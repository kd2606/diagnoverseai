// src/lib/patient/status.ts
import {
  Activity, Brain, CloudUpload, Cpu, Eye, HeartPulse, Hourglass,
  Layers, ScanLine, ShieldCheck, Sparkles, TriangleAlert, WifiOff,
  type LucideIcon,
} from 'lucide-react';
import type { ScanModality, UploadStatus } from './types';

export type Tone = 'indigo' | 'emerald' | 'amber' | 'neutral' | 'rose';

export const TONE: Record<Tone, {
  rgb: string; text: string; dot: string; chip: string; ring: string; glow: string; bar: string;
}> = {
  indigo: {
    rgb: '99,102,241',
    text: 'text-indigo-300',
    dot: 'bg-indigo-400',
    chip: 'bg-indigo-500/[0.08] border-indigo-400/20',
    ring: 'ring-indigo-400/25',
    glow: 'shadow-[0_0_30px_-8px_rgba(99,102,241,0.65)]',
    bar: 'from-indigo-500 via-indigo-400 to-sky-300',
  },
  emerald: {
    rgb: '16,185,129',
    text: 'text-emerald-300',
    dot: 'bg-emerald-400',
    chip: 'bg-emerald-500/[0.08] border-emerald-400/20',
    ring: 'ring-emerald-400/25',
    glow: 'shadow-[0_0_30px_-8px_rgba(16,185,129,0.6)]',
    bar: 'from-emerald-500 via-emerald-400 to-teal-300',
  },
  amber: {
    rgb: '245,158,11',
    text: 'text-amber-300',
    dot: 'bg-amber-400',
    chip: 'bg-amber-500/[0.08] border-amber-400/20',
    ring: 'ring-amber-400/25',
    glow: 'shadow-[0_0_30px_-8px_rgba(245,158,11,0.55)]',
    bar: 'from-amber-500 via-amber-400 to-yellow-300',
  },
  rose: {
    rgb: '244,63,94',
    text: 'text-rose-300',
    dot: 'bg-rose-400',
    chip: 'bg-rose-500/[0.08] border-rose-400/20',
    ring: 'ring-rose-400/25',
    glow: 'shadow-[0_0_30px_-8px_rgba(244,63,94,0.5)]',
    bar: 'from-rose-500 via-rose-400 to-orange-300',
  },
  neutral: {
    rgb: '148,163,184',
    text: 'text-white/55',
    dot: 'bg-white/40',
    chip: 'bg-white/[0.03] border-white/[0.07]',
    ring: 'ring-white/10',
    glow: '',
    bar: 'from-white/30 via-white/50 to-white/30',
  },
};

export const STATUS_META: Record<UploadStatus, {
  label: string; short: string; tone: Tone; Icon: LucideIcon; spin?: boolean;
}> = {
  compressing:  { label: 'Edge compression active',           short: 'COMPRESSING', tone: 'indigo',  Icon: Cpu,           spin: true },
  queued:       { label: 'Queued offline · IndexedDB',         short: 'QUEUED',      tone: 'amber',   Icon: WifiOff },
  uploading:    { label: 'Uploading · Chunked TUS',            short: 'UPLOADING',   tone: 'indigo',  Icon: CloudUpload },
  analyzing:    { label: 'Nova inference running',             short: 'ANALYZING',   tone: 'indigo',  Icon: Sparkles,      spin: true },
  adjudication: { label: 'Pending clinician adjudication',     short: 'ADJUDICATION',tone: 'amber',   Icon: Hourglass },
  verified:     { label: 'Clinician verified',                 short: 'VERIFIED',    tone: 'emerald', Icon: ShieldCheck },
  failed:       { label: 'Sync failed · auto-retry armed',     short: 'RETRYING',    tone: 'rose',    Icon: TriangleAlert },
};

export const MODALITY_META: Record<ScanModality, { label: string; Icon: LucideIcon; mesh: string }> = {
  xray:   { label: 'Radiograph',   Icon: ScanLine,   mesh: 'from-indigo-500/25 via-slate-500/10 to-transparent' },
  derm:   { label: 'Dermoscopy',   Icon: Layers,     mesh: 'from-amber-500/25 via-rose-500/10 to-transparent' },
  ct:     { label: 'CT Volume',    Icon: Brain,      mesh: 'from-sky-500/25 via-indigo-500/10 to-transparent' },
  mri:    { label: 'MRI Sequence', Icon: Activity,   mesh: 'from-violet-500/25 via-fuchsia-500/10 to-transparent' },
  retina: { label: 'Fundus',       Icon: Eye,        mesh: 'from-emerald-500/25 via-teal-500/10 to-transparent' },
  ecg:    { label: 'ECG Trace',    Icon: HeartPulse, mesh: 'from-rose-500/25 via-orange-500/10 to-transparent' },
};
