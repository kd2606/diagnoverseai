"use client";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CircleCheckBig, CloudOff, Filter, RefreshCw, ShieldAlert } from "lucide-react";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { runSafetyProtocols, type ProtocolHit } from "@/lib/triage/safety-protocols";
import type { Decision, TriageCase } from "@/lib/triage/types";
import { TriageTable } from "./triage-table";
import { CasePreviewPanel } from "./case-preview-panel";
import { KpiCard } from "./kpi-card";

export interface AdjudicatedCase extends TriageCase {
  hits: ProtocolHit[];
  bypassed: boolean;
  status: Decision;
}

export interface AuditEntry {
  id: string;
  caseId: string;
  action: string;
  actor: string;
  at: string;
  tone: "emerald" | "rose" | "indigo";
}

export function TriageConsole({ cases, locale }: { cases: TriageCase[]; locale: string }) {
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [filter, setFilter] = useState<"all" | "bypassed" | "recovered">("all");

  /** Single source of truth: the regex layer adjudicates before the model is trusted. */
  const adjudicated = useMemo<AdjudicatedCase[]>(
    () =>
      cases.map((c) => {
        const hits = runSafetyProtocols({ narrative: c.narrative, triageNote: c.triageNote });
        const bypassed = hits.length > 0;
        return {
          ...c,
          hits,
          bypassed,
          status: decisions[c.caseId] ?? (bypassed ? "escalated" : c.modelStatus),
        };
      }),
    [cases, decisions],
  );

  const visible = useMemo(
    () =>
      adjudicated.filter((c) =>
        filter === "bypassed" ? c.bypassed : filter === "recovered" ? c.sync !== "synced" : true,
      ),
    [adjudicated, filter],
  );

  const [activeId, setActiveId] = useState<string>(cases[0]?.caseId ?? "");
  const active = adjudicated.find((c) => c.caseId === activeId) ?? visible[0] ?? adjudicated[0];

  const kpis = useMemo(() => {
    const pending = adjudicated.filter((c) => c.status === "pending");
    const bypassed = adjudicated.filter((c) => c.bypassed);
    const recovered = adjudicated.filter((c) => c.sync !== "synced");
    const breaching = pending.filter((c) => c.receivedMinutesAgo > c.slaMinutes).length;
    const meanConfidence = pending.length
      ? pending.reduce((a, c) => a + c.confidence, 0) / pending.length
      : 0;
    const attempts = recovered.reduce((a, c) => a + c.syncAttempts, 0);
    return { pending, bypassed, recovered, breaching, meanConfidence, attempts };
  }, [adjudicated]);

  const decide = useCallback((caseId: string, next: Exclude<Decision, "pending">, note: string) => {
    setDecisions((prev) => ({ ...prev, [caseId]: next }));
    setAudit((prev) => [
      {
        id: `${caseId}-${prev.length}`,
        caseId,
        action: note,
        actor: "Dr. E. Kovač",
        at: new Date().toLocaleTimeString("en-GB", { hour12: false }),
        tone: (next === "approved" ? "emerald" : "rose") as "emerald" | "rose",
      },
      ...prev,
    ].slice(0, 8));
  }, []);

  const filters = [
    { key: "all" as const, label: "All", count: adjudicated.length },
    { key: "bypassed" as const, label: "Protocol bypass", count: kpis.bypassed.length },
    { key: "recovered" as const, label: "Offline recovered", count: kpis.recovered.length },
  ];

  return (
    <div className="mx-auto flex max-w-[1680px] flex-col gap-6">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <p className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-indigo-300/70">
            <ShieldAlert className="h-3 w-3" strokeWidth={2} />
            Zero-Trust · human-in-the-loop
          </p>
          <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] text-white sm:text-[32px]">
            Zero-Trust Adjudication Queue
          </h1>
          <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-white/45">
            Every model output below is unratified until a licensed clinician signs it. Deterministic safety
            protocols execute on raw intake text before inference is trusted, and cannot be overridden by a
            high confidence score.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-white/[0.05] bg-white/[0.02] p-1 backdrop-blur-3xl">
            <Filter className="ml-2 mr-1 h-3.5 w-3.5 text-white/25" strokeWidth={1.75} />
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`relative rounded-lg px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] transition-colors ${
                  filter === f.key ? "text-white" : "text-white/35 hover:text-white/70"
                }`}
              >
                {filter === f.key && (
                  <motion.span
                    layoutId="filter-pill"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    className="absolute inset-0 rounded-lg border border-white/[0.07] bg-white/[0.06]"
                  />
                )}
                <span className="relative">
                  {f.label} <span className="tabular-nums text-white/40">{f.count}</span>
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="group flex items-center gap-2 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3.5 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/45 backdrop-blur-3xl transition-colors hover:border-indigo-400/25 hover:text-white"
          >
            <RefreshCw className="h-3.5 w-3.5 transition-transform duration-500 group-hover:rotate-180" strokeWidth={2} />
            Resync
          </button>
        </div>
      </motion.header>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KpiCard
          index={0}
          accent="indigo"
          icon={CircleCheckBig}
          label="Pending Approvals"
          value={kpis.pending.length}
          unit="cases"
          delta={`${kpis.breaching} past SLA`}
          deltaTone={kpis.breaching ? "rose" : "emerald"}
          footnote={`mean model confidence ${(kpis.meanConfidence * 100).toFixed(1)}%`}
          progress={kpis.pending.length / Math.max(adjudicated.length, 1)}
        />
        <KpiCard
          index={1}
          accent="rose"
          icon={ShieldAlert}
          label="Critical Escalations"
          value={kpis.bypassed.length}
          unit="regex triggered"
          delta="AI output suppressed"
          deltaTone="rose"
          footnote={`${new Set(kpis.bypassed.flatMap((c) => c.hits.map((h) => h.protocolId))).size} distinct protocols fired`}
          progress={kpis.bypassed.length / Math.max(adjudicated.length, 1)}
          pulse
        />
        <KpiCard
          index={2}
          accent="emerald"
          icon={CloudOff}
          label="Network Recoveries"
          value={kpis.recovered.length}
          unit="offline syncs"
          delta="0 records lost"
          deltaTone="emerald"
          footnote={`${kpis.attempts} reconciliation attempts · idempotent replay`}
          progress={kpis.recovered.length / Math.max(adjudicated.length, 1)}
        />
      </div>

      {/* Split view */}
      <div className="grid min-w-0 grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_440px] 2xl:grid-cols-[minmax(0,1fr)_500px]">
        <TriageTable
          cases={visible}
          activeId={active?.caseId ?? ""}
          onSelect={setActiveId}
          locale={locale}
        />

        <div className="xl:sticky xl:top-[92px]">
          <AnimatePresence mode="wait">
            {active && (
              <CasePreviewPanel
                key={active.caseId}
                triageCase={active}
                audit={audit.filter((a) => a.caseId === active.caseId)}
                onApprove={() =>
                  decide(active.caseId, "approved", `Ratified AI triage · ${active.icd10} @ ${(active.confidence * 100).toFixed(0)}%`)
                }
                onEscalate={(specialty) =>
                  decide(active.caseId, "escalated", `Escalated to ${specialty}`)
                }
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
