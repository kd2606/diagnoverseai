'use client';

import { useCallback, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check, CloudUpload, Cpu, Database, FileImage, Gauge, RefreshCw,
  ShieldCheck, Trash2, UploadCloud, WifiOff, Zap,
} from 'lucide-react';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { useOfflineQueue } from '@/hooks/use-offline-queue';
import { compressForEdge, sha256 } from '@/lib/patient/edge-compression';
import { enqueue, patchQueued, removeQueued } from '@/lib/patient/offline-queue';
import { compressionRatio, formatBytes } from '@/lib/patient/format';
import { MODALITY_META, TONE } from '@/lib/patient/status';
import type { ScanModality } from '@/lib/patient/types';
import { cn } from '@/lib/utils';

const MODALITIES: ScanModality[] = ['xray', 'derm', 'ct', 'mri', 'retina', 'ecg'];
const ACCEPT = 'image/*,.dcm,application/dicom,application/pdf';

type Stage = { id: string; name: string; bytesIn: number; bytesOut: number; phase: 'compressing' | 'done' };

export function EdgeUploadZone({ patientId }: { patientId: string }) {
  const [modality, setModality] = useState<ScanModality>('xray');
  const [dragging, setDragging] = useState(false);
  const [stages, setStages] = useState<Stage[]>([]);
  const dragDepth = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { items, stats, online, refresh } = useOfflineQueue();

  const ingest = useCallback(
    async (files: FileList | File[]) => {
      for (const file of Array.from(files)) {
        const id = crypto.randomUUID();
        setStages((prev) => [
          { id, name: file.name, bytesIn: file.size, bytesOut: 0, phase: 'compressing' },
          ...prev,
        ]);

        try {
          // 1 — on-device codec pass. Never blocks on network.
          const result = await compressForEdge(file, { maxEdge: 2048, quality: 0.82 });
          setStages((prev) =>
            prev.map((s) => (s.id === id ? { ...s, bytesOut: result.bytesOut, phase: 'done' } : s)),
          );

          // 2 — durably park the payload before anything touches the wire.
          await enqueue({
            id,
            patientId,
            modality,
            fileName: file.name,
            bytesIn: result.bytesIn,
            bytesOut: result.bytesOut,
            blob: result.blob,
            checksum: await sha256(result.blob),
            offset: 0,
            attempts: 0,
            createdAt: Date.now(),
            status: navigator.onLine ? 'uploading' : 'queued',
          });

          // 3 — hand off to the resumable TUS worker (see integration notes).
          if (navigator.onLine) {
            window.dispatchEvent(new CustomEvent('diagnoverse:flush-queue', { detail: { id } }));
          }
        } catch {
          await patchQueued(id, { status: 'failed' });
        } finally {
          setTimeout(() => setStages((prev) => prev.filter((s) => s.id !== id)), 4200);
        }
      }
      void refresh();
    },
    [modality, patientId, refresh],
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      if (e.dataTransfer.files?.length) void ingest(e.dataTransfer.files);
    },
    [ingest],
  );

  const queueTone = !online || stats.failed > 0 ? 'amber' : stats.pending > 0 ? 'amber' : 'emerald';
  const tone = TONE[queueTone];

  return (
    <SpotlightCard glow="rgba(99,102,241,0.15)" className="p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.02] px-2.5 py-1">
            <Zap className="h-3 w-3 text-indigo-300" strokeWidth={2} />
            <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-white/40">
              Edge-Resilient Ingest
            </span>
          </div>
          <h2 className="mt-3.5 text-[21px] font-semibold tracking-[-0.02em] text-white/95">
            Upload a scan
          </h2>
          <p className="mt-1.5 max-w-md text-[13.5px] leading-relaxed text-white/40">
            Compressed on your device, encrypted, then queued. Works on 2G, works on no G.
          </p>
        </div>

        {/* IndexedDB offline queue indicator */}
        <div
          className={cn(
            'flex items-center gap-3 rounded-2xl border px-4 py-3 backdrop-blur-xl transition-colors duration-500',
            tone.chip,
          )}
        >
          <div className="relative">
            <Database className={cn('h-4 w-4', tone.text)} strokeWidth={1.75} />
            <motion.span
              className={cn('absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full', tone.dot)}
              animate={{ opacity: [1, 0.25, 1] }}
              transition={{ duration: stats.pending ? 1.1 : 2.6, repeat: Infinity }}
            />
          </div>
          <div className="leading-tight">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-white/35">
              IndexedDB Queue
            </p>
            <p className={cn('mt-1 font-mono text-[12px]', tone.text)}>
              {stats.pending + stats.uploading > 0
                ? `${stats.pending + stats.uploading} pending · ${formatBytes(stats.pendingBytes)}`
                : 'Fully synced'}
            </p>
          </div>
          <span className="mx-1 h-8 w-px bg-white/[0.06]" />
          <span
            className={cn(
              'flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em]',
              online ? 'text-emerald-300' : 'text-amber-300',
            )}
          >
            {online ? <Check className="h-3 w-3" strokeWidth={2.5} /> : <WifiOff className="h-3 w-3" strokeWidth={2.5} />}
            {online ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Modality selector */}
      <div className="mt-6 flex flex-wrap gap-2">
        {MODALITIES.map((m) => {
          const meta = MODALITY_META[m];
          const active = modality === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => setModality(m)}
              className={cn(
                'group relative flex items-center gap-2 rounded-xl border px-3 py-2 text-[12.5px] font-medium transition-all duration-300',
                active
                  ? 'border-indigo-400/30 bg-indigo-500/[0.1] text-indigo-100 shadow-[0_0_26px_-10px_rgba(99,102,241,0.9)]'
                  : 'border-white/[0.05] bg-white/[0.02] text-white/40 hover:border-white/[0.1] hover:text-white/75',
              )}
            >
              <meta.Icon className="h-[15px] w-[15px]" strokeWidth={1.75} />
              {meta.label}
            </button>
          );
        })}
      </div>

      {/* Drop zone */}
      <div
        onDragEnter={(e) => { e.preventDefault(); dragDepth.current += 1; setDragging(true); }}
        onDragLeave={() => { dragDepth.current -= 1; if (dragDepth.current <= 0) setDragging(false); }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
        className={cn(
          'group relative mt-5 cursor-pointer overflow-hidden rounded-3xl border border-dashed transition-all duration-500',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50',
          dragging
            ? 'border-indigo-400/50 bg-indigo-500/[0.06]'
            : 'border-white/[0.09] bg-white/[0.015] hover:border-indigo-400/30 hover:bg-white/[0.03]',
        )}
      >
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          animate={{ opacity: dragging ? 1 : 0 }}
          transition={{ duration: 0.35 }}
          style={{ background: 'radial-gradient(420px circle at 50% 40%, rgba(99,102,241,0.2), transparent 70%)' }}
        />

        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="sr-only"
          onChange={(e) => { if (e.target.files) void ingest(e.target.files); e.target.value = ''; }}
        />

        <div className="relative flex flex-col items-center gap-5 px-6 py-12 text-center sm:py-14">
          <motion.div
            animate={dragging ? { y: -6, scale: 1.06 } : { y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            className="relative grid h-16 w-16 place-items-center rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.07] to-transparent"
          >
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-2xl bg-[radial-gradient(closest-side,rgba(99,102,241,0.4),transparent)] blur-lg"
              animate={{ opacity: dragging ? 0.95 : [0.25, 0.5, 0.25] }}
              transition={{ duration: 3.6, repeat: dragging ? 0 : Infinity, ease: 'easeInOut' }}
            />
            <UploadCloud className="relative h-7 w-7 text-indigo-200" strokeWidth={1.5} />
          </motion.div>

          <div>
            <p className="text-[16px] font-medium text-white/90">
              {dragging ? 'Release to compress on-device' : 'Drag a scan here, or tap to browse'}
            </p>
            <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-white/35">
              X-Ray · Dermoscopy · CT · MRI · Fundus · ECG — JPEG, PNG, HEIC, DICOM or PDF up to 400 MB.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.16em] text-white/30">
            <span className="rounded-md border border-white/[0.06] px-2 py-1">AES-256 at rest</span>
            <span className="rounded-md border border-white/[0.06] px-2 py-1">Resumable TUS</span>
            <span className="rounded-md border border-white/[0.06] px-2 py-1">No PHI in logs</span>
          </div>
        </div>
      </div>

      {/* Live compression visualizer */}
      <div className="mt-5 space-y-2.5">
        <AnimatePresence initial={false}>
          {stages.map((stage) => {
            const done = stage.phase === 'done' && stage.bytesOut > 0;
            const pct = done ? Math.max(3, Math.round((stage.bytesOut / stage.bytesIn) * 100)) : 100;
            return (
              <motion.div
                key={stage.id}
                layout
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="rounded-2xl border border-indigo-400/15 bg-indigo-500/[0.04] p-4 backdrop-blur-xl">
                  <div className="flex items-center gap-3">
                    <motion.span
                      animate={{ rotate: done ? 0 : 360 }}
                      transition={done ? undefined : { duration: 1.6, repeat: Infinity, ease: 'linear' }}
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-indigo-400/20 bg-indigo-500/[0.08]"
                    >
                      {done
                        ? <Check className="h-3.5 w-3.5 text-emerald-300" strokeWidth={2.5} />
                        : <Cpu className="h-3.5 w-3.5 text-indigo-300" strokeWidth={2} />}
                    </motion.span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-4">
                        <p className="truncate text-[13px] font-medium text-white/85">{stage.name}</p>
                        <p className="shrink-0 font-mono text-[11px] text-indigo-200/90">
                          {done ? (
                            <>
                              {formatBytes(stage.bytesIn)} <span className="text-white/25">→</span>{' '}
                              <span className="text-emerald-300">{formatBytes(stage.bytesOut)}</span> WebP
                              <span className="ml-1.5 text-white/30">
                                ({compressionRatio(stage.bytesIn, stage.bytesOut)})
                              </span>
                            </>
                          ) : (
                            <>Edge compression active · {formatBytes(stage.bytesIn)}</>
                          )}
                        </p>
                      </div>

                      <div className="relative mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                        <motion.div
                          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-indigo-500 via-indigo-400 to-emerald-300"
                          initial={{ width: '100%' }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.95, ease: [0.22, 1, 0.36, 1] }}
                        />
                        {!done && (
                          <motion.div
                            className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                            animate={{ x: ['-100%', '400%'] }}
                            transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Persisted queue rows */}
      {items.length > 0 && (
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-white/30">
              Offline queue · persisted
            </p>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('diagnoverse:flush-queue'))}
              disabled={!online}
              className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/35 transition-colors hover:text-white/70 disabled:opacity-30"
            >
              <RefreshCw className="h-3 w-3" strokeWidth={2} /> Flush now
            </button>
          </div>

          <ul className="divide-y divide-white/[0.04] overflow-hidden rounded-2xl border border-white/[0.05] bg-white/[0.015]">
            <AnimatePresence initial={false}>
              {items.slice(0, 5).map((item) => {
                const synced = item.status === 'synced';
                const rowTone = TONE[synced ? 'emerald' : item.status === 'failed' ? 'rose' : 'amber'];
                return (
                  <motion.li
                    key={item.id}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="group flex items-center gap-3 px-4 py-3"
                  >
                    <FileImage className="h-4 w-4 shrink-0 text-white/25" strokeWidth={1.75} />
                    <span className="min-w-0 flex-1 truncate text-[13px] text-white/75">{item.fileName}</span>
                    <span className="hidden shrink-0 font-mono text-[10.5px] text-white/30 sm:block">
                      {formatBytes(item.bytesOut)} · {compressionRatio(item.bytesIn, item.bytesOut)}
                    </span>
                    <span className={cn('flex shrink-0 items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em]', rowTone.text)}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', rowTone.dot)} />
                      {synced ? 'Synced' : item.status === 'failed' ? 'Retry armed' : 'Queued'}
                    </span>
                    <button
                      type="button"
                      onClick={() => void removeQueued(item.id)}
                      aria-label={`Remove ${item.fileName}`}
                      className="shrink-0 text-white/15 opacity-0 transition-all hover:text-rose-300 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </button>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </div>
      )}

      {/* Codec telemetry footer */}
      <div className="mt-6 grid grid-cols-1 gap-3 border-t border-white/[0.05] pt-5 sm:grid-cols-3">
        {[
          { Icon: Gauge, label: 'Median payload', value: '412 KB', hint: 'from 8.2 MB capture' },
          { Icon: CloudUpload, label: 'Chunk size', value: '256 KB', hint: 'TUS · resumable' },
          { Icon: ShieldCheck, label: 'Integrity', value: 'SHA-256', hint: 'verified client + edge' },
        ].map(({ Icon, label, value, hint }) => (
          <div key={label} className="flex items-center gap-3">
            <Icon className="h-4 w-4 shrink-0 text-indigo-300/70" strokeWidth={1.75} />
            <div className="leading-tight">
              <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-white/30">{label}</p>
              <p className="mt-1 font-mono text-[12px] text-white/70">
                {value} <span className="text-white/25">· {hint}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </SpotlightCard>
  );
}
