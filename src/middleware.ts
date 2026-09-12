import { NextResponse, type NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { decodeJwt } from 'jose';

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

export default async function proxy(request: NextRequest) {
  const { locale, path } = stripLocale(request.nextUrl.pathname);

  if (!path.startsWith('/dashboard')) {
    return handleI18n(request);
  }

  // Supabase auth token is usually stored in cookies
  // Find any cookie that looks like a Supabase auth token
  const authCookieName = request.cookies.getAll().find(c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'))?.name;
  let token = null;

  if (authCookieName) {
    try {
      const cookieVal = request.cookies.get(authCookieName)?.value;
      if (cookieVal) {
         const parsed = JSON.parse(cookieVal);
         token = parsed.access_token;
      }
    } catch {
       token = null;
    }
  }

  // Fallback for custom session cookies if they implemented it that way
  if (!token) {
     token = request.cookies.get('__session')?.value;
  }

  let role: 'doctor' | 'patient' | null = null;

  if (token) {
    try {
      const payload = decodeJwt(token);
      role = (payload.app_metadata as any)?.role === 'doctor' ? 'doctor' : 'patient';
    } catch {
      role = null;
    }
  }

  if (!role) {
    const url = request.nextUrl.clone();
    let authPath = '/auth/login';
    url.pathname = localized(locale, authPath);
    url.search = `?next=${encodeURIComponent(request.nextUrl.pathname)}`;
    return NextResponse.redirect(url);
  }

  const allowed =
    (role === 'patient' && path.startsWith('/dashboard/patient')) ||
    (role === 'doctor' && path.startsWith('/dashboard/doctor'));

  if (path === '/dashboard' || path === '/dashboard/' || !allowed) {
    const url = request.nextUrl.clone();
    url.pathname = localized(locale, `/dashboard/${role}`);
    url.search = '';
    return NextResponse.redirect(url);
  }

  return handleI18n(request);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
