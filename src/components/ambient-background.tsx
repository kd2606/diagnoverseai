"use client";

import { motion, useReducedMotion } from "framer-motion";

const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='240' height='240' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")";

export function AmbientBackground() {
  const reduce = useReducedMotion();

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#050505]">
      {/* Base atmospheric wash */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_18%_-10%,rgba(79,70,229,0.20),transparent_60%),radial-gradient(90%_70%_at_100%_0%,rgba(16,185,129,0.10),transparent_55%),radial-gradient(80%_60%_at_50%_120%,rgba(244,63,94,0.08),transparent_60%)]" />

      {/* Slow-drifting orbs */}
      <motion.div
        className="absolute -left-40 -top-40 h-[42rem] w-[42rem] rounded-full bg-indigo-600/20 blur-[140px]"
        animate={reduce ? undefined : { x: [0, 90, 0], y: [0, 60, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-56 right-[-12rem] h-[38rem] w-[38rem] rounded-full bg-emerald-500/[0.12] blur-[150px]"
        animate={reduce ? undefined : { x: [0, -70, 0], y: [0, -40, 0], scale: [1, 1.12, 1] }}
        transition={{ duration: 32, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
      <motion.div
        className="absolute left-1/2 top-1/3 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-rose-500/[0.07] blur-[130px]"
        animate={reduce ? undefined : { opacity: [0.5, 0.85, 0.5] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Precision grid, masked to fade toward the edges */}
      <div
        className="absolute inset-0 opacity-[0.35] [mask-image:radial-gradient(70%_60%_at_50%_30%,#000,transparent)]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.045) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />

      {/* Scanning sweep — subtle clinical "live monitor" cue */}
      {!reduce && (
        <motion.div
          className="absolute inset-x-0 h-[36rem] bg-[linear-gradient(to_bottom,transparent,rgba(99,102,241,0.05),transparent)]"
          animate={{ y: ["-40%", "140%"] }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        />
      )}

      {/* Film grain + vignette */}
      <div className="absolute inset-0 opacity-[0.16] mix-blend-overlay" style={{ backgroundImage: NOISE }} />
      <div className="absolute inset-0 bg-[radial-gradient(100%_100%_at_50%_50%,transparent_45%,rgba(0,0,0,0.75))]" />
    </div>
  );
}
