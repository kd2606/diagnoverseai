'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Filter, Sparkles } from 'lucide-react';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { MODALITY_META, STATUS_META, TONE } from '@/lib/patient/status';
import { compressionRatio, formatBytes, timeAgo } from '@/lib/patient/format';
import type { ScanRecord, UploadStatus } from '@/lib/patient/types';
import { cn } from '@/lib/utils';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'In flight' },
  { key: 'adjudication', label: 'Awaiting clinician' },
  { key: 'verified', label: 'Verified' },
] as const;

const ACTIVE: UploadStatus[] = ['compressing', 'queued', 'uploading', 'analyzing'];

function TimeAgo({ iso }: { iso: string }) {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setLabel(timeAgo(iso));
    tick();
    const t = setInterval(tick, 60_000);
    return () => clearInterval(t);
  }, [iso]);
  return (
    <span suppressHydrationWarning className="font-mono text-[10.5px] text-white/30">
      {label ?? '—'}
    </span>
  );
}

function ConfidenceMeter({ value, tone }: { value: number; tone: keyof typeof TONE }) {
  return (
    <div className="mt-4">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-white/30">
          Nova confidence
        </span>
        <span className={cn('font-mono text-[11px]', TONE[tone].text)}>
          {(value * 100).toFixed(1)}%
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-white/[0.05]">
        <motion.div
          className={cn('h-full rounded-full bg-gradient-to-r', TONE[tone].bar)}
          initial={{ width: 0 }}
          whileInView={{ width: `${value * 100}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}

function ScanCard({ scan, index }: { scan: ScanRecord; index: number }) {
  const status = STATUS_META[scan.status];
  const modality = MODALITY_META[scan.modality];
  const tone = TONE[status.tone];
  const inFlight = ACTIVE.includes(scan.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 26, filter: 'blur(8px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      layout
    >
      <SpotlightCard glow={`rgba(${tone.rgb},0.14)`} className="h-full">
        {/* Modality mesh preview — synthetic, never a grey box. */}
        <div className="relative h-32 overflow-hidden border-b border-white/[0.05]">
          <div className={cn('absolute inset-0 bg-gradient-to-br', modality.mesh)} />
          <div className="absolute inset-0 bg-[radial-gradient(closest-side,transparent,rgba(5,5,5,0.85))]" />
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:22px_22px]"
          />
          {inFlight && (
            <motion.div
              aria-hidden
              className="absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-indigo-300/20 to-transparent"
              animate={{ y: ['-64px', '128px'] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}

          <div className="absolute inset-x-4 top-4 flex items-start justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#050505]/60 px-2 py-1 backdrop-blur-xl">
              <modality.Icon className="h-3 w-3 text-white/60" strokeWidth={1.75} />
              <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-white/55">
                {modality.label}
              </span>
            </span>
            <TimeAgo iso={scan.capturedAt} />
          </div>

          <div className="absolute inset-x-4 bottom-3">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 backdrop-blur-xl',
                tone.chip,
                status.tone !== 'neutral' && tone.glow,
              )}
            >
              <motion.span
                animate={status.spin ? { rotate: 360 } : {}}
                transition={status.spin ? { duration: 2.2, repeat: Infinity, ease: 'linear' } : undefined}
                className="grid place-items-center"
              >
                <status.Icon className={cn('h-3 w-3', tone.text)} strokeWidth={2} />
              </motion.span>
              <span className={cn('font-mono text-[9.5px] uppercase tracking-[0.16em]', tone.text)}>
                {status.short}
              </span>
            </span>
          </div>
        </div>

        <div className="p-5">
          <h3 className="text-[15px] font-medium leading-snug tracking-[-0.01em] text-white/90">
            {scan.title}
          </h3>
          {scan.fileName && scan.bytesIn !== undefined && scan.bytesOut !== undefined && (
            <p className="mt-1 truncate font-mono text-[10.5px] text-white/30">
              {scan.fileName} · {formatBytes(scan.bytesIn)}{' '}
              <span className="text-white/20">→</span>{' '}
              <span className="text-emerald-300/70">{formatBytes(scan.bytesOut)}</span>{' '}
              <span className="text-white/25">({compressionRatio(scan.bytesIn, scan.bytesOut)})</span>
            </p>
          )}

          {/* Transfer progress */}
          {scan.status === 'uploading' && typeof scan.progress === 'number' && (
            <div className="mt-4">
              <div className="mb-1.5 flex items-baseline justify-between font-mono text-[10px]">
                <span className="uppercase tracking-[0.16em] text-white/30">
                  {scan.chunk ? `Chunk ${scan.chunk.index}/${scan.chunk.total}` : 'Transfer'}
                </span>
                <span className="text-indigo-300">{Math.round(scan.progress * 100)}%</span>
              </div>
              <div className="relative h-1 overflow-hidden rounded-full bg-white/[0.05]">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-indigo-500 to-sky-300"
                  initial={{ width: 0 }}
                  animate={{ width: `${scan.progress * 100}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
                <motion.div
                  className="absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-white/45 to-transparent"
                  animate={{ x: ['-100%', '500%'] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>
            </div>
          )}

          {scan.status === 'queued' && (
            <p className="mt-4 flex items-center gap-2 rounded-xl border border-amber-400/15 bg-amber-500/[0.05] px-3 py-2 font-mono text-[10.5px] text-amber-200/80">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              Parked in IndexedDB · auto-resumes on reconnect
            </p>
          )}

          {typeof scan.confidence === 'number' && (
            <ConfidenceMeter value={scan.confidence} tone={status.tone} />
          )}

          {scan.finding && (
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
              <Sparkles className="mt-px h-3.5 w-3.5 shrink-0 text-indigo-300/80" strokeWidth={1.75} />
              <p className="text-[12.5px] leading-relaxed text-white/60">{scan.finding}</p>
            </div>
          )}

          <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/[0.05] pt-4">
            {scan.clinician ? (
              <div className="flex min-w-0 items-center gap-2.5">
                <span className={cn(
                  'grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[10px] font-semibold',
                  scan.status === 'verified'
                    ? 'border-emerald-400/30 bg-emerald-500/[0.12] text-emerald-200'
                    : 'border-amber-400/25 bg-amber-500/[0.1] text-amber-200',
                )}>
                  {scan.clinician.initials}
                </span>
                <div className="min-w-0 leading-tight">
                  <p className={cn('truncate text-[12.5px] font-medium', tone.text)}>
                    {scan.status === 'verified' ? `Verified by ${scan.clinician.name}` : scan.clinician.name}
                  </p>
                  <p className="truncate font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/25">
                    {scan.clinician.specialty}
                  </p>
                </div>
              </div>
            ) : (
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/25">
                {status.label}
              </p>
            )}

            <button
              type="button"
              className="group/btn flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/35 transition-colors hover:text-white/85"
            >
              Report
              <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover/btn:translate-x-0.5" strokeWidth={2} />
            </button>
          </div>
        </div>
      </SpotlightCard>
    </motion.div>
  );
}

export function AnalysisResultsGrid({ scans }: { scans: ScanRecord[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('all');

  const visible = useMemo(() => {
    if (filter === 'all') return scans;
    if (filter === 'active') return scans.filter((s) => ACTIVE.includes(s.status));
    return scans.filter((s) => s.status === filter);
  }, [scans, filter]);

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[21px] font-semibold tracking-[-0.02em] text-white/95">
            AI analysis &amp; results
          </h2>
          <p className="mt-1.5 text-[13.5px] text-white/40">
            Every Nova finding is adjudicated by a licensed clinician before it becomes advice.
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1 backdrop-blur-xl">
          <Filter className="ml-1.5 h-3.5 w-3.5 text-white/25" strokeWidth={1.75} />
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                'relative rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors',
                filter === f.key ? 'text-white' : 'text-white/35 hover:text-white/70',
              )}
            >
              {filter === f.key && (
                <motion.span
                  layoutId="results-filter-pill"
                  className="absolute inset-0 -z-10 rounded-lg border border-white/[0.07] bg-white/[0.06]"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <motion.div layout className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {visible.map((scan, i) => (
            <ScanCard key={scan.id} scan={scan} index={i} />
          ))}
        </AnimatePresence>
      </motion.div>

      {visible.length === 0 && (
        <div className="rounded-3xl border border-dashed border-white/[0.07] bg-white/[0.015] py-16 text-center">
          <p className="text-[14px] text-white/40">Nothing in this lane right now.</p>
        </div>
      )}
    </section>
  );
}
