"use client";

import { useRef } from "react";
import Link from "next/link";
import {
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Cpu,
  Radio,
  ScanLine,
  ShieldAlert,
  Stethoscope,
  WifiOff,
} from "lucide-react";
import { EASE_EXPO } from "@/lib/utils";

const HEADLINE_LINE_ONE = ["Clinical", "Intelligence."];
const HEADLINE_LINE_TWO = ["Anywhere", "on", "Earth."];

const wordVariants = {
  hidden: { y: "115%", opacity: 0, rotateX: -45 },
  visible: {
    y: "0%",
    opacity: 1,
    rotateX: 0,
    transition: { duration: 1.05, ease: EASE_EXPO },
  },
};

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);

  // Scroll-linked depth: the mockup recedes and fades as you scroll past.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const mockScale = useTransform(scrollYProgress, [0, 1], [1, 0.86]);
  const mockY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const mockOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0]);

  // Pointer parallax for the floating mockup.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotY = useSpring(useTransform(px, [-0.5, 0.5], [12, -12]), {
    stiffness: 90,
    damping: 20,
  });
  const rotX = useSpring(useTransform(py, [-0.5, 0.5], [-10, 10]), {
    stiffness: 90,
    damping: 20,
  });

  function handleMove(e: React.MouseEvent<HTMLElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - rect.left) / rect.width - 0.5);
    py.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  return (
    <section
      ref={sectionRef}
      onMouseMove={handleMove}
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 pb-24 pt-36 sm:pt-44"
    >
      {/* Floating pill badge */}
      <motion.div
        initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 1, ease: EASE_EXPO, delay: 0.15 }}
        className="relative z-10"
      >
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
          className="group relative flex items-center gap-2.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-4 py-1.5 backdrop-blur-3xl"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-indigo-300" />
          </span>
          <span className="text-[11.5px] font-medium tracking-[0.02em] text-white/65 sm:text-xs">
            Autonomous Edge Intelligence · Human-in-the-Loop
          </span>
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(120px_circle_at_50%_-20%,rgba(99,102,241,0.28),transparent)]"
          />
        </motion.div>
      </motion.div>

      {/* Headline — staggered per-word mask reveal */}
      <motion.h1
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.075, delayChildren: 0.3 } },
        }}
        className="relative z-10 mt-8 max-w-5xl text-center text-[clamp(2.5rem,8vw,5.25rem)] font-semibold leading-[0.98] tracking-[-0.045em] text-white"
      >
        <span className="block overflow-hidden pb-1">
          {HEADLINE_LINE_ONE.map((word) => (
            <span key={word} className="inline-block overflow-hidden pb-1">
              <motion.span variants={wordVariants} className="mr-[0.22em] inline-block">
                {word}
              </motion.span>
            </span>
          ))}
        </span>
        <span className="block overflow-hidden pb-1">
          {HEADLINE_LINE_TWO.map((word, i) => (
            <span key={word} className="inline-block overflow-hidden pb-1">
              <motion.span
                variants={wordVariants}
                className={
                  i === HEADLINE_LINE_TWO.length - 1
                    ? "mr-[0.22em] inline-block bg-gradient-to-br from-white via-indigo-200 to-indigo-400/70 bg-clip-text text-transparent"
                    : "mr-[0.22em] inline-block text-white/45"
                }
              >
                {word}
              </motion.span>
            </span>
          ))}
        </span>
      </motion.h1>

      {/* Subhead */}
      <motion.p
        initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 1.1, ease: EASE_EXPO, delay: 0.75 }}
        className="relative z-10 mt-7 max-w-2xl text-balance text-center text-[15px] leading-relaxed tracking-tight text-white/45 sm:text-[17px]"
      >
        Empowering clinicians and patients with edge-resilient multimodal AI. From
        low-bandwidth offline scans to instant clinician verification.
      </motion.p>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: EASE_EXPO, delay: 0.92 }}
        className="relative z-10 mt-10 flex w-full max-w-md flex-col items-center gap-3 sm:w-auto sm:flex-row"
      >
        <Link href="/auth/patient/register" className="group w-full sm:w-auto">
          <motion.span
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.975 }}
            transition={{ type: "spring", stiffness: 380, damping: 20 }}
            className="relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-white px-7 py-3.5 text-sm font-semibold tracking-tight text-black shadow-[0_18px_50px_-18px_rgba(255,255,255,0.45)] sm:w-auto"
          >
            <span className="relative z-10">Launch Patient Portal</span>
            <ArrowRight className="relative z-10 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            {/* Specular sweep */}
            <span
              aria-hidden
              className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-black/10 to-transparent transition-transform duration-700 group-hover:translate-x-full"
            />
          </motion.span>
        </Link>

        <Link href="/auth/doctor/login" className="group w-full sm:w-auto">
          <motion.span
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.975 }}
            transition={{ type: "spring", stiffness: 380, damping: 20 }}
            className="relative flex w-full items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-7 py-3.5 text-sm font-semibold tracking-tight text-white/85 backdrop-blur-3xl transition-colors duration-300 hover:border-white/15 hover:bg-white/[0.06] sm:w-auto"
          >
            <Stethoscope className="h-4 w-4 text-indigo-300" />
            Clinician Console
          </motion.span>
        </Link>
      </motion.div>

      {/* Floating 3D triage mockup */}
      <motion.div
        style={{ scale: mockScale, y: mockY, opacity: mockOpacity, perspective: 1600 }}
        className="relative z-10 mt-20 w-full max-w-3xl"
      >
        <motion.div
          initial={{ opacity: 0, y: 70, rotateX: 22, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
          transition={{ duration: 1.5, ease: EASE_EXPO, delay: 1.05 }}
          style={{ transformStyle: "preserve-3d", rotateX: rotX, rotateY: rotY }}
        >
          {/* Continuous gentle bob */}
          <motion.div
            animate={{ y: [0, -16, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformStyle: "preserve-3d" }}
            className="relative"
          >
            <TriageMockup />
          </motion.div>
        </motion.div>

        {/* Reflected floor glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-16 left-1/2 h-40 w-[85%] -translate-x-1/2 rounded-[100%] bg-indigo-600/20 blur-[70px]"
        />
      </motion.div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Glassmorphic "AI triage scan" mockup                                */
/* ------------------------------------------------------------------ */

function TriageMockup() {
  return (
    <div className="relative overflow-hidden rounded-[26px] border border-white/[0.07] bg-white/[0.02] p-px shadow-[0_50px_140px_-40px_rgba(49,46,129,0.75)] backdrop-blur-3xl">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-16 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent"
      />
      <div className="relative rounded-[25px] bg-gradient-to-b from-white/[0.035] to-transparent">
        {/* Window chrome */}
        <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] px-2.5 py-1">
            <ScanLine className="h-3 w-3 text-indigo-300" />
            <span className="text-[10.5px] font-medium tracking-tight text-white/50">
              triage/session-04f2 · multimodal
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-amber-400/15 bg-amber-400/[0.06] px-2.5 py-1">
            <WifiOff className="h-3 w-3 text-amber-300/90" />
            <span className="text-[10.5px] font-medium tracking-tight text-amber-200/80">
              Offline · queued
            </span>
          </div>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-5">
          {/* Scan panel */}
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-black/40 p-4 sm:col-span-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/35">
                Dermal scan · WebP
              </span>
              <span className="rounded-md border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5 font-mono text-[10px] text-indigo-200/80">
                8MB → 400KB
              </span>
            </div>

            {/* Scan surface */}
            <div className="relative mt-3 h-40 overflow-hidden rounded-xl border border-white/[0.05] bg-[radial-gradient(circle_at_50%_40%,rgba(79,70,229,0.22),rgba(5,5,5,0.9))]">
              <div className="absolute inset-0 bg-grid opacity-40" />
              {/* Sweeping scanline */}
              <div className="scanline-sweep absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-transparent via-indigo-400/25 to-transparent">
                <div className="absolute inset-x-0 bottom-0 h-px bg-indigo-300/70 shadow-[0_0_18px_2px_rgba(129,140,248,0.7)]" />
              </div>
              {/* Detection reticle */}
              <motion.div
                animate={{ opacity: [0.4, 1, 0.4], scale: [0.98, 1.02, 0.98] }}
                transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute left-[38%] top-[34%] h-16 w-20 rounded-lg border border-indigo-300/60"
              >
                <span className="absolute -top-5 left-0 rounded bg-indigo-500/20 px-1.5 py-0.5 font-mono text-[9px] text-indigo-100">
                  ROI 0.91
                </span>
              </motion.div>
            </div>

            {/* Inference progress */}
            <div className="mt-3.5 flex items-center gap-3">
              <Cpu className="h-3.5 w-3.5 shrink-0 text-white/35" />
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  initial={{ width: "8%" }}
                  animate={{ width: ["8%", "92%", "8%"] }}
                  transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-400"
                />
              </div>
              <span className="shrink-0 font-mono text-[10px] text-white/40">
                on-device
              </span>
            </div>
          </div>

          {/* Findings panel */}
          <div className="flex flex-col gap-3 sm:col-span-2">
            <div className="rounded-2xl border border-red-500/15 bg-red-500/[0.05] p-3.5">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-red-400" />
                <span className="text-[11px] font-semibold tracking-tight text-red-200">
                  Red-flag protocol
                </span>
              </div>
              <p className="mt-1.5 font-mono text-[10.5px] leading-relaxed text-red-200/60">
                /chest\s*pain/i → escalate
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5">
              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/35">
                Triage confidence
              </span>
              <div className="mt-2 flex items-end gap-1.5">
                <span className="text-2xl font-semibold tracking-tighter text-white">
                  94.2
                </span>
                <span className="pb-1 text-xs text-white/35">%</span>
              </div>
              <div className="mt-2 space-y-1.5">
                {[
                  { l: "Urgency", v: "82%" },
                  { l: "Specificity", v: "67%" },
                ].map((row) => (
                  <div key={row.l} className="flex items-center gap-2">
                    <span className="w-[68px] text-[10px] text-white/35">{row.l}</span>
                    <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: row.v }}
                        transition={{ duration: 1.6, ease: EASE_EXPO, delay: 1.6 }}
                        className="h-full rounded-full bg-white/45"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.05] p-3.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span className="text-[11px] font-medium leading-tight tracking-tight text-emerald-100/80">
                Awaiting clinician
                <br />
                1-click adjudication
              </span>
            </div>
          </div>
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between border-t border-white/[0.05] px-5 py-3">
          <div className="flex items-center gap-2">
            <Radio className="h-3 w-3 text-indigo-300/70" />
            <span className="font-mono text-[10px] text-white/35">
              IndexedDB · 3 records pending sync
            </span>
          </div>
          <span className="font-mono text-[10px] text-white/25">2G · 62 kbps</span>
        </div>
      </div>
    </div>
  );
}
