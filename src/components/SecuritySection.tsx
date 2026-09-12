"use client";

import Link from "next/link";
import { Lock, FileCheck2, EyeOff, ArrowRight } from "lucide-react";
import { SpotlightCard } from "@/components/SpotlightCard";
import { Reveal, RevealChild, RevealGroup } from "@/components/Reveal";

const PILLARS = [
  {
    icon: Lock,
    title: "Zero-Trust by default",
    body: "Every clinician session is independently authenticated and scoped. No implicit trust between edge client, sync layer, and adjudication dashboard.",
  },
  {
    icon: EyeOff,
    title: "Minimal data surface",
    body: "Captures are compressed and queued locally in IndexedDB, so protected data leaves the device only when a sync window is available and authorised.",
  },
  {
    icon: FileCheck2,
    title: "Decision support posture",
    body: "Human-in-the-loop verification is structural, not optional — every AI output carries a clinician adjudication record.",
  },
];

export function SecuritySection() {
  return (
    <section id="security" className="relative mx-auto max-w-7xl px-5 py-28 sm:py-36">
      <div className="mx-auto max-w-3xl text-center">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.02] px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white/45 backdrop-blur-3xl">
            <Lock className="h-3 w-3 text-indigo-300" />
            Security &amp; Governance
          </span>
        </Reveal>
        <Reveal delay={0.08}>
          <h2 className="mt-6 text-balance text-[clamp(2rem,5vw,3.5rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-white">
            Oversight is part of the{" "}
            <span className="bg-gradient-to-br from-white via-indigo-200 to-indigo-400/60 bg-clip-text text-transparent">
              runtime
            </span>
            .
          </h2>
        </Reveal>
      </div>

      <RevealGroup stagger={0.1} className="mt-14 grid gap-4 sm:gap-5 md:grid-cols-3">
        {PILLARS.map((p) => {
          const Icon = p.icon;
          return (
            <RevealChild key={p.title}>
              <SpotlightCard glow="129,140,248" tilt={5}>
                <div className="flex h-full flex-col p-7">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.03]">
                    <Icon className="h-[18px] w-[18px] text-indigo-300" strokeWidth={1.9} />
                  </div>
                  <h3 className="mt-5 text-[17px] font-semibold tracking-[-0.025em] text-white">
                    {p.title}
                  </h3>
                  <p className="mt-2.5 text-[14px] leading-relaxed tracking-tight text-white/40">
                    {p.body}
                  </p>
                </div>
              </SpotlightCard>
            </RevealChild>
          );
        })}
      </RevealGroup>

      {/* Closing CTA slab */}
      <Reveal delay={0.12} className="mt-20">
        <div className="relative overflow-hidden rounded-[32px] border border-white/[0.06] bg-white/[0.02] px-6 py-16 text-center backdrop-blur-3xl sm:px-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-24 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-[-10rem] h-[24rem] w-[36rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(79,70,229,0.28),transparent_70%)] blur-3xl"
          />
          <h3 className="relative text-balance text-[clamp(1.75rem,4.5vw,3rem)] font-semibold leading-[1.05] tracking-[-0.04em] text-white">
            Deploy clinical intelligence
            <br className="hidden sm:block" /> where the network ends.
          </h3>
          <p className="relative mx-auto mt-5 max-w-lg text-balance text-[15px] leading-relaxed tracking-tight text-white/40">
            Stand up the patient portal and clinician console in a single
            environment — edge-resilient from day one.
          </p>
          <div className="relative mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/auth/patient/register"
              className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-7 py-3.5 text-sm font-semibold tracking-tight text-black transition-transform duration-300 hover:-translate-y-0.5 sm:w-auto"
            >
              Get Started
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link
              href="/auth/patient/login"
              className="flex w-full items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] px-7 py-3.5 text-sm font-semibold tracking-tight text-white/85 backdrop-blur-3xl transition-colors duration-300 hover:border-white/15 hover:bg-white/[0.06] sm:w-auto"
            >
              Sign In
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
