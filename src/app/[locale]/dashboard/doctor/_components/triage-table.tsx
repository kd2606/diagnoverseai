"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import {
  ChevronRight,
  CircleCheckBig,
  CloudOff,
  LoaderCircle,
  ShieldAlert,
  TriangleAlert,
  Wifi,
} from "lucide-react";
import { cn, fromNow } from "@/lib/utils";
import { protocolSignature } from "@/lib/triage/safety-protocols";
import type { AdjudicatedCase } from "./triage-console";

const GRID =
  "grid grid-cols-[minmax(0,1.05fr)_minmax(0,1.5fr)_120px_132px_92px_28px] gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.6fr)_140px_140px_104px_28px]";

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.1 } },
};

const rowVariants = {
  hidden: { opacity: 0, y: 14, filter: "blur(4px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

function ConfidenceMeter({ value, suppressed }: { value: number; suppressed: boolean }) {
  const pct = value * 100;
  const tone = suppressed
    ? "from-white/30 to-white/15"
    : pct >= 95
      ? "from-emerald-400 to-emerald-300"
      : pct >= 85
        ? "from-indigo-400 to-indigo-300"
        : "from-amber-400 to-amber-300";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline gap-1">
        <span
          className={cn(
            "font-mono text-[15px] font-semibold tabular-nums",
            suppressed ? "text-white/30 line-through decoration-rose-400/60" : "text-white/90",
          )}
        >
          {pct.toFixed(0)}
        </span>
        <span className="font-mono text-[10px] text-white/30">%</span>
      </div>
      <div className="h-[2.5px] w-full overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          className={cn("h-full rounded-full bg-gradient-to-r", tone)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function StatusPill({ c }: { c: AdjudicatedCase }) {
  if (c.status === "approved") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-emerald-300">
        <CircleCheckBig className="h-3 w-3" strokeWidth={2.25} /> Approved
      </span>
    );
  }
  if (c.status === "escalated") {
    return (
      <span className="relative inline-flex items-center gap-1.5 rounded-lg border border-rose-400/30 bg-rose-500/[0.12] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-rose-200 shadow-[0_0_20px_-8px_rgba(244,63,94,0.9)]">
        <TriangleAlert className="h-3 w-3" strokeWidth={2.25} /> Escalated
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-white/55">
      <LoaderCircle className="h-3 w-3 animate-spin [animation-duration:3s]" strokeWidth={2.25} /> Pending
    </span>
  );
}

export function TriageTable({
  cases,
  activeId,
  onSelect,
  locale,
}: {
  cases: AdjudicatedCase[];
  activeId: string;
  onSelect: (id: string) => void;
  locale: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  const move = (delta: number) => {
    const i = cases.findIndex((c) => c.caseId === activeId);
    const next = cases[Math.min(cases.length - 1, Math.max(0, i + delta))];
    if (next) onSelect(next.caseId);
  };

  return (
    <section
      aria-label="Incoming triage cases"
      className="relative min-w-0 overflow-hidden rounded-2xl border border-white/[0.05] bg-white/[0.02] backdrop-blur-3xl shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_30px_80px_-40px_rgba(0,0,0,1)]"
    >
      <div aria-hidden className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      {/* Table chrome */}
      <div className="flex items-center justify-between gap-4 border-b border-white/[0.05] px-5 py-4">
        <div>
          <h2 className="text-[14px] font-semibold tracking-tight text-white">Incoming Cases</h2>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/30">
            {cases.length} records · locale {locale.toUpperCase()} · ↑↓ to navigate
          </p>
        </div>
        <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-white/30">
          <motion.span
            className="h-1.5 w-1.5 rounded-full bg-indigo-400 shadow-[0_0_10px_2px_rgba(99,102,241,0.7)]"
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 1.8, repeat: Infinity }}
          />
          live stream
        </span>
      </div>

      {/* Column headers */}
      <div
        role="row"
        className={cn(
          GRID,
          "sticky top-[68px] z-10 border-b border-white/[0.05] bg-[#070707]/80 px-5 py-2.5 backdrop-blur-2xl",
        )}
      >
        {["Patient", "AI Diagnosis", "Confidence", "Status", "Received", ""].map((h) => (
          <span
            key={h || "chevron"}
            role="columnheader"
            className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-white/25"
          >
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      <motion.div
        ref={listRef}
        variants={listVariants}
        initial="hidden"
        animate="show"
        role="rowgroup"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "j") { e.preventDefault(); move(1); }
          if (e.key === "ArrowUp" || e.key === "k") { e.preventDefault(); move(-1); }
        }}
        className="max-h-[min(62vh,720px)] divide-y divide-white/[0.04] overflow-y-auto outline-none [scrollbar-color:rgba(255,255,255,0.12)_transparent] [scrollbar-width:thin] focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-indigo-400/40"
      >
        {cases.map((c) => {
          const isActive = c.caseId === activeId;
          const hit = c.hits[0];

          return (
            <motion.div
              key={c.caseId}
              variants={rowVariants}
              role="row"
              tabIndex={-1}
              aria-selected={isActive}
              onClick={() => onSelect(c.caseId)}
              className={cn(
                GRID,
                "group relative cursor-pointer items-center px-5 py-3.5 transition-colors duration-300",
                isActive ? "bg-white/[0.045]" : "hover:bg-white/[0.028]",
              )}
            >
              {/* Active / bypass rail */}
              {isActive && (
                <motion.span
                  layoutId="row-rail"
                  transition={{ type: "spring", stiffness: 420, damping: 36 }}
                  className={cn(
                    "absolute inset-y-0 left-0 w-[2px]",
                    c.bypassed
                      ? "bg-rose-400 shadow-[0_0_16px_3px_rgba(244,63,94,0.7)]"
                      : "bg-indigo-400 shadow-[0_0_16px_3px_rgba(99,102,241,0.7)]",
                  )}
                />
              )}
              {!isActive && c.bypassed && (
                <span aria-hidden className="absolute inset-y-0 left-0 w-[2px] bg-rose-500/40" />
              )}
              {c.bypassed && (
                <span aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(244,63,94,0.07),transparent_45%)]" />
              )}

              {/* Patient */}
              <div role="cell" className="relative min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-mono text-[12.5px] font-medium tracking-tight text-white/90">
                    {c.patientId}
                  </span>
                  {c.sync === "offline-recovered" && (
                    <span title={`Recovered after ${c.syncAttempts} sync attempts`}>
                      <CloudOff className="h-3 w-3 shrink-0 text-emerald-300/80" strokeWidth={2} />
                    </span>
                  )}
                  {c.sync === "degraded" && (
                    <span title="Degraded uplink">
                      <Wifi className="h-3 w-3 shrink-0 text-amber-300/80" strokeWidth={2} />
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate font-mono text-[10px] text-white/30">
                  {c.initials} · {c.age}
                  {c.sex} · {c.caseId}
                </p>
              </div>

              {/* Diagnosis */}
              <div role="cell" className="relative min-w-0">
                <div className="flex items-center gap-2">
                  <span className="shrink-0 rounded border border-white/[0.07] bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-white/45">
                    {c.modality}
                  </span>
                  <span
                    className={cn(
                      "truncate text-[13px] tracking-tight",
                      c.bypassed ? "text-white/40" : "text-white/85",
                    )}
                  >
                    {c.aiDiagnosis}
                  </span>
                </div>

                {hit ? (
                  <motion.div
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.18 }}
                    className="mt-1 flex min-w-0 items-center gap-1.5"
                  >
                    <span className="inline-flex shrink-0 items-center gap-1 rounded border border-rose-400/30 bg-rose-500/[0.14] px-1.5 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.08em] text-rose-200">
                      <ShieldAlert className="h-2.5 w-2.5" strokeWidth={2.5} />
                      {hit.protocolId}
                    </span>
                    <span className="truncate font-mono text-[9.5px] text-rose-300/60">
                      {protocolSignature(hit.protocolId)} → AI bypassed
                    </span>
                  </motion.div>
                ) : (
                  <p className="mt-1 truncate font-mono text-[10px] text-white/25">{c.icd10}</p>
                )}
              </div>

              <div role="cell" className="relative">
                <ConfidenceMeter value={c.confidence} suppressed={c.bypassed && c.status !== "approved"} />
              </div>

              <div role="cell" className="relative">
                <StatusPill c={c} />
              </div>

              <div role="cell" className="relative">
                <p className="font-mono text-[11.5px] tabular-nums text-white/60">{fromNow(c.receivedMinutesAgo)}</p>
                <p
                  className={cn(
                    "mt-0.5 font-mono text-[9.5px] tabular-nums",
                    c.receivedMinutesAgo > c.slaMinutes && c.status === "pending"
                      ? "text-rose-300/80"
                      : "text-white/25",
                  )}
                >
                  SLA {c.slaMinutes}m
                </p>
              </div>

              <div role="cell" className="relative">
                <ChevronRight
                  className={cn(
                    "h-4 w-4 transition-all duration-300",
                    isActive ? "text-white/70" : "-translate-x-1 text-white/15 opacity-0 group-hover:translate-x-0 group-hover:opacity-100",
                  )}
                  strokeWidth={1.75}
                />
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      <div className="flex items-center justify-between border-t border-white/[0.05] px-5 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/25">
          showing {cases.length} of {cases.length} · p95 inference 412ms
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/25">immutable audit · append-only</p>
      </div>
    </section>
  );
}
