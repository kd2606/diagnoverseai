'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity, CloudUpload, FileHeart, Menu, ShieldCheck, Sparkles, WifiOff, X,
  ScanLine, Stethoscope, ClipboardList, FolderLock
} from 'lucide-react';
import { useOfflineQueue } from '@/hooks/use-offline-queue';
import { formatBytes } from '@/lib/patient/format';
import { cn } from '@/lib/utils';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

const LINKS = [
  { key: 'hub',         href: '',              label: 'Health Hub',  Icon: Activity },
  { key: 'scanner',     href: '/scanner',      label: 'Scanner',     Icon: ScanLine },
  { key: 'respiratory', href: '/respiratory',  label: 'Respiratory', Icon: Stethoscope },
  { key: 'assessments', href: '/assessments',  label: 'Assessments', Icon: ClipboardList },
  { key: 'vault',       href: '/vault',        label: 'Vault',       Icon: FolderLock },
] as const;

export function PatientNav({ locale }: { locale: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { stats, online } = useOfflineQueue();

  const base = `/${locale}/dashboard/patient`;
  const isActive = (href: string) => {
    const full = `${base}${href}`;
    return href === '' ? pathname === base || pathname === `${base}/` : pathname.startsWith(full);
  };

  const degraded = !online || stats.pending > 0 || stats.failed > 0;

  return (
    <header className="sticky top-0 z-50">
      <div className="absolute inset-0 border-b border-white/[0.05] bg-[#050505]/70 backdrop-blur-3xl" />
      <nav className="relative mx-auto flex h-[68px] w-full max-w-[1440px] items-center gap-6 px-5 sm:px-8 lg:px-12">
        {/* Logo */}
        <Link href={base} className="group flex shrink-0 items-center gap-3">
          <span className="relative grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-gradient-to-br from-indigo-500/25 to-indigo-500/[0.03]">
            <Sparkles className="h-[17px] w-[17px] text-indigo-300" strokeWidth={1.75} />
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-xl ring-1 ring-indigo-400/30"
              animate={{ opacity: [0.25, 0.7, 0.25], scale: [1, 1.06, 1] }}
              transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
            />
          </span>
          <span className="leading-none">
            <span className="block text-[15px] font-semibold tracking-tight text-white/95">
              DiagnoVerse <span className="text-indigo-300">AI</span>
            </span>
            <span className="mt-[3px] block font-mono text-[9.5px] uppercase tracking-[0.26em] text-white/35">
              Patient Portal
            </span>
          </span>
        </Link>

        {/* Desktop links */}
        <div className="ml-2 hidden items-center gap-1 md:flex">
          {LINKS.map(({ key, href, label, Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={key}
                href={`${base}${href}`}
                className={cn(
                  'relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13.5px] font-medium transition-colors duration-300',
                  active ? 'text-white' : 'text-white/45 hover:text-white/80',
                )}
              >
                {active && (
                  <motion.span
                    layoutId="patient-nav-pill"
                    className="absolute inset-0 -z-10 rounded-xl border border-white/[0.07] bg-white/[0.04] shadow-[0_0_24px_-10px_rgba(99,102,241,0.8)]"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
                <Icon className="h-[15px] w-[15px]" strokeWidth={1.75} />
                {label}
              </Link>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-2.5 sm:gap-3">
          {/* Live sync telemetry */}
          <div
            className={cn(
              'hidden items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] backdrop-blur-xl sm:flex',
              degraded
                ? 'border-amber-400/20 bg-amber-500/[0.07] text-amber-300'
                : 'border-emerald-400/20 bg-emerald-500/[0.07] text-emerald-300',
            )}
            title={
              degraded
                ? `${stats.pending} queued · ${formatBytes(stats.pendingBytes)} parked in IndexedDB`
                : 'All captures synced to the clinical vault'
            }
          >
            <span className="relative flex h-1.5 w-1.5">
              <motion.span
                className={cn('absolute inset-0 rounded-full', degraded ? 'bg-amber-400' : 'bg-emerald-400')}
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: degraded ? 1.1 : 2.4, repeat: Infinity }}
              />
            </span>
            {!online ? (
              <><WifiOff className="h-3 w-3" strokeWidth={2} /> Offline · {stats.pending} queued</>
            ) : degraded ? (
              <>Syncing · {stats.pending + stats.uploading}</>
            ) : (
              <>Synced</>
            )}
          </div>

          <div className="hidden items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/40 lg:flex">
            <ShieldCheck className="h-3 w-3 text-indigo-300" strokeWidth={2} /> E2EE
          </div>

          <LanguageSwitcher />

          <button
            type="button"
            className="group flex items-center gap-2.5 rounded-full border border-white/[0.07] bg-white/[0.02] py-1 pl-1 pr-1 backdrop-blur-xl transition-colors hover:border-white/15 sm:pr-3.5"
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-indigo-400/80 to-violet-500/70 text-[12px] font-semibold text-[#050505]">
              JM
            </span>
            <span className="hidden text-[13px] font-medium text-white/70 sm:block">John M.</span>
          </button>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation"
            className="grid h-9 w-9 place-items-center rounded-xl border border-white/[0.07] bg-white/[0.02] text-white/60 md:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden border-b border-white/[0.05] bg-[#050505]/90 backdrop-blur-3xl md:hidden"
          >
            <div className="flex flex-col gap-1 px-5 py-4">
              {LINKS.map(({ key, href, label, Icon }) => (
                <Link
                  key={key}
                  href={`${base}${href}`}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors',
                    isActive(href)
                      ? 'border border-white/[0.07] bg-white/[0.04] text-white'
                      : 'text-white/50 hover:text-white/85',
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                  {label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
