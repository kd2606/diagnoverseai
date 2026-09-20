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
  let patientId = "39bbb160-558e-4ab7-9b68-09ad472af4c6";

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

  const MOCK_SCANS: ScanRecord[] = [
    {
      id: 'scn_01', modality: 'xray', title: 'Chest radiograph · PA view',
      fileName: 'chest_pa_2026.heic', bytesIn: 8_594_432, bytesOut: 421_888,
      status: 'uploading', progress: 0.64, chunk: { index: 11, total: 17 },
      capturedAt: new Date(Date.now() - 0.15 * 3600000).toISOString(),
    },
    {
      id: 'scn_02', modality: 'derm', title: 'Dermoscopy · left forearm lesion',
      fileName: 'derm_forearm_L.jpg', bytesIn: 6_291_456, bytesOut: 312_320,
      status: 'adjudication', confidence: 0.912,
      finding: 'Asymmetric pigment network with irregular borders. Flagged for specialist review.',
      clinician: { name: 'Dr. M. Kovač', specialty: 'Dermatology · Queued 12m', initials: 'MK' },
      capturedAt: new Date(Date.now() - 3.4 * 3600000).toISOString(),
    },
    {
      id: 'scn_03', modality: 'retina', title: 'Fundus photograph · right eye',
      fileName: 'fundus_OD.png', bytesIn: 4_194_304, bytesOut: 268_288,
      status: 'verified', confidence: 0.974,
      finding: 'No referable diabetic retinopathy. Repeat screening in 12 months.',
      clinician: { name: 'Dr. Kovač', specialty: 'Ophthalmology · Signed', initials: 'MK' },
      capturedAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    }
  ];

  const dbScans: ScanRecord[] = (casesData || []).map((c: any) => {
    let modality: import('@/lib/patient/types').ScanModality = 'text';
    let isVision = false;
    
    if (c.chief_complaint?.startsWith('Visual scan:')) {
      isVision = true;
      if (c.chief_complaint.includes('face')) modality = 'face';
      else if (c.chief_complaint.includes('eye')) modality = 'retina';
      else modality = 'derm'; // skin
    }

    return {
      id: c.id,
      modality,
      title: isVision ? c.chief_complaint : 'Symptom Triage',
      status: c.status === 'pending' ? 'adjudication' : c.status,
      confidence: c.confidence_score ? c.confidence_score : undefined,
      finding: c.ai_diagnosis || 'Pending AI assessment',
      clinician: c.clinician ? { name: c.clinician.full_name, specialty: 'Clinician', initials: c.clinician.full_name.substring(0, 2).toUpperCase() } : undefined,
      capturedAt: c.created_at,
    };
  });

  const SCANS: ScanRecord[] = [...dbScans, ...MOCK_SCANS];

  const openCasesCount = SCANS.filter(s => s.status !== 'verified').length;

  const SIGNALS_TL = [
    { id: 'triage', label: t('triageTier', { default: 'Triage tier' }),  value: t('routine', { default: 'Routine' }), delta: t('stable14d', { default: 'Stable 14d' }), trend: 'flat', tone: 'emerald' },
    { 
      id: 'open',   
      label: t('openCases', { default: 'Open cases' }),   
      value: openCasesCount.toString(), 
      delta: t('awaitingMD', { default: 'Awaiting MD' }), 
      trend: 'flat', 
      tone: openCasesCount > 0 ? 'amber' : 'emerald' 
    },
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
      <ManualSymptomInput patientId={patientId} />
      <EdgeUploadZone patientId={patientId} />
      <AnalysisResultsGrid scans={SCANS} />
    </div>
  );
}
