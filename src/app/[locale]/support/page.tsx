import Link from 'next/link';
import { LifeBuoy, ArrowLeft, Mail } from 'lucide-react';

export default function ClinicalSupportPage() {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className="max-w-md w-full relative">
        {/* Glow effect */}
        <div className="absolute inset-0 -z-10 bg-sky-500/10 blur-[100px] rounded-full" />
        
        <div className="border border-white/[0.08] bg-black/60 backdrop-blur-3xl rounded-3xl p-8 shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="h-14 w-14 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center shadow-[0_0_32px_-8px_rgba(56,189,248,0.3)] text-[#38bdf8]">
              <LifeBuoy className="h-7 w-7" />
            </div>
          </div>
          
          <h1 className="text-xl font-semibold text-white text-center mb-3 tracking-tight">
            Clinical Support Desk
          </h1>
          
          <p className="text-[13px] leading-relaxed text-white/60 text-center mb-8">
            For urgent technical assistance, RMP verification issues, or DPDP compliance queries regarding the DiagnoVerse portal, please contact your system administrator.
          </p>
          
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 mb-8 flex items-center justify-center gap-3">
            <Mail className="h-4 w-4 text-white/40" />
            <a href="mailto:support@diagnoverse.ai" className="text-[13px] font-mono tracking-tight text-white/90 hover:text-white transition-colors">
              support@diagnoverse.ai
            </a>
          </div>
          
          <Link 
            href="/"
            className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-white/[0.08] text-[13px] font-medium text-white hover:bg-white/[0.12] transition-colors border border-white/[0.05]"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to Secure Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
