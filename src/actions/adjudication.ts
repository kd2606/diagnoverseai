'use server';

import { createClient } from '@/lib/supabase/server';

export async function markForAdjudication(scanId: string) {
  const supabase = await createClient();
  const { error } = await (supabase as any)
    .from('triage_cases')
    .update({ status: 'escalated' }) // 'escalated' is the closest to awaiting_adjudication in this schema
    .eq('id', scanId);

  if (error) {
    throw new Error(error.message);
  }
  return { success: true };
}
