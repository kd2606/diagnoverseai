'use server';

import { createClient } from '@/lib/supabase/server';

export async function markForAdjudication(patientId: string, chiefComplaint: string, aiAssessment: string) {
  const supabase = await createClient();
  const { error } = await (supabase as any)
    .from('triage_cases')
    .insert({
      patient_id: patientId,
      chief_complaint: chiefComplaint,
      ai_assessment: aiAssessment,
      status: 'pending' // pending is equivalent to awaiting_adjudication in this DB
    });

  if (error) {
    throw new Error(error.message);
  }
  return { success: true };
}
