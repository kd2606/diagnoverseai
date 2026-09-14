"use client";

import { useTranslations } from 'next-intl';
import QRCode from "react-qr-code";
import { SpotlightCard, ACCENT } from "@/components/patient/ui";
import { QrCode, ShieldCheck, User } from "lucide-react";

interface PatientQRCardProps {
  patientId: string;
  patientName: string;
  mrn: string;
}

export function PatientQRCard({ patientId, patientName, mrn }: PatientQRCardProps) {
  const t = useTranslations('Passport');
  // Generates a secure link that doctors can scan. 
  // In production, this would be a deep link to the clinician portal.
  const secureRecordUrl = `https://diagnoverseai.vercel.app/en/dashboard/doctor/patients/${patientId}`;

  return (
    <SpotlightCard className="flex flex-col items-center justify-center p-8 text-center border border-white/[0.05] bg-white/[0.02] backdrop-blur-3xl rounded-3xl max-w-sm mx-auto">
      <div className="grid h-12 w-12 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.03] mb-4 text-white">
        <QrCode className="h-6 w-6"/>
      </div>
      
      <h3 className="text-lg font-semibold tracking-tight text-white mb-1">
        {t('healthPassport')}
      </h3>
      <p className="text-xs text-white/50 mb-6">
        {t('presentToClinician')}
      </p>

      <div className="bg-white p-3 rounded-2xl shadow-[0_0_40px_-10px_rgba(255,255,255,0.2)] mb-6 mx-auto w-fit">
        <QRCode bgColor="#ffffff" fgColor="#000000" level="Q" size={160} value={secureRecordUrl}/>
      </div>

      <div className="w-full bg-black/40 rounded-xl p-4 border border-white/[0.05] flex items-center justify-between">
        <div className="text-left">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/35">{t('patient')}</p>
          <p className="text-sm font-medium text-white truncate max-w-[120px]">{patientName}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/35">MRN</p>
          <p className="font-mono text-sm text-white/70">{mrn}</p>
        </div>
      </div>

      <div className="mt-5 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-emerald-400">
        <ShieldCheck className="h-3 w-3"/>
        {t('encrypted')}
      </div>
    </SpotlightCard>
  );
}
