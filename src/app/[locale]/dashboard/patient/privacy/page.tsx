"use client";

import { Shield, Lock, EyeOff, ServerOff, FileKey } from "lucide-react";
import {
  ACCENT,
  ClinicalDisclaimer,
  PageHeader,
  PageShell,
  SpotlightCard,
  Tag,
  cn,
} from "@/components/patient/ui";
import { motion } from "framer-motion";

export default function PrivacyPage() {
  const policies = [
    {
      icon: EyeOff,
      title: "Zero-Knowledge Architecture",
      desc: "Your medical data is encrypted on your device before it ever reaches our servers. We cannot read your scans, transcripts, or triage results.",
      accent: "emerald" as const,
    },
    {
      icon: ServerOff,
      title: "No PHI Retention",
      desc: "Protected Health Information (PHI) is processed transiently in our secure enclaves. It is never stored in server logs or database backups.",
      accent: "indigo" as const,
    },
    {
      icon: FileKey,
      title: "Cryptographic Vault",
      desc: "Your Clinical Vault records are cryptographically signed. Only you and the clinicians you explicitly authorize hold the decryption keys.",
      accent: "rose" as const,
    },
  ];

  return (
    <PageShell>
      <PageHeader
        accent="emerald"
        eyebrow="Compliance & Privacy"
        icon={Shield}
        subtitle="Your health data belongs to you. Here is how we ensure it stays that way."
        title="Privacy Policy"
      />

      <div className="grid gap-6">
        <SpotlightCard accent="emerald" className="p-8 sm:p-10">
          <div className="max-w-3xl">
            <Tag accent="emerald" dot>HIPAA & GDPR Ready</Tag>
            <h2 className="mt-5 text-2xl font-semibold leading-snug text-white sm:text-3xl">
              Privacy by Design. Not by Policy.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-white/60">
              We believe that true privacy is mathematically guaranteed, not just promised in a legal document. DiagnoVerse AI is built on a zero-trust model where security and privacy are woven directly into the code. 
            </p>
            <p className="mt-4 text-[15px] leading-relaxed text-white/60">
              When you use our AI diagnostics, processing happens primarily on the edge (your device). Any data sent to our secure cloud models is transient and strictly governed by Enterprise Data Protection terms—meaning your voice or images are never used to train generalized AI models.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-white/[0.05] pt-6">
               <div className="flex items-center gap-2">
                 <Lock className="h-4 w-4 text-white/30"/>
                 <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/40">End-to-End Encrypted</span>
               </div>
            </div>
          </div>
        </SpotlightCard>

        <div className="grid gap-4 sm:grid-cols-3">
          {policies.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
            >
              <SpotlightCard accent={p.accent} className="flex h-full flex-col p-6">
                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", ACCENT[p.accent].soft)}>
                  <p.icon className={cn("h-[18px] w-[18px]", ACCENT[p.accent].text)} strokeWidth={1.75} />
                </div>
                <h3 className="mt-5 text-[15px] font-medium text-white">{p.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-white/45">{p.desc}</p>
              </SpotlightCard>
            </motion.div>
          ))}
        </div>
      </div>

      <ClinicalDisclaimer className="mt-10"/>
    </PageShell>
  );
}
