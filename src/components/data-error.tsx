import { SpotlightCard } from '@/components/patient/ui';

export function DataError({
  message,
  code,
}: {
  message: string;
  code?: string;
}) {
  const isAuth = code === 'UNAUTHENTICATED' || code === 'FORBIDDEN';

  return (
    <SpotlightCard className="p-8 text-center mt-12 max-w-xl mx-auto">
      <p className="text-sm font-medium text-red-300">{message}</p>
      {isAuth && (
        <a href="/login" className="mt-3 inline-block text-xs text-white/50 underline">
          Sign in as a clinician
        </a>
      )}
    </SpotlightCard>
  );
}
