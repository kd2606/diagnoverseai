'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import FullScreenLoader from './FullScreenLoader';
import { supabase } from '@/lib/supabase/client';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<'checking' | 'authorized' | 'redirecting' | 'unauthorized'>('checking');

  useEffect(() => {
    let cancelled = false;

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      const currentLocale = pathname.split('/')[1] || 'en';
      const purePath = pathname.replace(new RegExp('^/' + currentLocale), '') || '/';

      if (!session) {
        if (!cancelled) {
          setState('redirecting');
          router.replace(`/${currentLocale}/auth/login?next=${encodeURIComponent(pathname)}`);
        }
        return;
      }

      const role = session.user.app_metadata?.role;
      const effectiveRole = role === 'doctor' ? 'doctor' : 'patient';
      const homePath = `/dashboard/${effectiveRole}`;

      // Root dashboard redirect
      if (purePath === '/dashboard' || purePath === '/dashboard/') {
        if (!cancelled) {
          setState('redirecting');
          router.replace(`/${currentLocale}${homePath}`);
        }
        return;
      }

      // Strict path isolation
      let isAllowed = false;
      if (effectiveRole === 'patient') {
        isAllowed = purePath.startsWith('/dashboard/patient');
      } else if (effectiveRole === 'doctor') {
        isAllowed = purePath.startsWith('/dashboard/doctor');
      }

      if (!isAllowed) {
        if (!cancelled) {
          setState('redirecting');
          router.replace(`/${currentLocale}${homePath}`);
        }
        return;
      }

      if (!cancelled) {
        setState('authorized');
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && state === 'authorized') {
        const currentLocale = pathname.split('/')[1] || 'en';
        router.replace(`/${currentLocale}/auth/login`);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [pathname, router, state]);

  if (state === 'unauthorized') {
     return (
       <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
         <div className="bg-white rounded-xl shadow p-6 max-w-md w-full text-center border border-red-100">
           <h2 className="text-xl font-bold text-slate-800 mb-2">Access Denied</h2>
           <button
             onClick={() => router.push('/')}
             className="w-full bg-slate-900 text-white rounded-lg py-2 font-medium hover:bg-slate-800"
           >
             Return Home
           </button>
         </div>
       </div>
     );
  }

  if (state !== 'authorized') return <FullScreenLoader />;
  return <>{children}</>;
}
