import { Suspense } from 'react';
import { getPatientPanel } from '@/actions/clinical-data';
import { PatientPanel } from './_components/patient-panel';
import { DataError } from '@/components/data-error';
import { toPatientCardModel } from '@/lib/adapters/clinical';

export default async function PatientsPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center animate-pulse">Loading patient panel...</div>}>
      <PatientPanelLoader />
    </Suspense>
  );
}

async function PatientPanelLoader() {
  const result = await getPatientPanel();
  if (!result.ok) return <DataError message={result.error} code={result.code} />;
  
  const patients = result.data.map(toPatientCardModel);
  return <PatientPanel patients={patients} />;
}
