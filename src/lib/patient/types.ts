// src/lib/patient/types.ts

export type ScanModality = 'xray' | 'derm' | 'ct' | 'mri' | 'retina' | 'ecg' | 'voice' | 'text' | 'face';

export type UploadStatus =
  | 'compressing'   // running through the edge codec
  | 'queued'        // durably parked in IndexedDB, awaiting network
  | 'uploading'     // chunked, resumable TUS transfer in flight
  | 'analyzing'     // Nova inference
  | 'adjudication'  // awaiting human clinician sign-off
  | 'verified'      // clinician-adjudicated
  | 'failed';

export type ScanRecord = {
  id: string;
  modality: ScanModality;
  title: string;
  fileName?: string;
  /** Original capture size in bytes (pre-compression). */
  bytesIn?: number;
  /** Post-edge-compression payload size in bytes. */
  bytesOut?: number;
  status: UploadStatus;
  /** 0..1 — transfer or inference progress. */
  progress?: number;
  /** 0..1 — Nova model confidence. */
  confidence?: number;
  finding?: string;
  clinician?: { name: string; specialty: string; initials: string };
  capturedAt: string; // ISO
  chunk?: { index: number; total: number };
};

export type HealthSignal = {
  id: string;
  label: string;
  value: string;
  unit?: string;
  delta?: string;
  trend: 'up' | 'down' | 'flat';
  tone: 'indigo' | 'emerald' | 'amber' | 'neutral';
};
