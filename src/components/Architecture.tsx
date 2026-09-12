"use client";

import { useRef } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { Camera, Cpu, Stethoscope, ArrowDown } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { EASE_EXPO } from "@/lib/utils";

const STEPS = [
  {
    index: "01",
    title: "Capture at Edge",
    icon: Camera,
    glow: "99,102,241",
    body: "Multimodal intake on any device. <canvas> WebP compression drops an 8MB capture to 400KB, then IndexedDB queues it offline-first until the 2G window opens.",
    meta: ["WebP · q72", "IndexedDB queue", "Offline-first"],
  },
  {
    index: "02",
    title: "Deterministic AI Triage",
    icon: Cpu,
    glow: "56,189,248",
    body: "Hardcoded regex red-flag protocols evaluate first and can bypass the model entirely. Everything else routes to multimodal inference with voice-native intake via Nova TTS.",
    meta: ["Regex-first", "Multimodal", "Nova TTS"],
  },
  {
    index: "03",
    title: "Clinician Adjudication",
    icon: Stethoscope,
    glow: "52,211,153",
    body: "Zero-trust clinician dashboards surface the AI's reasoning and confidence for 1-click approval, amendment, or escalation. No output reaches a patient unverified.",
    meta: ["Zero-trust", "1-click approval", "Full audit trail"],
  },
];

export function Architecture() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 75%", "end 60%"],
  });
  const lineScale = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 28,
    restDelta: 0.001,
  });
  const glowY = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section
      id="architecture"
      className="relative mx-auto max-w-6xl px-5 py-28 sm:py-36"
    >
      <div className="mx-auto max-w-3xl text-center">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.02] px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white/45 backdrop-blur-3xl">
            <Cpu className="h-3 w-3 text-indigo-300" />
            System Architecture
          </span>
        </Reveal>
        <Reveal delay={0.08}>
          <h2 className="mt-6 text-balance text-[clamp(2rem,5vw,3.5rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-white">
            Three stages. One{" "}
            <span className="bg-gradient-to-br from-white via-indigo-200 to-indigo-400/60 bg-clip-text text-transparent">
              accountable
            </span>{" "}
            pipeline.
          </h2>
        </Reveal>
      </div>

      <div ref={containerRef} className="relative mt-20">
        {/* Spine — static track */}
        <div
          aria-hidden
          className="absolute left-[27px] top-2 h-[calc(100%-1rem)] w-px bg-white/[0.06] md:left-1/2 md:-translate-x-1/2"
        />
        {/* Spine — scroll-linked fill */}
        <motion.div
          aria-hidden
          style={{ scaleY: lineScale }}
          className="absolute left-[27px] top-2 h-[calc(100%-1rem)] w-px origin-top bg-gradient-to-b from-indigo-400 via-sky-400 to-emerald-400 shadow-[0_0_16px_rgba(99,102,241,0.7)] md:left-1/2 md:-translate-x-1/2"
        />
        {/* Travelling comet */}
        <motion.div
          aria-hidden
          style={{ top: glowY }}
          className="absolute left-[27px] h-16 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-white to-transparent opacity-70 blur-[1px] md:left-1/2"
        />

        <div className="space-y-12 md:space-y-24">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const isRight = i % 2 === 1;
            return (
              <div
                key={step.index}
                className="relative grid gap-6 md:grid-cols-2 md:items-center md:gap-14"
              >
                {/* Node */}
                <motion.div
                  initial={{ scale: 0.4, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true, margin: "-120px" }}
                  transition={{ duration: 0.8, ease: EASE_EXPO }}
                  className="absolute left-0 top-0 z-10 md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2"
                >
                  <div
                    className="relative grid h-14 w-14 place-items-center rounded-2xl border border-white/[0.08] bg-black/70 backdrop-blur-3xl"
                    style={{
                      boxShadow: `0 0 40px -8px rgba(${step.glow},0.55), inset 0 1px 0 0 rgba(255,255,255,0.07)`,
                    }}
                  >
                    <Icon
                      className="h-5 w-5"
                      style={{ color: `rgb(${step.glow})` }}
                      strokeWidth={1.8}
                    />
                    <motion.span
                      aria-hidden
                      animate={{ scale: [1, 1.55], opacity: [0.45, 0] }}
                      transition={{
                        duration: 2.8,
                        repeat: Infinity,
                        ease: "easeOut",
                        delay: i * 0.5,
                      }}
                      className="absolute inset-0 rounded-2xl border"
                      style={{ borderColor: `rgba(${step.glow},0.6)` }}
                    />
                  </div>
                </motion.div>

                {/* Card */}
                <motion.div
                  initial={{ opacity: 0, y: 40, x: isRight ? 30 : -30 }}
                  whileInView={{ opacity: 1, y: 0, x: 0 }}
                  viewport={{ once: true, margin: "-110px" }}
                  transition={{ duration: 1, ease: EASE_EXPO, delay: 0.1 }}
                  className={
                    isRight
                      ? "ml-20 md:col-start-2 md:ml-0"
                      : "ml-20 md:col-start-1 md:ml-0 md:text-right"
                  }
                >
                  <span
                    className="font-mono text-xs tracking-[0.2em]"
                    style={{ color: `rgba(${step.glow},0.8)` }}
                  >
                    {step.index}
                  </span>
                  <h3 className="mt-2 text-[22px] font-semibold tracking-[-0.03em] text-white sm:text-2xl">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-[14.5px] leading-relaxed tracking-tight text-white/40">
                    {step.body}
                  </p>
                  <div
                    className={`mt-4 flex flex-wrap gap-2 ${
                      isRight ? "" : "md:justify-end"
                    }`}
                  >
                    {step.meta.map((m) => (
                      <span
                        key={m}
                        className="rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-0.5 font-mono text-[10.5px] text-white/40 backdrop-blur-3xl"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </motion.div>

                {/* Spacer column */}
                <div className="hidden md:block" />
              </div>
            );
          })}
        </div>

        {/* Terminal marker */}
        <Reveal delay={0.1} className="mt-14 flex justify-center">
          <div className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.02] px-4 py-2 backdrop-blur-3xl">
            <ArrowDown className="h-3.5 w-3.5 text-emerald-300" />
            <span className="text-[11.5px] font-medium tracking-tight text-white/50">
              Verified guidance returned to patient — audit-logged end to end
            </span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
