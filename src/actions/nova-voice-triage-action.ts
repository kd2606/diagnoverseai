'use server';

import { generateClinicalTriage } from '@/actions/nova-inference';
import type { ClinicalTriageReport } from '@/actions/nova-inference';
import { createClient } from '@/lib/supabase/server';

/* ------------------------------------------------------------------ */
/* Contract                                                            */
/* ------------------------------------------------------------------ */

export type VoiceTriageResult =
  | {
      success: true;
      caseId: string;
      data: ClinicalTriageReport;
      meta: { model: string; latencyMs: number };
    }
  | { success: false; error: string; message: string };

/* ------------------------------------------------------------------ */
/* Server Action                                                       */
/* ------------------------------------------------------------------ */

/**
 * End-to-end voice triage: AI inference → WORM vault insert.
 *
 * 1. Sends the transcript to `generateClinicalTriage` (Gemini structured output).
 * 2. On success, inserts the structured report into `triage_cases`.
 * 3. Returns the saved case ID so the frontend can reference it for escalation.
 */
export async function submitVoiceTriage(
  patientId: string,
  transcript: string,
): Promise<VoiceTriageResult> {
  /* ---------- Step 1: AI Inference ---------- */
  const aiResult = await generateClinicalTriage(transcript);

  if (!aiResult.success) {
    return aiResult as any;
  }

  const { data, meta } = aiResult;

  /* ---------- Step 2: Vault Insert ---------- */
  try {
    const supabase = await createClient();

    const { data: savedCase, error: insertError } = await (supabase as any)
      .from('triage_cases')
      .insert({
        patient_id: patientId,
        chief_complaint: transcript.slice(0, 500),
        ai_assessment: data?.aiAssessment,
        icd10_code: data?.icd10,
        confidence_score: data?.confidence,
        triage_note: data?.triageNote,
        reasoning: JSON.stringify(data?.reasoning),
        differentials: JSON.stringify(data?.differentials),
        status: 'pending',
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[voice-triage] vault insert failed', {
        code: insertError.code,
        hint: insertError.hint,
      });
      return {
        success: false,
        error: 'DB_WRITE_FAILED',
        message: 'Failed to save triage record to the clinical vault. Please try again.',
      };
    }

    return { success: true, caseId: savedCase.id, data: data as ClinicalTriageReport, meta: meta! };
  } catch (err) {
    console.error('[voice-triage] unexpected DB error', err);
    console.error("SERVER_ACTION_ERROR:", err);
    return {
      success: false,
      error: 'DB_WRITE_FAILED',
      message: 'Failed to save triage record to the clinical vault. Please try again.',
    };
  }
}
