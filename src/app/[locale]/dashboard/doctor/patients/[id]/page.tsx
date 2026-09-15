import { getTranslations } from "next-intl/server";
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ShieldAlert } from 'lucide-react';

export default async function PatientHealthPassportPage({ params }: { params: { id: string } }) {
  const t = await getTranslations("Doctor");
  const supabase = await createClient();
  
  // Strict RMP Authentication
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-[#050505] p-6 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 border border-rose-500/20">
          <ShieldAlert className="h-8 w-8 text-rose-500" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-white">{t("unauthorizedAccess")}</h1>
        <p className="text-white/60">{t("rmpLoginRequired")}</p>
      </div>
    );
  }

  // Get profile to verify role
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() as any;

  if (!profile || profile.role !== 'clinician') {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-[#050505] p-6 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 border border-rose-500/20">
          <ShieldAlert className="h-8 w-8 text-rose-500" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-white">{t("unauthorizedAccess")}</h1>
        <p className="text-white/60">{t("rmpLoginRequired")}</p>
      </div>
    );
  }

  // Mock patient data for demonstration purposes
  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-8 flex items-center justify-between border-b border-white/10 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{t("patientHealthPassport")}</h1>
          <p className="text-sm text-white/50">{t("verifiedRmpAccess")}</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
          </span>
          <span className="text-xs font-medium text-emerald-400">{t("secureSession")}</span>
        </div>
      </div>
      
      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
        <h2 className="mb-4 text-lg font-semibold text-white/90">Patient ID: {params.id}</h2>
        <p className="text-white/60">
          This is a securely authenticated view. Full medical history, latest symptom assessments, and triage records would be displayed here for the authorized clinician.
        </p>
      </div>
    </div>
  );
}