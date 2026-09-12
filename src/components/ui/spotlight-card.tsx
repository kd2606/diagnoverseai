"use client";

import { useRef, type ReactNode } from "react";
import { motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

type Accent = "indigo" | "emerald" | "rose" | "amber";

const ACCENT_RGB: Record<Accent, string> = {
  indigo: "99,102,241",
  emerald: "16,185,129",
  rose: "244,63,94",
  amber: "245,158,11",
};

interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
  accent?: Accent;
  /** Radius of the cursor-tracked glow, in px. */
  radius?: number;
  interactive?: boolean;
}

export function SpotlightCard({
  children,
  className,
  accent = "indigo",
  radius = 340,
  interactive = true,
}: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(-9999);
  const y = useMotionValue(-9999);
  const opacity = useSpring(0, { stiffness: 220, damping: 30 });

  const rgb = ACCENT_RGB[accent];
  const spotlight = useMotionTemplate`radial-gradient(${radius}px circle at ${x}px ${y}px, rgba(${rgb},0.16), transparent 72%)`;
  const border = useMotionTemplate`radial-gradient(${radius * 0.8}px circle at ${x}px ${y}px, rgba(${rgb},0.55), transparent 70%)`;

  return (
    <div
      ref={ref}
      onPointerMove={(e) => {
        if (!interactive || !ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        x.set(e.clientX - rect.left);
        y.set(e.clientY - rect.top);
      }}
      onPointerEnter={() => interactive && opacity.set(1)}
      onPointerLeave={() => opacity.set(0)}
      className={cn(
        "group/spot relative isolate overflow-hidden rounded-2xl",
        "border border-white/[0.05] bg-white/[0.02] backdrop-blur-3xl",
        "shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_24px_60px_-30px_rgba(0,0,0,0.9)]",
        "transition-colors duration-500 hover:border-white/[0.09]",
        className,
      )}
    >
      {/* Glow border ring */}
      <motion.div
        aria-hidden
        style={{ background: border, opacity }}
        className="pointer-events-none absolute -inset-px rounded-2xl [mask:linear-gradient(#000,#000)_content-box,linear-gradient(#000,#000)] [mask-composite:xor] p-px"
      />
      {/* Interior spotlight */}
      <motion.div aria-hidden style={{ background: spotlight, opacity }} className="pointer-events-none absolute inset-0" />
      {/* Top specular highlight */}
      <div aria-hidden className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="relative">{children}</div>
    </div>
  );
}
