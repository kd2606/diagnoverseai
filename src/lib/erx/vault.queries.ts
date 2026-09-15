import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  courseEndDate,
  generateReminders,
  isCourseActiveOn,
  isDoseDueOn,
  type DoseSlot,
  type FrequencySchedule,
} from '@/lib/erx/frequency';
import type { MedicationRoute } from '@/lib/erx/prescription.schema';

const IST_OFFSET = '+05:30';

interface ReminderRow {
  readonly id: string;
  readonly slot: DoseSlot;
  readonly reminder_time: string;
  readonly is_active: boolean;
}

interface ItemRow {
  readonly id: string;
  readonly medication_name: string;
  readonly strength: string | null;
  readonly dosage: string;
  readonly frequency: string;
  readonly route: MedicationRoute;
  readonly duration_days: number;
  readonly start_date: string;
  readonly instructions: string | null;
  readonly is_sos: boolean;
  readonly medication_reminders: readonly ReminderRow[];
}

interface PrescriptionRow {
  readonly id: string;
  readonly status: string;
  readonly issued_at: string;
  readonly diagnosis: string;
  readonly clinical_notes: string | null;
  readonly doctor_registration_no: string;
  readonly doctor: { readonly full_name: string | null } | null;
  readonly prescription_items: readonly ItemRow[];
}

export interface VaultMedication {
  readonly id: string;
  readonly name: string;
  readonly strength: string | null;
  readonly dosage: string;
  readonly frequency: string;
  readonly route: MedicationRoute;
  readonly instructions: string | null;
  readonly isSos: boolean;
  readonly startDate: string;
  readonly endDate: string;
  readonly daysRemaining: number;
  readonly schedule: FrequencySchedule;
}

export interface VaultPrescription {
  readonly id: string;
  readonly issuedAt: string;
  readonly diagnosis: string;
  readonly clinicalNotes: string | null;
  readonly doctorName: string;
  readonly doctorRegistrationNo: string;
  readonly medications: readonly VaultMedication[];
}

export interface TodayDose {
  readonly reminderId: string;
  readonly medicationName: string;
  readonly dosage: string;
  readonly slot: DoseSlot;
  readonly time: string;
  readonly scheduledForIso: string;
  readonly status: 'TAKEN' | 'SKIPPED' | 'PENDING';
}

export interface ClinicalVaultData {
  readonly prescriptions: readonly VaultPrescription[];
  readonly todaysDoses: readonly TodayDose[];
}

/** India-only simplification: reminders are stored in Asia/Kolkata. */
function toIstTimestamp(dateIso: string, time: string): string {
  return `${dateIso}T${time.slice(0, 5)}:00${IST_OFFSET}`;
}

function todayInIst(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
}

const SELECT = `
  id, status, issued_at, diagnosis, clinical_notes, doctor_registration_no,
  doctor:doctor_id ( full_name ),
  prescription_items (
    id, medication_name, strength, dosage, frequency, route, duration_days,
    start_date, instructions, is_sos,
    medication_reminders ( id, slot, reminder_time, is_active )
  )
` as const;

export async function getClinicalVault(now: Date = new Date()): Promise<ClinicalVaultData> {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { prescriptions: [], todaysDoses: [] };

  const today = todayInIst(now);

  // RLS already restricts rows to this patient; the explicit filter keeps the index tight.
  const { data, error } = await supabase
    .from('prescriptions')
    .select(SELECT)
    .eq('patient_id', auth.user.id)
    .eq('status', 'ACTIVE')
    .order('issued_at', { ascending: false })
    .returns<PrescriptionRow[]>();

  if (error || !data) {
    console.error('[getClinicalVault] query failed', error);
    return { prescriptions: [], todaysDoses: [] };
  }

  const { data: logs } = await supabase
    .from('medication_dose_logs')
    .select('reminder_id, scheduled_for, status')
    .eq('patient_id', auth.user.id)
    .gte('scheduled_for', toIstTimestamp(today, '00:00'))
    .lte('scheduled_for', toIstTimestamp(today, '23:59'))
    .returns<{ reminder_id: string; scheduled_for: string; status: 'TAKEN' | 'SKIPPED' }[]>();

  const loggedStatus = new Map<string, 'TAKEN' | 'SKIPPED'>(
    (logs ?? []).map((log) => [`${log.reminder_id}|${new Date(log.scheduled_for).toISOString()}`, log.status]),
  );

  const prescriptions: VaultPrescription[] = [];
  const todaysDoses: TodayDose[] = [];

  for (const row of data) {
    const medications: VaultMedication[] = [];

    for (const item of row.prescription_items) {
      if (!isCourseActiveOn(item.start_date, item.duration_days, today)) continue;

      const schedule = generateReminders(item.frequency);
      const endDate = courseEndDate(item.start_date, item.duration_days);
      const daysRemaining =
        Math.round((Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000) + 1;

      medications.push({
        id: item.id,
        name: item.medication_name,
        strength: item.strength,
        dosage: item.dosage,
        frequency: item.frequency,
        route: item.route,
        instructions: item.instructions,
        isSos: item.is_sos,
        startDate: item.start_date,
        endDate,
        daysRemaining,
        schedule,
      });

      if (item.is_sos || !isDoseDueOn(item.start_date, schedule.cadenceDays, today)) continue;

      for (const reminder of item.medication_reminders) {
        if (!reminder.is_active) continue;
        const scheduledForIso = new Date(toIstTimestamp(today, reminder.reminder_time)).toISOString();
        todaysDoses.push({
          reminderId: reminder.id,
          medicationName: item.medication_name,
          dosage: item.dosage,
          slot: reminder.slot,
          time: reminder.reminder_time.slice(0, 5),
          scheduledForIso,
          status: loggedStatus.get(`${reminder.id}|${scheduledForIso}`) ?? 'PENDING',
        });
      }
    }

    if (medications.length === 0) continue;

    prescriptions.push({
      id: row.id,
      issuedAt: row.issued_at,
      diagnosis: row.diagnosis,
      clinicalNotes: row.clinical_notes,
      doctorName: row.doctor?.full_name ?? 'Attending physician',
      doctorRegistrationNo: row.doctor_registration_no,
      medications,
    });
  }

  todaysDoses.sort((a, b) => a.time.localeCompare(b.time));
  return { prescriptions, todaysDoses };
}
