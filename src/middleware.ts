import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Match only internationalized pathnames, excluding /api routes
  matcher: ['/', '/(fr|en|es|pt|ar|de|zh)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)']
};
