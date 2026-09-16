'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  Keyboard,
  Loader2,
  RotateCcw,
  SendHorizontal,
  Stethoscope,
} from 'lucide-react';
import { generateClinicalTriage } from '@/actions/nova-inference';
import type { ClinicalTriageReport, TriageResult } from '@/actions/nova-inference';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Confidence → color mapping (matches analysis-results-grid palette)  */
/* ------------------------------------------------------------------ */

function confidenceAccent(c: number) {
  if (c >= 0.75) return 'emerald';
  if (c >= 0.45) return 'amber';
  return 'rose';
}

const ACCENT_STYLES = {
  emerald: { border: 'border-emerald-400/20', bg: 'bg-emerald-500/[0.08]', text: 'text-emerald-200', bar: 'bg-emerald-400' },
  amber:   { border: 'border-amber-400/20',   bg: 'bg-amber-500/[0.08]',   text: 'text-amber-200',   bar: 'bg-amber-400' },
  rose:    { border: 'border-rose-400/20',     bg: 'bg-rose-500/[0.08]',     text: 'text-rose-200',     bar: 'bg-rose-400' },
  indigo:  { border: 'border-indigo-400/20',   bg: 'bg-indigo-500/[0.08]',   text: 'text-indigo-200',   bar: 'bg-indigo-400' },
} as const;

/* ------------------------------------------------------------------ */
/* Result display (inline, compact)                                    */
/* ------------------------------------------------------------------ */

function TriageResultCard({ data }: { data: ClinicalTriageReport }) {
  const accent = confidenceAccent(data.confidence);
  const s = ACCENT_STYLES[accent];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-5"
    >
      {/* Primary assessment */}
      <div className={cn('rounded-2xl border p-5', s.border, s.bg)}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className={cn('inline-block rounded-lg px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.2em]', s.border, s.bg, s.text)}>
              {data.recommendedSpecialty}
            </span>
            <h3 className="mt-3 text-lg font-semibold text-white/95">{data.aiAssessment}</h3>
          </div>
          <span className={cn('shrink-0 font-mono text-[11px]', s.text)}>
            {Math.round(data.confidence * 100)}%
          </span>
        </div>
        <p className="mt-3 text-[13.5px] leading-relaxed text-white/60">{data.triageNote}</p>
        <div className="mt-3 flex items-center gap-2 font-mono text-[10px] text-white/30">
          <Stethoscope className="h-3 w-3" strokeWidth={1.75} />
          ICD-10: {data.icd10}
        </div>
      </div>

      {/* Differentials */}
      <div className="space-y-2">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-white/30">
          Differentials
        </span>
        {data.differentials.map((d) => {
          const da = confidenceAccent(d.probability);
          const ds = ACCENT_STYLES[da];
          return (
            <div key={d.label} className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <span className="text-[13px] text-white/70">{d.label}</span>
                <span className="ml-2 font-mono text-[10px] text-white/30">{d.icd10}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.round(d.probability * 100)}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={cn('h-full rounded-full', ds.bar)}
                  />
                </div>
                <span className={cn('font-mono text-[10px]', ds.text)}>
                  {Math.round(d.probability * 100)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reasoning */}
      <div className="space-y-2">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-white/30">
          Model reasoning
        </span>
        <ul className="space-y-1.5">
          {data.reasoning.map((r, i) => (
            <li key={i} className="flex items-start gap-2 text-[13px] leading-relaxed text-white/55">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded bg-indigo-500/10 font-mono text-[9px] text-indigo-300">{i + 1}</span>
              {r}
            </li>
          ))}
        </ul>
      </div>

      {/* Disclaimer */}
      <div className="flex items-center gap-2 rounded-2xl border border-white/[0.05] bg-white/[0.02] p-3.5">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" strokeWidth={1.75} />
        <p className="text-[12px] text-white/45">
          This is AI-generated decision support — not a diagnosis. A licensed clinician must review before any action is taken.
        </p>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export function ManualSymptomInput() {
  const t = useTranslations('Common');
  const [text, setText] = useState('');
  const [result, setResult] = useState<TriageResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const canSubmit = text.trim().length >= 12 && !isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    startTransition(async () => {
      const res = await generateClinicalTriage(text.trim());
      setResult(res);
    });
  };

  const handleReset = () => {
    setText('');
    setResult(null);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 24, filter: 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.85, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-[28px] border border-white/[0.06] bg-white/[0.02] backdrop-blur-3xl shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset,0_40px_100px_-60px_rgba(79,70,229,0.3)]"
    >
      {/* Subtle gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(600px 200px at 80% 0%, rgba(99,102,241,0.10), transparent 70%)',
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-20 -top-px h-px bg-gradient-to-r from-transparent via-indigo-300/20 to-transparent"
      />

      <div className="relative p-6 sm:p-9">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-2.5 mb-5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/20 bg-indigo-500/[0.08] px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.2em] text-indigo-200/85">
            <Keyboard className="h-3 w-3" strokeWidth={2} /> Manual Intake
          </span>
        </div>

        <h2 className="text-[20px] font-semibold leading-snug tracking-[-0.02em] text-white/90 sm:text-[22px]">
          Type your symptoms
        </h2>
        <p className="mt-1.5 max-w-xl text-[14px] leading-relaxed text-white/40">
          Describe what you&apos;re feeling in your own words. Nova will analyse it using the same clinical AI.
        </p>

        {/* Textarea */}
        <div className="mt-5">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Or type your symptoms manually here..."
            disabled={isPending}
            rows={4}
            className={cn(
              'w-full resize-none rounded-2xl border bg-white/[0.03] px-5 py-4 text-[15px] leading-relaxed text-white/90 placeholder:text-white/25',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400/30',
              'transition-all duration-200',
              isPending
                ? 'border-white/5 cursor-not-allowed opacity-60'
                : 'border-white/10 hover:border-white/15',
            )}
          />

          {/* Character hint */}
          <div className="mt-2 flex items-center justify-between">
            <p className="font-mono text-[10px] text-white/20">
              {text.trim().length < 12 && text.trim().length > 0
                ? `${12 - text.trim().length} more characters needed`
                : '\u00A0'}
            </p>
            <p className="font-mono text-[10px] text-white/20">
              {text.trim().length > 0 ? `${text.trim().length} chars` : ''}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all duration-200',
              canSubmit
                ? 'bg-indigo-500 text-white hover:bg-indigo-400 shadow-[0_0_30px_-8px_rgba(99,102,241,0.7)]'
                : 'bg-white/[0.04] text-white/30 cursor-not-allowed',
            )}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Analysing…
              </>
            ) : (
              <>
                <SendHorizontal className="h-4 w-4" strokeWidth={1.75} /> Submit Symptoms
              </>
            )}
          </button>

          {(result || text) && !isPending && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/30 transition-colors hover:text-white/60"
            >
              <RotateCcw className="h-3 w-3" strokeWidth={2} /> Clear
            </button>
          )}
        </div>

        {/* Result */}
        <AnimatePresence mode="wait">
          {result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-8 overflow-hidden"
            >
              {result.ok ? (
                <TriageResultCard data={result.data} />
              ) : (
                <div className="flex items-start gap-3 rounded-2xl border border-rose-400/20 bg-rose-500/[0.06] p-5">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" strokeWidth={1.75} />
                  <div>
                    <p className="text-[14px] font-medium text-rose-200">{result.error}</p>
                    <p className="mt-1 text-[13px] text-white/50">{result.message}</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}
