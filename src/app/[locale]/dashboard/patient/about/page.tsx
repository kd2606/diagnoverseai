"use client";

import { motion } from "framer-motion";
import { Activity, Cpu, ShieldCheck, Sparkles, Fingerprint } from "lucide-react";
import {
  ACCENT,
  ClinicalDisclaimer,
  PageHeader,
  PageShell,
  SpotlightCard,
  Tag,
  cn,
} from "@/components/patient/ui";

export default function AboutPage() {
  const features = [
    {
      icon: Cpu,
      title: "Edge-Resilient Engine",
      desc: "WebP image compression and triage logic run directly on your device, ensuring functionality even on 2G networks or offline.",
      accent: "indigo" as const,
    },
    {
      icon: ShieldCheck,
      title: "Zero-Trust Security",
      desc: "End-to-end encryption with zero PHI in logs. Your clinical data remains cryptographically signed and immutable.",
      accent: "emerald" as const,
    },
    {
      icon: Activity,
      title: "Nova Clinical AI",
      desc: "Powered by Gemini 1.5, delivering deterministic safety protocols and human-in-the-loop clinical adjudication.",
      accent: "rose" as const,
    },
  ];

  return (
    <PageShell>
      <PageHeader
        accent="indigo"
        eyebrow="System Info"
        icon={Sparkles}
        subtitle="The next-generation, edge-resilient clinical intelligence platform."
        title="About DiagnoVerse AI"
      />

      <div className="grid gap-6">
        <SpotlightCard className="p-8 sm:p-10">
          <div className="max-w-3xl">
            <Tag accent="indigo" dot>Version 4.2.1</Tag>
            <h2 className="mt-5 text-2xl font-semibold leading-snug text-white sm:text-3xl">
              Democratizing healthcare with edge AI.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-white/60">
              DiagnoVerse AI bridges the gap between advanced clinical diagnostics and remote patient care. By leveraging on-device processing, deterministic safety protocols, and a zero-trust architecture, we ensure that high-fidelity medical intelligence is accessible to everyone—regardless of their network connection.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-white/[0.05] pt-6">
               <div className="flex items-center gap-2">
                 <Fingerprint className="h-4 w-4 text-white/30"/>
                 <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/40">Built for the future</span>
               </div>
            </div>
          </div>
        </SpotlightCard>

        <div className="grid gap-4 sm:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
            >
              <SpotlightCard accent={f.accent} className="flex h-full flex-col p-6">
                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", ACCENT[f.accent].soft)}>
                  <f.icon className={cn("h-[18px] w-[18px]", ACCENT[f.accent].text)} strokeWidth={1.75} />
                </div>
                <h3 className="mt-5 text-[15px] font-medium text-white">{f.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-white/45">{f.desc}</p>
              </SpotlightCard>
            </motion.div>
          ))}
        </div>
      </div>

      <ClinicalDisclaimer className="mt-10"/>
    </PageShell>
  );
}
