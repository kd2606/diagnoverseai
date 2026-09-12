"use client";

import { useRef } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
} from "framer-motion";
import { cn } from "@/lib/utils";

type SpotlightCardProps = {
  children: React.ReactNode;
  className?: string;
  /** RGB triplet string, e.g. "99,102,241" */
  glow?: string;
  /** Max tilt in degrees on each axis. */
  tilt?: number;
  /** Spotlight radius in px. */
  radius?: number;
};

/**
 * Reusable 3D bento card.
 * - Tracks the pointer to drive a radial-gradient spotlight (surface + border).
 * - Applies spring-damped rotateX/rotateY for physical 3D tilt.
 * - Children are lifted on the Z axis via translateZ for real parallax depth.
 */
export function SpotlightCard({
  children,
  className,
  glow = "99,102,241",
  tilt = 7,
  radius = 420,
}: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Raw pointer position, local to the card.
  const mouseX = useMotionValue(-9999);
  const mouseY = useMotionValue(-9999);

  const springCfg = { stiffness: 180, damping: 22, mass: 0.6 };
  const rotateX = useSpring(0, springCfg);
  const rotateY = useSpring(0, springCfg);
  const lift = useSpring(0, { stiffness: 220, damping: 26 });
  const glowOpacity = useSpring(0, { stiffness: 120, damping: 20 });

  const surfaceSpotlight = useMotionTemplate`radial-gradient(${radius}px circle at ${mouseX}px ${mouseY}px, rgba(${glow},0.16), rgba(${glow},0.05) 40%, transparent 68%)`;
  const borderSpotlight = useMotionTemplate`radial-gradient(${
    radius * 0.75
  }px circle at ${mouseX}px ${mouseY}px, rgba(${glow},0.65), rgba(255,255,255,0.10) 45%, transparent 72%)`;

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    mouseX.set(x);
    mouseY.set(y);

    // Normalised -0.5 .. 0.5
    const nx = x / rect.width - 0.5;
    const ny = y / rect.height - 0.5;

    rotateY.set(nx * tilt * 2);
    rotateX.set(-ny * tilt * 2);
  }

  function handleEnter() {
    glowOpacity.set(1);
    lift.set(1);
  }

  function handleLeave() {
    glowOpacity.set(0);
    lift.set(0);
    rotateX.set(0);
    rotateY.set(0);
    mouseX.set(-9999);
    mouseY.set(-9999);
  }

  return (
    <div className={cn("group relative h-full", className)} style={{ perspective: 1400 }}>
      <motion.div
        ref={ref}
        onMouseMove={handleMove}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        whileHover={{ z: 24 }}
        transition={{ type: "spring", stiffness: 200, damping: 24 }}
        className="relative h-full overflow-hidden rounded-3xl border border-white/[0.05] bg-white/[0.02] p-px backdrop-blur-3xl transition-shadow duration-500 will-change-transform group-hover:shadow-[0_28px_80px_-28px_rgba(79,70,229,0.45)]"
      >
        {/* Illuminated border (mask-composite hairline) */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-3xl"
          style={{
            opacity: glowOpacity,
            background: borderSpotlight,
            padding: 1,
            WebkitMask:
              "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
            WebkitMaskComposite: "xor",
            mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
            maskComposite: "exclude",
          }}
        />

        {/* Surface spotlight */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-3xl"
          style={{ opacity: glowOpacity, background: surfaceSpotlight }}
        />

        {/* Top specular hairline */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-60"
        />

        {/* Content, lifted in Z for parallax */}
        <motion.div
          style={{ transform: "translateZ(46px)", transformStyle: "preserve-3d" }}
          className="relative h-full rounded-3xl"
        >
          {children}
        </motion.div>
      </motion.div>
    </div>
  );
}
