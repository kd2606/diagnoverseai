import { getTranslations } from "next-intl/server";
import { Suspense } from 'react';
import { getAuditLogs, verifyAuditChain } from '@/actions/clinical-data';
import { AuditLedger } from './_components/audit-ledger';
import { DataError } from '@/components/data-error';
import { toEventModel } from '@/lib/adapters/clinical';

export default async function AuditPage() {
  const t = await getTranslations("Doctor");

  return (
    <Suspense fallback={<div className="p-10 text-center animate-pulse">{t("loadingAuditLedger")}</div>}>
      <AuditLedgerLoader />
    </Suspense>
  );
}

async function AuditLedgerLoader() {
  const [logsResult, chainResult] = await Promise.all([
    getAuditLogs({ limit: 100 }),
    verifyAuditChain(),
  ]);

  if (!logsResult.ok) {
    return <DataError message={logsResult.error} code={logsResult.code} />;
  }

  const events = logsResult.data.map(toEventModel);
  return (
    <AuditLedger
      events={events}
      integrity={chainResult.ok ? chainResult.data : null}
    />
  );
}
