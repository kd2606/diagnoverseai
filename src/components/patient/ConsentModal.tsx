'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConsentModalProps {
  onConsent: (storeLocally: boolean) => void;
}

export function ConsentModal({ onConsent }: ConsentModalProps) {
  const [consent1, setConsent1] = useState(false);
  const [consent2, setConsent2] = useState(false);
  const [consent3, setConsent3] = useState(false);

  const canProceed = consent1 && consent2;

  return (
    <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-[#050505]/95 backdrop-blur-3xl p-6 rounded-2xl sm:rounded-[inherit]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.02] p-6 shadow-2xl"
      >
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/10 border border-indigo-500/20">
          <ShieldAlert className="h-6 w-6 text-indigo-400" />
        </div>
        
        <h2 className="mb-2 text-xl font-semibold tracking-tight text-white/95">
          Privacy & Consent
        </h2>
        <p className="mb-6 text-[13px] leading-relaxed text-white/50">
          Before we begin, please review and accept our data processing terms to continue.
        </p>

        <div className="space-y-4">
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className={cn(
              "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
              consent1 ? "border-indigo-500 bg-indigo-500" : "border-white/20 bg-transparent group-hover:border-white/40"
            )}>
              {consent1 && <Check className="h-3 w-3 text-white" />}
            </div>
            <input type="checkbox" className="sr-only" checked={consent1} onChange={(e) => setConsent1(e.target.checked)} />
            <span className="text-[12.5px] leading-snug text-white/80 select-none">
              I consent to my voice and text being processed for symptom assessment. <span className="text-rose-400">*</span>
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer group">
            <div className={cn(
              "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
              consent2 ? "border-indigo-500 bg-indigo-500" : "border-white/20 bg-transparent group-hover:border-white/40"
            )}>
              {consent2 && <Check className="h-3 w-3 text-white" />}
            </div>
            <input type="checkbox" className="sr-only" checked={consent2} onChange={(e) => setConsent2(e.target.checked)} />
            <span className="text-[12.5px] leading-snug text-white/80 select-none">
              I acknowledge this is an AI tool, NOT a doctor, and this is NOT a medical diagnosis. <span className="text-rose-400">*</span>
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer group">
            <div className={cn(
              "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
              consent3 ? "border-emerald-500 bg-emerald-500" : "border-white/20 bg-transparent group-hover:border-white/40"
            )}>
              {consent3 && <Check className="h-3 w-3 text-white" />}
            </div>
            <input type="checkbox" className="sr-only" checked={consent3} onChange={(e) => setConsent3(e.target.checked)} />
            <span className="text-[12.5px] leading-snug text-white/80 select-none">
              I agree to store my assessment locally in my Health Passport.
            </span>
          </label>
        </div>

        <button
          disabled={!canProceed}
          onClick={() => onConsent(consent3)}
          className={cn(
            "mt-8 w-full rounded-xl py-3 text-[13px] font-semibold transition-all",
            canProceed 
              ? "bg-indigo-500 text-white hover:bg-indigo-400" 
              : "bg-white/5 text-white/30 cursor-not-allowed"
          )}
        >
          Accept & Continue
        </button>
      </motion.div>
    </div>
  );
}
