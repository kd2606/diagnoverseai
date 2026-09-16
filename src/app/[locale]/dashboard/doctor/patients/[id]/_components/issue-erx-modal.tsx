'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Plus, X, Loader2, CheckCircle2 } from 'lucide-react';

interface IssueErxModalProps {
  patientId: string;
}

export default function IssueErxModal({ patientId }: IssueErxModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [diagnosis, setDiagnosis] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [medicationName, setMedicationName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [duration, setDuration] = useState('');

  function resetForm() {
    setDiagnosis('');
    setClinicalNotes('');
    setMedicationName('');
    setDosage('');
    setFrequency('');
    setDuration('');
    setSuccess(false);
  }

  function handleClose() {
    if (loading) return;
    setOpen(false);
    setTimeout(resetForm, 300);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!diagnosis.trim() || !medicationName.trim() || !dosage.trim() || !frequency.trim() || !duration.trim()) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const durationDays = parseInt(duration, 10) || 5;
      const today = new Date().toISOString().split('T')[0];

      // Insert prescription
      const { data: rx, error: rxError } = await (supabase as any)
        .from('prescriptions')
        .insert({
          patient_id: patientId,
          doctor_id: user.id,
          status: 'ACTIVE',
          diagnosis: diagnosis.trim(),
          clinical_notes: clinicalNotes.trim() || null,
          doctor_registration_no: 'DMC-2026-8912',
          issued_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (rxError || !rx) throw rxError || new Error('Failed to create prescription');

      // Insert prescription item
      const { error: itemError } = await (supabase as any)
        .from('prescription_items')
        .insert({
          prescription_id: rx.id,
          medication_name: medicationName.trim(),
          dosage: dosage.trim(),
          frequency: frequency.trim(),
          route: 'oral',
          duration_days: durationDays,
          start_date: today,
          is_sos: false,
        });

      if (itemError) throw itemError;

      setSuccess(true);
      setTimeout(() => {
        handleClose();
        router.refresh();
      }, 1200);
    } catch (err) {
      console.error('[IssueErxModal] submission failed', err);
      alert('Failed to issue prescription. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-400 hover:shadow-indigo-500/40"
      >
        <Plus className="h-4 w-4" />
        Issue New e-Prescription (eRx)
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />

          {/* Modal */}
          <div className="relative z-10 w-full max-w-lg mx-4 overflow-hidden rounded-3xl border border-white/10 bg-[#0a0a0a] shadow-2xl">
            {/* Success overlay */}
            {success && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0a0a0a]/95 backdrop-blur-sm">
                <CheckCircle2 className="h-16 w-16 text-emerald-400 mb-4" />
                <p className="text-lg font-semibold text-white">Prescription Issued</p>
                <p className="text-sm text-white/50 mt-1">eRx has been recorded successfully.</p>
              </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-white tracking-tight">Issue e-Prescription</h2>
                <p className="text-xs text-white/40 mt-0.5">All fields marked are required for compliance</p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="grid h-8 w-8 place-items-center rounded-lg text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Diagnosis */}
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">Diagnosis *</label>
                <input
                  type="text"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="e.g. Suspected Dengue / Viral Fever"
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-colors"
                />
              </div>

              {/* Clinical Notes */}
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">Clinical Notes</label>
                <textarea
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  placeholder="Additional clinical observations..."
                  rows={2}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-colors resize-none"
                />
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-white/[0.06]" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Medication</span>
                <div className="h-px flex-1 bg-white/[0.06]" />
              </div>

              {/* Medication Name */}
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">Medication Name *</label>
                <input
                  type="text"
                  value={medicationName}
                  onChange={(e) => setMedicationName(e.target.value)}
                  placeholder="e.g. Paracetamol 500mg"
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-colors"
                />
              </div>

              {/* Dosage + Frequency row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">Dosage *</label>
                  <input
                    type="text"
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    placeholder="e.g. 1 tablet"
                    required
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">Frequency *</label>
                  <input
                    type="text"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    placeholder="e.g. 1-0-1"
                    required
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-colors"
                  />
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">Duration (days) *</label>
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g. 5"
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-colors"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-400 hover:shadow-indigo-500/40 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Issuing Prescription…
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Issue e-Prescription
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
