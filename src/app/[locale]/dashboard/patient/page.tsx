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

const SCANS: ScanRecord[] = [
  {
    id: 'scn_01', modality: 'xray', title: 'Chest radiograph · PA view',
    fileName: 'chest_pa_2026.heic', bytesIn: 8_594_432, bytesOut: 421_888,
    status: 'uploading', progress: 0.64, chunk: { index: 11, total: 17 },
    capturedAt: new Date(Date.now() - 0.15 * HOURS).toISOString(),
  },
  {
    id: 'scn_02', modality: 'derm', title: 'Dermoscopy · left forearm lesion',
    fileName: 'derm_forearm_L.jpg', bytesIn: 6_291_456, bytesOut: 312_320,
    status: 'adjudication', confidence: 0.912,
    finding: 'Asymmetric pigment network with irregular borders. Flagged for specialist review — not a symptom assessment.',
    clinician: { name: 'Dr. M. Kovač', specialty: 'Dermatology · Queued 12m', initials: 'MK' },
    capturedAt: new Date(Date.now() - 3.4 * HOURS).toISOString(),
  },
  {
    id: 'scn_03', modality: 'retina', title: 'Fundus photograph · right eye',
    fileName: 'fundus_OD.png', bytesIn: 4_194_304, bytesOut: 268_288,
    status: 'verified', confidence: 0.974,
    finding: 'No referable diabetic retinopathy. Repeat screening in 12 months.',
    clinician: { name: 'Dr. Kovač', specialty: 'Ophthalmology · Signed', initials: 'MK' },
    capturedAt: new Date(Date.now() - 26 * HOURS).toISOString(),
  },
  {
    id: 'scn_04', modality: 'ecg', title: 'Single-lead ECG · 30s strip',
    fileName: 'ecg_strip_0312.pdf', bytesIn: 1_048_576, bytesOut: 1_048_576,
    status: 'queued',
    capturedAt: new Date(Date.now() - 0.6 * HOURS).toISOString(),
  },
  {
    id: 'scn_05', modality: 'ct', title: 'CT thorax · axial series',
    fileName: 'ct_thorax_ax.dcm', bytesIn: 42_991_616, bytesOut: 3_984_588,
    status: 'analyzing', confidence: 0.418,
    finding: 'Nova is reconstructing 214 slices. Provisional output only.',
    capturedAt: new Date(Date.now() - 0.05 * HOURS).toISOString(),
  },
  {
    id: 'scn_06', modality: 'mri', title: 'MRI knee · sagittal T2',
    fileName: 'mri_knee_sag.dcm', bytesIn: 27_262_976, bytesOut: 2_411_724,
    status: 'verified', confidence: 0.938,
    finding: 'Grade II medial meniscus signal change. Conservative management advised.',
    clinician: { name: 'Dr. Kovač', specialty: 'Musculoskeletal · Signed', initials: 'MK' },
    capturedAt: new Date(Date.now() - 74 * HOURS).toISOString(),
  },
];

export default async function PatientDashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Dashboard' });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let firstName = "John";
  let fullName = "John Doe";
  if (user) {
    const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).single() as any;
    if (data && data.full_name) {
      fullName = data.full_name;
      firstName = fullName.split(' ')[0];
    }
  }

  // Update SIGNALS translations
  const SIGNALS_TL = [
    { id: 'triage', label: t('triageTier', { default: 'Triage tier' }),  value: t('routine', { default: 'Routine' }), delta: t('stable14d', { default: 'Stable 14d' }), trend: 'flat', tone: 'emerald' },
    { id: 'open',   label: t('openCases', { default: 'Open cases' }),   value: '2',       delta: t('awaitingMD', { default: '1 awaiting MD' }), trend: 'up', tone: 'amber' },
    { id: 'saved',  label: t('dataSaved', { default: 'Data saved' }),   value: '96.4', unit: '%', delta: '18.2 MB -> 0.7 MB', trend: 'down', tone: 'indigo' },
    { id: 'sync',   label: t('lastSync', { default: 'Last sync' }),    value: '2', unit: t('min', { default: 'min' }), delta: t('edgeNode', { default: 'Edge node FRA-1' }), trend: 'flat', tone: 'emerald' },
  ] as const;

  return (
    <div className="flex flex-col gap-12 sm:gap-14">
      <GreetingHeader firstName={firstName} signals={SIGNALS_TL as any} />
      
      {/* Patient Health Passport (QR) */}
      <PatientQRCard 
        patientId="pat_8f3c19" 
        patientName={fullName} 
        mrn="MRN-884120" 
      />

      <NovaVoiceTriage />
      <ManualSymptomInput />
      <EdgeUploadZone patientId="pat_8f3c19" />
      <AnalysisResultsGrid scans={SCANS} />
    </div>
  );
}
