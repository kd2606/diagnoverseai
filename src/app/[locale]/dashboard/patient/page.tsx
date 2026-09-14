import type { Metadata } from 'next';
import { GreetingHeader } from './_components/greeting-header';
import { NovaVoiceTriage } from './_components/nova-voice-triage';
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
    finding: 'Asymmetric pigment network with irregular borders. Flagged for specialist review — not a diagnosis.',
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

export default function PatientDashboardPage() {
  return (
    <div className="flex flex-col gap-12 sm:gap-14">
      <GreetingHeader firstName="John" signals={SIGNALS} />
      
      {/* Patient Health Passport (QR) */}
      <PatientQRCard 
        patientId="pat_8f3c19" 
        patientName="John Doe" 
        mrn="MRN-884120" 
      />

      <NovaVoiceTriage />
      <EdgeUploadZone patientId="pat_8f3c19" />
      <AnalysisResultsGrid scans={SCANS} />
    </div>
  );
}
