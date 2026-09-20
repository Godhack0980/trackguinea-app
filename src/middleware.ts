import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware(routing);

const ALLOWED_ORIGINS = new Set([
  'https://localhost',
  'capacitor://localhost',
  'https://transconnekt.com',
  'https://www.transconnekt.com',
  'http://localhost:3000',
]);

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get('origin');

  // Interception prioritaire des requêtes API pour la gestion CORS centralisée
  if (pathname.startsWith('/api/')) {
    const isAllowed = origin && ALLOWED_ORIGINS.has(origin);

    // 1. Réponse immédiate au preflight OPTIONS
    if (request.method === 'OPTIONS') {
      const preflightHeaders = new Headers();
      if (isAllowed && origin) {
        preflightHeaders.set('Access-Control-Allow-Origin', origin);
        preflightHeaders.set('Access-Control-Allow-Credentials', 'true');
      }
      preflightHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      preflightHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
      preflightHeaders.set('Access-Control-Max-Age', '86400');
      return new NextResponse(null, { status: 204, headers: preflightHeaders });
    }

    // 2. Requêtes API réelles (GET, POST, etc.)
    const response = NextResponse.next();
    if (isAllowed && origin) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }
    return response;
  }

  const userAgent = request.headers.get('user-agent') || '';
  const isCapacitorApp = userAgent.includes('TransConnektApp') || request.headers.get('x-requested-with') === 'com.transconnekt.app';

  // Si la requête provient de l'application native TransConnekt
  if (isCapacitorApp) {
    // 1. Accès racine pur: '/' -> aiguiller directement vers '/[defaultLocale]/mobile'
    if (pathname === '/') {
      return NextResponse.redirect(new URL(`/${routing.defaultLocale}/mobile`, request.url));
    }

    // 2. Accès racine de langue: '/fr', '/en', etc. -> aiguiller vers '/fr/mobile', '/en/mobile'
    const isLocaleRoot = routing.locales.some((locale) => pathname === `/${locale}`);
    if (isLocaleRoot) {
      return NextResponse.redirect(new URL(`${pathname}/mobile`, request.url));
    }
  }

  // Pour les navigateurs Web et les routes internes de l'application (ex: /[locale]/mobile),
  // exécuter le middleware next-intl standard sans altération
  return intlMiddleware(request);
}

export const config = {
  // Match API routes as well as internationalized pathnames, excluding static assets
  matcher: ['/api/:path*', '/', '/(fr|en|es|pt|ar|de|zh)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)']
};

