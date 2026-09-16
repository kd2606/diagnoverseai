import type { ReactNode } from "react";

import ClinicianTopNav, { type ClinicianIdentity } from "./_components/clinician-topnav";

import { createClient } from '@/lib/supabase/server';

/**
 * Resolved on the server so the countdown prop is stable across hydration.
 */
async function getClinician(): Promise<ClinicianIdentity> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let name = "Dr. Arvind Mathur";
  if (user) {
    const { data: profile } = await (supabase as any).from('profiles').select('full_name').eq('id', user.id).single();
    if (profile?.full_name) {
      name = profile.full_name;
      if (!name.startsWith('Dr. ')) name = `Dr. ${name}`;
    }
  }

  return {
    name,
    credential: "MD, FACEP",
    specialty: "Emergency Medicine · Attending",
    npi: "DMC-2026-8912",
    attestationDueAt: new Date(Date.now() + 38 * 60 * 60 * 1000).toISOString(),
    pendingTriage: 7,
  };
}

export default async function ClinicianLayout({ children }: { children: ReactNode }) {
  const clinician = await getClinician();

  return (
    <div className="relative min-h-screen bg-black text-white antialiased selection:bg-white/10">
      {/* Ambient depth: two soft blooms + a faint technical grid. */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-40 left-1/2 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.10),transparent_65%)] blur-3xl" />
        <div className="absolute -bottom-56 right-[-10rem] h-[38rem] w-[38rem] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.07),transparent_65%)] blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_72%)]" />
      </div>

      <a
        href="#clinician-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[80] focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:text-black"
      >
        Skip to content
      </a>

      <ClinicianTopNav clinician={clinician} />

      <main id="clinician-content" className="relative z-10">
        <div className="mx-auto w-full max-w-[1500px] px-4 pb-24 pt-8 sm:px-6 sm:pt-10 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
