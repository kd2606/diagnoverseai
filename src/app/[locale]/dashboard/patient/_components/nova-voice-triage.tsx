'use client';

import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useAnimationFrame } from 'framer-motion';
import {
  Accessibility, AudioLines, Languages, Mic, MicOff, Square, WifiOff,
} from 'lucide-react';
import { useVoiceTriage, WAVE_BARS } from '@/hooks/use-voice-triage';
import { cn } from '@/lib/utils';

const LANGS = [
  { code: 'en-US', label: 'EN' },
  { code: 'hr-HR', label: 'HR' },
  { code: 'es-ES', label: 'ES' },
  { code: 'hi-IN', label: 'HI' },
  { code: 'sw-KE', label: 'SW' },
] as const;

const LEXICON: Record<string, string[]> = {
  'Chest pain': ['chest pain', 'chest hurts', 'tight chest', 'pressure in my chest'],
  'Dyspnoea': ['breath', 'breathing', 'breathless', 'wheez'],
  'Fever': ['fever', 'temperature', 'hot', 'chills'],
  'Cough': ['cough', 'coughing', 'phlegm'],
  'Headache': ['headache', 'migraine', 'head hurts'],
  'Fatigue': ['tired', 'fatigue', 'exhausted', 'weak'],
  'Skin lesion': ['rash', 'mole', 'lesion', 'itch', 'spot on my'],
  'Dizziness': ['dizzy', 'lighthead', 'faint'],
};

function extractSymptoms(text: string): string[] {
  const lower = text.toLowerCase();
  return Object.entries(LEXICON)
    .filter(([, cues]) => cues.some((c) => lower.includes(c)))
    .map(([label]) => label);
}

/** 60fps waveform driven straight off the analyser ref — zero re-renders. */
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
        // Breathing idle state: "always listening", never dead.
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

export function NovaVoiceTriage() {
  const [lang, setLang] = useState<string>('en-US');
  const { state, transcript, interim, error, sttSupported, levelsRef, toggle, reset, isActive } =
    useVoiceTriage({ lang });

  const symptoms = useMemo(() => extractSymptoms(`${transcript} ${interim}`), [transcript, interim]);
  const live = `${transcript}${interim ? ` ${interim}` : ''}`.trim();

  return (
    <motion.section
      initial={{ opacity: 0, y: 24, filter: 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.85, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-[28px] border border-white/[0.06] bg-white/[0.02] backdrop-blur-3xl shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset,0_60px_140px_-70px_rgba(79,70,229,0.6)]"
    >
      {/* Reactive aurora — intensifies while listening. */}
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

      <div className="relative flex flex-col gap-8 p-6 sm:p-9 lg:flex-row lg:items-center lg:gap-12">
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
              onClick={toggle}
              aria-pressed={isActive}
              aria-label={isActive ? 'Stop voice triage' : 'Start voice triage'}
              whileHover={{ scale: 1.045 }}
              whileTap={{ scale: 0.955 }}
              className={cn(
                'relative grid h-[76px] w-[76px] place-items-center rounded-full border transition-colors duration-500',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]',
                isActive
                  ? 'border-indigo-300/50 bg-gradient-to-br from-indigo-400/90 to-violet-500/80 shadow-[0_0_48px_-8px_rgba(99,102,241,0.95)]'
                  : 'border-white/12 bg-white/[0.04] hover:border-indigo-300/40 hover:bg-indigo-500/[0.1]',
              )}
            >
              <AnimatePresence mode="wait" initial={false}>
                {state === 'error' ? (
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

        {/* Copy + transcript */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/20 bg-indigo-500/[0.08] px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.2em] text-indigo-200/85">
              <AudioLines className="h-3 w-3" strokeWidth={2} /> Nova Voice Triage
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.2em] text-white/35">
              <Accessibility className="h-3 w-3" strokeWidth={2} /> Zero-typing
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-500/[0.07] px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.2em] text-amber-200/85">
              <WifiOff className="h-3 w-3" strokeWidth={2} /> On-device fallback
            </span>
          </div>

          <h2 className="mt-4 text-[23px] font-semibold leading-snug tracking-[-0.02em] text-white/95 sm:text-[26px]">
            {isActive ? (
              <span className="bg-gradient-to-r from-indigo-200 to-sky-200 bg-clip-text text-transparent">
                Listening… describe what you feel, in your own words.
              </span>
            ) : (
              <>Always listening. <span className="text-white/45">Tap to speak your symptoms…</span></>
            )}
          </h2>

          <div className="mt-4 min-h-[56px]">
            <AnimatePresence mode="wait" initial={false}>
              {error ? (
                <motion.p key="error" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="font-mono text-[12px] text-rose-300/85">
                  Microphone unavailable · {error}. You can still upload a scan or type in Clinical Records.
                </motion.p>
              ) : live ? (
                <motion.p key="live" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-[15px] leading-relaxed text-white/80">
                  “{transcript}
                  {interim && <span className="text-white/35"> {interim}</span>}”
                </motion.p>
              ) : (
                <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-xl text-[14.5px] leading-relaxed text-white/40">
                  Try: <span className="text-white/60">“I've had a tight chest and trouble breathing since Tuesday.”</span>{' '}
                  Nova structures it into a clinical intake note, routes urgency, and queues it for a
                  human clinician — even with no connection.
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {symptoms.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap items-center gap-2 pt-4">
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-white/30">
                    Extracted
                  </span>
                  {symptoms.map((s) => (
                    <motion.span
                      key={s}
                      layout
                      initial={{ opacity: 0, scale: 0.88 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="rounded-lg border border-emerald-400/20 bg-emerald-500/[0.08] px-2.5 py-1 text-[12px] font-medium text-emerald-200"
                    >
                      {s}
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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

            {live && (
              <button
                type="button"
                onClick={reset}
                className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/30 transition-colors hover:text-white/60"
              >
                Clear transcript
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
