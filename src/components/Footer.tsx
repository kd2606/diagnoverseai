"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Activity, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/Reveal";

const COLUMNS = [
  {
    heading: "Product",
    links: [
      { label: "Patient Portal", href: "/auth/patient/register" },
      { label: "Clinician Dashboard", href: "/auth/doctor/login" },
    ],
  },
  {
    heading: "Technology",
    links: [
      { label: "Edge Sync", href: "#architecture" },
      { label: "Multimodal AI", href: "#features" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy", href: "/legal/privacy" },
      { label: "HIPAA/SaMD Compliance", href: "/legal/compliance" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/[0.05]">
      {/* Ambient floor glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[-14rem] left-1/2 h-[28rem] w-[48rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(49,46,129,0.35),transparent_70%)] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
      />

      <div className="relative mx-auto max-w-7xl px-5 pb-10 pt-20">
        <div className="grid gap-12 md:grid-cols-12">
          {/* Brand block */}
          <Reveal className="md:col-span-5">
            <div>
              <Link href="/" className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-gradient-to-br from-indigo-500/25 to-blue-600/10">
                  <Activity className="h-[18px] w-[18px] text-indigo-300" strokeWidth={2.2} />
                </span>
                <span className="text-[15px] font-semibold tracking-[-0.02em] text-white">
                  DiagnoVerse{" "}
                  <span className="bg-gradient-to-r from-indigo-300 to-blue-400 bg-clip-text text-transparent">
                    AI
                  </span>
                </span>
              </Link>
              <p className="mt-5 max-w-xs text-[14px] leading-relaxed tracking-tight text-white/35">
                Edge-resilient multimodal clinical intelligence — engineered for
                rural deployments and premium triage workflows.
              </p>
              <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 backdrop-blur-3xl">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-300/80" />
                <span className="text-[11px] font-medium tracking-tight text-white/45">
                  Human-in-the-Loop enforced
                </span>
              </div>
            </div>
          </Reveal>

          {/* Link columns */}
          <div className="grid gap-10 sm:grid-cols-3 md:col-span-7">
            {COLUMNS.map((col, ci) => (
              <Reveal key={col.heading} delay={0.06 * (ci + 1)}>
                <div>
                  <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
                    {col.heading}
                  </h4>
                  <ul className="mt-5 space-y-3.5">
                    {col.links.map((link) => (
                      <li key={link.label}>
                        <Link
                          href={link.href}
                          className="group inline-flex items-center text-[14px] tracking-tight text-white/55 transition-colors duration-300 hover:text-white"
                        >
                          <span className="relative">
                            {link.label}
                            <motion.span
                              aria-hidden
                              className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-white/40 transition-transform duration-300 group-hover:scale-x-100"
                            />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        {/* Oversized wordmark */}
        <Reveal delay={0.1} y={40}>
          <div className="mt-20 select-none">
            <p className="bg-gradient-to-b from-white/[0.07] to-transparent bg-clip-text text-center text-[clamp(2.5rem,13vw,10rem)] font-semibold leading-none tracking-[-0.06em] text-transparent">
              DiagnoVerse AI
            </p>
          </div>
        </Reveal>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col gap-4 border-t border-white/[0.05] pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-[12px] leading-relaxed tracking-tight text-white/30">
            Built with Zero-Trust Architecture. DiagnoVerse AI is a clinical
            decision support system, not a replacement for emergency services.
          </p>
          <p className="shrink-0 font-mono text-[11px] tracking-tight text-white/25">
            © {new Date().getFullYear()} DiagnoVerse AI
          </p>
        </div>
      </div>
    </footer>
  );
}
