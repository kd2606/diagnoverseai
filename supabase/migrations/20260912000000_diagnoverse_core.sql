-- ============================================================================
-- DiagnoVerse AI — Core Clinical Schema
-- Migration: 20260912000000_diagnoverse_core.sql
-- Target: Supabase Postgres 15+ (gen_random_uuid() is built-in, no pgcrypto)
-- 
-- Design notes:
-- * All PHI tables are RLS-deny-by-default; there are no permissive
-- "USING (true)" escape hatches anywhere in this file.
-- * auth.uid() is always wrapped in (select ...) so the planner evaluates it
-- once per query (initplan) instead of once per row. This is the single
-- biggest RLS performance win on large tables.
-- * Cross-table authorization runs through SECURITY DEFINER helpers with a
-- locked-down search_path. This avoids RLS recursion on `profiles` and
-- keeps the policy predicates index-friendly.
-- * Writes to ai_insights are reserved for the service_role (the Genkit
-- pipeline). Clinicians may only transition `status` / `clinical_summary`,
-- enforced by column-level GRANTs layered on top of RLS.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 0. Clean slate (safe to re-run in dev; comment out for prod re-deploys)
-- ----------------------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- 1.1 profiles — mirrors auth.users, adds role + clinical metadata.
-- id is both PK and FK: one profile per auth user, cascades on delete.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'patient' constraint profiles_role_check check (role in ('doctor', 'patient')),
  full_name text,
  email text,
  specialty text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A specialty is meaningless for a patient; reject the bad state at the DB.
  constraint profiles_specialty_requires_doctor check (specialty is null or role = 'doctor')
);

comment on table public.profiles is 'Application-level user record, 1:1 with auth.users.';
comment on column public.profiles.role is 'Authorization role: doctor (B2B reviewer) or patient (B2C uploader).';
comment on column public.profiles.email is 'Denormalized copy of auth.users.email for joins/display; not authoritative.';

-- 1.2 medical_records — one row per uploaded artifact (DICOM, PDF, image).
-- doctor_id is the assignment pointer: NULL = awaiting triage.
-- ON DELETE SET NULL so offboarding a clinician never destroys PHI.
create table if not exists public.medical_records (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  doctor_id uuid references public.profiles (id) on delete set null,
  title text not null constraint medical_records_title_not_blank check (length(btrim(title)) > 0),
  document_type text not null constraint medical_records_document_type_check check (document_type in ('xray', 'mri', 'blood_report', 'prescription')),
  storage_path text not null constraint medical_records_storage_path_not_blank check (length(btrim(storage_path)) > 0),
  uploaded_at timestamptz not null default now(),
  -- One logical row per stored object: blocks duplicate-ingest races and
  -- stops a second record from being pointed at someone else's file.
  constraint medical_records_storage_path_key unique (storage_path)
);

comment on column public.medical_records.doctor_id is 'Assigned reviewing clinician. NULL until triaged.';
comment on column public.medical_records.storage_path is 'Object key in the private "medical-records" bucket. Convention: {patient_id}/{record_uuid}/{filename}.';

-- 1.3 ai_insights — output of the Genkit/Gemini multimodal pipeline.
-- Multiple rows per record are allowed (model versions, re-runs).
create table if not exists public.ai_insights (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.medical_records (id) on delete cascade,
  ai_model_used text not null,
  raw_analysis_json jsonb not null default '{}'::jsonb,
  confidence_score numeric(5, 4) constraint ai_insights_confidence_range check (confidence_score is null or (confidence_score >= 0 and confidence_score <= 1)),
  clinical_summary text,
  status text not null default 'pending' constraint ai_insights_status_check check (status in ('pending', 'reviewed')),
  generated_at timestamptz not null default now()
);

comment on column public.ai_insights.ai_model_used is 'Exact model id, e.g. gemini-2.5-pro. Free-text by design: models churn.';
comment on column public.ai_insights.confidence_score is 'Normalized 0.0-1.0. numeric(5,4) keeps it exact and comparable.';
comment on column public.ai_insights.raw_analysis_json is 'Verbatim structured model output. Queried via GIN/jsonb containment.';

-- ============================================================================
-- 2. INDEXES
-- ============================================================================
-- Foreign keys are NOT auto-indexed by Postgres. These also back the RLS
-- predicates, so their absence would turn every policy check into a seq scan.
create index if not exists medical_records_patient_id_idx on public.medical_records (patient_id);
create index if not exists medical_records_doctor_id_idx on public.medical_records (doctor_id) where doctor_id is not null;
create index if not exists ai_insights_record_id_idx on public.ai_insights (record_id);

-- Composite covering the primary read paths: "my records, newest first" and
-- "my assigned worklist, newest first".
create index if not exists medical_records_patient_uploaded_idx on public.medical_records (patient_id, uploaded_at desc);
create index if not exists medical_records_doctor_uploaded_idx on public.medical_records (doctor_id, uploaded_at desc) where doctor_id is not null;

-- Backs the "doctors can read their patients' profiles" policy: the EXISTS
-- subquery probes (doctor_id, patient_id) directly, index-only.
create index if not exists medical_records_doctor_patient_idx on public.medical_records (doctor_id, patient_id) where doctor_id is not null;

-- Unreviewed-queue index. Partial, so it stays tiny as reviewed volume grows.
create index if not exists ai_insights_pending_idx on public.ai_insights (generated_at desc) where status = 'pending';

-- GIN on the raw model output. Default jsonb_ops (not jsonb_path_ops) so it
-- serves key-existence (?, ?&, ?|) in addition to containment (@>):
-- where raw_analysis_json @> '{"findings":[{"label":"nodule"}]}'
-- where raw_analysis_json ? 'differential_diagnosis'
create index if not exists ai_insights_raw_analysis_json_gin_idx on public.ai_insights using gin (raw_analysis_json);
create index if not exists profiles_role_idx on public.profiles (role);

-- ============================================================================
-- 3. TRIGGER FUNCTIONS
-- ============================================================================
-- 3.1 updated_at maintenance.
create or replace function public.tg_set_updated_at() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.tg_set_updated_at();

-- 3.2 Auth -> profiles provisioning.
-- SECURITY DEFINER: runs as owner because the signing-up user has no
-- INSERT policy on profiles (deliberately — role must not be self-issued
-- post-signup). search_path is emptied to defeat search_path hijacking.
-- The role value is whitelisted, never trusted verbatim from client
-- metadata, and anything unrecognized degrades to 'patient'.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_role text;
  v_full_name text;
  v_specialty text;
begin
  v_role := lower(nullif(btrim(coalesce(new.raw_user_meta_data ->> 'role', '')), ''));
  if v_role is null or v_role not in ('doctor', 'patient') then
    v_role := 'patient';
  end if;
  
  -- Accept full_name, or the 'name' claim that OAuth providers send.
  v_full_name := nullif(btrim(coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    ''
  )), '');
  
  v_specialty := case when v_role = 'doctor' then nullif(btrim(coalesce(new.raw_user_meta_data ->> 'specialty', '')), '') end;
  
  insert into public.profiles (id, role, full_name, email, specialty)
  values (new.id, v_role, v_full_name, new.email, v_specialty)
  on conflict (id) do nothing; -- idempotent: survives provider re-links
  return new;
exception
  -- Never let profile provisioning abort the auth transaction; a failed
  -- signup is a worse outcome than a profile we can backfill. Surfaces in
  -- Postgres logs for alerting.
  when others then
    raise warning 'handle_new_user: profile provisioning failed for user %: % (%)', new.id, sqlerrm, sqlstate;
    return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- ============================================================================
-- 4. AUTHORIZATION HELPERS
-- SECURITY DEFINER + STABLE. Two jobs: (a) break the profiles->profiles
-- RLS recursion, (b) let the planner hoist the check out of the row loop.
-- Each helper is intentionally narrow — it answers exactly one question
-- about the *calling* user and cannot be coerced into leaking other rows.
-- ============================================================================

create or replace function public.is_doctor() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'doctor'
  );
$$;

-- True if the caller is the owning patient of the record.
create or replace function public.is_record_patient(p_record_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.medical_records mr where mr.id = p_record_id and mr.patient_id = (select auth.uid())
  );
$$;

-- True if the caller is the assigned reviewing clinician for the record.
create or replace function public.is_record_doctor(p_record_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.medical_records mr where mr.id = p_record_id and mr.doctor_id = (select auth.uid())
  );
$$;

-- Lock down SECURITY DEFINER surface area: PUBLIC/anon get nothing.
revoke all on function public.is_doctor() from public, anon;
revoke all on function public.is_record_patient(uuid) from public, anon;
revoke all on function public.is_record_doctor(uuid) from public, anon;
revoke all on function public.handle_new_user() from public, anon, authenticated;

grant execute on function public.is_doctor() to authenticated;
grant execute on function public.is_record_patient(uuid) to authenticated;
grant execute on function public.is_record_doctor(uuid) to authenticated;

-- ============================================================================
-- 5. TABLE PRIVILEGES (defense in depth beneath RLS)
-- Supabase grants ALL to anon/authenticated on new public tables by
-- default. Strip that, then re-grant the minimum. Column-level UPDATE is
-- what actually stops a clinician from rewriting confidence_score or a
-- patient from re-pointing storage_path at another patient's object.
-- ============================================================================

revoke all on public.profiles from anon, authenticated;
revoke all on public.medical_records from anon, authenticated;
revoke all on public.ai_insights from anon, authenticated;

-- anon (pre-login) gets zero access to PHI. Nothing granted. Intentional.
grant select on public.profiles to authenticated;
grant update (full_name, specialty) on public.profiles to authenticated;
-- Note: `role` is absent above. Role escalation is impossible via the API;
-- promotions happen server-side with the service key.

grant select, insert, delete on public.medical_records to authenticated;
grant update (title, document_type, doctor_id) on public.medical_records to authenticated;
-- storage_path and patient_id are immutable post-insert by privilege.

grant select on public.ai_insights to authenticated;
grant update (status, clinical_summary) on public.ai_insights to authenticated;
-- Model output columns (raw_analysis_json, confidence_score, ai_model_used)
-- are append-only from the pipeline's perspective: no human can alter them.

-- ============================================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.medical_records enable row level security;
alter table public.ai_insights enable row level security;

-- FORCE applies RLS even to the table owner, so a stray superuser-owned
-- function can't silently bypass policy. service_role has BYPASSRLS and is
-- unaffected — which is exactly how the Genkit worker writes insights.
alter table public.profiles force row level security;
alter table public.medical_records force row level security;
alter table public.ai_insights force row level security;

-- ---------------------------------------------------------------- profiles --
-- Self-read.
drop policy if exists "profiles: select own" on public.profiles;
create policy "profiles: select own" on public.profiles for select to authenticated using (id = (select auth.uid()));

-- Self-update. WITH CHECK re-asserts identity so the row can't be
-- re-keyed to another user mid-update.
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Clinician -> patient visibility, scoped strictly to an existing care
-- relationship expressed in medical_records. No assignment, no visibility.
-- Uses public.is_doctor() rather than a self-join on profiles, which would
-- recurse into this same policy set.
drop policy if exists "profiles: doctors select assigned patients" on public.profiles;
create policy "profiles: doctors select assigned patients" on public.profiles for select to authenticated using (
  role = 'patient' and public.is_doctor() and exists (
    select 1 from public.medical_records mr where mr.patient_id = profiles.id and mr.doctor_id = (select auth.uid())
  )
);

-- Reciprocal: a patient may see the clinician assigned to their records
-- (needed to render "Reviewed by Dr. X" without a service-role round trip).
drop policy if exists "profiles: patients select assigned doctors" on public.profiles;
create policy "profiles: patients select assigned doctors" on public.profiles for select to authenticated using (
  role = 'doctor' and exists (
    select 1 from public.medical_records mr where mr.doctor_id = profiles.id and mr.patient_id = (select auth.uid())
  )
);
-- No INSERT policy: profiles are created solely by the auth trigger.
-- No DELETE policy: deletion cascades from auth.users; PHI is never
-- deleted by a client request path.

-- --------------------------------------------------------- medical_records --

drop policy if exists "medical_records: patients select own" on public.medical_records;
create policy "medical_records: patients select own" on public.medical_records for select to authenticated using (patient_id = (select auth.uid()));

drop policy if exists "medical_records: patients insert own" on public.medical_records;
create policy "medical_records: patients insert own" on public.medical_records for insert to authenticated with check (patient_id = (select auth.uid()));

drop policy if exists "medical_records: patients update own" on public.medical_records;
create policy "medical_records: patients update own" on public.medical_records for update to authenticated using (patient_id = (select auth.uid())) with check (patient_id = (select auth.uid()));

drop policy if exists "medical_records: patients delete own" on public.medical_records;
create policy "medical_records: patients delete own" on public.medical_records for delete to authenticated using (patient_id = (select auth.uid()));

drop policy if exists "medical_records: doctors select assigned" on public.medical_records;
create policy "medical_records: doctors select assigned" on public.medical_records for select to authenticated using (doctor_id = (select auth.uid()));

-- A clinician may edit an assigned record but cannot hand it to a third
-- party or steal it: WITH CHECK pins doctor_id to themselves.
drop policy if exists "medical_records: doctors update assigned" on public.medical_records;
create policy "medical_records: doctors update assigned" on public.medical_records for update to authenticated using (doctor_id = (select auth.uid())) with check (doctor_id = (select auth.uid()));

-- ------------------------------------------------------------- ai_insights --
drop policy if exists "ai_insights: patients select own records" on public.ai_insights;
create policy "ai_insights: patients select own records" on public.ai_insights for select to authenticated using (public.is_record_patient(record_id));

drop policy if exists "ai_insights: doctors select assigned records" on public.ai_insights;
create policy "ai_insights: doctors select assigned records" on public.ai_insights for select to authenticated using (public.is_record_doctor(record_id));

-- Verification workflow: the assigned clinician flips pending -> reviewed and
-- may annotate clinical_summary. Column GRANTs above constrain *what* can
-- change; this policy constrains *which rows*, and WITH CHECK prevents
-- re-parenting the insight to a different record.
drop policy if exists "ai_insights: doctors update assigned records" on public.ai_insights;
create policy "ai_insights: doctors update assigned records" on public.ai_insights for update to authenticated using (public.is_record_doctor(record_id)) with check (public.is_record_doctor(record_id));

-- No INSERT/DELETE policy by design. The Genkit + Gemini worker writes with
-- the service_role key from a trusted server context (Route Handler, Edge
-- Function, or queue consumer). A browser-issued insight would be a forged
-- diagnosis.

commit;

-- ============================================================================
-- OPTIONAL FOLLOW-UP MIGRATION: 20260912000001_storage.sql
-- ============================================================================
-- Private bucket. 'public' MUST stay false: signed URLs only, no PHI on a CDN.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'medical-records',
  'medical-records',
  false,
  524288000, -- 500 MB: DICOM series get large
  array[
    'application/dicom',
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/tiff',
    'application/octet-stream' -- DICOM often arrives untyped
  ]
) on conflict (id) do nothing;

-- Path convention enforced here: {auth.uid()}/{record_id}/{filename}
-- The first folder segment is the owning patient's uid, which makes ownership
-- checkable without a table lookup on upload.
drop policy if exists "storage: patients insert own folder" on storage.objects;
create policy "storage: patients insert own folder" on storage.objects for insert to authenticated with check (
  bucket_id = 'medical-records' and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "storage: patients select own folder" on storage.objects;
create policy "storage: patients select own folder" on storage.objects for select to authenticated using (
  bucket_id = 'medical-records' and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "storage: patients delete own folder" on storage.objects;
create policy "storage: patients delete own folder" on storage.objects for delete to authenticated using (
  bucket_id = 'medical-records' and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Clinician read access is derived from assignment, not from path: the object
-- must be referenced by a medical_record assigned to them. Relies on the
-- unique constraint on medical_records.storage_path.
create or replace function public.can_read_medical_object(p_object_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.medical_records mr where mr.storage_path = p_object_name and mr.doctor_id = (select auth.uid())
  );
$$;

revoke all on function public.can_read_medical_object(text) from public, anon;
grant execute on function public.can_read_medical_object(text) to authenticated;

drop policy if exists "storage: doctors select assigned objects" on storage.objects;
create policy "storage: doctors select assigned objects" on storage.objects for select to authenticated using (
  bucket_id = 'medical-records' and public.can_read_medical_object(name)
);
