'use client';

import { useOptimistic, useTransition } from 'react';
import { logDose } from '@/app/actions/prescriptions';
import type { TodayDose } from '@/lib/erx/vault.queries';
import type { DoseSlot } from '@/lib/erx/frequency';

type DoseStatus = TodayDose['status'];

const SLOT_LABELS: Record<DoseSlot, string> = {
  EARLY_MORNING: 'Early morning',
  MORNING: 'Morning',
  NOON: 'Noon',
  AFTERNOON: 'Afternoon',
  EVENING: 'Evening',
  NIGHT: 'Night',
};

const STATUS_STYLES: Record<DoseStatus, string> = {
  TAKEN: 'border-emerald-200 bg-emerald-50',
  SKIPPED: 'border-slate-200 bg-slate-50 opacity-70',
  PENDING: 'border-slate-200 bg-white',
};

export function TodayPillSchedule({ doses }: { readonly doses: readonly TodayDose[] }): React.JSX.Element {
  const [isPending, startTransition] = useTransition();
  const [optimisticDoses, applyOptimistic] = useOptimistic<
    readonly TodayDose[],
    { readonly reminderId: string; readonly status: DoseStatus }
  >(doses, (state, update) =>
    state.map((dose) => (dose.reminderId === update.reminderId ? { ...dose, status: update.status } : dose)),
  );

  if (optimisticDoses.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
        No scheduled doses for today.
      </div>
    );
  }

  const handleLog = (dose: TodayDose, status: Exclude<DoseStatus, 'PENDING'>): void => {
    startTransition(async () => {
      applyOptimistic({ reminderId: dose.reminderId, status });
      await logDose(dose.reminderId, dose.scheduledForIso, status);
    });
  };

  return (
    <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3" aria-busy={isPending}>
      {optimisticDoses.map((dose) => (
        <li
          key={`${dose.reminderId}-${dose.time}`}
          className={`flex items-center justify-between gap-3 rounded-xl border p-3 transition ${STATUS_STYLES[dose.status]}`}
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">{dose.time}</p>
            <p className="truncate text-sm text-slate-700">{dose.medicationName}</p>
            <p className="truncate text-xs text-slate-500">
              {dose.dosage} · {SLOT_LABELS[dose.slot]}
            </p>
          </div>

          {dose.status === 'PENDING' ? (
            <div className="flex shrink-0 flex-col gap-1">
              <button
                type="button"
                onClick={() => handleLog(dose, 'TAKEN')}
                disabled={isPending}
                className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
              >
                Taken
              </button>
              <button
                type="button"
                onClick={() => handleLog(dose, 'SKIPPED')}
                disabled={isPending}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-300 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Skip
              </button>
            </div>
          ) : (
            <span
              className={`shrink-0 text-xs font-semibold ${dose.status === 'TAKEN' ? 'text-emerald-700' : 'text-slate-500'}`}
            >
              {dose.status === 'TAKEN' ? 'Taken' : 'Skipped'}
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}
