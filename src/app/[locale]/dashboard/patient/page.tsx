import { createClient } from "@/lib/supabase/server";
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { GreetingHeader } from './_components/greeting-header';
import { NovaVoiceTriage } from './_components/nova-voice-triage';
import { ManualSymptomInput } from './_components/manual-symptom-input';
import { EdgeUploadZone } from './_components/edge-upload-zone';
import { AnalysisResultsGrid } from './_components/analysis-results-grid';
import { PatientQRCard } from '@/components/patient/PatientQRCard';
import type { HealthSignal, ScanRecord } from '@/lib/patient/types';

export const metadata: Metadata = {
  title: 'My Health Hub · DiagnoVerse AI',
  description: 'Voice-first triage, edge-compressed imaging, clinician-adjudicated results.',
};

const HOURS = 60 * 60 * 1000;

// Swap for your server query / RSC data layer.
const SIGNALS: HealthSignal[] = [
  { id: 'triage', label: 'Triage tier',  value: 'Routine', delta: 'Stable 14d', trend: 'flat', tone: 'emerald' },
  { id: 'open',   label: 'Open cases',   value: '2',       delta: '1 awaiting MD', trend: 'up', tone: 'amber' },
  { id: 'saved',  label: 'Data saved',   value: '96.4', unit: '%', delta: '18.2 MB → 0.7 MB', trend: 'down', tone: 'indigo' },
  { id: 'sync',   label: 'Last sync',    value: '2', unit: 'min', delta: 'Edge node FRA-1', trend: 'flat', tone: 'emerald' },
];



export default async function PatientDashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Dashboard' });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let firstName = "John";
  let fullName = "John Doe";
  let patientId = "pat_8f3c19";

  if (user) {
    const { data } = await supabase.from('profiles').select('id, full_name').eq('id', user.id).single() as any;
    if (data) {
      if (data.full_name) {
        fullName = data.full_name;
        firstName = fullName.split(' ')[0];
      }
      patientId = data.id;
    }
  }

  // Fetch actual cases instead of mock SCANS
  const { data: casesData } = await supabase
    .from('triage_cases')
    .select('*, clinician:profiles!clinician_id(full_name)')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  const SCANS: ScanRecord[] = (casesData || []).map((c: any) => ({
    id: c.id,
    modality: 'derm', // default to derm since it's vision mostly
    title: c.chief_complaint || 'Visual Assessment',
    fileName: `scan_${c.id.substring(0, 5)}.jpg`,
    bytesIn: 2_000_000,
    bytesOut: 500_000,
    status: c.status === 'pending' ? 'adjudication' : c.status,
    confidence: c.confidence_score ? c.confidence_score : 0.85,
    finding: c.ai_assessment || 'Pending AI assessment',
    clinician: c.clinician ? { name: c.clinician.full_name, specialty: 'Clinician', initials: c.clinician.full_name.substring(0, 2).toUpperCase() } : undefined,
    capturedAt: c.created_at,
  }));

  // Update SIGNALS translations
  const SIGNALS_TL = [
    { id: 'triage', label: t('triageTier', { default: 'Triage tier' }),  value: t('routine', { default: 'Routine' }), delta: t('stable14d', { default: 'Stable 14d' }), trend: 'flat', tone: 'emerald' },
    { id: 'open',   label: t('openCases', { default: 'Open cases' }),   value: SCANS.filter(s => s.status !== 'verified').length.toString(), delta: t('awaitingMD', { default: 'Awaiting MD' }), trend: 'up', tone: 'amber' },
    { id: 'saved',  label: t('dataSaved', { default: 'Data saved' }),   value: '96.4', unit: '%', delta: '18.2 MB -> 0.7 MB', trend: 'down', tone: 'indigo' },
    { id: 'sync',   label: t('lastSync', { default: 'Last sync' }),    value: '2', unit: t('min', { default: 'min' }), delta: t('edgeNode', { default: 'Edge node FRA-1' }), trend: 'flat', tone: 'emerald' },
  ] as const;

  return (
    <div className="flex flex-col gap-12 sm:gap-14">
      <GreetingHeader firstName={firstName} signals={SIGNALS_TL as any} />
      
      {/* Patient Health Passport (QR) */}
      <PatientQRCard 
        patientId={patientId} 
        patientName={fullName} 
        mrn="MRN-884120" 
      />

      <NovaVoiceTriage patientId={patientId} />
      <ManualSymptomInput />
      <EdgeUploadZone patientId={patientId} />
      <AnalysisResultsGrid scans={SCANS} />
    </div>
  );
}
