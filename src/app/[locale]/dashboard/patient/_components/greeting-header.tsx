'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Minus, Sparkles } from 'lucide-react';
import { TONE } from '@/lib/patient/status';
import type { HealthSignal } from '@/lib/patient/types';
import { cn } from '@/lib/utils';

const TREND_ICON = { up: ArrowUpRight, down: ArrowDownRight, flat: Minus } as const;

function salutation(hour: number): string {
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function GreetingHeader({
  firstName,
  signals,
}: {
  firstName: string;
  signals: HealthSignal[];
}) {
  // Resolved after mount so the greeting reflects the patient's local clock
  // without risking a hydration mismatch.
  const [greeting, setGreeting] = useState<string | null>(null);
  useEffect(() => setGreeting(salutation(new Date().getHours())), []);

  return (
    <section className="relative">
      <motion.div
        initial={{ opacity: 0, y: 18, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between"
      >
        <div className="max-w-2xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/[0.07] px-3 py-1.5 backdrop-blur-xl">
            <motion.span
              className="h-1.5 w-1.5 rounded-full bg-indigo-400"
              animate={{ opacity: [1, 0.25, 1], scale: [1, 1.4, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-indigo-200/80">
              Nova Health Intelligence · Live
            </span>
          </div>

          <h1 className="text-balance text-[34px] font-semibold leading-[1.08] tracking-[-0.03em] sm:text-[46px]">
            <span
              className={cn(
                'bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent transition-opacity duration-700',
                greeting ? 'opacity-100' : 'opacity-0',
              )}
            >
              {greeting ?? 'Hello'}, {firstName}.
            </span>
            <br />
            <span className="relative inline-block bg-gradient-to-r from-indigo-200 via-indigo-300 to-sky-200 bg-clip-text text-transparent">
              Your health intelligence is active.
              <motion.span
                aria-hidden
                className="absolute -inset-x-6 -inset-y-4 -z-10 rounded-full bg-[radial-gradient(closest-side,rgba(99,102,241,0.22),transparent)] blur-2xl"
                animate={{ opacity: [0.45, 0.9, 0.45] }}
                transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
              />
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-white/45">
            Three captures are being watched by Nova and your care team. Speak your symptoms
            any time — no typing, no forms, works without signal.
          </p>
        </div>

        {/* Signal strip */}
        <div className="grid w-full shrink-0 grid-cols-2 gap-3 sm:grid-cols-4 lg:w-auto lg:grid-cols-2 xl:grid-cols-4">
          {signals.map((signal, i) => {
            const tone = TONE[signal.tone];
            const Trend = TREND_ICON[signal.trend];
            return (
              <motion.div
                key={signal.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.18 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                className="group relative overflow-hidden rounded-2xl border border-white/[0.05] bg-white/[0.02] p-4 backdrop-blur-3xl transition-colors duration-500 hover:border-white/[0.1]"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{ background: `radial-gradient(120px circle at 50% 0%, rgba(${tone.rgb},0.13), transparent 70%)` }}
                />
                <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-white/35">
                  {signal.label}
                </p>
                <p className="mt-2.5 flex items-baseline gap-1 text-[22px] font-semibold tracking-tight text-white/95">
                  {signal.value}
                  {signal.unit && (
                    <span className="font-mono text-[11px] font-normal text-white/35">{signal.unit}</span>
                  )}
                </p>
                {signal.delta && (
                  <p className={cn('mt-1.5 flex items-center gap-1 font-mono text-[10px]', tone.text)}>
                    <Trend className="h-3 w-3" strokeWidth={2.25} />
                    {signal.delta}
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      <div className="mt-10 flex items-center gap-3">
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-indigo-300/70" strokeWidth={1.75} />
        <div className="h-px flex-1 bg-gradient-to-r from-indigo-400/25 via-white/[0.06] to-transparent" />
      </div>
    </section>
  );
}
