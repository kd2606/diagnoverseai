import { NextResponse, type NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';


const handleI18n = createMiddleware(routing);

function stripLocale(pathname: string) {
  const [, maybeLocale, ...rest] = pathname.split('/');
  if ((routing.locales as readonly string[]).includes(maybeLocale)) {
    return { locale: maybeLocale, path: '/' + rest.join('/') };
  }
  return { locale: routing.defaultLocale, path: pathname };
}

function localized(locale: string, path: string) {
  return `/${locale}${path}`;
}

import { updateSession } from '@/lib/supabase/proxy';

export default async function proxy(request: NextRequest) {
  const { locale, path } = stripLocale(request.nextUrl.pathname);

  // First let next-intl generate the base response
  const intlResponse = handleI18n(request);

  if (!path.startsWith('/dashboard')) {
    // Even if it's not a dashboard route, we should refresh the session if present.
    await updateSession(request, intlResponse);
    return intlResponse;
  }

  // Check auth using Supabase proxy
  const { user } = await updateSession(request, intlResponse);
  
  let role: 'doctor' | 'patient' | null = null;
  if (user) {
    const rawRole = (user.user_metadata as any)?.role || (user.app_metadata as any)?.role;
    if (rawRole === 'clinician' || rawRole === 'doctor') {
      role = 'doctor';
    } else if (rawRole === 'patient') {
      role = 'patient';
    } else {
      role = path.startsWith('/dashboard/doctor') ? 'doctor' : 'patient';
    }
  }

  if (!role) {
    const url = request.nextUrl.clone();
    let authPath = '/auth/patient/login';
    if (path.startsWith('/dashboard/doctor')) {
      authPath = '/auth/doctor/login';
    }
    url.pathname = localized(locale, authPath);
    url.search = `?next=${encodeURIComponent(request.nextUrl.pathname)}`;
    
    // Create redirect response but copy cookies from intlResponse
    const redirectRes = NextResponse.redirect(url);
    intlResponse.cookies.getAll().forEach(c => redirectRes.cookies.set(c.name, c.value));
    return redirectRes;
  }

  const allowed =
    (role === 'patient' && path.startsWith('/dashboard/patient')) ||
    (role === 'doctor' && path.startsWith('/dashboard/doctor'));

  if (path === '/dashboard' || path === '/dashboard/' || !allowed) {
    const url = request.nextUrl.clone();
    url.pathname = localized(locale, `/dashboard/${role}`);
    url.search = '';
    const redirectRes = NextResponse.redirect(url);
    intlResponse.cookies.getAll().forEach(c => redirectRes.cookies.set(c.name, c.value));
    return redirectRes;
  }

  return intlResponse;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
