"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  Database,
  Download,
  Filter,
  Search,
  SlidersHorizontal,
  UserPlus,
  Users,
} from "lucide-react";

import { GlowPill, PageHeader, SpotlightCard, Tag, glass } from "@/components/patient/ui";

const ACCENT = "#38bdf8"; // Light blue for clinician theme
const cx = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");
const tint = (pct: number) => `color-mix(in oklab, ${ACCENT} ${pct}%, transparent)`;

/* ------------------------------------------------------------------ */
/* Domain model                                                       */
/* ------------------------------------------------------------------ */

type RiskTier = "critical" | "high" | "moderate" | "low";
type CareStatus = "active" | "monitoring" | "discharged";

interface PatientRecord {
  id: string;
  name: string;
  mrn: string;
  age: number;
  sex: "F" | "M" | "X";
  riskTier: RiskTier;
  riskScore: number;
  chiefComplaint: string;
  lastTriageAt: string;
  status: CareStatus;
  openActions: number;
}

const RISK_META: Record<RiskTier, { label: string; text: string; bg: string; ring: string; dot: string }> = {
  critical: { label: "Critical", text: "text-rose-200", bg: "bg-rose-500/10", ring: "ring-rose-400/20", dot: "bg-rose-400" },
  high: { label: "High", text: "text-amber-200", bg: "bg-amber-500/10", ring: "ring-amber-400/20", dot: "bg-amber-400" },
  moderate: { label: "Moderate", text: "text-sky-200", bg: "bg-sky-500/10", ring: "ring-sky-400/20", dot: "bg-sky-400" },
  low: { label: "Low", text: "text-emerald-200", bg: "bg-emerald-500/10", ring: "ring-emerald-400/20", dot: "bg-emerald-400" },
};

const STATUS_LABEL: Record<CareStatus, string> = {
  active: "Active care",
  monitoring: "Monitoring",
  discharged: "Discharged",
};

/** Deterministic, timezone-independent stamp — keeps SSR and client identical. */
const formatStamp = (iso: string) => `${iso.slice(0, 10)} ${iso.slice(11, 16)}Z`;

type SortKey = "risk" | "recent" | "name";
const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: "risk", label: "Risk" },
  { key: "recent", label: "Most recent" },
  { key: "name", label: "A–Z" },
];

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

export function PatientPanel({ patients }: { patients: PatientRecord[] }) {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "en";

  const [query, setQuery] = useState("");
  const [tier, setTier] = useState<RiskTier | "all">("all");
  const [sort, setSort] = useState<SortKey>("risk");

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const tierWeight: Record<RiskTier, number> = { critical: 0, high: 1, moderate: 2, low: 3 };

    return patients.filter((patient) => {
      const matchesTier = tier === "all" || patient.riskTier === tier;
      const matchesQuery =
        !needle ||
        patient.name.toLowerCase().includes(needle) ||
        patient.mrn.toLowerCase().includes(needle) ||
        patient.chiefComplaint.toLowerCase().includes(needle);
      return matchesTier && matchesQuery;
    }).sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "recent") return b.lastTriageAt.localeCompare(a.lastTriageAt);
      return tierWeight[a.riskTier] - tierWeight[b.riskTier] || b.riskScore - a.riskScore;
    });
  }, [query, tier, sort]);

  const stats = useMemo(
    () => [
      { label: "Patients in panel", value: patients.length, hint: "Assigned to you" },
      { label: "Critical stratification", value: patients.filter((p) => p.riskTier === "critical").length, hint: "Needs same-shift review" },
      { label: "Open clinical actions", value: patients.reduce((sum, p) => sum + p.openActions, 0), hint: "Across all records" },
      { label: "Triaged last 24h", value: patients.filter((p) => p.lastTriageAt >= "2026-09-12T06:00:00.000Z").length, hint: "Model-assisted" },
    ],
    [],
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader
          eyebrow="Registry"
          title="Patient Database"
          subtitle="Longitudinal registry of every patient in your panel, stratified by model-assisted acuity."
          icon={Database}
        />
        <div className="flex flex-wrap items-center gap-2">
          <GlowPill>
            <span className="inline-flex items-center gap-1.5 text-[11px]">
              <Users className="h-3 w-3" aria-hidden />
              {patients.length} records synced
            </span>
          </GlowPill>
          <button
            type="button"
            className={cx(
              glass,
              "inline-flex items-center gap-2 rounded-full border border-white/[0.05] bg-white/[0.02] px-4 py-2 text-[12px] font-medium text-white/70 backdrop-blur-3xl transition-colors hover:bg-white/[0.05] hover:text-white",
            )}
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            Export cohort
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-white/[0.1] px-4 py-2 text-[12px] font-semibold text-white transition-transform hover:scale-[1.02]"
            style={{ background: tint(18), boxShadow: `0 12px 40px -18px ${tint(90)}` }}
          >
            <UserPlus className="h-3.5 w-3.5" aria-hidden />
            Enroll patient
          </button>
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <SpotlightCard className="h-full rounded-2xl border border-white/[0.05] bg-white/[0.02] p-5 backdrop-blur-3xl">
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/35">
                {stat.label}
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums text-white">
                {stat.value}
              </p>
              <p className="mt-1 text-[11px] text-white/40">{stat.hint}</p>
            </SpotlightCard>
          </motion.div>
        ))}
      </div>

      {/* Controls */}
      <SpotlightCard className="rounded-2xl border border-white/[0.05] bg-white/[0.02] p-4 backdrop-blur-3xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative flex w-full items-center lg:max-w-md">
            <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-white/30" aria-hidden />
            <span className="sr-only">Search patients</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, MRN, or chief complaint…"
              className="h-11 w-full rounded-xl border border-white/[0.06] bg-black/40 pl-10 pr-3 text-[13px] text-white placeholder:text-white/25 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/10"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-white/30">
              <Filter className="h-3 w-3" aria-hidden />
              Risk
            </span>
            {(["all", "critical", "high", "moderate", "low"] as const).map((option) => {
              const active = tier === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setTier(option)}
                  className={cx(
                    "rounded-full border px-3 py-1.5 text-[11px] font-medium capitalize transition-colors",
                    active
                      ? "border-white/[0.14] bg-white/[0.08] text-white"
                      : "border-white/[0.05] bg-white/[0.02] text-white/45 hover:text-white/80",
                  )}
                >
                  {option}
                </button>
              );
            })}

            <span className="mx-1 hidden h-5 w-px bg-white/[0.06] sm:block" aria-hidden />

            <span className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-white/30">
              <SlidersHorizontal className="h-3 w-3" aria-hidden />
              Sort
            </span>
            {SORTS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setSort(option.key)}
                className={cx(
                  "rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors",
                  sort === option.key
                    ? "border-white/[0.14] bg-white/[0.08] text-white"
                    : "border-white/[0.05] bg-white/[0.02] text-white/45 hover:text-white/80",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </SpotlightCard>

      {/* Grid header (desktop only) */}
      <div className="hidden grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1.2fr)_auto] gap-4 px-5 lg:grid">
        {["Patient", "MRN", "Risk stratification", "Last triage", ""].map((label) => (
          <span key={label} className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/30">
            {label}
          </span>
        ))}
      </div>

      {/* Rows */}
      <div className="space-y-2.5">
        <AnimatePresence initial={false} mode="popLayout">
          {rows.map((patient, index) => {
            const risk = RISK_META[patient.riskTier];
            return (
              <motion.div
                key={patient.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ delay: Math.min(index * 0.035, 0.28), duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <SpotlightCard className="group rounded-2xl border border-white/[0.05] bg-white/[0.02] p-5 backdrop-blur-3xl transition-colors hover:border-white/[0.09]">
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1.2fr)_auto] lg:items-center">
                    {/* Identity */}
                    <div className="flex min-w-0 items-start gap-3">
                      <span
                        className={cx(
                          "mt-1 h-8 w-1 shrink-0 rounded-full ring-1",
                          risk.dot,
                          risk.ring,
                        )}
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-medium tracking-tight text-white">
                          {patient.name}
                        </p>
                        <p className="mt-0.5 text-[11px] text-white/40">
                          {patient.age}
                          {patient.sex} · {STATUS_LABEL[patient.status]}
                          {patient.openActions > 0 && ` · ${patient.openActions} open actions`}
                        </p>
                        <p className="mt-1.5 truncate text-[12px] text-white/55">
                          {patient.chiefComplaint}
                        </p>
                      </div>
                    </div>

                    {/* MRN */}
                    <div>
                      <p className="font-mono text-[12px] tracking-tight text-white/70">{patient.mrn}</p>
                      <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-white/25 lg:hidden">
                        Medical record
                      </p>
                    </div>

                    {/* Risk */}
                    <div className="flex items-center gap-2">
                      <span
                        className={cx(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1",
                          risk.bg,
                          risk.text,
                          risk.ring,
                        )}
                      >
                        <span className={cx("h-1.5 w-1.5 rounded-full", risk.dot)} aria-hidden />
                        {risk.label}
                      </span>
                      <span className="font-mono text-[11px] tabular-nums text-white/35">
                        {patient.riskScore}
                      </span>
                    </div>

                    {/* Last triage */}
                    <div>
                      <p className="font-mono text-[12px] tabular-nums text-white/60">
                        {formatStamp(patient.lastTriageAt)}
                      </p>
                      <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-white/25 lg:hidden">
                        Last triage
                      </p>
                    </div>

                    {/* Action */}
                    <Link
                      href={`/${locale}/dashboard/doctor/patients/${patient.id}`}
                      className="inline-flex items-center gap-1.5 justify-self-start rounded-full border border-white/[0.06] bg-white/[0.02] px-3.5 py-2 text-[11px] font-medium text-white/60 transition-all group-hover:border-white/[0.14] group-hover:text-white lg:justify-self-end"
                    >
                      Open chart
                      <ArrowUpRight className="h-3 w-3" aria-hidden />
                    </Link>
                  </div>
                </SpotlightCard>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {rows.length === 0 && (
          <SpotlightCard className="rounded-2xl border border-white/[0.05] bg-white/[0.02] p-12 text-center backdrop-blur-3xl">
            <p className="text-[14px] font-medium text-white/80">No matching records</p>
            <p className="mt-1.5 text-[12px] text-white/40">
              Adjust the risk filter or clear your search to widen the cohort.
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <Tag>{query ? `query: ${query}` : "no query"}</Tag>
              <Tag>risk: {tier}</Tag>
            </div>
          </SpotlightCard>
        )}
      </div>
    </div>
  );
}
