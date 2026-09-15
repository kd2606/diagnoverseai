import { getTranslations } from "next-intl/server";
import { Suspense } from 'react';
import { getPatientPanel } from '@/actions/clinical-data';
import { PatientPanel } from './_components/patient-panel';

export default async function PatientsPage() {
  const t = await getTranslations("Doctor");



  return (
    <Suspense fallback={<div className="p-10 text-center animate-pulse">{t("loadingPatientPanel")}</div>}>
      <PatientPanelLoader />
    </Suspense>
  );
}

async function PatientPanelLoader() {
  const t = await getTranslations("Doctor");
  const result = await getPatientPanel();
  
  if (!result.ok) {
    console.error("Failed to load patient panel:", result.error, result.code);
    return (
      <div className="flex flex-col items-center justify-center p-12 mt-8 border border-white/10 rounded-2xl bg-white/[0.02]">
        <h3 className="text-lg font-medium text-white mb-2">{t("noPatientsFound")}</h3>
        <p className="text-white/50 text-sm">{result.error || "Unable to load patient panel. Please retry or contact your administrator."}</p>
      </div>
    );
  }
  
  const patients = result.data || [];
  
  if (patients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 mt-8 border border-white/10 rounded-2xl bg-white/[0.02]">
        <h3 className="text-lg font-medium text-white mb-2">{t("noPatientsFound")}</h3>
        <p className="text-white/50 text-sm">{t("noPatientsAssigned")}</p>
      </div>
    );
  }

  return <PatientPanel patients={patients} />;
}
