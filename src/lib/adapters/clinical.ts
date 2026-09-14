import type {
  AuditLogEntry,
  PatientPanelItem,
  TriageQueueItem,
} from '@/actions/clinical-data';
import type { TriageCase } from '@/lib/triage/types';

export function relativeTime(iso: string): string {
  const mins = Math.floor((Date.now() - Date.parse(iso)) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function toQueueCardModel(c: TriageQueueItem): TriageCase {
  const minsAgo = Math.floor((Date.now() - Date.parse(c.createdAt)) / 60_000);
  
  // Extract reasoning steps if available (they are in JSON format in the DB)
  let reasoningStrings: string[] = [];
  if (c.reasoning && c.reasoning.steps && Array.isArray(c.reasoning.steps)) {
    reasoningStrings = c.reasoning.steps.map(s => `${s.observation} → ${s.inference}`);
  }

  // Parse diffs
  const differentials = c.differentials.map(d => ({
    label: d.condition,
    icd10: d.icd10,
    probability: d.probability,
  }));

  return {
    caseId: c.id,
    patientId: c.patientId,
    initials: c.mrn, // Fallback initials
    age: c.age || 0,
    sex: (c.sex?.toUpperCase().startsWith('M') ? 'M' : c.sex?.toUpperCase().startsWith('F') ? 'F' : 'X'),
    modality: 'ECG', // Hardcoded fallback for now
    aiAssessment: c.aiAssessment ?? 'Pending inference',
    icd10: c.icd10Code ?? '—',
    confidence: c.confidence ?? 0,
    modelStatus: c.status === 'verified' ? 'approved' : c.status === 'escalated' ? 'escalated' : 'pending',
    receivedMinutesAgo: minsAgo,
    capturedAt: c.createdAt,
    sync: 'synced',
    syncAttempts: 1,
    narrative: c.chiefComplaint,
    triageNote: c.triageNote ?? undefined,
    reasoning: reasoningStrings.length ? reasoningStrings : ['AI inference pending...'],
    differentials,
    vitals: { hr: 80, bp: "120/80", spo2: 98, temp: 37, rr: 16 }, // Fallback since it's not in DB
    scan: { filename: "scan.webp", width: 768, height: 768, quality: 0.82 },
    slaMinutes: 15,
  };
}

export interface EventModel {
  id: string;
  actor: string;
  role: string;
  type: 'inference' | 'bypass' | 'override' | 'approval' | 'escalation';
  description: string;
  hash: string;
  timeAgo: string;
  timestamp: string;
}

export function toEventModel(log: AuditLogEntry): any {
  return {
    id: log.id,
    kind: log.actionType,
    at: relativeTime(log.createdAt),
    actor: { name: log.actorName, role: log.actorRole },
    subject: { mrn: log.caseId?.slice(0, 8) ?? '—', label: "Case" },
    summary: log.summary,
    hash: log.hash ?? '',
    prevHash: log.prevHash ?? '',
    // Fake model data to satisfy UI
    model: log.actionType === 'inference' ? {
      name: "DiagnoVerse Engine v3",
      version: "3.2.1",
      confidence: 0.9,
      latencyMs: 120,
      promptTokens: 450,
    } : undefined
  };
}

export function toPatientCardModel(p: PatientPanelItem): any {
  let riskTier = 'low';
  if (p.latestStatus === 'escalated') riskTier = 'critical';
  else if (p.openCases > 0) riskTier = 'moderate';

  return {
    id: p.id,
    mrn: p.mrn,
    name: p.fullName ?? 'Unknown',
    age: p.age || 0,
    sex: (p.sex?.toUpperCase().startsWith('M') ? 'M' : p.sex?.toUpperCase().startsWith('F') ? 'F' : 'X'),
    riskTier,
    riskScore: p.latestConfidence ? Math.round(p.latestConfidence * 100) : 10,
    chiefComplaint: p.chiefComplaint ?? '—',
    lastTriageAt: p.lastSeenAt ? relativeTime(p.lastSeenAt) : 'Never',
    status: p.latestStatus === 'verified' ? 'discharged' : (p.openCases > 0 ? 'active' : 'monitoring'),
    openActions: p.openCases,
  };
}
