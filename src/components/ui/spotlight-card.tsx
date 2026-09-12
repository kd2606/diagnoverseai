'use client';

import { useCallback, useRef, useState, type ReactNode } from 'react';
import { motion, useMotionTemplate, useMotionValue, useSpring } from 'framer-motion';
import { cn } from '@/lib/utils';

type Accent = "indigo" | "emerald" | "rose" | "amber";

const ACCENT_RGB: Record<Accent, string> = {
  indigo: "99,102,241",
  emerald: "16,185,129",
  rose: "244,63,94",
  amber: "245,158,11",
};

type SpotlightCardProps = {
  children: ReactNode;
  className?: string;
  /** Spotlight core colour, e.g. 'rgba(99,102,241,0.16)'. */
  glow?: string;
  accent?: Accent;
  radius?: number;
  /** Render the reactive 1px gradient hairline. */
  hairline?: boolean;
  interactive?: boolean;
};

export function SpotlightCard({
  children,
  className,
  glow,
  accent,
  radius = 460,
  hairline = true,
  interactive = true,
}: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  const activeGlow = glow ?? (accent ? `rgba(${ACCENT_RGB[accent]},0.16)` : 'rgba(99,102,241,0.16)');

  const rawX = useMotionValue(-9999);
  const rawY = useMotionValue(-9999);
  const x = useSpring(rawX, { stiffness: 260, damping: 34, mass: 0.4 });
  const y = useSpring(rawY, { stiffness: 260, damping: 34, mass: 0.4 });

  const fill = useMotionTemplate`radial-gradient(${radius}px circle at ${x}px ${y}px, ${activeGlow}, transparent 68%)`;
  const edge = useMotionTemplate`radial-gradient(${radius * 0.7}px circle at ${x}px ${y}px, rgba(255,255,255,0.38), transparent 62%)`;

  const onMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!interactive) return;
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;
      rawX.set(e.clientX - rect.left);
      rawY.set(e.clientY - rect.top);
    },
    [rawX, rawY, interactive],
  );

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      className={cn(
        'group relative isolate overflow-hidden rounded-3xl',
        'border border-white/[0.05] bg-white/[0.02] backdrop-blur-3xl',
        'shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_40px_120px_-60px_rgba(0,0,0,0.9)]',
        'transition-colors duration-500 hover:border-white/[0.09]',
        className,
      )}
    >
      {hairline && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 rounded-[inherit]"
          style={{
            background: edge,
            padding: 1,
            WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
          }}
          animate={{ opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        />
      )}

      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{ background: fill }}
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      />

      {/* Fine top light-catch, like brushed glass. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-8 -top-px z-10 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
      />

      <div className="relative z-10">{children}</div>
    </div>
  );
}
