// src/app/[locale]/dashboard/patient/layout.tsx
import type { ReactNode } from 'react';
import { createClient } from "@/lib/supabase/server";
import Link from 'next/link';
import { AmbientBackground } from '@/components/ambient-background';
import { PatientNav } from './_components/patient-nav';

type PatientLayoutProps = {
  children: ReactNode;
  // Next 15: params is a Promise. On Next 14 drop the Promise + await.
  params: Promise<{ locale: string }>;
};

export default async function PatientLayout({ children, params }: PatientLayoutProps) {
  const { locale } = await params;


  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let userProfile = { fullName: "John M.", initials: "JM" };
  if (user) {
    const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).single() as any;
    if (data && data.full_name) {
      const fullName = data.full_name;
      const names = fullName.trim().split(' ');
      const initials = names.length > 1 ? (names[0][0] + names[names.length - 1][0]).toUpperCase() : fullName.substring(0, 2).toUpperCase();
      userProfile = { fullName, initials };
    }
  }

  return (

    <div className="relative min-h-screen bg-[#050505] text-white antialiased selection:bg-indigo-500/30">
      {/* Zero-trust shell: ambient field renders behind every patient surface. */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <AmbientBackground />
      </div>

      {/* Horizon bloom — keeps pure black from reading as "dead". */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[520px] bg-[radial-gradient(900px_420px_at_50%_-160px,rgba(99,102,241,0.13),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.035] mix-blend-overlay [background-image:url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22160%22 height=%22160%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22/></filter><rect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/></svg>')]"
      />

      <div className="relative z-10 flex min-h-screen flex-col">
        <PatientNav locale={locale} userProfile={userProfile} />
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-5 pb-28 pt-8 sm:px-8 lg:px-12">
          {children}
        </main>
        <footer className="mx-auto w-full max-w-[1440px] px-5 pb-10 sm:px-8 lg:px-12">
          <div className="flex flex-col gap-4 border-t border-white/[0.05] pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-white/25">
              <span>DiagnoVerse AI · Patient Portal</span>
              <span>E2EE · Zero-Trust Session · Edge-First</span>
            </div>
            <div className="flex items-center gap-6 text-[11px] font-mono uppercase tracking-[0.18em]">
              <Link href={`/${locale}/dashboard/patient/about`} className="text-white/25 transition-colors hover:text-white/70">
                About
              </Link>
              <Link href={`/${locale}/dashboard/patient/privacy`} className="text-white/25 transition-colors hover:text-white/70">
                Privacy Policy
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
