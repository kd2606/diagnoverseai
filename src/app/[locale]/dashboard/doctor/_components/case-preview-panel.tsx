"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  BrainCircuit,
  CircleCheckBig,
  Clock,
  Fingerprint,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";
import { cn, fromNow } from "@/lib/utils";
import { protocolSignature, segmentMatches } from "@/lib/triage/safety-protocols";
import type { AdjudicatedCase, AuditEntry } from "./triage-console";
import { ScanCanvas } from "./scan-canvas";

const SPECIALTIES = ["Cardiology", "Neurology", "Emergency Medicine", "Critical Care", "Obstetrics"];

export function CasePreviewPanel({
  triageCase: c,
  audit,
  onApprove,
  onEscalate,
}: {
  triageCase: AdjudicatedCase;
  audit: AuditEntry[];
  onApprove: () => void;
  onEscalate: (specialty: string) => void;
}) {
  const [attested, setAttested] = useState(false);
  const [routing, setRouting] = useState(false);
  const settled = c.status !== "pending";
  const canApprove = attested && !c.bypassed && !settled;
  const defaultRoute = c.hits[0]?.routeTo ?? "Emergency Medicine";

  const segments = segmentMatches(c.narrative, c.hits.filter((h) => h.source === "narrative"));

  return (
    <motion.aside
      initial={{ opacity: 0, x: 24, filter: "blur(8px)" }}
      animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, x: -16, filter: "blur(8px)" }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      aria-label={`Case detail ${c.caseId}`}
      className="relative overflow-hidden rounded-2xl border border-white/[0.05] bg-white/[0.02] backdrop-blur-3xl shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_30px_80px_-40px_rgba(0,0,0,1)]"
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-px",
          c.bypassed
            ? "bg-gradient-to-r from-transparent via-rose-400/60 to-transparent"
            : "bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent",
        )}
      />
      {c.bypassed && (
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_45%_at_50%_0%,rgba(244,63,94,0.1),transparent)]" />
      )}

      <div className="relative max-h-[calc(100vh-140px)] overflow-y-auto [scrollbar-color:rgba(255,255,255,0.12)_transparent] [scrollbar-width:thin]">
        {/* Identity */}
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.05] p-5">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">Active case</p>
            <h2 className="mt-1 font-mono text-[17px] font-semibold tracking-tight text-white">{c.patientId}</h2>
            <p className="mt-1 font-mono text-[10.5px] text-white/35">
              {c.initials} · {c.age}
              {c.sex} · {c.modality} · captured {c.capturedAt}
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.03] px-2 py-1 font-mono text-[10px] text-white/45">
            <Clock className="h-3 w-3" strokeWidth={2} />
            {fromNow(c.receivedMinutesAgo)}
          </span>
        </div>

        {/* Protocol bypass banner */}
        <AnimatePresence>
          {c.bypassed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden border-b border-rose-400/15 bg-rose-500/[0.07]"
            >
              <div className="flex gap-3 p-4">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-rose-400/30 bg-rose-500/15">
                  <ShieldAlert className="h-3.5 w-3.5 text-rose-300" strokeWidth={2.25} />
                </span>
                <div className="min-w-0">
                  <p className="text-[12.5px] font-semibold tracking-tight text-rose-100">
                    Deterministic safety protocol bypassed the model
                  </p>
                  <p className="mt-1 text-[12px] leading-relaxed text-rose-200/70">
                    {c.hits.length} pattern {c.hits.length === 1 ? "match" : "matches"} in raw intake text. One-click
                    approval is disabled; this case must be routed to {defaultRoute}.
                  </p>
                  <ul className="mt-2.5 space-y-1">
                    {c.hits.map((h) => (
                      <li key={`${h.protocolId}-${h.start}`} className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
                        <span className="rounded border border-rose-400/30 bg-rose-500/15 px-1.5 py-0.5 font-semibold uppercase tracking-[0.08em] text-rose-200">
                          {h.protocolId}
                        </span>
                        <span className="text-rose-300/60">{protocolSignature(h.protocolId)}</span>
                        <span className="text-rose-200/80">matched “{h.matched}”</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Study */}
        <div className="border-b border-white/[0.05] p-5">
          <ScanCanvas
            seed={c.patientId}
            modality={c.modality}
            filename={c.scan.filename}
            quality={c.scan.quality}
            width={c.scan.width}
            height={c.scan.height}
            roi={c.bypassed}
          />
        </div>

        {/* Vitals strip */}
        <div className="grid grid-cols-5 divide-x divide-white/[0.05] border-b border-white/[0.05]">
          {[
            { k: "HR", v: c.vitals.hr, alert: c.vitals.hr > 100 },
            { k: "BP", v: c.vitals.bp, alert: Number(c.vitals.bp.split("/")[0]) < 100 },
            { k: "SpO₂", v: `${c.vitals.spo2}`, alert: c.vitals.spo2 < 94 },
            { k: "Temp", v: c.vitals.temp.toFixed(1), alert: c.vitals.temp >= 38 },
            { k: "RR", v: c.vitals.rr, alert: c.vitals.rr > 20 },
          ].map((v) => (
            <div key={v.k} className="px-2 py-3 text-center">
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/30">{v.k}</p>
              <p className={cn("mt-1 font-mono text-[13px] font-semibold tabular-nums", v.alert ? "text-rose-300" : "text-white/80")}>
                {v.v}
              </p>
            </div>
          ))}
        </div>

        {/* Reasoning */}
        <div className="space-y-4 border-b border-white/[0.05] p-5">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-4 w-4 text-indigo-300" strokeWidth={1.75} />
            <h3 className="text-[13px] font-semibold tracking-tight text-white">Model reasoning</h3>
            <span className="ml-auto font-mono text-[10px] text-white/30">DV-VISION-4.2.1</span>
          </div>

          <div className="rounded-xl border border-white/[0.05] bg-white/[0.015] p-3.5">
            <div className="flex items-baseline justify-between gap-3">
              <p className={cn("text-[13.5px] font-medium tracking-tight", c.bypassed ? "text-white/45" : "text-white")}>
                {c.aiDiagnosis}
              </p>
              <span className={cn("font-mono text-[15px] font-semibold tabular-nums", c.bypassed ? "text-white/30 line-through decoration-rose-400/60" : "text-white")}>
                {(c.confidence * 100).toFixed(1)}%
              </span>
            </div>
            <p className="mt-1 font-mono text-[10px] text-white/30">ICD-10 {c.icd10}</p>
          </div>

          <ol className="space-y-2.5">
            {c.reasoning.map((r, i) => (
              <motion.li
                key={r}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.12 + i * 0.07 }}
                className="flex gap-2.5 text-[12.5px] leading-relaxed text-white/55"
              >
                <span className="mt-[3px] font-mono text-[10px] text-indigo-300/50">{String(i + 1).padStart(2, "0")}</span>
                <span>{r}</span>
              </motion.li>
            ))}
          </ol>

          {/* Differentials */}
          <div className="space-y-2 pt-1">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-white/25">Differentials</p>
            {c.differentials.map((d, i) => (
              <div key={d.icd10} className="flex items-center gap-3">
                <span className="w-40 shrink-0 truncate text-[12px] text-white/60">{d.label}</span>
                <div className="h-[2.5px] flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div
                    className={cn("h-full rounded-full bg-gradient-to-r", i === 0 ? "from-indigo-500 to-indigo-300" : "from-white/25 to-white/10")}
                    initial={{ width: 0 }}
                    animate={{ width: `${d.probability * 100}%` }}
                    transition={{ duration: 0.7, delay: 0.2 + i * 0.08, ease: "easeOut" }}
                  />
                </div>
                <span className="w-14 shrink-0 text-right font-mono text-[10.5px] tabular-nums text-white/45">
                  {(d.probability * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>

          {/* Raw intake text with regex highlighting */}
          <div className="rounded-xl border border-white/[0.05] bg-black/30 p-3.5">
            <p className="mb-2 font-mono text-[9.5px] uppercase tracking-[0.2em] text-white/25">
              Raw intake text · protocol input
            </p>
            <p className="font-mono text-[11.5px] leading-relaxed text-white/55">
              {segments.map((s, i) =>
                s.hit ? (
                  <mark
                    key={i}
                    className="rounded bg-rose-500/25 px-1 font-semibold text-rose-100 shadow-[0_0_16px_-4px_rgba(244,63,94,0.9)]"
                    title={`${s.hit.protocolId} · ${s.hit.label}`}
                  >
                    {s.text}
                  </mark>
                ) : (
                  <span key={i}>{s.text}</span>
                ),
              )}
            </p>
          </div>
        </div>

        {/* Audit trail */}
        {audit.length > 0 && (
          <div className="border-b border-white/[0.05] p-5">
            <p className="mb-2.5 flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.2em] text-white/25">
              <Fingerprint className="h-3 w-3" strokeWidth={2} /> Signed actions
            </p>
            <ul className="space-y-1.5">
              {audit.map((a) => (
                <motion.li
                  key={a.id}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 font-mono text-[10.5px] text-white/45"
                >
                  <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", a.tone === "emerald" ? "bg-emerald-400" : "bg-rose-400")} />
                  <span className="tabular-nums text-white/30">{a.at}</span>
                  <span className="truncate text-white/60">{a.action}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        )}

        {/* Adjudication */}
        <div className="space-y-3 p-5">
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-white/[0.05] bg-white/[0.015] p-3 transition-colors hover:border-white/[0.09]">
            <input
              type="checkbox"
              checked={attested}
              onChange={(e) => setAttested(e.target.checked)}
              disabled={settled}
              className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-white/20 bg-transparent accent-indigo-500"
            />
            <span className="text-[11.5px] leading-relaxed text-white/50">
              I have independently reviewed the study and intake text, and I accept clinical responsibility for this
              adjudication.
            </span>
          </label>

          <div className="grid grid-cols-1 gap-3">
            <motion.button
              type="button"
              disabled={!canApprove}
              onClick={onApprove}
              whileHover={canApprove ? { scale: 1.015 } : undefined}
              whileTap={canApprove ? { scale: 0.985 } : undefined}
              className={cn(
                "group relative flex items-center justify-center gap-2.5 overflow-hidden rounded-xl border px-5 py-4 text-[13px] font-semibold tracking-tight transition-all duration-300",
                canApprove
                  ? "border-emerald-400/30 bg-emerald-500/[0.14] text-emerald-100 shadow-[0_0_40px_-14px_rgba(16,185,129,0.9)] hover:border-emerald-400/50 hover:bg-emerald-500/20"
                  : "cursor-not-allowed border-white/[0.05] bg-white/[0.015] text-white/25",
              )}
            >
              {canApprove && (
                <span aria-hidden className="absolute inset-0 -translate-x-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)] transition-transform duration-700 group-hover:translate-x-full" />
              )}
              <CircleCheckBig className="relative h-4 w-4" strokeWidth={2.25} />
              <span className="relative">
                {c.status === "approved" ? "AI Triage Ratified" : "Approve AI Triage"}
              </span>
            </motion.button>

            <motion.button
              type="button"
              disabled={settled && c.status === "escalated" && !routing}
              onClick={() => setRouting((v) => !v)}
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
              className={cn(
                "group relative flex items-center justify-center gap-2.5 overflow-hidden rounded-xl border px-5 py-4 text-[13px] font-semibold tracking-tight transition-all duration-300",
                "border-rose-400/30 bg-rose-500/[0.13] text-rose-100 shadow-[0_0_40px_-14px_rgba(244,63,94,0.9)] hover:border-rose-400/50 hover:bg-rose-500/20",
                c.bypassed && "ring-1 ring-rose-400/30",
              )}
            >
              <TriangleAlert className="relative h-4 w-4" strokeWidth={2.25} />
              <span className="relative">
                {c.status === "escalated" ? "Re-route Escalation" : "Escalate to Specialist"}
              </span>
            </motion.button>
          </div>

          <AnimatePresence>
            {routing && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <p className="pb-2 pt-1 font-mono text-[9.5px] uppercase tracking-[0.2em] text-white/25">Route to</p>
                <div className="flex flex-wrap gap-1.5">
                  {SPECIALTIES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => { onEscalate(s); setRouting(false); }}
                      className={cn(
                        "rounded-lg border px-2.5 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.1em] transition-colors",
                        s === defaultRoute
                          ? "border-rose-400/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20"
                          : "border-white/[0.06] text-white/45 hover:border-white/15 hover:text-white",
                      )}
                    >
                      {s}
                      {s === defaultRoute && " ·"}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="flex items-start gap-1.5 pt-1 font-mono text-[10px] leading-relaxed text-white/25">
            <Activity className="mt-px h-3 w-3 shrink-0" strokeWidth={2} />
            {c.bypassed
              ? "Approval locked by protocol layer. Escalation is the only permitted terminal action."
              : "Decision is cryptographically signed to your NPI and written to the append-only audit ledger."}
          </p>
        </div>
      </div>
    </motion.aside>
  );
}
