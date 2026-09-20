'use server';

import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function markForAdjudication(scanId: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await (supabaseAdmin as any)
    .from('triage_cases')
    .update({ status: 'escalated' }) // 'escalated' is the closest to awaiting_adjudication in this schema
    .eq('id', scanId);

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}
