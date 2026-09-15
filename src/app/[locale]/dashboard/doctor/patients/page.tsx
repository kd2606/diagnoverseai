import { Suspense } from 'react';
import { getPatientPanel } from '@/actions/clinical-data';
import { PatientPanel } from './_components/patient-panel';

export default async function PatientsPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center animate-pulse">Loading patient panel...</div>}>
      <PatientPanelLoader />
    </Suspense>
  );
}

async function PatientPanelLoader() {
  const result = await getPatientPanel();
  
  if (!result.ok) {
    console.error("Failed to load patient panel:", result.error, result.code);
    return (
      <div className="flex flex-col items-center justify-center p-12 mt-8 border border-white/10 rounded-2xl bg-white/[0.02]">
        <h3 className="text-lg font-medium text-white mb-2">No patients found</h3>
        <p className="text-white/50 text-sm">{result.error || "Unable to load patient panel. Please retry or contact your administrator."}</p>
      </div>
    );
  }
  
  const patients = result.data || [];
  
  if (patients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 mt-8 border border-white/10 rounded-2xl bg-white/[0.02]">
        <h3 className="text-lg font-medium text-white mb-2">No patients found</h3>
        <p className="text-white/50 text-sm">There are currently no patients assigned to your panel.</p>
      </div>
    );
  }

  return <PatientPanel patients={patients} />;
}
