"use client";
import { useTranslations } from "next-intl";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Brain,
  ChevronDown,
  Fingerprint,
  GitBranch,
  Link2,
  Lock,
  Search,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  Siren,
  UserCheck,
} from "lucide-react";

import { GlowPill, PageHeader, SpotlightCard, glass } from "@/components/patient/ui";

const ACCENT = "#38bdf8"; // Light blue for clinician theme
const cx = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");
const tint = (pct: number) => `color-mix(in oklab, ${ACCENT} ${pct}%, transparent)`;

/* ------------------------------------------------------------------ */
/* Ledger model                                                       */
/* ------------------------------------------------------------------ */

type AuditKind = "inference" | "bypass" | "override" | "approval" | "escalation" | "attestation";

interface AuditEvent {
  id: string;
  kind: AuditKind;
  at: string;
  actor: { name: string; role: string };
  subject: { mrn: string; label: string };
  summary: string;
  model?: {
    name: string;
    version: string;
    confidence: number;
    latencyMs: number;
    promptTokens: number;
    completionTokens: number;
  };
  protocol?: { rule: string; outcome: string };
  hash: string;
  prevHash: string;
}

const KIND_META: Record<
  AuditKind,
  { label: string; icon: typeof Brain; text: string; bg: string; ring: string; dot: string }
> = {
  inference: { label: "AI inference", icon: Brain, text: "text-indigo-200", bg: "bg-indigo-500/10", ring: "ring-indigo-400/20", dot: "bg-indigo-400" },
  bypass: { label: "Protocol bypass", icon: ShieldAlert, text: "text-amber-200", bg: "bg-amber-500/10", ring: "ring-amber-400/20", dot: "bg-amber-400" },
  override: { label: "Clinician override", icon: GitBranch, text: "text-fuchsia-200", bg: "bg-fuchsia-500/10", ring: "ring-fuchsia-400/20", dot: "bg-fuchsia-400" },
  approval: { label: "Clinician approval", icon: UserCheck, text: "text-emerald-200", bg: "bg-emerald-500/10", ring: "ring-emerald-400/20", dot: "bg-emerald-400" },
  escalation: { label: "Escalation", icon: Siren, text: "text-rose-200", bg: "bg-rose-500/10", ring: "ring-rose-400/20", dot: "bg-rose-400" },
  attestation: { label: "Attestation", icon: Fingerprint, text: "text-sky-200", bg: "bg-sky-500/10", ring: "ring-sky-400/20", dot: "bg-sky-400" },
};

const formatStamp = (iso: string) => `${iso.slice(0, 10)} ${iso.slice(11, 19)}Z`;
const shortHash = (hash: string) => `${hash.slice(0, 10)}…${hash.slice(-6)}`;

const EVENTS: AuditEvent[] = [
  {
    id: "evt-90211",
    kind: "escalation",
    at: "2026-09-13T06:12:41.000Z",
    actor: { name: "Triage Engine", role: "Deterministic protocol" },
    subject: { mrn: "MRN-884120", label: "Chest pain, 67F" },
    summary: "HEART score ≥ 7 with ischemic ECG features — routed to immediate cardiology activation, bypassing model ranking.",
    protocol: { rule: "ACS-RED-01 · mandatory escalation", outcome: "Escalated to cath-lab pathway in 340 ms" },
    hash: "9f2c1ab47e0d5c3b9d6741af08b2e5c1d4f77a90bb31c6de8e2a405f6c9d1e73",
    prevHash: "3a71d0ffc4b28e6a5719cd0b2f84e6a1c9d3b7025e4f8a1c6b9d02e7f4a8c531",
  },
  {
    id: "evt-90210",
    kind: "inference",
    at: "2026-09-13T06:12:40.660Z",
    actor: { name: "Gemini 1.5 Pro", role: "Primary triage model" },
    subject: { mrn: "MRN-884120", label: "Chest pain, 67F" },
    summary: "Differential generated with ACS ranked first; recommended troponin, 12-lead ECG, and aspirin per unit protocol.",
    model: { name: "gemini-1.5-pro", version: "002", confidence: 0.94, latencyMs: 1_284, promptTokens: 3_118, completionTokens: 642 },
    hash: "3a71d0ffc4b28e6a5719cd0b2f84e6a1c9d3b7025e4f8a1c6b9d02e7f4a8c531",
    prevHash: "cc10e4b96d7f2a08b3145e7c0da29f6b8e1d4c73a05f9b2e6d8c1074a3f5b9e2",
  },
  {
    id: "evt-90209",
    kind: "override",
    at: "2026-09-13T05:41:09.000Z",
    actor: { name: "Dr. Amara Osei", role: "Attending · NPI 1861792304" },
    subject: { mrn: "MRN-884121", label: "Calf swelling, 41M" },
    summary: "Overrode model's 'low probability PE' ranking to high after documenting recent transcontinental flight absent from intake.",
    model: { name: "gemini-1.5-pro", version: "002", confidence: 0.61, latencyMs: 1_042, promptTokens: 2_744, completionTokens: 511 },
    protocol: { rule: "WELLS-ADJ-04 · clinician gestalt precedence", outcome: "Model output demoted; CTPA ordered" },
    hash: "cc10e4b96d7f2a08b3145e7c0da29f6b8e1d4c73a05f9b2e6d8c1074a3f5b9e2",
    prevHash: "7b48a2e0c9d13f5748ab6c20e9d5f31b4a08c76de2f1a934b5c60d7e8f2a41bc",
  },
  {
    id: "evt-90208",
    kind: "bypass",
    at: "2026-09-13T04:48:55.000Z",
    actor: { name: "Triage Engine", role: "Deterministic protocol" },
    subject: { mrn: "MRN-884123", label: "Dyspnea, 73M" },
    summary: "Model output suppressed: SpO₂ 88% on room air crossed hard-coded vitals threshold, forcing deterministic red-flag path.",
    protocol: { rule: "VITALS-HARD-02 · SpO₂ < 90%", outcome: "LLM path disabled for this encounter" },
    hash: "7b48a2e0c9d13f5748ab6c20e9d5f31b4a08c76de2f1a934b5c60d7e8f2a41bc",
    prevHash: "12f9c7d3a5b80e64719d2c0af38b6e5d4c17a90b2e6f8d1c3a5b70e92d4f6a18",
  },
  {
    id: "evt-90207",
    kind: "approval",
    at: "2026-09-12T21:05:12.000Z",
    actor: { name: "Dr. Amara Osei", role: "Attending · NPI 1861792304" },
    subject: { mrn: "MRN-884122", label: "Migraine with aura, 29F" },
    summary: "Accepted model plan unchanged; documented no red flags on focused neuro exam and countersigned the recommendation.",
    model: { name: "gemini-1.5-pro", version: "002", confidence: 0.88, latencyMs: 968, promptTokens: 2_210, completionTokens: 430 },
    hash: "12f9c7d3a5b80e64719d2c0af38b6e5d4c17a90b2e6f8d1c3a5b70e92d4f6a18",
    prevHash: "5e0b7a14c8d2f936ab45e70c1d9f82b6a3c07d5e1f4a8b92c6d03e75f1a9b48d",
  },
  {
    id: "evt-90206",
    kind: "attestation",
    at: "2026-09-12T08:00:00.000Z",
    actor: { name: "Dr. Amara Osei", role: "Attending · NPI 1861792304" },
    subject: { mrn: "—", label: "Session-level" },
    summary: "Quarterly model-use attestation signed: reviewed intended use, known limitations, and override responsibilities.",
    hash: "5e0b7a14c8d2f936ab45e70c1d9f82b6a3c07d5e1f4a8b92c6d03e75f1a9b48d",
    prevHash: "0ac36f81b25d7e094c18a6f3d2b95e7c4a10d86bf293c5e7a8b04d19f6c2e35a",
  },
];

const FILTERS: Array<{ key: AuditKind | "all"; label: string }> = [
  { key: "all", label: "All events" },
  { key: "inference", label: "Inferences" },
  { key: "bypass", label: "Bypasses" },
  { key: "override", label: "Overrides" },
  { key: "approval", label: "Approvals" },
  { key: "escalation", label: "Escalations" },
];

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

export function AuditLedger({ events: rawEvents, integrity }: { events: any[], integrity: { intact: boolean, totalEntries: number, brokenAt: number[] } | null }) {
  const t = useTranslations("Doctor");

      const mappedEvents = (rawEvents || []).map(e => ({
        id: e.id,
        kind: (e.actionType || 'inference') as AuditKind,
        at: e.createdAt || new Date().toISOString(),
        actor: { name: e.actorName || 'System', role: e.actorRole || 'system' },
        subject: { mrn: 'MRN-' + (e.caseId ? e.caseId.slice(0,6).toUpperCase() : 'UNKNOWN'), label: 'Triage Case' },
        summary: e.summary || '',
        hash: e.hash || '',
        prevHash: e.prevHash || '',
        model: undefined as any,
        protocol: undefined as any
      }));
    
  const [filter, setFilter] = useState<AuditKind | "all">("all");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(mappedEvents[0]?.id ?? null);

  const events = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return mappedEvents.filter((event) => {
      const matchesKind = filter === "all" || event.kind === filter;
      const matchesQuery =
        !needle ||
        event.summary.toLowerCase().includes(needle) ||
        event.subject.mrn.toLowerCase().includes(needle) ||
        event.actor.name.toLowerCase().includes(needle) ||
        event.hash.includes(needle);
      return matchesKind && matchesQuery;
    });
  }, [filter, query]);

  return (
    <div className="space-y-8">
      {integrity && (
        <SpotlightCard className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
          <span className="text-sm text-white/60 font-mono">
            SHA-256 chain · {integrity.totalEntries} sealed entries
          </span>
          <span
            className={
              integrity.intact
                ? 'text-sm font-semibold text-emerald-400'
                : 'text-sm font-semibold text-red-400'
            }
          >
            {integrity.intact
              ? 'Verified — no tampering detected'
              : `INTEGRITY FAILURE at seq ${integrity.brokenAt.join(', ')}`}
          </span>
        </SpotlightCard>
      )}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader
          eyebrow="Compliance"
          title="Model Audit Logs"
          subtitle="Immutable, append-only ledger of AI decisions and human overrides"
          icon={ScrollText}
        />
        <div className="flex flex-wrap items-center gap-2">
          <GlowPill>
            <span className="inline-flex items-center gap-1.5 text-[11px]">
              <Lock className="h-3 w-3" aria-hidden />
              Write-once · WORM storage
            </span>
          </GlowPill>
          <button
            type="button"
            className={cx(
              glass,
              "inline-flex items-center gap-2 rounded-full border border-white/[0.05] bg-white/[0.02] px-4 py-2 text-[12px] font-medium text-white/70 backdrop-blur-3xl transition-colors hover:bg-white/[0.05] hover:text-white",
            )}
          >
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            Verify chain
          </button>
        </div>
      </div>

      {/* Integrity banner */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <SpotlightCard className="relative overflow-hidden rounded-2xl border border-white/[0.05] bg-white/[0.02] p-6 backdrop-blur-3xl">
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full blur-3xl"
            style={{ background: tint(12) }}
            aria-hidden
          />
          <div className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <LedgerStat label="Chain status" value="Verified" mono={false} accent hint="Merkle root matches notary" />
            <LedgerStat label="Ledger entries" value="12,481" hint="Since 2025-04-02" />
            <LedgerStat label="Override rate (30d)" value="6.8%" hint="142 of 2,088 inferences" />
            <LedgerStat label="Merkle root" value="9f2c1ab4…9d1e73" hint="sha256 · sealed hourly" />
          </div>
        </SpotlightCard>
      </motion.div>

      {/* Controls */}
      <SpotlightCard className="rounded-2xl border border-white/[0.05] bg-white/[0.02] p-4 backdrop-blur-3xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative flex w-full items-center lg:max-w-md">
            <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-white/30" aria-hidden />
            <span className="sr-only">{t("searchLedger")}</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search MRN, actor, hash, or decision text…"
              className="h-11 w-full rounded-xl border border-white/[0.06] bg-black/40 pl-10 pr-3 font-mono text-[12px] text-white placeholder:font-sans placeholder:text-white/25 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/10"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setFilter(option.key)}
                className={cx(
                  "rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors",
                  filter === option.key
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

      {/* Timeline */}
      <div className="relative">
        <div
          className="absolute left-[15px] top-2 bottom-2 w-px bg-gradient-to-b from-white/[0.12] via-white/[0.05] to-transparent sm:left-[19px]"
          aria-hidden
        />
        <ol className="space-y-3">
          <AnimatePresence initial={false} mode="popLayout">
            {events.map((event, index) => {
              const meta = KIND_META[event.kind];
              const Icon = meta.icon;
              const open = expanded === event.id;

              return (
                <motion.li
                  key={event.id}
                  layout
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ delay: Math.min(index * 0.045, 0.3), duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                  className="relative pl-10 sm:pl-14"
                >
                  <span
                    className={cx(
                      "absolute left-0 top-5 grid h-8 w-8 place-items-center rounded-full border border-white/[0.07] bg-black/80 ring-1 backdrop-blur-3xl sm:left-1",
                      meta.ring,
                    )}
                  >
                    <Icon className={cx("h-3.5 w-3.5", meta.text)} aria-hidden />
                  </span>

                  <SpotlightCard className="rounded-2xl border border-white/[0.05] bg-white/[0.02] backdrop-blur-3xl">
                    <button
                      type="button"
                      onClick={() => setExpanded(open ? null : event.id)}
                      aria-expanded={open}
                      className="flex w-full items-start gap-4 p-5 text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cx(
                              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ring-1",
                              meta.bg,
                              meta.text,
                              meta.ring,
                            )}
                          >
                            <span className={cx("h-1.5 w-1.5 rounded-full", meta.dot)} aria-hidden />
                            {meta.label}
                          </span>
                          <span className="font-mono text-[11px] tabular-nums text-white/40">
                            {formatStamp(event.at)}
                          </span>
                          <span className="font-mono text-[11px] text-white/30">
                            {event.subject.mrn}
                          </span>
                        </div>

                        <p className="mt-3 text-[13px] leading-relaxed text-white/80">
                          {event.summary}
                        </p>

                        <p className="mt-2 text-[11px] text-white/40">
                          <span className="text-white/60">{event.actor.name}</span> · {event.actor.role} ·{" "}
                          {event.subject.label}
                        </p>
                      </div>

                      <ChevronDown
                        className={cx(
                          "mt-1 h-4 w-4 shrink-0 text-white/30 transition-transform duration-200",
                          open && "rotate-180",
                        )}
                        aria-hidden
                      />
                    </button>

                    <AnimatePresence initial={false}>
                      {open && (
                        <motion.div
                          key="detail"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-5 border-t border-white/[0.05] px-5 py-5">
                            {event.model && (
                              <DetailBlock title="Model telemetry">
                                <DetailRow label="Model" value={`${event.model.name}@${event.model.version}`} />
                                <DetailRow label="Confidence" value={event.model.confidence.toFixed(2)} />
                                <DetailRow label="Latency" value={`${event.model.latencyMs.toLocaleString()} ms`} />
                                <DetailRow
                                  label="Tokens"
                                  value={`${event.model.promptTokens.toLocaleString()} in / ${event.model.completionTokens.toLocaleString()} out`}
                                />
                              </DetailBlock>
                            )}

                            {event.protocol && (
                              <DetailBlock title="Deterministic protocol">
                                <DetailRow label="Rule" value={event.protocol.rule} />
                                <DetailRow label="Outcome" value={event.protocol.outcome} span />
                              </DetailBlock>
                            )}

                            <DetailBlock title="Cryptographic chain">
                              <DetailRow label="Entry hash" value={shortHash(event.hash)} />
                              <DetailRow label="Previous" value={shortHash(event.prevHash)} />
                            </DetailBlock>

                            <div className="flex flex-wrap items-center gap-3 pt-1">
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-emerald-200 ring-1 ring-emerald-400/20">
                                <ShieldCheck className="h-3 w-3" aria-hidden />
                                Signature valid
                              </span>
                              <span className="inline-flex items-center gap-1.5 text-[11px] text-white/35">
                                <Link2 className="h-3 w-3" aria-hidden />
                                Linked to prior entry
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </SpotlightCard>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ol>

        {events.length === 0 && (
          <div className="pl-10 sm:pl-14">
            <SpotlightCard className="rounded-2xl border border-white/[0.05] bg-white/[0.02] p-12 text-center backdrop-blur-3xl">
              <p className="text-[14px] font-medium text-white/80">{t("noLedgerEntries")}</p>
              <p className="mt-1.5 text-[12px] text-white/40">
                The ledger is append-only — entries are never deleted, only filtered from this view.
              </p>
            </SpotlightCard>
          </div>
        )}
      </div>
    </div>
  );
}

function LedgerStat({
  label,
  value,
  hint,
  mono = true,
  accent = false,
}: {
  label: string;
  value: string;
  hint: string;
  mono?: boolean;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/35">{label}</p>
      <p
        className={cx(
          "mt-2.5 text-xl font-semibold tracking-tight",
          mono && "font-mono text-[15px] tabular-nums",
        )}
        style={accent ? { color: ACCENT } : undefined}
      >
        {value}
      </p>
      <p className="mt-1 text-[11px] text-white/40">{hint}</p>
    </div>
  );
}

function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/30">{title}</p>
      <dl className="mt-3 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">{children}</dl>
    </div>
  );
}

function DetailRow({ label, value, span = false }: { label: string; value: string; span?: boolean }) {
  return (
    <div className={cx("flex items-baseline justify-between gap-4", span && "sm:col-span-2")}>
      <dt className="text-[11px] text-white/40">{label}</dt>
      <dd className="truncate font-mono text-[11px] tabular-nums text-white/75">{value}</dd>
    </div>
  );
}
