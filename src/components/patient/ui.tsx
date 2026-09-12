"use client";

/**
 * DiagnoVerse AI — shared design primitives.
 * Single source of truth for glass, glow, typography and layout rhythm.
 * If a visual token isn't here, it doesn't belong in a page.
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  HTMLMotionProps,
  motion,
  useMotionTemplate,
  useMotionValue,
} from "framer-motion";
import type { LucideIcon } from "lucide-react";
import React from "react";

/* ------------------------------------------------------------------ utils */

export const cn = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

/** The one true glass recipe. */
export const glass =
  "bg-white/[0.02] border border-white/[0.05] backdrop-blur-3xl";

export type Accent = "indigo" | "emerald" | "rose";

export const ACCENT: Record<
  Accent,
  { text: string; ring: string; glow: string; soft: string; raw: string }
> = {
  indigo: {
    text: "text-indigo-300",
    ring: "ring-indigo-500/50",
    glow: "shadow-[0_0_40px_-8px_rgba(99,102,241,0.55)]",
    soft: "bg-indigo-500/10",
    raw: "rgba(99,102,241,0.16)",
  },
  emerald: {
    text: "text-emerald-300",
    ring: "ring-emerald-500/50",
    glow: "shadow-[0_0_40px_-8px_rgba(16,185,129,0.5)]",
    soft: "bg-emerald-500/10",
    raw: "rgba(16,185,129,0.14)",
  },
  rose: {
    text: "text-rose-300",
    ring: "ring-rose-500/50",
    glow: "shadow-[0_0_40px_-8px_rgba(244,63,94,0.5)]",
    soft: "bg-rose-500/10",
    raw: "rgba(244,63,94,0.14)",
  },
};

/** Locale-aware href builder for the `[locale]` segment. */
export function usePatientHref() {
  const { locale } = useParams<{ locale?: string }>();
  return (path: string) => `/${locale ?? "en"}${path}`;
}

/* ---------------------------------------------------------- SpotlightCard */

type SpotlightCardProps = React.ComponentPropsWithoutRef<"div"> & {
  accent?: Accent;
  /** Disable the cursor spotlight (useful behind video/canvas layers). */
  inert?: boolean;
};

/**
 * Primary container. Frosted glass + a soft accent light that tracks the
 * cursor. Pointer events are never intercepted by the light layer.
 */
export function SpotlightCard({
  children,
  className,
  accent = "indigo",
  inert = false,
  ...rest
}: SpotlightCardProps) {
  const x = useMotionValue(-400);
  const y = useMotionValue(-400);

  const light = useMotionTemplate`radial-gradient(460px circle at ${x}px ${y}px, ${ACCENT[accent].raw}, transparent 72%)`;

  return (
    <div
      onPointerMove={(e) => {
        if (inert) return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set(e.clientX - r.left);
        y.set(e.clientY - r.top);
      }}
      onPointerLeave={() => {
        x.set(-400);
        y.set(-400);
      }}
      className={cn(
        "group relative overflow-hidden rounded-3xl",
        glass,
        className
      )}
      {...rest}
    >
      {!inert && (
        <motion.div
          aria-hidden
          style={{ background: light }}
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        />
      )}
      {/* top hairline highlight — the detail that reads as "expensive" */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
      />
      <div className="relative">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ shell */

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#050505] text-white/90 antialiased">
      {/* ambient aurora — fixed, cheap, never scrolls */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-[36rem] w-[36rem] rounded-full bg-indigo-600/10 blur-[140px]" />
        <div className="absolute -bottom-52 right-1/5 h-[32rem] w-[32rem] rounded-full bg-emerald-500/[0.07] blur-[140px]" />
      </div>

      <motion.main
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-16"
      >
        {children}
      </motion.main>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  icon: Icon,
  accent = "indigo",
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  accent?: Accent;
}) {
  return (
    <header className="mb-10 flex flex-col gap-5 sm:mb-14 sm:flex-row sm:items-center sm:gap-6">
      <div
        className={cn(
          "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl",
          glass,
          ACCENT[accent].soft
        )}
      >
        <Icon className={cn("h-6 w-6", ACCENT[accent].text)} strokeWidth={1.5} />
      </div>
      <div className="min-w-0">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/40">
          {eyebrow}
        </p>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-white/50">
          {subtitle}
        </p>
      </div>
    </header>
  );
}

/* ---------------------------------------------------------------- buttons */

type PillProps = HTMLMotionProps<"button"> & {
  accent?: Accent;
  variant?: "solid" | "ghost";
  icon?: LucideIcon;
  children?: React.ReactNode;
};

/** Large, glowing, thumb-friendly action pill (min 48px tap target). */
export function GlowPill({
  children,
  className,
  accent = "indigo",
  variant = "solid",
  icon: Icon,
  disabled,
  ...rest
}: PillProps) {
  return (
    <motion.button
      whileHover={disabled ? undefined : { scale: 1.025 }}
      whileTap={disabled ? undefined : { scale: 0.975 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
      disabled={disabled}
      className={cn(
        "inline-flex min-h-[48px] items-center justify-center gap-2.5 rounded-full px-6 text-[15px] font-medium",
        "outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:opacity-40",
        variant === "solid"
          ? cn("text-white", ACCENT[accent].soft, ACCENT[accent].glow,
              "border border-white/10 hover:bg-white/[0.07]")
          : cn(glass, "text-white/70 hover:text-white hover:bg-white/[0.05]"),
        className
      )}
      {...rest}
    >
      {Icon && <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />}
      {children}
    </motion.button>
  );
}

/* ------------------------------------------------------------------- tags */

export function Tag({
  children,
  accent = "indigo",
  dot = false,
}: {
  children: React.ReactNode;
  accent?: Accent;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-white/[0.07] px-2.5 py-1",
        "font-mono text-[10px] uppercase tracking-[0.14em]",
        ACCENT[accent].soft,
        ACCENT[accent].text
      )}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      )}
      {children}
    </span>
  );
}

/* ----------------------------------------------------------- empty states */

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  accent = "indigo",
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  accent?: Accent;
  action?: { label: string; href?: string; onClick?: () => void };
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center px-6 py-20 text-center"
    >
      <div className="relative mb-7">
        <motion.div
          aria-hidden
          animate={{ opacity: [0.35, 0.75, 0.35], scale: [1, 1.12, 1] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
          className={cn(
            "absolute inset-0 rounded-3xl blur-2xl",
            ACCENT[accent].soft
          )}
        />
        <div
          className={cn(
            "relative flex h-20 w-20 items-center justify-center rounded-3xl",
            glass
          )}
        >
          <Icon
            className={cn("h-8 w-8", ACCENT[accent].text)}
            strokeWidth={1.25}
          />
        </div>
      </div>

      <h3 className="text-lg font-medium text-white">{title}</h3>
      <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-white/45">
        {body}
      </p>

      {action &&
        (action.href ? (
          <Link href={action.href} className="mt-7">
            <GlowPill accent={accent}>
              {action.label}
            </GlowPill>
          </Link>
        ) : (
          <GlowPill accent={accent} className="mt-7" onClick={action.onClick}>
            {action.label}
          </GlowPill>
        ))}
    </motion.div>
  );
}

/** Thin, reusable confidence / score meter. */
export function Meter({
  value,
  accent = "indigo",
  delay = 0,
}: {
  value: number; // 0..1
  accent?: Accent;
  delay?: number;
}) {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.round(value * 100)}%` }}
        transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "h-full rounded-full",
          accent === "indigo"
            ? "bg-indigo-400"
            : accent === "emerald"
            ? "bg-emerald-400"
            : "bg-rose-400"
        )}
      />
    </div>
  );
}

/** Medical-safety footer. Legally and ethically non-optional. */
export function ClinicalDisclaimer({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "font-mono text-[10px] leading-relaxed tracking-wide text-white/30",
        className
      )}
    >
      DIAGNOVERSE AI PROVIDES DECISION SUPPORT ONLY — NOT A MEDICAL DIAGNOSIS.
      ALWAYS CONFIRM RESULTS WITH A LICENSED CLINICIAN.
    </p>
  );
}
