export type Decision = "pending" | "approved" | "escalated";
export type SyncState = "synced" | "offline-recovered" | "degraded";
export type Modality = "CT" | "MRI" | "X-RAY" | "DERM" | "ECG" | "FUNDUS";

export interface Differential {
  label: string;
  probability: number;
  icd10: string;
}

export interface TriageCase {
  caseId: string;
  patientId: string;
  initials: string;
  age: number;
  sex: "M" | "F" | "X";
  modality: Modality;
  aiAssessment: string;
  icd10: string;
  confidence: number;
  modelStatus: Decision;
  receivedMinutesAgo: number;
  capturedAt: string;
  sync: SyncState;
  syncAttempts: number;
  narrative: string;
  triageNote?: string;
  reasoning: string[];
  differentials: Differential[];
  vitals: { hr: number; bp: string; spo2: number; temp: number; rr: number };
  scan: { filename: string; width: number; height: number; quality: number };
  slaMinutes: number;
}
