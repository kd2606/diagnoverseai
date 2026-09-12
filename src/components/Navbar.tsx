"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
} from "framer-motion";
import { Activity, ArrowUpRight, Menu, X } from "lucide-react";
import { cn, EASE_EXPO } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Architecture", href: "#architecture" },
  { label: "Security", href: "#security" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 24);
  });

  return (
    <motion.header
      initial={{ y: -90, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 1, ease: EASE_EXPO, delay: 0.1 }}
      className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4 sm:pt-6"
    >
      <nav
        className={cn(
          "relative w-full max-w-6xl rounded-2xl border transition-all duration-500",
          scrolled
            ? "border-white/[0.07] bg-black/60 shadow-[0_18px_60px_-24px_rgba(0,0,0,0.9)] backdrop-blur-3xl"
            : "border-white/[0.04] bg-white/[0.02] backdrop-blur-2xl"
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
        />

        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="relative grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-gradient-to-br from-indigo-500/25 to-blue-600/10">
              <Activity className="h-[18px] w-[18px] text-indigo-300" strokeWidth={2.2} />
              <motion.span
                aria-hidden
                animate={{ opacity: [0.25, 0.7, 0.25] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-xl bg-indigo-500/20 blur-md"
              />
            </span>
            <span className="text-[15px] font-semibold tracking-[-0.02em] text-white">
              DiagnoVerse{" "}
              <span className="bg-gradient-to-r from-indigo-300 to-blue-400 bg-clip-text text-transparent">
                AI
              </span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="relative rounded-lg px-3.5 py-2 text-[13.5px] font-medium tracking-tight text-white/55 transition-colors duration-300 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden items-center gap-2 md:flex">
            <Link
              href="/auth/patient/login"
              className="rounded-xl px-4 py-2 text-[13.5px] font-medium tracking-tight text-white/70 transition-colors duration-300 hover:text-white"
            >
              Sign In
            </Link>
            <Link href="/auth/patient/register" className="group relative">
              <motion.span
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 22 }}
                className="relative flex items-center gap-1.5 overflow-hidden rounded-xl border border-white/10 bg-white px-4 py-2 text-[13.5px] font-semibold tracking-tight text-black shadow-[0_8px_30px_-10px_rgba(255,255,255,0.35)]"
              >
                Get Started
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </motion.span>
            </Link>
          </div>

          {/* Mobile trigger */}
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation"
            aria-expanded={open}
            className="grid h-9 w-9 place-items-center rounded-xl border border-white/[0.07] bg-white/[0.03] text-white/70 md:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {/* Mobile sheet */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.45, ease: EASE_EXPO }}
              className="overflow-hidden md:hidden"
            >
              <div className="space-y-1 border-t border-white/[0.05] px-4 py-4">
                {NAV_LINKS.map((link, i) => (
                  <motion.div
                    key={link.label}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i + 0.08, ease: EASE_EXPO }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="block rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/[0.03] hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                ))}
                <div className="mt-3 grid grid-cols-2 gap-2 pt-2">
                  <Link
                    href="/auth/patient/login"
                    onClick={() => setOpen(false)}
                    className="rounded-xl border border-white/[0.07] bg-white/[0.02] py-2.5 text-center text-sm font-medium text-white/80"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/patient/register"
                    onClick={() => setOpen(false)}
                    className="rounded-xl bg-white py-2.5 text-center text-sm font-semibold text-black"
                  >
                    Get Started
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </motion.header>
  );
}
