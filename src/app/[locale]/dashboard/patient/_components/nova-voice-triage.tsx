'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useRef, useState, useTransition } from 'react';
import { AnimatePresence, motion, useAnimationFrame } from 'framer-motion';
import {
  Accessibility, AlertTriangle, AudioLines, CheckCircle2, Languages,
  Loader2, Mic, MicOff, RotateCcw, Square, Stethoscope, WifiOff,
} from 'lucide-react';
import { useVoiceTriage, WAVE_BARS } from '@/hooks/use-voice-triage';
import { submitVoiceTriage } from '@/actions/nova-voice-triage-action';
import type { VoiceTriageResult } from '@/actions/nova-voice-triage-action';
import type { ClinicalTriageReport } from '@/actions/nova-inference';
import { markForAdjudication } from '@/actions/adjudication';
import { confidenceToSeverity, getVoiceTriageGuidance } from '@/utils/clinicalMatrix';
import { cn } from '@/lib/utils';

const LANGS = [
  { code: 'en-US', label: 'EN' },
  { code: 'hr-HR', label: 'HR' },
  { code: 'es-ES', label: 'ES' },
  { code: 'hi-IN', label: 'HI' },
  { code: 'sw-KE', label: 'SW' },
] as const;

/* ------------------------------------------------------------------ */
/* Confidence → accent color                                           */
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
} as const;

/* ------------------------------------------------------------------ */
/* 60fps waveform                                                      */
/* ------------------------------------------------------------------ */

function AudioWave({
  levelsRef,
  active,
}: {
  levelsRef: React.MutableRefObject<Float32Array>;
  active: boolean;
}) {
  const bars = useRef<(HTMLSpanElement | null)[]>([]);
  const idleRef = useRef(0);

  useAnimationFrame((t) => {
    idleRef.current = t / 1000;
    const levels = levelsRef.current;
    for (let i = 0; i < bars.current.length; i++) {
      const el = bars.current[i];
      if (!el) continue;
      const v = active
        ? levels[i] ?? 0
        : 0.05 + 0.045 * (Math.sin(idleRef.current * 1.5 + i * 0.42) + 1);
      const scale = Math.max(0.05, Math.min(1, v));
      el.style.transform = `scaleY(${scale.toFixed(3)})`;
      el.style.opacity = (0.2 + scale * 0.8).toFixed(3);
    }
  });

  return (
    <div className="flex h-14 items-center gap-[3px]" aria-hidden>
      {Array.from({ length: WAVE_BARS }).map((_, i) => (
        <span
          key={i}
          ref={(n) => { bars.current[i] = n; }}
          style={{ transform: 'scaleY(0.05)' }}
          className={cn(
            'h-full w-[3px] origin-center rounded-full will-change-transform',
            'bg-gradient-to-t from-indigo-500/30 via-indigo-400 to-sky-200',
          )}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Triage result card (mirrors manual-symptom-input pattern)           */
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
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export function NovaVoiceTriage({ patientId }: { patientId: string }) {
  const t = useTranslations('Common');
  const [lang, setLang] = useState<string>('en-US');
  const [triageResult, setTriageResult] = useState<VoiceTriageResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [escalated, setEscalated] = useState(false);
  const [escalating, setEscalating] = useState(false);

  const { state, transcript, interim, error, sttSupported, levelsRef, toggle, reset, isActive, stop } =
    useVoiceTriage({ lang });

  const live = `${transcript}${interim ? ` ${interim}` : ''}`.trim();

  /** Stop recording and submit to the AI pipeline. */
  const handleStop = () => {
    stop();
    const finalTranscript = transcript.trim();
    if (finalTranscript.length < 25) return; // Too short for AI

    startTransition(async () => {
      const result = await submitVoiceTriage(patientId, finalTranscript);
      setTriageResult(result);
    });
  };

  /** Toggle mic — on stop, trigger the pipeline. */
  const handleToggle = () => {
    if (isActive) {
      handleStop();
    } else {
      // Reset previous results on new recording
      setTriageResult(null);
      setEscalated(false);
      void toggle();
    }
  };

  /** Full reset. */
  const handleReset = () => {
    reset();
    setTriageResult(null);
    setEscalated(false);
  };

  /** Escalate to clinician. */
  const handleEscalate = async (caseId: string) => {
    setEscalating(true);
    try {
      await markForAdjudication(caseId);
      setEscalated(true);
    } catch (err) {
      console.error(err);
      alert('Failed to send to Clinician.');
    } finally {
      setEscalating(false);
    }
  };

  // Derive clinical guidance from the AI result
  const guidance = useMemo(() => {
    if (!triageResult?.ok) return null;
    const { data } = triageResult;
    const severity = confidenceToSeverity(data.confidence, data.recommendedSpecialty);
    return getVoiceTriageGuidance(data.recommendedSpecialty, severity);
  }, [triageResult]);

  const showResults = triageResult?.ok && !isPending;

  return (
    <motion.section
      initial={{ opacity: 0, y: 24, filter: 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.85, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-[28px] border border-white/[0.06] bg-white/[0.02] backdrop-blur-3xl shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset,0_60px_140px_-70px_rgba(79,70,229,0.6)]"
    >
      {/* Reactive aurora */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        animate={{ opacity: isActive ? 1 : 0.45 }}
        transition={{ duration: 0.7 }}
        style={{
          background:
            'radial-gradient(680px 300px at 12% 0%, rgba(99,102,241,0.20), transparent 68%), radial-gradient(520px 260px at 92% 110%, rgba(56,189,248,0.13), transparent 70%)',
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-16 -top-px h-px bg-gradient-to-r from-transparent via-indigo-300/40 to-transparent"
      />

      <div className="relative flex flex-col gap-8 p-6 sm:p-9 lg:flex-row lg:items-start lg:gap-12">
        {/* Mic */}
        <div className="flex shrink-0 items-center gap-6">
          <div className="relative grid h-[104px] w-[104px] place-items-center">
            <AnimatePresence>
              {isActive &&
                [0, 1, 2].map((ring) => (
                  <motion.span
                    key={ring}
                    className="absolute inset-0 rounded-full border border-indigo-400/30"
                    initial={{ scale: 0.72, opacity: 0.7 }}
                    animate={{ scale: 1.55, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 2.4, repeat: Infinity, delay: ring * 0.8, ease: 'easeOut' }}
                  />
                ))}
            </AnimatePresence>

            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full bg-[radial-gradient(closest-side,rgba(99,102,241,0.45),transparent)] blur-xl"
              animate={{ opacity: isActive ? [0.7, 1, 0.7] : [0.25, 0.45, 0.25], scale: isActive ? [1, 1.12, 1] : [1, 1.05, 1] }}
              transition={{ duration: isActive ? 1.6 : 4, repeat: Infinity, ease: 'easeInOut' }}
            />

            <motion.button
              type="button"
              onClick={handleToggle}
              disabled={isPending}
              aria-pressed={isActive}
              aria-label={isActive ? 'Stop voice triage' : 'Start voice triage'}
              whileHover={{ scale: 1.045 }}
              whileTap={{ scale: 0.955 }}
              className={cn(
                'relative grid h-[76px] w-[76px] place-items-center rounded-full border transition-colors duration-500',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]',
                isPending
                  ? 'border-amber-300/40 bg-gradient-to-br from-amber-400/60 to-orange-500/50 shadow-[0_0_48px_-8px_rgba(245,158,11,0.7)]'
                  : isActive
                    ? 'border-indigo-300/50 bg-gradient-to-br from-indigo-400/90 to-violet-500/80 shadow-[0_0_48px_-8px_rgba(99,102,241,0.95)]'
                    : state === 'error'
                      ? 'border-rose-300/40 bg-rose-500/20'
                      : 'border-white/12 bg-white/[0.04] hover:border-indigo-300/40 hover:bg-indigo-500/[0.1]',
              )}
            >
              <AnimatePresence mode="wait" initial={false}>
                {isPending ? (
                  <motion.span key="pending" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}>
                    <Loader2 className="h-7 w-7 animate-spin text-white" strokeWidth={1.6} />
                  </motion.span>
                ) : state === 'error' ? (
                  <motion.span key="err" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}>
                    <MicOff className="h-7 w-7 text-rose-300" strokeWidth={1.6} />
                  </motion.span>
                ) : isActive ? (
                  <motion.span key="stop" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}>
                    <Square className="h-6 w-6 fill-[#050505] text-[#050505]" strokeWidth={1.6} />
                  </motion.span>
                ) : (
                  <motion.span key="mic" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}>
                    <Mic className="h-7 w-7 text-white/90" strokeWidth={1.6} />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>

          <div className="hidden lg:block">
            <AudioWave levelsRef={levelsRef} active={isActive} />
          </div>
        </div>

        {/* Copy + transcript + results */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/20 bg-indigo-500/[0.08] px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.2em] text-indigo-200/85">
              <AudioLines className="h-3 w-3" strokeWidth={2} /> {t('novaVoiceTriage', { default: 'Nova Voice Triage' })}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.2em] text-white/35">
              <Accessibility className="h-3 w-3" strokeWidth={2} /> Zero-typing
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-500/[0.07] px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.2em] text-amber-200/85">
              <WifiOff className="h-3 w-3" strokeWidth={2} /> On-device fallback
            </span>
          </div>

          <h2 className="mt-4 text-[23px] font-semibold leading-snug tracking-[-0.02em] text-white/95 sm:text-[26px]">
            {isPending ? (
              <span className="bg-gradient-to-r from-amber-200 to-orange-200 bg-clip-text text-transparent">
                Processing your symptoms…
              </span>
            ) : isActive ? (
              <span className="bg-gradient-to-r from-indigo-200 to-sky-200 bg-clip-text text-transparent">
                Listening… describe what you feel, in your own words.
              </span>
            ) : showResults ? (
              <span className="bg-gradient-to-r from-emerald-200 to-teal-200 bg-clip-text text-transparent">
                Assessment complete
              </span>
            ) : (
              <>{t('nova_title')}</>
            )}
          </h2>

          {/* Live transcript / error / hint */}
          <div className="mt-4 min-h-[56px]">
            <AnimatePresence mode="wait" initial={false}>
              {error && !isPending ? (
                <motion.p key="error" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="font-mono text-[12px] text-rose-300/85">
                  Microphone unavailable · {error}. You can still upload a scan or type in Clinical Records.
                </motion.p>
              ) : triageResult && !triageResult.ok && !isPending ? (
                <motion.div key="ai-error" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-start gap-3 rounded-2xl border border-rose-400/20 bg-rose-500/[0.06] p-5"
                >
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" strokeWidth={1.75} />
                  <div>
                    <p className="text-[14px] font-medium text-rose-200">{triageResult.error}</p>
                    <p className="mt-1 text-[13px] text-white/50">{triageResult.message}</p>
                  </div>
                </motion.div>
              ) : live && !showResults ? (
                <motion.p key="live" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-[15px] leading-relaxed text-white/80">
                  &ldquo;{transcript}
                  {interim && <span className="text-white/35"> {interim}</span>}&rdquo;
                </motion.p>
              ) : !showResults ? (
                <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-xl text-[14.5px] leading-relaxed text-white/40">
                  {t('nova_description')}
                </motion.p>
              ) : null}
            </AnimatePresence>
          </div>

          {/* ---- AI Results ---- */}
          <AnimatePresence>
            {showResults && triageResult.ok && (
              <motion.div
                key="results"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 overflow-hidden"
              >
                <TriageResultCard data={triageResult.data} />

                {/* Clinical Next Steps — hardcoded safe text from matrix */}
                {guidance && (
                  <div className="mt-6 rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-5">
                    <h3 className="font-mono text-[11px] uppercase tracking-widest text-indigo-300">
                      Clinical Next Steps
                    </h3>
                    <p className="mt-3 text-[14px] leading-relaxed text-indigo-100/90">
                      <strong>Precautions:</strong> {guidance.precautions}
                      <br />
                      <strong>Next Steps:</strong> {guidance.nextSteps}
                    </p>

                    {/* Clinician escalation + Locate Care */}
                    <div className="mt-5 flex gap-3">
                      {escalated ? (
                        <div className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500/10 px-5 py-2.5 text-sm font-medium text-emerald-400">
                          <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />
                          Sent to Clinician Command Center
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEscalate(triageResult.caseId)}
                          disabled={escalating}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-500/10 px-5 py-2.5 text-sm font-medium text-rose-400 transition-all hover:bg-rose-500/20 focus:outline-none focus:ring-2 focus:ring-rose-500/50 disabled:opacity-50"
                        >
                          {escalating ? (
                            <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
                          ) : (
                            'Send to Clinician Command Center'
                          )}
                        </button>
                      )}
                      <a
                        href="https://www.google.com/maps/search/Clinics+near+me"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      >
                        Locate Care
                      </a>
                    </div>
                  </div>
                )}

                {/* Disclaimer */}
                <div className="mt-5 flex items-center gap-2 rounded-2xl border border-white/[0.05] bg-white/[0.02] p-3.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" strokeWidth={1.75} />
                  <p className="text-[12px] text-white/45">
                    This is AI-generated decision support — not a diagnosis. A licensed clinician must review before any action is taken. Saved to your Clinical Vault automatically.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Controls bar */}
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1">
              <Languages className="ml-1.5 h-3.5 w-3.5 text-white/30" strokeWidth={1.75} />
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setLang(l.code)}
                  className={cn(
                    'rounded-lg px-2 py-1 font-mono text-[10.5px] tracking-wider transition-colors',
                    lang === l.code
                      ? 'bg-white/[0.08] text-white'
                      : 'text-white/35 hover:text-white/70',
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>

            {(live || triageResult) && !isPending && (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/30 transition-colors hover:text-white/60"
              >
                <RotateCcw className="h-3 w-3" strokeWidth={2} /> Start over
              </button>
            )}

            {!sttSupported && (
              <span className="font-mono text-[10.5px] text-amber-300/70">
                Browser STT unavailable · audio will be queued for server transcription
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="relative px-6 pb-6 lg:hidden">
        <AudioWave levelsRef={levelsRef} active={isActive} />
      </div>
    </motion.section>
  );
}
