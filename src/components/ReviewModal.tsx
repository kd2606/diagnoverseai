'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { approveTriage } from '@/app/actions/triage';
import { X, CheckCircle, Edit3, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ReviewModal({ insight }: { insight: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isOpen && !imageUrl && insight.medical_records?.storage_path) {
      supabase.storage
        .from('medical-records')
        .createSignedUrl(insight.medical_records.storage_path, 3600)
        .then(({ data }) => {
          if (data?.signedUrl) {
            setImageUrl(data.signedUrl);
          }
        });
    }
  }, [isOpen, imageUrl, insight.medical_records?.storage_path]);

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await approveTriage(insight.id);
      setIsOpen(false);
      router.refresh();
    } catch (e) {
      console.error(e);
      alert("Failed to approve");
    } finally {
      setIsApproving(false);
    }
  };

  const aiData = insight.raw_analysis_json || {};

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-2xl font-medium tracking-wide transition-all duration-300"
      >
        Review Case
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md transition-all">
          <div className="relative w-full max-w-6xl max-h-[90vh] bg-[#0c0c0c]/80 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            
            {/* Close Button */}
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 z-50 p-2 bg-black/50 hover:bg-black text-neutral-400 hover:text-white rounded-full transition-colors border border-white/10"
            >
              <X size={20} />
            </button>

            {/* Left Pane: Image */}
            <div className="w-full md:w-1/2 bg-black/50 p-6 flex flex-col items-center justify-center border-r border-white/5">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={imageUrl} 
                  alt="Medical Scan" 
                  className="w-full h-auto max-h-full object-contain rounded-2xl border border-white/10 shadow-lg"
                />
              ) : (
                <div className="flex flex-col items-center text-neutral-500">
                  <Loader2 className="animate-spin mb-4" size={32} />
                  <p className="font-light">Decrypting secure image...</p>
                </div>
              )}
            </div>

            {/* Right Pane: AI JSON & Actions */}
            <div className="w-full md:w-1/2 flex flex-col h-full max-h-[90vh]">
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold text-white mb-2">
                    {insight.medical_records?.profiles?.full_name || 'Patient Record'}
                  </h2>
                  <p className="text-sm text-neutral-400 font-light">
                    Generated at {new Date(insight.generated_at).toLocaleString()}
                  </p>
                </div>

                <div className="space-y-8">
                  {/* Summary */}
                  <div className="bg-white/[0.03] p-5 rounded-2xl border border-white/5">
                    <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-3">Clinical Summary</h4>
                    <p className="text-neutral-200 leading-relaxed font-light text-lg">
                      {insight.clinical_summary}
                    </p>
                  </div>

                  {/* Findings */}
                  <div>
                    <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-3">Detected Findings</h4>
                    <ul className="space-y-2">
                      {aiData.findings?.map((f: string, i: number) => (
                        <li key={i} className="flex gap-3 text-neutral-300 font-light">
                          <span className="text-blue-500 mt-1.5 opacity-70">•</span>
                          <span className="leading-relaxed">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Differential DX */}
                  <div>
                    <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-3">Differential Assessment</h4>
                    <div className="flex flex-wrap gap-2">
                      {aiData.differential_assessment?.map((dx: string, i: number) => (
                        <span key={i} className="px-4 py-1.5 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-full text-sm font-light">
                          {dx}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="p-6 bg-white/[0.02] border-t border-white/5 flex gap-4">
                <button 
                  className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white py-3.5 rounded-2xl font-medium transition-all duration-300 border border-white/10"
                >
                  <Edit3 size={18} />
                  Edit & Approve
                </button>
                <button 
                  onClick={handleApprove}
                  disabled={isApproving}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3.5 rounded-2xl font-medium transition-all duration-300 shadow-[0_0_20px_rgba(79,70,229,0.3)] disabled:opacity-50"
                >
                  {isApproving ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                  Approve Insight
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
