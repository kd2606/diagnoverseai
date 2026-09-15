import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getClinicalVault } from '@/lib/erx/vault.queries';
import { PrescriptionCard } from '@/components/vault/PrescriptionCard';
import { TodayPillSchedule } from '@/components/vault/TodayPillSchedule';

export const metadata = { title: 'Clinical Vault · DiagnoVerse AI' };
export const dynamic = 'force-dynamic'; // PHI must never be statically cached

export default async function ClinicalVaultPage(): Promise<React.JSX.Element> {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/sign-in?next=/vault');

  const { prescriptions, todaysDoses } = await getClinicalVault();
  const takenCount = todaysDoses.filter((dose) => dose.status === 'TAKEN').length;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Clinical Vault</h1>
        <p className="mt-1 text-sm text-slate-600">
          Your active prescriptions and today&apos;s medicine schedule, in one place.
        </p>
      </header>

      <section aria-labelledby="today-heading" className="mb-8">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 id="today-heading" className="text-lg font-semibold text-slate-900">
            Today&apos;s schedule
          </h2>
          {todaysDoses.length > 0 ? (
            <p className="text-sm text-slate-500">
              {takenCount} of {todaysDoses.length} doses taken
            </p>
          ) : null}
        </div>
        <TodayPillSchedule doses={todaysDoses} />
      </section>

      <section aria-labelledby="rx-heading">
        <h2 id="rx-heading" className="mb-3 text-lg font-semibold text-slate-900">
          Active prescriptions
        </h2>

        {prescriptions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <p className="text-sm font-medium text-slate-700">No active prescriptions</p>
            <p className="mt-1 text-sm text-slate-500">
              Prescriptions issued by your doctor will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {prescriptions.map((prescription) => (
              <PrescriptionCard key={prescription.id} prescription={prescription} />
            ))}
          </div>
        )}
      </section>

      <p className="mt-8 text-xs leading-relaxed text-slate-400">
        Reminder times are generated automatically from the prescribed frequency and are a convenience only. Always
        follow the instructions given by your doctor or pharmacist.
      </p>
    </main>
  );
}
