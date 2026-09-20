import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * Server-side ONLY helper to lazily auto-provision a 'patients' record 
 * for a newly authenticated user. This must run with admin privileges
 * because users do not have INSERT privileges on the 'patients' table
 * (to prevent spoofing MRNs or metadata).
 */
export async function ensurePatientRecord(userId: string): Promise<void> {
  const adminClient = getSupabaseAdmin();
  
  // Upsert the patient record using the service role key.
  // We use the authenticated user's ID to strictly map it.
  const { error } = await adminClient.from('patients').upsert({
    id: userId,
    profile_id: userId,
    mrn: `MRN-${userId.substring(0, 8)}`,
    age: 30,
    sex: 'unknown',
    chief_complaint: 'Self-triage auto-provisioned'
  }, { onConflict: 'id' });

  if (error) {
    console.error('[patient-provisioning] Failed to provision patient record:', error);
    throw new Error('Could not provision patient record for triage.');
  }
}
