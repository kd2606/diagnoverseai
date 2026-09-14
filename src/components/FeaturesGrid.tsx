"use client";

import { motion } from "framer-motion";
import {
  AudioLines,
  CheckCheck,
  Gauge,
  Mic,
  ShieldAlert,
  UserCheck,
  Zap,
} from "lucide-react";
import { SpotlightCard } from "@/components/SpotlightCard";
import { Reveal, RevealChild, RevealGroup } from "@/components/Reveal";
import { EASE_EXPO } from "@/lib/utils";

export function FeaturesGrid() {
  return (
    <section id="features" className="relative mx-auto max-w-7xl px-5 py-28 sm:py-36">
      {/* Section header */}
      <div className="mx-auto max-w-3xl text-center">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.02] px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white/45 backdrop-blur-3xl">
            <Zap className="h-3 w-3 text-indigo-300" />
            Platform Capabilities
          </span>
        </Reveal>
        <Reveal delay={0.08}>
          <h2 className="mt-6 text-balance text-[clamp(2rem,5vw,3.5rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-white">
            Engineered for the{" "}
            <span className="bg-gradient-to-br from-white via-indigo-200 to-indigo-400/60 bg-clip-text text-transparent">
              last mile
            </span>{" "}
            of care.
          </h2>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="mx-auto mt-5 max-w-xl text-balance text-[15px] leading-relaxed tracking-tight text-white/40">
            Four systems working in concert — compression, voice, oversight, and
            deterministic safety — so intelligence survives the network, not the
            other way around.
          </p>
        </Reveal>
      </div>

      {/* Bento grid */}
      <RevealGroup
        stagger={0.12}
        className="mt-16 grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-6"
      >
        {/* 1 — Adaptive Edge Runtime (wide) */}
        <RevealChild className="md:col-span-4">
          <SpotlightCard glow="99,102,241">
            <div className="flex h-full flex-col justify-between gap-8 p-7 sm:p-8">
              <CardHeader
                icon={<Gauge className="h-[18px] w-[18px] text-indigo-300" />}
                title="Adaptive Edge Runtime"
                body={
                  <>
                    <code className="rounded bg-white/[0.05] px-1 py-0.5 font-mono text-[12.5px] text-indigo-200/90">
                      &lt;canvas&gt;
                    </code>{" "}
                    WebP compression (8MB to 400KB) and IndexedDB offline-first
                    syncing for 2G network resilience.
                  </>
                }
              />
              <CompressionVisual />
            </div>
          </SpotlightCard>
        </RevealChild>

        {/* 2 — Zero-Friction Voice Triage (narrow) */}
        <RevealChild className="md:col-span-2">
          <SpotlightCard glow="56,189,248">
            <div className="flex h-full flex-col justify-between gap-8 p-7 sm:p-8">
              <CardHeader
                icon={<Mic className="h-[18px] w-[18px] text-sky-300" />}
                title="Pan-India Multilingual Voice"
                body="Sarvam AI cross-lingual speech-to-text. Speaks 13+ Indian languages with flawless native translation. Zero typing required."
              />
              <VoiceVisual />
            </div>
          </SpotlightCard>
        </RevealChild>

        {/* 3 — Human-in-the-Loop (narrow) */}
        <RevealChild className="md:col-span-2">
          <SpotlightCard glow="52,211,153">
            <div className="flex h-full flex-col justify-between gap-8 p-7 sm:p-8">
              <CardHeader
                icon={<UserCheck className="h-[18px] w-[18px] text-emerald-300" />}
                title="SaMD & DPDP Compliant"
                body="Strict regulatory compliance. Granular opt-in consent, zero raw 'diagnoses', and fully authenticated doctor verification."
              />
              <ApprovalVisual />
            </div>
          </SpotlightCard>
        </RevealChild>

        {/* 4 — Deterministic Safety Overrides (wide) */}
        <RevealChild className="md:col-span-4">
          <SpotlightCard glow="244,63,94">
            <div className="flex h-full flex-col justify-between gap-8 p-7 sm:p-8">
              <CardHeader
                icon={<ShieldAlert className="h-[18px] w-[18px] text-rose-300" />}
                title="Deterministic Safety Overrides"
                body="Hardcoded regex protocols that instantly bypass AI for acute red-flag emergencies (e.g., chest pain)."
              />
              <OverrideVisual />
            </div>
          </SpotlightCard>
        </RevealChild>
      </RevealGroup>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function CardHeader({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.03] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
        {icon}
      </div>
      <h3 className="mt-5 text-[19px] font-semibold leading-tight tracking-[-0.025em] text-white">
        {title}
      </h3>
      <p className="mt-2.5 max-w-md text-[14px] leading-relaxed tracking-tight text-white/40">
        {body}
      </p>
    </div>
  );
}

function CompressionVisual() {
  return (
    <div className="rounded-2xl border border-white/[0.05] bg-black/30 p-4">
      <div className="flex items-center justify-between font-mono text-[10.5px] text-white/35">
        <span>raw_capture.png</span>
        <span className="text-indigo-200/80">webp_q72.webp</span>
      </div>
      <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          initial={{ width: "100%" }}
          whileInView={{ width: "5%" }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1.8, ease: EASE_EXPO, delay: 0.3 }}
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-indigo-400 to-blue-400 shadow-[0_0_20px_rgba(99,102,241,0.55)]"
        />
      </div>
      <div className="mt-3 flex items-end justify-between">
        <div>
          <p className="text-lg font-semibold tracking-tighter text-white/30 line-through">
            8 MB
          </p>
          <p className="font-mono text-[10px] uppercase tracking-wider text-white/25">
            before
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold tracking-tighter text-white">400 KB</p>
          <p className="font-mono text-[10px] uppercase tracking-wider text-indigo-200/60">
            −95% payload
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-white/[0.05] pt-3.5">
        {["IndexedDB queue", "Offline-first", "2G resilient"].map((tag) => (
          <span
            key={tag}
            className="rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-0.5 font-mono text-[10px] text-white/40"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function VoiceVisual() {
  const bars = [0.35, 0.7, 0.45, 0.95, 0.6, 1, 0.5, 0.8, 0.4, 0.65, 0.3, 0.75];
  return (
    <div className="rounded-2xl border border-white/[0.05] bg-black/30 p-4">
      <div className="flex items-center gap-2">
        <AudioLines className="h-3.5 w-3.5 text-sky-300/80" />
        <span className="font-mono text-[10px] uppercase tracking-wider text-white/35">
          nova · listening
        </span>
      </div>
      <div className="mt-4 flex h-12 items-center justify-between gap-[3px]">
        {bars.map((h, i) => (
          <motion.span
            key={i}
            animate={{ scaleY: [h * 0.3, h, h * 0.45] }}
            transition={{
              duration: 1.1 + (i % 4) * 0.22,
              repeat: Infinity,
              repeatType: "mirror",
              ease: "easeInOut",
              delay: i * 0.06,
            }}
            className="h-full w-full origin-center rounded-full bg-gradient-to-t from-sky-500/40 to-sky-300/90"
          />
        ))}
      </div>
      <p className="mt-3.5 border-t border-white/[0.05] pt-3 text-[11.5px] italic leading-snug tracking-tight text-white/45">
        “My chest feels tight since morning…”
      </p>
    </div>
  );
}

function ApprovalVisual() {
  return (
    <div className="space-y-2">
      {[
        { id: "#04f2", state: "Approved", tone: "emerald" as const },
        { id: "#04f3", state: "Escalated", tone: "amber" as const },
        { id: "#04f4", state: "Pending", tone: "neutral" as const },
      ].map((row, i) => (
        <motion.div
          key={row.id}
          initial={{ opacity: 0, x: -14 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: EASE_EXPO, delay: 0.25 + i * 0.12 }}
          className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-black/30 px-3 py-2.5"
        >
          <span className="font-mono text-[11px] text-white/40">
            case {row.id}
          </span>
          <span
            className={
              row.tone === "emerald"
                ? "flex items-center gap-1.5 rounded-md border border-emerald-400/20 bg-emerald-400/[0.07] px-2 py-0.5 text-[10.5px] font-medium text-emerald-200"
                : row.tone === "amber"
                ? "flex items-center gap-1.5 rounded-md border border-amber-400/20 bg-amber-400/[0.07] px-2 py-0.5 text-[10.5px] font-medium text-amber-200"
                : "flex items-center gap-1.5 rounded-md border border-white/[0.07] bg-white/[0.03] px-2 py-0.5 text-[10.5px] font-medium text-white/45"
            }
          >
            {row.tone === "emerald" && <CheckCheck className="h-3 w-3" />}
            {row.state}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

function OverrideVisual() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.05] bg-black/40">
      <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-2.5">
        <span className="font-mono text-[10px] uppercase tracking-wider text-white/30">
          safety/protocols.ts
        </span>
        <span className="rounded-md border border-rose-500/20 bg-rose-500/[0.07] px-2 py-0.5 font-mono text-[10px] text-rose-200">
          AI BYPASSED
        </span>
      </div>
      <div className="space-y-1.5 p-4 font-mono text-[11.5px] leading-relaxed">
        {[
          { t: "const RED_FLAGS = [", c: "text-white/35" },
          { t: "  /chest\\s*pain|crushing\\s*pressure/i,", c: "text-rose-300/85" },
          { t: "  /slurred\\s*speech|facial\\s*droop/i,", c: "text-rose-300/85" },
          { t: "  /uncontrolled\\s*bleeding/i,", c: "text-rose-300/85" },
          { t: "]; // → route: EMERGENCY_ESCALATION", c: "text-white/30" },
        ].map((line, i) => (
          <motion.p
            key={line.t}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.55, ease: EASE_EXPO, delay: 0.2 + i * 0.09 }}
            className={`whitespace-pre ${line.c}`}
          >
            {line.t}
          </motion.p>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t border-white/[0.05] bg-rose-500/[0.03] px-4 py-2.5">
        <motion.span
          animate={{ opacity: [1, 0.25, 1] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          className="h-1.5 w-1.5 rounded-full bg-rose-400 shadow-[0_0_10px_2px_rgba(244,63,94,0.7)]"
        />
        <span className="text-[10.5px] tracking-tight text-rose-200/70">
          Match latency &lt; 1ms · zero model inference required
        </span>
      </div>
    </div>
  );
}
