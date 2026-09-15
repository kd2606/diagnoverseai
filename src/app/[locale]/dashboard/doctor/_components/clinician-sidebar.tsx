'use client';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useTranslations } from "next-intl";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BrainCircuit,
  ChevronsLeft,
  Database,
  HeartPulse,
  LogOut,
  ScrollText,
  Settings,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: typeof HeartPulse;
  badge?: number;
  badgeTone?: "rose" | "indigo";
}

export function ClinicianSidebar({
  locale,
  queueCount,
  escalationCount,
}: {
  locale: string;
  queueCount: number;
  escalationCount: number;
}) {
  const router = useRouter();
  const t = useTranslations("Doctor");
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const base = `/${locale}/dashboard/doctor`;

  const items: NavItem[] = [
    { key: "queue", label: "Triage Queue", href: base, icon: HeartPulse, badge: queueCount, badgeTone: "rose" },
    { key: "patients", label: "Patient Database", href: `${base}/patients`, icon: Database },
    { key: "audit", label: "Model Audit Logs", href: `${base}/audit`, icon: ScrollText, badge: escalationCount, badgeTone: "indigo" },
    { key: "settings", label: "Settings", href: `${base}/settings`, icon: Settings },
  ];

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 84 : 276 }}
      transition={{ type: "spring", stiffness: 320, damping: 34 }}
      className="sticky top-0 hidden h-screen shrink-0 flex-col border-r border-white/[0.05] bg-white/[0.02] backdrop-blur-3xl lg:flex"
    >
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-indigo-400/25 to-transparent" />

      {/* Brand */}
      <div className="flex h-[68px] items-center gap-3 px-5">
        <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/[0.08] bg-gradient-to-br from-indigo-500/25 to-indigo-500/[0.02]">
          <Stethoscope className="h-[18px] w-[18px] text-indigo-300" strokeWidth={1.75} />
          <span className="absolute inset-0 rounded-xl shadow-[0_0_24px_-4px_rgba(99,102,241,0.7)_inset]" />
        </span>
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.18 }}
              className="min-w-0"
            >
              <p className="truncate text-[13px] font-semibold tracking-tight text-white">{t("diagnoverseAi")}</p>
              <p className="truncate font-mono text-[9.5px] uppercase tracking-[0.22em] text-indigo-300/60">
                Clinician Console
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mx-5 h-px bg-white/[0.05]" />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        {!collapsed && (
          <p className="px-3 pb-2 font-mono text-[9.5px] uppercase tracking-[0.22em] text-white/25">{t("clinical")}</p>
        )}
        {items.map((item) => {
          const active = item.href === base ? pathname === base : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 outline-none transition-colors duration-300",
                "focus-visible:ring-1 focus-visible:ring-indigo-400/60",
                active ? "text-white" : "text-white/45 hover:bg-white/[0.03] hover:text-white/80",
              )}
            >
              {active && (
                <motion.span
                  layoutId="nav-active"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  className="absolute inset-0 rounded-xl border border-indigo-400/20 bg-indigo-500/[0.09] shadow-[0_0_28px_-10px_rgba(99,102,241,0.8)]"
                />
              )}
              {active && <span aria-hidden className="absolute -left-3 top-1/2 h-6 w-[2px] -translate-y-1/2 rounded-full bg-indigo-400 shadow-[0_0_12px_2px_rgba(99,102,241,0.65)]" />}
              <Icon
                className={cn("relative h-[17px] w-[17px] shrink-0 transition-colors", active && "text-indigo-300")}
                strokeWidth={1.75}
              />
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="relative truncate text-[13px] font-medium tracking-tight"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>

              {item.badge ? (
                <span
                  className={cn(
                    "relative ml-auto grid h-[19px] min-w-[19px] place-items-center rounded-md border px-1 font-mono text-[10px] font-semibold tabular-nums",
                    collapsed && "absolute -right-1 -top-1 ml-0",
                    item.badgeTone === "rose"
                      ? "border-rose-400/25 bg-rose-500/15 text-rose-200 shadow-[0_0_16px_-4px_rgba(244,63,94,0.8)]"
                      : "border-indigo-400/25 bg-indigo-500/15 text-indigo-200",
                  )}
                >
                  {item.badge}
                  {item.badgeTone === "rose" && (
                    <motion.span
                      aria-hidden
                      className="absolute inset-0 rounded-md ring-1 ring-rose-400/50"
                      animate={{ opacity: [0.9, 0, 0.9], scale: [1, 1.5, 1] }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
                    />
                  )}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {/* Model integrity strip */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mx-3 mb-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3"
          >
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-3.5 w-3.5 text-indigo-300" strokeWidth={1.75} />
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">{t("dvVision")}</p>
              <span className="ml-auto font-mono text-[10px] text-white/30">{t("dvVisionVersion")}</span>
            </div>
            <div className="mt-2.5 h-[3px] overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400"
                initial={{ width: 0 }}
                animate={{ width: "97.4%" }}
                transition={{ duration: 1.1, ease: "easeOut", delay: 0.3 }}
              />
            </div>
            <p className="mt-2 flex items-center gap-1.5 font-mono text-[10px] text-emerald-300/80">
              <ShieldCheck className="h-3 w-3" strokeWidth={2} /> drift 0.4% · signed
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clinician identity */}
      <div className="border-t border-white/[0.05] p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/[0.03]">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/[0.08] bg-gradient-to-br from-emerald-400/20 to-transparent font-mono text-[11px] font-semibold text-emerald-200">
            EK
          </span>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-medium text-white/85">Dr. E. Kovač</p>
                <p className="truncate font-mono text-[10px] text-white/35">NPI 1902847561</p>
              </motion.div>
            )}
          </AnimatePresence>
          {!collapsed && (
            <button type="button" aria-label="Sign out" onClick={async () => { await supabase.auth.signOut(); router.push('/'); router.refresh(); }} className="rounded-md p-1.5 text-white/30 transition-colors hover:bg-white/[0.05] hover:text-rose-300">
              <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-white/[0.05] py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/35 transition-colors hover:border-white/10 hover:text-white/70"
        >
          <ChevronsLeft className={cn("h-3.5 w-3.5 transition-transform duration-300", collapsed && "rotate-180")} strokeWidth={2} />
          {!collapsed && "Collapse"}
        </button>
      </div>
    </motion.aside>
  );
}
