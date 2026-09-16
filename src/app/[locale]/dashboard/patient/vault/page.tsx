"use client";
import { useTranslations } from "next-intl";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  BellRing,
  CalendarClock,
  Download,
  FileHeart,
  FolderLock,
  Landmark,
  Plus,
  ScanLine,
  Search,
  ShieldCheck,
} from "lucide-react";
import {
  ACCENT,
  Accent,
  ClinicalDisclaimer,
  EmptyState,
  GlowPill,
  PageHeader,
  PageShell,
  SpotlightCard,
  Tag,
  cn,
  glass,
  usePatientHref,
} from "@/components/patient/ui";

/* ---------------------------------------------------------------- models */

type RecordItem = {
  id: string;
  title: string;
  source: string;
  date: string;
  kind: "SCAN" | "AUDIO" | "FORM";
  accent: Accent;
};

type ReminderItem = {
  id: string;
  title: string;
  when: string;
  cadence: string;
  active: boolean;
};

type SchemeItem = {
  id: string;
  title: string;
  summary: string;
  status: "ELIGIBLE" | "REVIEW" | "APPLIED";
};

type TabId = "records" | "reminders" | "schemes";

const TABS: { id: TabId; label: string; icon: typeof FileHeart; accent: Accent }[] = [
  { id: "records", label: "Health Records", icon: FileHeart, accent: "indigo" },
  { id: "reminders", label: "Reminders", icon: BellRing, accent: "emerald" },
  { id: "schemes", label: "Govt Schemes", icon: Landmark, accent: "rose" },
];

const KIND_ICON = { SCAN: ScanLine, AUDIO: Activity, FORM: FileHeart };

/* ------------------------------------------------------------------ page */

export default function ClinicalVaultPage() {
  const t = useTranslations("Vault");
  const href = usePatientHref();
  const [tab, setTab] = useState<TabId>("records");
  const [query, setQuery] = useState("");

  const [records, setRecords] = useState<RecordItem[]>([]);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [schemes] = useState<SchemeItem[]>([]);

  useEffect(() => {
    async function loadVault() {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let patientId = user.id;
      const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).single() as any;
      if (profile) patientId = profile.id;

      const { data } = await supabase
        .from('triage_cases')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (data) {
        setRecords(data.map((c: any) => ({
          id: c.id,
          title: c.chief_complaint || 'Triage Case',
          source: c.status === 'verified' ? 'Clinician Verified' : 'AI Assessment',
          date: new Date(c.created_at).toLocaleDateString(),
          kind: 'SCAN',
          accent: 'indigo'
        })));
      }
    }
    loadVault();
  }, []);

  const filteredRecords = useMemo(
    () =>
      records.filter((r) =>
        (r.title + r.source).toLowerCase().includes(query.trim().toLowerCase())
      ),
    [records, query]
  );

  const counts: Record<TabId, number> = {
    records: records.length,
    reminders: reminders.length,
    schemes: schemes.length,
  };

  const activeTab = TABS.find((t) => t.id === tab)!;

  return (
    <PageShell>
      <PageHeader
        eyebrow="Module 04 · Archive"
        title="Clinical Vault"
        subtitle="Everything in one place — your AI results, your reminders and the health schemes you may qualify for."
        icon={FolderLock}
      />

      {/* ------------------------------------------------------------ tabs */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="tablist"
          aria-label="Vault sections"
          className={cn("flex gap-1.5 self-start rounded-2xl p-1.5", glass)}
        >
          {TABS.map((t) => {
            const selected = t.id === tab;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={selected}
                onClick={() => setTab(t.id)}
                className="relative flex min-h-[48px] items-center gap-2.5 rounded-xl px-4 text-[14px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-white/30 sm:px-5"
              >
                {selected && (
                  <motion.span
                    layoutId="vault-tab"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    className={cn(
                      "absolute inset-0 rounded-xl border border-white/10",
                      ACCENT[t.accent].soft,
                      ACCENT[t.accent].glow
                    )}
                  />
                )}
                <t.icon
                  className={cn(
                    "relative h-[17px] w-[17px]",
                    selected ? ACCENT[t.accent].text : "text-white/40"
                  )}
                  strokeWidth={1.75}
                />
                <span className={cn("relative", selected ? "text-white" : "text-white/50")}>
                  {t.label}
                </span>
                {counts[t.id] > 0 && (
                  <span className="relative font-mono text-[10px] text-white/35">
                    {counts[t.id]}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {tab === "records" && records.length > 0 && (
          <label
            className={cn(
              "flex min-h-[48px] items-center gap-3 rounded-2xl px-4 sm:w-72",
              glass,
              "focus-within:ring-1 focus-within:ring-indigo-500/50"
            )}
          >
            <Search className="h-4 w-4 shrink-0 text-white/30" strokeWidth={1.75} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search records"
              className="w-full border-0 bg-transparent text-sm text-white outline-none placeholder:text-white/25"
            />
          </label>
        )}
      </div>

      {/* --------------------------------------------------------- content */}
      <AnimatePresence mode="wait">
        <motion.section
          key={tab}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          role="tabpanel"
          aria-label={activeTab.label}
        >
          {/* ---------------------------------------------------- records */}
          {tab === "records" &&
            (filteredRecords.length === 0 ? (
              <SpotlightCard>
                <EmptyState
                  icon={FileHeart}
                  title={query ? t("noMatchingRecords") : t("noHealthRecordsYet")}
                  body={
                    query
                      ? t("tryDifferentName")
                      : t("aiAssessmentsSync")
                  }
                  action={
                    query
                      ? { label: t("clearSearch"), onClick: () => setQuery("") }
                      : { label: t("runScan"), href: href("/dashboard/patient/scanner") }
                  }
                />
              </SpotlightCard>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredRecords.map((r, i) => {
                  const Icon = KIND_ICON[r.kind];
                  return (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.4 }}
                    >
                      <SpotlightCard accent={r.accent} className="flex h-full flex-col p-6">
                        <div className="flex items-start justify-between gap-3">
                          <div
                            className={cn(
                              "flex h-10 w-10 items-center justify-center rounded-xl",
                              ACCENT[r.accent].soft
                            )}
                          >
                            <Icon
                              className={cn("h-[18px] w-[18px]", ACCENT[r.accent].text)}
                              strokeWidth={1.75}
                            />
                          </div>
                          <Tag accent={r.accent}>{r.kind}</Tag>
                        </div>
                        <h3 className="mt-5 text-[16px] font-medium leading-snug text-white">
                          {r.title}
                        </h3>
                        <p className="mt-1.5 text-[13px] text-white/45">{r.source}</p>
                        <div className="mt-auto flex items-center justify-between pt-6">
                          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/30">
                            {r.date}
                          </span>
                          <button
                            aria-label={`Download ${r.title}`}
                            className="rounded-lg p-2 text-white/40 transition hover:bg-white/[0.06] hover:text-white"
                          >
                            <Download className="h-4 w-4" strokeWidth={1.75} />
                          </button>
                        </div>
                      </SpotlightCard>
                    </motion.div>
                  );
                })}
              </div>
            ))}

          {/* -------------------------------------------------- reminders */}
          {tab === "reminders" &&
            (reminders.length === 0 ? (
              <SpotlightCard accent="emerald">
                <EmptyState
                  icon={BellRing}
                  accent="emerald"
                  title={t("noRemindersSet")}
                  body={t("setGentleNudges")}
                  action={{ label: t("createReminder") }}
                />
              </SpotlightCard>
            ) : (
              <div className="space-y-3">
                {reminders.map((rem, i) => (
                  <motion.div
                    key={rem.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.35 }}
                  >
                    <SpotlightCard
                      accent="emerald"
                      className="flex flex-wrap items-center gap-4 p-5 sm:flex-nowrap"
                    >
                      <div
                        className={cn(
                          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                          ACCENT.emerald.soft
                        )}
                      >
                        <CalendarClock
                          className="h-[18px] w-[18px] text-emerald-300"
                          strokeWidth={1.75}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-[15px] font-medium text-white">
                          {rem.title}
                        </h3>
                        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white/35">
                          {rem.when} · {rem.cadence}
                        </p>
                      </div>
                      <button
                        role="switch"
                        aria-checked={rem.active}
                        aria-label={`Toggle ${rem.title}`}
                        onClick={() =>
                          setReminders((prev) =>
                            prev.map((x) =>
                              x.id === rem.id ? { ...x, active: !x.active } : x
                            )
                          )
                        }
                        className={cn(
                          "relative h-7 w-12 shrink-0 rounded-full border border-white/10 transition-colors",
                          rem.active ? "bg-emerald-500/25" : "bg-white/[0.05]"
                        )}
                      >
                        <motion.span
                          layout
                          transition={{ type: "spring", stiffness: 520, damping: 32 }}
                          className={cn(
                            "absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white",
                            rem.active ? "right-1" : "left-1"
                          )}
                        />
                      </button>
                    </SpotlightCard>
                  </motion.div>
                ))}
                <GlowPill accent="emerald" variant="ghost" icon={Plus} className="mt-2">
                  Add Reminder
                </GlowPill>
              </div>
            ))}

          {/* ---------------------------------------------------- schemes */}
          {tab === "schemes" &&
            (schemes.length === 0 ? (
              <SpotlightCard accent="rose">
                <EmptyState
                  icon={Landmark}
                  accent="rose"
                  title={t("noSchemesMatched")}
                  body={t("onceYouCompleteProfile")}
                  action={{
                    label: t("completeAssessment"),
                    href: href("/dashboard/patient/assessments"),
                  }}
                />
              </SpotlightCard>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {schemes.map((s, i) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.4 }}
                  >
                    <SpotlightCard accent="rose" className="flex h-full flex-col p-6">
                      <div className="flex items-start justify-between gap-3">
                        <ShieldCheck
                          className="h-5 w-5 text-rose-300"
                          strokeWidth={1.5}
                        />
                        <Tag accent={s.status === "ELIGIBLE" ? "emerald" : "rose"}>
                          {s.status}
                        </Tag>
                      </div>
                      <h3 className="mt-5 text-[16px] font-medium text-white">{s.title}</h3>
                      <p className="mt-2 text-[13px] leading-relaxed text-white/45">
                        {s.summary}
                      </p>
                      <GlowPill accent="rose" variant="ghost" className="mt-6 w-full">
                        View Details
                      </GlowPill>
                    </SpotlightCard>
                  </motion.div>
                ))}
              </div>
            ))}
        </motion.section>
      </AnimatePresence>

      <ClinicalDisclaimer className="mt-10" />
    </PageShell>
  );
}
