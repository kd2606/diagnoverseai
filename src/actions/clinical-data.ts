'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient, type SupabaseServerClient } from '@/lib/supabase/server';
import { fail, ok, safeError, type ActionResult } from './_result';
import type {
  AuditAction,
  CaseStatus,
  ClinicalReasoning,
  Database,
  Differential,
} from '@/types/database.types';

/* ═════════════════════════ Domain models (UI-facing) ═════════════════════ */

export interface TriageQueueItem {
  id: string;
  patientId: string;
  mrn: string;
  age: number | null;
  sex: string | null;
  chiefComplaint: string;
  aiAssessment: string | null;
  icd10Code: string | null;
  confidence: number | null;
  confidencePct: number;
  status: CaseStatus;
  triageNote: string | null;
  reasoning: ClinicalReasoning;
  differentials: Differential[];
  reviewUrgency: 'critical' | 'elevated' | 'routine' | 'unknown';
  clinicianId: string | null;
  clinicianName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PatientPanelItem {
  id: string;
  mrn: string;
  fullName: string | null;
  age: number | null;
  sex: string | null;
  chiefComplaint: string | null;
  totalCases: number;
  openCases: number;
  latestStatus: CaseStatus | null;
  latestAssessment: string | null;
  latestConfidence: number | null;
  lastSeenAt: string | null;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  seq: number;
  caseId: string | null;
  actorName: string;
  actorRole: string;
  actionType: AuditAction;
  summary: string;
  hash: string | null;
  prevHash: string | null;
  createdAt: string;
}

export interface AdjudicationOutcome {
  caseId: string;
  status: CaseStatus;
  auditLogId: string;
  actionType: AuditAction;
}

/* ═════════════════════════════ Auth guards ══════════════════════════════ */

interface ClinicianIdentity {
  supabase: SupabaseServerClient;
  profileId: string;
  fullName: string;
  role: 'clinician';
}

async function requireClinician(): Promise<
  { ok: true; identity: ClinicianIdentity } | { ok: false; error: string; code: string }
> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, error: 'Not authenticated.', code: 'UNAUTHENTICATED' };
  }

  const { data: profile, error: profileError } = await (supabase as any)
    .from('profiles')
    .select('id, role, full_name')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return { ok: false, error: 'Profile not found.', code: 'NO_PROFILE' };
  }

  if (profile.role !== 'clinician') {
    return {
      ok: false,
      error: 'Clinician privileges required.',
      code: 'FORBIDDEN',
    };
  }

  return {
    ok: true,
    identity: {
      supabase,
      profileId: profile.id,
      fullName: profile.full_name || user.email || 'Unknown clinician',
      role: 'clinician',
    },
  };
}

/* ══════════════════════════════ Mappers ═════════════════════════════════ */

type QueueRow = Database['public']['Views']['triage_queue_view']['Row'];
type AuditRow = Database['public']['Tables']['audit_logs']['Row'];

function mapQueueRow(row: any): TriageQueueItem {
  const confidence =
    row.confidence_score === null ? null : Number(row.confidence_score);

  return {
    id: row.id,
    patientId: row.patient_id,
    mrn: row.patient_mrn,
    age: row.patient_age,
    sex: row.patient_sex,
    chiefComplaint: row.chief_complaint,
    aiAssessment: row.ai_assessment,
    icd10Code: row.icd10_code,
    confidence,
    confidencePct: confidence === null ? 0 : Math.round(confidence * 100),
    status: row.status,
    triageNote: row.triage_note,
    reasoning: row.reasoning ?? {},
    differentials: Array.isArray(row.differentials) ? row.differentials : [],
    reviewUrgency: row.review_urgency,
    clinicianId: row.clinician_id,
    clinicianName: row.clinician_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAuditRow(row: any): AuditLogEntry {
  return {
    id: row.id,
    seq: Number(row.seq),
    caseId: row.case_id,
    actorName: row.actor_name,
    actorRole: row.actor_role,
    actionType: row.action_type,
    summary: row.summary,
    hash: row.hash,
    prevHash: row.prev_hash,
    createdAt: row.created_at,
  };
}

/* ═══════════════════════════ 1. getTriageQueue ══════════════════════════ */

const QueueOptions = z.object({
  includeVerified: z.boolean().optional().default(false),
  limit: z.number().int().min(1).max(200).optional().default(50),
});

export type GetTriageQueueOptions = z.input<typeof QueueOptions>;

export async function getTriageQueue(
  options: GetTriageQueueOptions = {},
): Promise<ActionResult<TriageQueueItem[]>> {
  const parsed = QueueOptions.safeParse(options);
  if (!parsed.success) return fail('Invalid queue options.', 'BAD_INPUT');
  const { includeVerified, limit } = parsed.data;

  const guard = await requireClinician();
  if (!guard.ok) return fail(guard.error, guard.code);

  try {
    let query = (guard.identity.supabase as any)
      .from('triage_queue_view')
      .select('*')
      .order('priority_rank', { ascending: true })
      .order('confidence_score', { ascending: true, nullsFirst: true })
      .order('created_at', { ascending: true })
      .limit(limit);

    if (!includeVerified) {
      query = query.in('status', ['pending', 'escalated'] satisfies CaseStatus[]);
    }

    const { data, error } = await query;
    if (error) return fail(safeError('Unable to load triage queue', error), error.code);

    return ok((data ?? []).map(mapQueueRow));
  } catch (err) {
    return fail(safeError('Unable to load triage queue', err));
  }
}

export async function getCaseById(
  caseId: string,
): Promise<ActionResult<TriageQueueItem>> {
  if (!z.string().uuid().safeParse(caseId).success) {
    return fail('Invalid case id.', 'BAD_INPUT');
  }

  const guard = await requireClinician();
  if (!guard.ok) return fail(guard.error, guard.code);

  const { data, error } = await (guard.identity.supabase as any)
    .from('triage_queue_view')
    .select('*')
    .eq('id', caseId)
    .maybeSingle();

  if (error) return fail(safeError('Unable to load case', error), error.code);
  if (!data) return fail('Case not found.', 'NOT_FOUND');

  return ok(mapQueueRow(data));
}

/* ═══════════════════════════ 2. adjudicateCase ══════════════════════════ */

const AdjudicateInput = z.object({
  caseId: z.string().uuid('A valid case id is required.'),
  status: z.enum(['verified', 'escalated']),
  notes: z
    .string()
    .trim()
    .max(5000, 'Triage note cannot exceed 5000 characters.')
    .optional(),
});

export async function adjudicateCase(
  caseId: string,
  status: 'verified' | 'escalated',
  notes?: string,
): Promise<ActionResult<AdjudicationOutcome>> {
  const parsed = AdjudicateInput.safeParse({ caseId, status, notes });
  if (!parsed.success) {
    return fail(
      parsed.error.issues[0]?.message ?? 'Invalid adjudication input.',
      'BAD_INPUT',
    );
  }
  const input = parsed.data;

  const guard = await requireClinician();
  if (!guard.ok) return fail(guard.error, guard.code);
  const { supabase, profileId, fullName, role } = guard.identity;

  try {
    const { data: existing, error: readError } = await (supabase as any)
      .from('triage_cases')
      .select(
        'id, status, clinician_id, triage_note, ai_assessment, icd10_code, confidence_score',
      )
      .eq('id', input.caseId)
      .maybeSingle();

    if (readError) {
      return fail(safeError('Unable to read case', readError), readError.code);
    }
    if (!existing) return fail('Case not found.', 'NOT_FOUND');

    const previousStatus = existing.status;
    const confidence =
      existing.confidence_score === null ? null : Number(existing.confidence_score);

    const { data: updated, error: updateError } = await (supabase as any)
      .from('triage_cases')
      .update({
        status: input.status,
        clinician_id: profileId,
        ...(input.notes ? { triage_note: input.notes } : {}),
      })
      .eq('id', input.caseId)
      .select('id, status')
      .single();

    if (updateError || !updated) {
      return fail(
        safeError('Unable to update case', updateError),
        updateError?.code,
      );
    }

    const actionType: AuditAction = (() => {
      if (previousStatus === 'verified' && input.status === 'escalated') {
        return 'override';
      }
      if (previousStatus === 'escalated' && input.status === 'verified') {
        return confidence !== null && confidence < 0.7 ? 'override' : 'approval';
      }
      return input.status === 'verified' ? 'approval' : 'escalation';
    })();

    const confidenceLabel =
      confidence === null ? 'n/a' : `${Math.round(confidence * 100)}%`;

    const summaryParts = [
      `Case ${input.caseId.slice(0, 8)} adjudicated ${previousStatus} → ${input.status}`,
      `AI impression: ${existing.ai_assessment ?? 'none'}${
        existing.icd10_code ? ` (${existing.icd10_code})` : ''
      } @ ${confidenceLabel} confidence`,
      actionType === 'override'
        ? 'Clinician OVERRODE the prior determination.'
        : null,
      input.notes ? `Note: ${input.notes}` : null,
    ].filter((part): part is string => Boolean(part));

    const { data: auditRow, error: auditError } = await (supabase as any)
      .from('audit_logs')
      .insert({
        case_id: input.caseId,
        actor_name: fullName,
        actor_role: role,
        action_type: actionType,
        summary: summaryParts.join(' · '),
      })
      .select('id')
      .single();

    if (auditError || !auditRow) {
      await (supabase as any)
        .from('triage_cases')
        .update({
          status: previousStatus,
          clinician_id: existing.clinician_id,
          triage_note: existing.triage_note,
        })
        .eq('id', input.caseId);

      return fail(
        safeError('Audit write failed — adjudication rolled back', auditError),
        auditError?.code,
      );
    }

    revalidatePath('/[locale]/dashboard/doctor', 'page');
    revalidatePath('/[locale]/dashboard/doctor/patients', 'page');
    revalidatePath('/[locale]/dashboard/doctor/audit', 'page');

    return ok({
      caseId: updated.id,
      status: updated.status,
      auditLogId: auditRow.id,
      actionType,
    });
  } catch (err) {
    return fail(safeError('Adjudication failed', err));
  }
}

/* ════════════════════════════ 3. getAuditLogs ═══════════════════════════ */

const AuditOptions = z.object({
  limit: z.number().int().min(1).max(500).optional().default(100),
  caseId: z.string().uuid().optional(),
  actionType: z
    .enum(['inference', 'bypass', 'override', 'approval', 'escalation'])
    .optional(),
});

export type GetAuditLogsOptions = z.input<typeof AuditOptions>;

export async function getAuditLogs(
  options: GetAuditLogsOptions = {},
): Promise<ActionResult<AuditLogEntry[]>> {
  const parsed = AuditOptions.safeParse(options);
  if (!parsed.success) return fail('Invalid audit log filters.', 'BAD_INPUT');
  const { limit, caseId, actionType } = parsed.data;

  const guard = await requireClinician();
  if (!guard.ok) return fail(guard.error, guard.code);

  try {
    let query = (guard.identity.supabase as any)
      .from('audit_logs')
      .select('*')
      .order('seq', { ascending: false })
      .limit(limit);

    if (caseId) query = query.eq('case_id', caseId);
    if (actionType) query = query.eq('action_type', actionType);

    const { data, error } = await query;
    if (error) return fail(safeError('Unable to load audit ledger', error), error.code);

    return ok((data ?? []).map(mapAuditRow));
  } catch (err) {
    return fail(safeError('Unable to load audit ledger', err));
  }
}

export async function verifyAuditChain(): Promise<
  ActionResult<{ intact: boolean; totalEntries: number; brokenAt: number[] }>
> {
  const guard = await requireClinician();
  if (!guard.ok) return fail(guard.error, guard.code);

  const { data, error } = await (guard.identity.supabase as any).rpc('verify_audit_chain');
  if (error) return fail(safeError('Chain verification failed', error), error.code);

  const rows = data ?? [];
  const broken = rows.filter((r: any) => !r.is_valid).map((r: any) => Number(r.seq));

  return ok({
    intact: broken.length === 0,
    totalEntries: rows.length,
    brokenAt: broken,
  });
}

/* ═══════════════════════════ 4. getPatientPanel ═════════════════════════ */

export async function getPatientPanel(): Promise<
  ActionResult<PatientPanelItem[]>
> {
  const guard = await requireClinician();
  if (!guard.ok) return fail(guard.error, guard.code);

  try {
    const { data: prescriptions, error } = await (guard.identity.supabase as any)
      .from('prescriptions')
      .select(`
        patient_id,
        created_at,
        diagnosis,
        patient:profiles!patient_id(full_name)
      `)
      .eq('doctor_id', guard.identity.profileId)
      .order('created_at', { ascending: false });

    if (error) {
      return fail(safeError('Unable to load patient panel', error), error.code);
    }

    const patientMap = new Map<string, PatientPanelItem>();
    
    for (const p of (prescriptions || [])) {
      if (!patientMap.has(p.patient_id)) {
        const profile = Array.isArray(p.patient) ? p.patient[0] : p.patient;
        patientMap.set(p.patient_id, {
          id: p.patient_id,
          mrn: `MRN-${p.patient_id.substring(0, 8).toUpperCase()}`,
          fullName: profile?.full_name ?? 'Unknown Patient',
          age: null,
          sex: null,
          chiefComplaint: p.diagnosis || 'Consultation',
          totalCases: 1,
          openCases: 0,
          latestStatus: 'verified',
          latestAssessment: p.diagnosis || null,
          latestConfidence: 100,
          lastSeenAt: p.created_at,
          createdAt: p.created_at,
        });
      } else {
        const existing = patientMap.get(p.patient_id)!;
        existing.totalCases += 1;
      }
    }

    return ok(Array.from(patientMap.values()));
  } catch (err) {
    return fail(safeError('Unable to load patient panel', err));
  }
}
export async function createTriageCase(data: {
  patient_id: string;
  chief_complaint: string;
  ai_assessment?: string;
}) {
  const supabase = await createClient();
  const { error } = await (supabase as any)
    .from('triage_cases')
    .insert({
      patient_id: data.patient_id,
      chief_complaint: data.chief_complaint,
      ai_assessment: data.ai_assessment || null,
      status: 'pending'
    });

  if (error) {
    throw new Error(error.message);
  }
  return { success: true };
}
