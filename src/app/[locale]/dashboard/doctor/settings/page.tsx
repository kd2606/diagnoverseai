"use client";

import { useId, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeCheck,
  Bell,
  Check,
  Copy,
  Cpu,
  Gauge,
  Info,
  RotateCcw,
  Save,
  Settings,
  ShieldCheck,
  Sparkles,
  Thermometer,
} from "lucide-react";

import { GlowPill, PageHeader, SpotlightCard, Tag, glass } from "@/components/patient/ui";

const ACCENT = "#38bdf8"; // Light blue for clinician theme
const cx = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");
const tint = (pct: number) => `color-mix(in oklab, ${ACCENT} ${pct}%, transparent)`;

/* ------------------------------------------------------------------ */
/* Preference state                                                   */
/* ------------------------------------------------------------------ */

interface Preferences {
  criticalPush: boolean;
  overrideDigest: boolean;
  bypassAlerts: boolean;
  quietHours: boolean;
  riskThreshold: number;
  confidenceFloor: number;
  escalationSlaMinutes: number;
  autonomy: "advisory" | "assistive" | "co-sign";
  showChainOfThought: boolean;
  deterministicOverrides: boolean;
}

const DEFAULTS: Preferences = {
  criticalPush: true,
  overrideDigest: true,
  bypassAlerts: true,
  quietHours: false,
  riskThreshold: 70,
  confidenceFloor: 0.75,
  escalationSlaMinutes: 15,
  autonomy: "co-sign",
  showChainOfThought: true,
  deterministicOverrides: true,
};

const CLINICIAN = {
  name: "Dr. Amara Osei",
  credential: "MD, FACEP",
  npi: "1861792304",
  dea: "BO4827193",
  license: "CA-A-114982",
  primaryFacility: "Aurora General · Emergency Department",
  taxonomy: "207P00000X — Emergency Medicine",
};

const MODEL = {
  id: "gemini-1.5-pro-002",
  displayName: "Gemini 1.5 Pro",
  contextWindow: "2,000,000 tokens",
  region: "us-central1 · HIPAA-eligible",
  pinnedSince: "2026-06-04",
  evalPassRate: "98.2%",
  fallback: "gemini-1.5-flash-002",
};

const AUTONOMY_OPTIONS: Array<{ value: Preferences["autonomy"]; label: string; description: string }> = [
  { value: "advisory", label: "Advisory", description: "Model surfaces a differential only. No orders are pre-staged." },
  { value: "assistive", label: "Assistive", description: "Model pre-stages orders; each requires explicit selection." },
  { value: "co-sign", label: "Co-sign required", description: "Full plan drafted, blocked until you countersign. Recommended." },
];

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

export default function ClinicianSettingsPage() {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS);
  const [saved, setSaved] = useState(false);

  const dirty = useMemo(
    () => (Object.keys(DEFAULTS) as Array<keyof Preferences>).some((key) => prefs[key] !== DEFAULTS[key]),
    [prefs],
  );

  const update = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPrefs((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const onSave = () => {
    // Wire to your mutation, e.g. await savePreferences(prefs);
    setSaved(true);
  };

  return (
    <div className="space-y-8 pb-28">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader
          eyebrow="Configuration"
          title="Clinician Preferences"
          subtitle="Credentials, alert thresholds, and the model configuration governing your triage sessions."
          icon={Settings}
        />
        <GlowPill>
          <span className="inline-flex items-center gap-1.5 text-[11px]">
            <ShieldCheck className="h-3 w-3" aria-hidden />
            Changes are audit-logged
          </span>
        </GlowPill>
      </div>

      {/* ---------------- Account & NPI ---------------- */}
      <Section
        index={0}
        icon={BadgeCheck}
        title="Account & NPI Details"
        description="Sourced from the credentialing registry. Fields are read-only here; submit changes through Medical Staff Services."
      >
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <ReadOnlyField label="Legal name" value={`${CLINICIAN.name}, ${CLINICIAN.credential}`} />
          <ReadOnlyField label="Primary facility" value={CLINICIAN.primaryFacility} />
          <ReadOnlyField label="NPI" value={CLINICIAN.npi} mono copyable />
          <ReadOnlyField label="DEA" value={CLINICIAN.dea} mono copyable />
          <ReadOnlyField label="State license" value={CLINICIAN.license} mono />
          <ReadOnlyField label="Taxonomy" value={CLINICIAN.taxonomy} mono />
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-white/[0.05] pt-5">
          <Tag>Verified 2026-07-01</Tag>
          <Tag>PECOS active</Tag>
          <Tag>Re-attestation quarterly</Tag>
        </div>
      </Section>

      {/* ---------------- Notification thresholds ---------------- */}
      <Section
        index={1}
        icon={Bell}
        title="Notification Thresholds"
        description="Tune when the platform interrupts you. Critical escalations always page, regardless of quiet hours."
      >
        <div className="space-y-1">
          <Toggle
            label="Critical stratification push"
            description="Immediate device page when a patient crosses the critical tier."
            checked={prefs.criticalPush}
            onChange={(value) => update("criticalPush", value)}
          />
          <Toggle
            label="Protocol bypass alerts"
            description="Notify when a deterministic rule suppresses the model path."
            checked={prefs.bypassAlerts}
            onChange={(value) => update("bypassAlerts", value)}
          />
          <Toggle
            label="Daily override digest"
            description="Morning summary of every override you and your team recorded."
            checked={prefs.overrideDigest}
            onChange={(value) => update("overrideDigest", value)}
          />
          <Toggle
            label="Quiet hours (22:00 – 06:00)"
            description="Suppress non-critical notifications overnight."
            checked={prefs.quietHours}
            onChange={(value) => update("quietHours", value)}
          />
        </div>

        <div className="mt-7 grid gap-7 border-t border-white/[0.05] pt-7 sm:grid-cols-2">
          <Slider
            icon={Gauge}
            label="Risk score alert floor"
            value={prefs.riskThreshold}
            min={40}
            max={95}
            step={5}
            display={`${prefs.riskThreshold}`}
            hint="Only alert on patients scoring at or above this value."
            onChange={(value) => update("riskThreshold", value)}
          />
          <Slider
            icon={Thermometer}
            label="Escalation SLA"
            value={prefs.escalationSlaMinutes}
            min={5}
            max={60}
            step={5}
            display={`${prefs.escalationSlaMinutes} min`}
            hint="Re-page if an escalation is unacknowledged past this window."
            onChange={(value) => update("escalationSlaMinutes", value)}
          />
        </div>
      </Section>

      {/* ---------------- AI model configuration ---------------- */}
      <Section
        index={2}
        icon={Cpu}
        title="AI Model Configuration"
        description="The pinned model version, its guardrails, and how much autonomy it holds in your workflow."
      >
        <div className="rounded-2xl border border-white/[0.06] bg-black/40 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span
                className="grid h-9 w-9 place-items-center rounded-xl border border-white/[0.08]"
                style={{ background: tint(14), color: ACCENT }}
              >
                <Sparkles className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <p className="text-[14px] font-medium tracking-tight text-white">
                  {MODEL.displayName}
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-white/40">{MODEL.id}</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-200 ring-1 ring-emerald-400/20">
              <Check className="h-3 w-3" aria-hidden />
              Version pinned
            </span>
          </div>

          <dl className="mt-5 grid gap-x-8 gap-y-3 border-t border-white/[0.05] pt-5 sm:grid-cols-2">
            <SpecRow label="Context window" value={MODEL.contextWindow} />
            <SpecRow label="Serving region" value={MODEL.region} />
            <SpecRow label="Pinned since" value={MODEL.pinnedSince} />
            <SpecRow label="Clinical eval pass rate" value={MODEL.evalPassRate} />
            <SpecRow label="Degraded fallback" value={MODEL.fallback} />
            <SpecRow label="Training data usage" value="Disabled (zero-retention)" />
          </dl>
        </div>

        <fieldset className="mt-7">
          <legend className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/35">
            Autonomy level
          </legend>
          <div className="mt-3.5 grid gap-2.5 lg:grid-cols-3">
            {AUTONOMY_OPTIONS.map((option) => {
              const active = prefs.autonomy === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => update("autonomy", option.value)}
                  className={cx(
                    "rounded-2xl border p-4 text-left transition-all duration-200",
                    active
                      ? "border-white/[0.14] bg-white/[0.06]"
                      : "border-white/[0.05] bg-white/[0.02] hover:border-white/[0.09]",
                  )}
                  style={active ? { boxShadow: `inset 0 0 40px -24px ${tint(100)}` } : undefined}
                >
                  <span className="flex items-center justify-between">
                    <span className="text-[13px] font-medium tracking-tight text-white">
                      {option.label}
                    </span>
                    {active && <Check className="h-3.5 w-3.5" style={{ color: ACCENT }} aria-hidden />}
                  </span>
                  <span className="mt-2 block text-[11px] leading-relaxed text-white/45">
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-7 space-y-1 border-t border-white/[0.05] pt-5">
          <Toggle
            label="Show model reasoning summary"
            description="Display the condensed rationale alongside each ranked differential."
            checked={prefs.showChainOfThought}
            onChange={(value) => update("showChainOfThought", value)}
          />
          <Toggle
            label="Deterministic protocols take precedence"
            description="Hard-coded red-flag rules always supersede model output. Cannot be disabled by policy."
            checked={prefs.deterministicOverrides}
            onChange={(value) => update("deterministicOverrides", value)}
            locked
          />
        </div>

        <div className="mt-7">
          <Slider
            icon={Gauge}
            label="Minimum confidence to surface a recommendation"
            value={Math.round(prefs.confidenceFloor * 100)}
            min={50}
            max={95}
            step={5}
            display={prefs.confidenceFloor.toFixed(2)}
            hint="Below this threshold the encounter routes to unassisted clinician review."
            onChange={(value) => update("confidenceFloor", value / 100)}
          />
        </div>
      </Section>

      {/* ---------------- Sticky save bar ---------------- */}
      <AnimatePresence>
        {dirty && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-4 bottom-5 z-40 mx-auto max-w-3xl sm:inset-x-6"
          >
            <div
              className={cx(
                glass,
                "flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-black/80 px-5 py-4 backdrop-blur-3xl",
              )}
              style={{ boxShadow: "0 24px 70px -30px rgba(0,0,0,0.9)" }}
            >
              <p className="inline-flex items-center gap-2 text-[12px] text-white/60">
                <Info className="h-3.5 w-3.5 text-white/35" aria-hidden />
                {saved ? "Preferences saved and written to the audit ledger." : "Unsaved preference changes."}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPrefs(DEFAULTS);
                    setSaved(false);
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-white/[0.06] px-4 py-2 text-[12px] font-medium text-white/60 transition-colors hover:bg-white/[0.04] hover:text-white"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                  Reset
                </button>
                <button
                  type="button"
                  onClick={onSave}
                  className="inline-flex items-center gap-2 rounded-full border border-white/[0.1] px-5 py-2 text-[12px] font-semibold text-white transition-transform hover:scale-[1.02]"
                  style={{ background: tint(20), boxShadow: `0 14px 44px -20px ${tint(100)}` }}
                >
                  <Save className="h-3.5 w-3.5" aria-hidden />
                  Save changes
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Local building blocks                                              */
/* ------------------------------------------------------------------ */

function Section({
  index,
  icon: Icon,
  title,
  description,
  children,
}: {
  index: number;
  icon: typeof Bell;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <SpotlightCard className="rounded-2xl border border-white/[0.05] bg-white/[0.02] p-6 backdrop-blur-3xl sm:p-7">
        <header className="flex items-start gap-3.5 border-b border-white/[0.05] pb-6">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/[0.07] bg-white/[0.03] text-white/70">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight text-white">{title}</h2>
            <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-white/45">{description}</p>
          </div>
        </header>
        <div className="pt-6">{children}</div>
      </SpotlightCard>
    </motion.section>
  );
}

function ReadOnlyField({
  label,
  value,
  mono = false,
  copyable = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  copyable?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/35">{label}</p>
      <div className="mt-2 flex items-center gap-2">
        <p className={cx("truncate text-[13px] text-white/85", mono && "font-mono text-[12px] tabular-nums")}>
          {value}
        </p>
        {copyable && (
          <button
            type="button"
            onClick={onCopy}
            aria-label={`Copy ${label}`}
            className="shrink-0 rounded-lg border border-white/[0.06] p-1.5 text-white/40 transition-colors hover:bg-white/[0.05] hover:text-white"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-300" aria-hidden /> : <Copy className="h-3 w-3" aria-hidden />}
          </button>
        )}
      </div>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-[11px] text-white/40">{label}</dt>
      <dd className="truncate font-mono text-[11px] text-white/75">{value}</dd>
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
  locked = false,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  locked?: boolean;
}) {
  const id = useId();

  return (
    <div className="flex items-start justify-between gap-6 rounded-xl px-1 py-3.5 transition-colors hover:bg-white/[0.015]">
      <div className="min-w-0">
        <label htmlFor={id} className="text-[13px] font-medium tracking-tight text-white/90">
          {label}
        </label>
        <p className="mt-1 text-[11px] leading-relaxed text-white/40">{description}</p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-disabled={locked}
        disabled={locked}
        onClick={() => !locked && onChange(!checked)}
        className={cx(
          "mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full border p-0.5 transition-colors duration-200",
          checked ? "justify-end border-white/[0.12]" : "justify-start border-white/[0.07] bg-white/[0.04]",
          locked && "cursor-not-allowed opacity-60",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
        )}
        style={checked ? { background: tint(28) } : undefined}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 560, damping: 34 }}
          className="h-5 w-5 rounded-full bg-white shadow-[0_1px_6px_rgba(0,0,0,0.45)]"
        />
      </button>
    </div>
  );
}

function Slider({
  icon: Icon,
  label,
  value,
  min,
  max,
  step,
  display,
  hint,
  onChange,
}: {
  icon: typeof Gauge;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  hint: string;
  onChange: (value: number) => void;
}) {
  const id = useId();

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <label htmlFor={id} className="inline-flex items-center gap-2 text-[12px] font-medium text-white/80">
          <Icon className="h-3.5 w-3.5 text-white/35" aria-hidden />
          {label}
        </label>
        <span
          className="rounded-full border border-white/[0.08] px-2.5 py-1 font-mono text-[11px] tabular-nums"
          style={{ background: tint(14), color: ACCENT }}
        >
          {display}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ accentColor: ACCENT }}
        className="mt-4 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
      />
      <p className="mt-2.5 text-[11px] leading-relaxed text-white/40">{hint}</p>
    </div>
  );
}
