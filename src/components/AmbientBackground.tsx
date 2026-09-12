"use client";

import { motion } from "framer-motion";

/**
 * Fixed, non-interactive ambient layer: dark indigo radial glows,
 * hairline grid, and a slow-breathing aurora. Sits behind all content.
 */
export function AmbientBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#050505]"
    >
      {/* Masked hairline grid */}
      <div className="absolute inset-0 bg-grid mask-radial-faded opacity-70" />

      {/* Primary indigo bloom — top center */}
      <motion.div
        initial={{ opacity: 0.35, scale: 0.9 }}
        animate={{ opacity: [0.3, 0.55, 0.3], scale: [0.95, 1.08, 0.95] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        className="absolute left-1/2 top-[-22rem] h-[46rem] w-[46rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(79,70,229,0.30)_0%,rgba(30,27,75,0.12)_45%,transparent_70%)] blur-3xl"
      />

      {/* Cool blue bloom — mid left */}
      <motion.div
        initial={{ opacity: 0.2 }}
        animate={{ opacity: [0.18, 0.38, 0.18], x: [0, 40, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="absolute left-[-16rem] top-[36%] h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.22)_0%,transparent_70%)] blur-3xl"
      />

      {/* Violet bloom — lower right */}
      <motion.div
        initial={{ opacity: 0.18 }}
        animate={{ opacity: [0.14, 0.32, 0.14], y: [0, -50, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="absolute right-[-14rem] top-[68%] h-[36rem] w-[36rem] rounded-full bg-[radial-gradient(circle,rgba(109,40,217,0.20)_0%,transparent_70%)] blur-3xl"
      />

      {/* Film grain */}
      <div
        className="absolute inset-0 opacity-[0.14] mix-blend-soft-light"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Vignette for deep-black falloff at edges */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,#050505_95%)]" />
    </div>
  );
}
