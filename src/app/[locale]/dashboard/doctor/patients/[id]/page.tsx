import { createClient } from '@/lib/supabase/server';
import { ShieldAlert, FileText, User, Mail, Calendar, Activity, Pill, Plus } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function PatientHealthPassportPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const patientId = resolvedParams.id;
  const supabase = await createClient();
  
  // Strict RMP Authentication
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-[#050505] p-6 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 border border-rose-500/20">
          <ShieldAlert className="h-8 w-8 text-rose-500" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-white">Unauthorized Access</h1>
        <p className="text-white/60">Please login as a registered medical practitioner.</p>
      </div>
    );
  }

  // Get profile to verify role
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'clinician') {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-[#050505] p-6 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 border border-rose-500/20">
          <ShieldAlert className="h-8 w-8 text-rose-500" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-white">Unauthorized Access</h1>
        <p className="text-white/60">This area is restricted to verified clinicians only.</p>
      </div>
    );
  }

  // Fetch patient profile
  const { data: patientProfile, error: profileError } = await (supabase as any)
    .from('profiles')
    .select('full_name, email')
    .eq('id', patientId)
    .single();
    
  if (profileError || !patientProfile) {
    return (
      <div className="flex h-[80vh] w-full flex-col items-center justify-center p-6 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.03] border border-white/[0.08]">
          <User className="h-8 w-8 text-white/20" />
        </div>
        <h1 className="mb-2 text-xl font-semibold text-white">Patient Not Found</h1>
        <p className="text-white/60 max-w-md">We couldn't locate the clinical records for the requested patient ID. They may have been removed or you might lack access.</p>
        <Link href="/dashboard/doctor/patients" className="mt-6 flex items-center justify-center rounded-xl bg-white/[0.08] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/[0.12]">
          Return to Patient Database
        </Link>
      </div>
    );
  }

  // Fetch prescriptions
  const { data: prescriptions } = await (supabase as any)
    .from('prescriptions')
    .select('*, prescription_items(*)')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  const patientName = patientProfile?.full_name || 'Unknown Patient';
  const patientEmail = patientProfile?.email || 'No email provided';

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
      <div className="mb-8 border-b border-white/10 pb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/[0.03] border border-white/[0.08] shadow-[0_0_32px_-8px_rgba(56,189,248,0.2)]">
              <User className="h-8 w-8 text-[#38bdf8]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{patientName}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-white/50">
                <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {patientEmail}</span>
                <span className="hidden sm:inline">•</span>
                <span className="font-mono text-xs bg-white/5 px-2 py-0.5 rounded-md">ID: {patientId.split('-')[0].toUpperCase()}</span>
              </div>
            </div>
          </div>
          
          <button 
            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-400 hover:shadow-indigo-500/40"
            aria-label="Issue New e-Prescription (eRx)"
          >
            <Plus className="h-4 w-4" />
            Issue New e-Prescription (eRx)
          </button>
        </div>
      </div>
      
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white/90">Clinical History</h2>
      </div>

      <div className="space-y-6">
        {!prescriptions || prescriptions.length === 0 ? (
          <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-12 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.03] mb-4">
              <Activity className="h-8 w-8 text-white/20" />
            </div>
            <h3 className="text-lg font-medium text-white">No Clinical History</h3>
            <p className="mt-2 text-sm text-white/50 max-w-md mx-auto">There are no prescriptions or clinical notes recorded for this patient.</p>
          </div>
        ) : (
          prescriptions.map((rx: any) => (
            <div key={rx.id} className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] shadow-sm transition-colors hover:bg-white/[0.03]">
              <div className="border-b border-white/5 bg-gradient-to-br from-white/[0.01] to-transparent p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <FileText className="h-4 w-4 text-[#38bdf8]" />
                      <h3 className="text-lg font-semibold text-white/90">{rx.diagnosis || 'General Consultation'}</h3>
                    </div>
                    <p className="text-sm text-white/60 leading-relaxed max-w-3xl">
                      {rx.clinical_notes || 'No clinical notes provided.'}
                    </p>
                  </div>
                  <div className="shrink-0 text-left sm:text-right">
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-white/70 shadow-sm">
                      <Calendar className="h-3 w-3" />
                      {new Date(rx.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                </div>
              </div>
              
              {rx.prescription_items && rx.prescription_items.length > 0 && (
                <div className="p-5 sm:p-6 bg-black/40">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-white/40 mb-4 flex items-center gap-2">
                    <Pill className="h-3.5 w-3.5" /> Prescribed Medications
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {rx.prescription_items.map((item: any) => (
                      <div key={item.id} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 shadow-sm">
                        <div className="font-medium text-white/90 text-sm">{item.medication_name}</div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/60">
                          {item.dosage && <span className="bg-white/5 px-2 py-1 rounded-md">{item.dosage}</span>}
                          {item.frequency && <span className="bg-white/5 px-2 py-1 rounded-md">{item.frequency}</span>}
                          {item.duration_days && <span className="bg-white/5 px-2 py-1 rounded-md">{item.duration_days} days</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}