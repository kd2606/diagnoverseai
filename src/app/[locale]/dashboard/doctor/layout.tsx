import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AmbientBackground } from "@/components/ambient-background";
import { ClinicianSidebar } from "./_components/clinician-sidebar";
import { ClinicianTopbar } from "./_components/clinician-topbar";
import { TRIAGE_CASES } from "@/lib/triage/mock-cases";
import { runSafetyProtocols } from "@/lib/triage/safety-protocols";

export const metadata: Metadata = {
  title: "Clinician Console · DiagnoVerse AI",
  description: "Zero-Trust adjudication queue for AI-assisted diagnostic triage.",
};

export default async function DoctorLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Badge counts are computed server-side from the same deterministic
  // protocol engine the table uses — no drift between nav and content.
  const pending = TRIAGE_CASES.filter((c) => c.modelStatus === "pending").length;
  const escalations = TRIAGE_CASES.filter(
    (c) => runSafetyProtocols({ narrative: c.narrative, triageNote: c.triageNote }).length > 0,
  ).length;

  return (
    <div className="relative min-h-screen bg-[#050505] text-zinc-200 antialiased selection:bg-indigo-500/30">
      <AmbientBackground />

      <div className="relative flex min-h-screen">
        <ClinicianSidebar locale={locale} queueCount={pending} escalationCount={escalations} />

        <div className="flex min-w-0 flex-1 flex-col">
          <ClinicianTopbar escalationCount={escalations} />
          <main className="min-w-0 flex-1 px-5 pb-10 pt-6 lg:px-8">{children}</main>

          <footer className="border-t border-white/[0.04] px-5 py-4 lg:px-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/25">
              DiagnoVerse AI · Clinical decision support · Not a substitute for licensed medical judgement ·
              Region {locale.toUpperCase()} · Model DV-VISION-4.2.1
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
