"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bell, Command, Search, ShieldAlert, Wifi } from "lucide-react";

export function ClinicianTopbar({ escalationCount }: { escalationCount: number }) {
  // Zero-Trust re-attestation countdown. Starts client-side to stay hydration-safe.
  const [seconds, setSeconds] = useState<number | null>(null);
  useEffect(() => {
    setSeconds(14 * 60 + 32);
    const id = setInterval(() => setSeconds((s) => (s === null ? null : Math.max(0, s - 1))), 1000);
    return () => clearInterval(id);
  }, []);

  const clock =
    seconds === null ? "--:--" : `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <header className="sticky top-0 z-30 flex h-[68px] items-center gap-4 border-b border-white/[0.05] bg-[#050505]/70 px-5 backdrop-blur-3xl lg:px-8">
      <div className="group relative hidden w-full max-w-sm items-center md:flex">
        <Search className="pointer-events-none absolute left-3 h-4 w-4 text-white/25" strokeWidth={1.75} />
        <input
          type="search"
          placeholder="Search MRN, case ID, or symptom assessment…"
          className="h-10 w-full rounded-xl border border-white/[0.05] bg-white/[0.02] pl-9 pr-16 text-[13px] text-white/85 placeholder:text-white/25 outline-none backdrop-blur-3xl transition-colors focus:border-indigo-400/35 focus:bg-white/[0.035]"
        />
        <kbd className="pointer-events-none absolute right-3 flex items-center gap-0.5 rounded-md border border-white/[0.07] px-1.5 py-0.5 font-mono text-[10px] text-white/30">
          <Command className="h-2.5 w-2.5" strokeWidth={2.25} />K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-2.5">
        <span className="hidden items-center gap-2 rounded-lg border border-white/[0.05] bg-white/[0.02] px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-white/40 sm:flex">
          <ShieldAlert className="h-3 w-3 text-indigo-300" strokeWidth={2} />
          re-attest {clock}
        </span>

        <span className="hidden items-center gap-2 rounded-lg border border-emerald-400/15 bg-emerald-500/[0.07] px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-300/90 md:flex">
          <Wifi className="h-3 w-3" strokeWidth={2} />
          edge synced
          <motion.span
            className="h-1.5 w-1.5 rounded-full bg-emerald-400"
            animate={{ opacity: [1, 0.25, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </span>

        <button
          type="button"
          className="relative rounded-xl border border-white/[0.05] bg-white/[0.02] p-2.5 text-white/50 transition-colors hover:border-white/10 hover:text-white"
          aria-label={`${escalationCount} escalations`}
        >
          <Bell className="h-4 w-4" strokeWidth={1.75} />
          {escalationCount > 0 && (
            <span className="absolute -right-1 -top-1 grid h-[17px] min-w-[17px] place-items-center rounded-full border border-[#050505] bg-rose-500 font-mono text-[9.5px] font-bold text-white shadow-[0_0_14px_0_rgba(244,63,94,0.9)]">
              {escalationCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
