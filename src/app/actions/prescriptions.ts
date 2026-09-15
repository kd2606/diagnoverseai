'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createPrescriptionInputSchema } from '@/lib/erx/prescription.schema';
import { DEFAULT_SCHEDULE_WINDOW, generateReminders } from '@/lib/erx/frequency';

export type ActionResult<TData> =
  | { readonly ok: true; readonly data: TData }
  | { readonly ok: false; readonly error: string; readonly fieldErrors?: Readonly<Record<string, string[]>> };

interface ReminderPayload {
  readonly slot: string;
  readonly time: string;
  readonly timezone: string;
}

interface DoctorProfile {
  readonly role: string;
  readonly nmc_registration_no: string | null;
  readonly timezone: string | null;
}

export async function createPrescription(input: unknown): Promise<ActionResult<{ prescriptionId: string }>> {
  // 1. Validate the payload shape before touching the database.
  const parsed = createPrescriptionInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Please correct the highlighted fields.', fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const payload = parsed.data;

  const supabase = await createSupabaseServerClient();

  // 2. Authenticate.
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return { ok: false, error: 'Your session has expired. Please sign in again.' };

  if (auth.user.id === payload.patient_id) {
    return { ok: false, error: 'A prescription cannot be issued to yourself.' };
  }

  // 3. Authorise: only a registered medical practitioner may prescribe.
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, nmc_registration_no, timezone')
    .eq('id', auth.user.id)
    .single<DoctorProfile>();

  if (profileError || !profile) return { ok: false, error: 'We could not verify your clinician profile.' };
  if (profile.role !== 'doctor') return { ok: false, error: 'Only a registered doctor can issue a prescription.' };
  if (!profile.nmc_registration_no) {
    return { ok: false, error: 'Add your medical council registration number before issuing prescriptions.' };
  }

  // 4. Derive the dose schedule server-side — the client never supplies reminder times.
  const timezone = profile.timezone ?? 'Asia/Kolkata';
  const unparseable: string[] = [];

  const items = payload.items.map((item) => {
    const schedule = generateReminders(item.frequency, DEFAULT_SCHEDULE_WINDOW);
    if (schedule.requiresReview && !item.is_sos) unparseable.push(item.medication_name);

    const reminders: ReminderPayload[] = item.is_sos
      ? []
      : schedule.reminders.map((reminder) => ({ slot: reminder.slot, time: reminder.time, timezone }));

    return { ...item, reminders };
  });

  if (unparseable.length > 0) {
    return {
      ok: false,
      error: `We could not interpret the frequency for: ${unparseable.join(', ')}. Use a format like "Twice daily", "1-0-1" or "Every 8 hours".`,
    };
  }

  // 5. Single atomic write (header + items + reminders), still under RLS.
  const { data: prescriptionId, error: rpcError } = await supabase.rpc('create_prescription', {
    p_payload: {
      patient_id: payload.patient_id,
      encounter_id: payload.encounter_id ?? null,
      diagnosis: payload.diagnosis,
      clinical_notes: payload.clinical_notes ?? null,
      valid_until: payload.valid_until ?? null,
      doctor_registration_no: profile.nmc_registration_no,
      items,
    },
  });

  if (rpcError || typeof prescriptionId !== 'string') {
    // Log the raw error to your observability sink; never leak SQL detail to the client.
    console.error('[createPrescription] rpc failed', rpcError);
    return { ok: false, error: 'We could not save this prescription. Please try again.' };
  }

  revalidatePath('/vault');
  revalidatePath('/doctor/prescriptions');

  return { ok: true, data: { prescriptionId } };
}

export async function logDose(
  reminderId: string,
  scheduledForIso: string,
  status: 'TAKEN' | 'SKIPPED',
): Promise<ActionResult<null>> {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Your session has expired. Please sign in again.' };

  const { error } = await supabase
    .from('medication_dose_logs')
    .upsert(
      { reminder_id: reminderId, patient_id: auth.user.id, scheduled_for: scheduledForIso, status },
      { onConflict: 'reminder_id,scheduled_for' },
    );

  if (error) {
    console.error('[logDose] failed', error);
    return { ok: false, error: 'We could not record that dose. Please try again.' };
  }

  revalidatePath('/vault');
  return { ok: true, data: null };
}
