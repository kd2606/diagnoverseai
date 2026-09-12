import { TriageConsole } from "./_components/triage-console";
import { TRIAGE_CASES } from "@/lib/triage/mock-cases";

export default async function DoctorCommandCenterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <TriageConsole cases={[...TRIAGE_CASES]} locale={locale} />;
}
