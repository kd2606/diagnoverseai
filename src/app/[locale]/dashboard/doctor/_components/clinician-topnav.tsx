"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  BadgeCheck,
  ChevronDown,
  Database,
  LifeBuoy,
  LogOut,
  Menu,
  ScrollText,
  Settings,
  ShieldCheck,
  Stethoscope, User,
  TimerReset,
  X,
} from "lucide-react";

import { GlowPill, Tag, glass } from "@/components/patient/ui";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const ACCENT = "#38bdf8"; // Light blue for clinician theme
const cx = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

/** Alpha-tints ACCENT without assuming it is a hex string. */
const tint = (pct: number) => `color-mix(in oklab, ${ACCENT} ${pct}%, transparent)`;

export interface ClinicianIdentity {
  name: string;
  credential: string;
  specialty: string;
  npi: string;
  /** ISO timestamp for the next required model-use attestation. */
  attestationDueAt: string;
  /** Badge count surfaced on the Triage Queue link. */
  pendingTriage?: number;
}

interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: typeof Activity;
  /** Home requires exact matching; sections match by prefix. */
  exact?: boolean;
  badge?: number;
}

/* ------------------------------------------------------------------ */
/* Attestation countdown                                              */
/* ------------------------------------------------------------------ */

/** Returns `null` on the server render so SSR and hydration never disagree. */
function useCountdown(targetIso: string) {
  const targetMs = useMemo(() => new Date(targetIso).getTime(), [targetIso]);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  return useMemo(() => {
    if (now === null || Number.isNaN(targetMs)) return null;

    const delta = targetMs - now;
    const overdue = delta <= 0;
    const abs = Math.abs(delta);
    const days = Math.floor(abs / 86_400_000);
    const hours = Math.floor((abs % 86_400_000) / 3_600_000);
    const minutes = Math.floor((abs % 3_600_000) / 60_000);

    const label =
      days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    return { label, overdue, urgent: overdue || abs < 24 * 3_600_000 };
  }, [now, targetMs]);
}

function ReattestPill({ dueAt }: { dueAt: string }) {
  const countdown = useCountdown(dueAt);

  const state = countdown?.overdue
    ? { text: "Re-attest overdue", ring: "border-rose-400/30", fg: "text-rose-200", dot: "bg-rose-400" }
    : countdown?.urgent
      ? { text: `Re-attest in ${countdown.label}`, ring: "border-amber-400/30", fg: "text-amber-200", dot: "bg-amber-400" }
      : { text: `Re-attest in ${countdown?.label ?? "—"}`, ring: "border-white/[0.08]", fg: "text-white/70", dot: "bg-emerald-400" };

  return (
    <button
      type="button"
      className={cx(
        "group inline-flex items-center gap-2 rounded-full border bg-white/[0.02] px-3 py-1.5",
        "backdrop-blur-3xl transition-colors hover:bg-white/[0.05] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
        state.ring,
      )}
      aria-live="polite"
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className={cx("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", state.dot)} />
        <span className={cx("relative inline-flex h-1.5 w-1.5 rounded-full", state.dot)} />
      </span>
      <TimerReset className="h-3.5 w-3.5 text-white/40" aria-hidden />
      <span className={cx("text-[11px] font-medium tracking-tight tabular-nums", state.fg)}>
        {state.text}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Nav                                                                */
/* ------------------------------------------------------------------ */

export default function ClinicianTopNav({ clinician }: { clinician: ClinicianIdentity }) {
  const pathname = usePathname();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "en";

  const [menuOpen, setMenuOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // If you use next-intl's navigation helpers, swap the manual prefix for its <Link />.
  const base = `/${locale}/dashboard/doctor`;

  const items: NavItem[] = useMemo(
    () => [
      { key: "triage", label: "Triage Queue", href: base, icon: Activity, exact: true, badge: clinician.pendingTriage },
      { key: "patients", label: "Patient Database", href: `${base}/patients`, icon: Database },
      { key: "audit", label: "Audit Logs", href: `${base}/audit`, icon: ScrollText },
      { key: "settings", label: "Settings", href: `${base}/settings`, icon: Settings },
    ],
    [base, clinician.pendingTriage],
  );

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setSheetOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    document.body.style.overflow = sheetOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sheetOpen]);

  const initials = clinician.name
    .replace(/^Dr\.?\s+/i, "")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header
      className={cx(
        "sticky top-0 z-50 w-full border-b backdrop-blur-3xl transition-colors duration-500",
        scrolled ? "border-white/[0.07] bg-black/70" : "border-white/[0.04] bg-black/40",
      )}
    >
      {/* Hairline accent bloom along the top edge */}
      <div
        className="pointer-events-none absolute inset-x-0 -top-px h-px opacity-70"
        style={{ background: `linear-gradient(90deg, transparent, ${tint(55)}, transparent)` }}
        aria-hidden
      />

      <nav
        aria-label="Clinician navigation"
        className="mx-auto flex h-16 w-full max-w-[1500px] items-center gap-3 px-4 sm:px-6 lg:px-8"
      >
        {/* Brand */}
        <Link
          href={base}
          className="group flex shrink-0 items-center gap-2.5 rounded-xl px-1 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
        >
          <span
            className="grid h-8 w-8 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.03] shadow-[0_0_24px_-8px] transition-transform duration-300 group-hover:scale-105"
            style={{ color: ACCENT, boxShadow: `0 0 28px -10px ${tint(80)}` }}
          >
            <Stethoscope className="h-4 w-4" aria-hidden />
          </span>
          <span className="hidden flex-col leading-none sm:flex">
            <span className="text-[13px] font-semibold tracking-tight text-white">Command Center</span>
            <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-white/35">
              Clinician
            </span>
          </span>
        </Link>

        <span className="mx-1 hidden h-6 w-px bg-white/[0.06] lg:block" aria-hidden />

        {/* Desktop links */}
        <ul className="hidden items-center gap-1 lg:flex">
          {items.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "relative flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors duration-200",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
                    active ? "text-white" : "text-white/50 hover:text-white/85",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="clinician-nav-active"
                      className="absolute inset-0 rounded-full border border-white/[0.08] bg-white/[0.05]"
                      style={{ boxShadow: `inset 0 0 24px -12px ${tint(90)}` }}
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  <Icon className="relative z-10 h-3.5 w-3.5" aria-hidden />
                  <span className="relative z-10 tracking-tight">{item.label}</span>
                  {!!item.badge && (
                    <span
                      className="relative z-10 rounded-full border border-white/[0.08] px-1.5 py-0.5 text-[10px] font-semibold tabular-nums"
                      style={{ background: tint(16), color: ACCENT }}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div className="hidden xl:block">
            <GlowPill>
              <span className="inline-flex items-center gap-1.5 text-[11px]">
                <ShieldCheck className="h-3 w-3" aria-hidden />
                HIPAA session
              </span>
            </GlowPill>
          </div>

          <div className="hidden md:block">
            <ReattestPill dueAt={clinician.attestationDueAt} />
          </div>

          <LanguageSwitcher />

          {/* Identity / NPI */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className={cx(
                "flex items-center gap-2.5 rounded-full border border-white/[0.05] bg-white/[0.02] py-1.5 pl-1.5 pr-2.5",
                "backdrop-blur-3xl transition-colors hover:bg-white/[0.05] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
              )}
            >
              <span
                className="grid h-7 w-7 place-items-center rounded-full border border-white/[0.08] text-[11px] font-semibold tracking-tight"
                style={{ background: tint(14), color: ACCENT }}
              >
                {initials}
              </span>
              <span className="hidden flex-col items-start leading-none sm:flex">
                <span className="flex items-center gap-1 text-[12px] font-medium tracking-tight text-white/90">
                  {clinician.name}
                  <BadgeCheck className="h-3 w-3" style={{ color: ACCENT }} aria-hidden />
                </span>
                <span className="mt-0.5 font-mono text-[10px] tracking-tight text-white/35">
                  NPI {clinician.npi}
                </span>
              </span>
              <ChevronDown
                className={cx(
                  "h-3.5 w-3.5 text-white/40 transition-transform duration-200",
                  menuOpen && "rotate-180",
                )}
                aria-hidden
              />
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  role="menu"
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  className={cx(
                    glass,
                    "absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-white/[0.05] bg-black/80 p-1.5 backdrop-blur-3xl",
                  )}
                >
                  <div className="border-b border-white/[0.05] px-3 pb-3 pt-2.5">
                    <p className="text-[13px] font-medium tracking-tight text-white">
                      {clinician.name}, {clinician.credential}
                    </p>
                    <p className="mt-0.5 text-[11px] text-white/40">{clinician.specialty}</p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      <Tag>NPI {clinician.npi}</Tag>
                      <Tag>Attending</Tag>
                    </div>
                  </div>
                  <MenuLink href={`${base}/profile`} icon={User} label="Edit Profile" />
                  <MenuLink href={`${base}/settings`} icon={Settings} label="Clinician preferences" />
                  <MenuLink href={`${base}/audit`} icon={ScrollText} label="My audit trail" />
                  <MenuLink href="/support" icon={LifeBuoy} label="Clinical support" />
                  <button
                    type="button"
                    role="menuitem"
                    className="mt-1 flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[12px] text-rose-200/80 transition-colors hover:bg-rose-500/10 hover:text-rose-100"
                  >
                    <LogOut className="h-3.5 w-3.5" aria-hidden />
                    End secure session
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile trigger */}
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-label="Open navigation"
            className="grid h-9 w-9 place-items-center rounded-xl border border-white/[0.05] bg-white/[0.02] text-white/70 backdrop-blur-3xl transition-colors hover:bg-white/[0.05] lg:hidden"
          >
            <Menu className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </nav>

      {/* Mobile sheet */}
      <AnimatePresence>
        {sheetOpen && (
          <motion.div
            className="fixed inset-0 z-[60] lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setSheetOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: -24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -24, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-x-3 top-3 overflow-hidden rounded-3xl border border-white/[0.05] bg-black/85 p-4 backdrop-blur-3xl"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/35">
                  Navigate
                </span>
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  aria-label="Close navigation"
                  className="grid h-8 w-8 place-items-center rounded-lg border border-white/[0.06] text-white/60"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>

              <ul className="mt-4 space-y-1.5">
                {items.map((item, index) => {
                  const active = isActive(item);
                  const Icon = item.icon;
                  return (
                    <motion.li
                      key={item.key}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.04 * index, duration: 0.22 }}
                    >
                      <Link
                        href={item.href}
                        className={cx(
                          "flex items-center justify-between rounded-2xl border px-3.5 py-3 text-sm transition-colors",
                          active
                            ? "border-white/[0.08] bg-white/[0.06] text-white"
                            : "border-white/[0.04] bg-white/[0.02] text-white/60",
                        )}
                      >
                        <span className="flex items-center gap-3">
                          <Icon className="h-4 w-4" aria-hidden />
                          {item.label}
                        </span>
                        {!!item.badge && (
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums"
                            style={{ background: tint(16), color: ACCENT }}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </motion.li>
                  );
                })}
              </ul>

              <div className="mt-4 border-t border-white/[0.05] pt-4">
                <ReattestPill dueAt={clinician.attestationDueAt} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function MenuLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof Settings;
  label: string;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      className="mt-1 flex items-center gap-2.5 rounded-xl px-3 py-2 text-[12px] text-white/65 transition-colors hover:bg-white/[0.05] hover:text-white"
    >
      <Icon className="h-3.5 w-3.5 text-white/40" aria-hidden />
      {label}
    </Link>
  );
}
