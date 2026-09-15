import type { VaultMedication, VaultPrescription } from '@/lib/erx/vault.queries';

const DATE_FORMAT = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Kolkata',
});

export function PrescriptionCard({ prescription }: { readonly prescription: VaultPrescription }): React.JSX.Element {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-slate-900">{prescription.diagnosis}</h3>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            Dr. {prescription.doctorName} · Reg. {prescription.doctorRegistrationNo}
          </p>
        </div>
        <time dateTime={prescription.issuedAt} className="shrink-0 text-xs font-medium text-slate-400">
          {DATE_FORMAT.format(new Date(prescription.issuedAt))}
        </time>
      </header>

      <ul className="mt-3 flex-1 divide-y divide-slate-100">
        {prescription.medications.map((medication) => (
          <li key={medication.id} className="py-3 first:pt-0">
            <MedicationRow medication={medication} />
          </li>
        ))}
      </ul>

      {prescription.clinicalNotes ? (
        <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
          {prescription.clinicalNotes}
        </p>
      ) : null}
    </article>
  );
}

function MedicationRow({ medication }: { readonly medication: VaultMedication }): React.JSX.Element {
  const { schedule } = medication;

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <p className="font-medium text-slate-900">
          {medication.name}
          {medication.strength ? <span className="font-normal text-slate-500"> · {medication.strength}</span> : null}
        </p>
        <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-700">
          {schedule.normalised}
        </span>
        {medication.isSos ? (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
            Only when needed
          </span>
        ) : null}
      </div>

      <p className="mt-1 text-sm text-slate-600">
        {medication.dosage}
        {medication.instructions ? ` · ${medication.instructions}` : ''}
      </p>

      {schedule.reminders.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {schedule.reminders.map((reminder) => (
            <li
              key={`${reminder.slot}-${reminder.time}`}
              className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700"
            >
              {reminder.time} · {reminder.label}
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mt-2 text-xs text-slate-400">
        {medication.daysRemaining > 0
          ? `${medication.daysRemaining} day${medication.daysRemaining === 1 ? '' : 's'} left · until ${medication.endDate}`
          : 'Course complete'}
      </p>
    </div>
  );
}
