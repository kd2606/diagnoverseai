import { getTranslations } from "next-intl/server";
import { Suspense } from 'react';
import { TriageConsole } from "./_components/triage-console";
import { getTriageQueue } from "@/actions/clinical-data";
import { DataError } from "@/components/data-error";
import { toQueueCardModel } from "@/lib/adapters/clinical";

export default async function DoctorCommandCenterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const t = await getTranslations("Doctor");
  const { locale } = await params;
  
  return (
    <Suspense fallback={<div className="p-10 text-center animate-pulse">{t("loadingTriageQueue")}</div>}>
      <TriageQueueLoader locale={locale} />
    </Suspense>
  );
}

async function TriageQueueLoader({ locale }: { locale: string }) {
  const result = await getTriageQueue({ limit: 100, includeVerified: true });

  if (!result.ok) {
    return <DataError message={result.error} code={result.code} />;
  }

  const cases = result.data.map(toQueueCardModel);
  return <TriageConsole cases={cases} locale={locale} />;
}
