'use client';

import { useMemo, useState } from 'react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { buildAreaSpecialistUrl, buildNearbySpecialistUrl } from '@/lib/geo/maps';
import type { ClinicalSpecialty, TriageUrgency } from '@/lib/ai/schemas/triage.schema';

export interface SpecialistRouterProps {
  readonly specialty: ClinicalSpecialty;
  readonly urgency?: TriageUrgency;
  readonly referralReason?: string;
  readonly alternateSpecialties?: readonly ClinicalSpecialty[];
  readonly className?: string;
  /** Analytics / audit hook — fires when the patient opens Maps. */
  readonly onRouted?: (payload: { specialty: ClinicalSpecialty; mode: 'gps' | 'manual' }) => void;
}

const URGENCY_STYLES: Record<TriageUrgency, { label: string; className: string }> = {
  EMERGENCY_NOW: { label: 'Emergency — seek care now', className: 'bg-red-100 text-red-800 ring-red-300' },
  URGENT_24H: { label: 'See a doctor within 24 hours', className: 'bg-amber-100 text-amber-900 ring-amber-300' },
  ROUTINE_7D: { label: 'Routine — within a week', className: 'bg-sky-100 text-sky-800 ring-sky-300' },
  SELF_CARE: { label: 'Self-care advised', className: 'bg-emerald-100 text-emerald-800 ring-emerald-300' },
};

export function SpecialistRouter({
  specialty,
  urgency,
  referralReason,
  alternateSpecialties = [],
  className,
  onRouted,
}: SpecialistRouterProps): React.JSX.Element {
  const { status, coords, error, isLoading, request } = useGeolocation({ timeoutMs: 12_000 });
  const [area, setArea] = useState('');

  const nearbyUrl = useMemo(
    () => (coords ? buildNearbySpecialistUrl(specialty, coords) : null),
    [coords, specialty],
  );
  const manualUrl = useMemo(() => buildAreaSpecialistUrl(specialty, area), [area, specialty]);

  const needsManualFallback = status === 'denied' || status === 'unavailable' || status === 'timeout' || status === 'unsupported';
  const urgencyMeta = urgency ? URGENCY_STYLES[urgency] : null;

  return (
    <section
      aria-labelledby="specialist-router-heading"
      className={`w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 ${className ?? ''}`}
    >
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Recommended specialist</p>
          <h2 id="specialist-router-heading" className="mt-1 truncate text-xl font-semibold text-slate-900 sm:text-2xl">
            {specialty}
          </h2>
          {referralReason ? <p className="mt-2 text-sm leading-relaxed text-slate-600">{referralReason}</p> : null}
        </div>
        {urgencyMeta ? (
          <span className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${urgencyMeta.className}`}>
            {urgencyMeta.label}
          </span>
        ) : null}
      </header>

      {urgency === 'EMERGENCY_NOW' ? (
        <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-900 ring-1 ring-inset ring-red-200">
          <p className="font-semibold">Do not wait for an appointment.</p>
          <p className="mt-1">
            Call an ambulance on{' '}
            <a href="tel:108" className="font-semibold underline underline-offset-2">
              108
            </a>{' '}
            or go to the nearest emergency department immediately.
          </p>
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        {nearbyUrl ? (
          <a
            href={nearbyUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onRouted?.({ specialty, mode: 'gps' })}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 sm:w-auto"
          >
            <PinIcon />
            Find {specialty} clinics near me
          </a>
        ) : (
          <button
            type="button"
            onClick={request}
            disabled={isLoading || status === 'unsupported'}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 sm:w-auto"
          >
            {isLoading ? <Spinner /> : <PinIcon />}
            {isLoading ? 'Locating you…' : `Use my location to find ${specialty}`}
          </button>
        )}

        {coords ? (
          <p className="text-xs text-slate-500">
            Accurate to about {Math.round(coords.accuracyMeters)} m. Your location is used only to open Maps.
          </p>
        ) : null}
      </div>

      {error && needsManualFallback ? (
        <div className="mt-4 rounded-xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200">
          <p className="text-sm text-slate-700">{error.message}</p>
          <form
            className="mt-3 flex flex-col gap-2 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              onRouted?.({ specialty, mode: 'manual' });
              window.open(manualUrl, '_blank', 'noopener,noreferrer');
            }}
          >
            <label htmlFor="specialist-area" className="sr-only">
              City, locality or PIN code
            </label>
            <input
              id="specialist-area"
              name="area"
              type="text"
              inputMode="text"
              autoComplete="postal-code"
              value={area}
              onChange={(event) => setArea(event.target.value)}
              placeholder="City, locality or PIN code"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
            />
            <button
              type="submit"
              disabled={area.trim().length < 3}
              className="shrink-0 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Search
            </button>
          </form>
        </div>
      ) : null}

      {alternateSpecialties.length > 0 ? (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">If unavailable, also consider</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {alternateSpecialties.map((alt) => (
              <li key={alt}>
                <a
                  href={coords ? buildNearbySpecialistUrl(alt, coords) : buildAreaSpecialistUrl(alt, area)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
                >
                  {alt}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-5 text-xs leading-relaxed text-slate-400">
        Clinic results come from Google Maps and are not verified or endorsed by DiagnoVerse AI. This routing suggestion
        is not a medical diagnosis.
      </p>
    </section>
  );
}

function PinIcon(): React.JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-5.686 7-11a7 7 0 1 0-14 0c0 5.314 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function Spinner(): React.JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 animate-spin">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" fill="none" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}
