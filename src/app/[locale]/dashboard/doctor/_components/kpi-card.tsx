"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { cn } from "@/lib/utils";

const TONE = {
  indigo: { text: "text-indigo-300", ring: "border-indigo-400/20 bg-indigo-500/10", bar: "from-indigo-500 to-indigo-300", pulseRing: "ring-indigo-400/40" },
  rose: { text: "text-rose-300", ring: "border-rose-400/20 bg-rose-500/10", bar: "from-rose-500 to-rose-300", pulseRing: "ring-rose-400/40" },
  emerald: { text: "text-emerald-300", ring: "border-emerald-400/20 bg-emerald-500/10", bar: "from-emerald-500 to-emerald-300", pulseRing: "ring-emerald-400/40" },
  amber: { text: "text-amber-300", ring: "border-amber-400/20 bg-amber-500/10", bar: "from-amber-500 to-amber-300", pulseRing: "ring-amber-400/40" },
} as const;

export function KpiCard({
  index,
  icon: Icon,
  label,
  value,
  unit,
  delta,
  deltaTone,
  footnote,
  progress,
  accent,
  pulse,
}: {
  index: number;
  icon: LucideIcon;
  label: string;
  value: number;
  unit: string;
  delta: string;
  deltaTone: keyof typeof TONE;
  footnote: string;
  progress: number;
  accent: keyof typeof TONE;
  pulse?: boolean;
}) {
  const tone = TONE[accent];

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
    >
      <SpotlightCard accent={accent} className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="relative">
            <span className={cn("grid h-10 w-10 place-items-center rounded-xl border", tone.ring)}>
              <Icon className={cn("h-[18px] w-[18px]", tone.text)} strokeWidth={1.75} />
            </span>
            {pulse && (
              <motion.span
                aria-hidden
                className={cn("absolute inset-0 rounded-xl ring-1", tone.pulseRing)}
                animate={{ opacity: [0.7, 0, 0.7], scale: [1, 1.35, 1] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: "easeOut" }}
              />
            )}
          </div>
          <span className={cn("rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em]", TONE[deltaTone].ring, TONE[deltaTone].text)}>
            {delta}
          </span>
        </div>

        <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">{label}</p>

        <div className="mt-1.5 flex items-baseline gap-2">
          <motion.span
            className="font-mono text-[38px] font-semibold leading-none tracking-tight tabular-nums text-white"
            initial={{ opacity: 0, filter: "blur(6px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.6, delay: 0.15 + index * 0.08 }}
          >
            {String(value).padStart(2, "0")}
          </motion.span>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/30">{unit}</span>
        </div>

        <div className="mt-4 h-[3px] overflow-hidden rounded-full bg-white/[0.05]">
          <motion.div
            className={cn("h-full rounded-full bg-gradient-to-r", tone.bar)}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, Math.max(4, progress * 100))}%` }}
            transition={{ duration: 0.9, delay: 0.25 + index * 0.08, ease: "easeOut" }}
          />
        </div>

        <p className="mt-3 font-mono text-[10.5px] text-white/30">{footnote}</p>
      </SpotlightCard>
    </motion.div>
  );
}
