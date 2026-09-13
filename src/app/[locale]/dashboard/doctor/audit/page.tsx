import { Suspense } from 'react';
import { getAuditLogs, verifyAuditChain } from '@/actions/clinical-data';
import { AuditLedger } from './_components/audit-ledger';
import { DataError } from '@/components/data-error';
import { toEventModel } from '@/lib/adapters/clinical';

export default async function AuditPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center animate-pulse">Loading audit ledger...</div>}>
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
