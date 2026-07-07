import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import { routing } from '@/i18n/routing';

const handleI18nRouting = createMiddleware(routing);

const isProtectedRoute = createRouteMatcher([
  '/:locale/dashboard(.*)',
  '/dashboard(.*)',
  '/:locale/workspace(.*)',
  '/workspace(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    await auth.protect();
  }

  const { pathname, search } = request.nextUrl;
  const hasLocalePrefix = routing.locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );
  const isRootPath = pathname === '/';
  const isStaticAsset = /\.[^/]+$/.test(pathname);
  const isApiRoute = pathname.startsWith('/api');

  if (isApiRoute) {
    return NextResponse.next();
  }

  // Serve static files from /public (robots.txt, sitemap.xml, llms.txt, ...)
  // untouched — locale routing would otherwise rewrite them into 404s.
  if (isStaticAsset) {
    return NextResponse.next();
  }

  // Internally rewrite routes like /pricing to /en/pricing while keeping the URL.
  if (!hasLocalePrefix && !isRootPath && !isStaticAsset) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = `/${routing.defaultLocale}${pathname}`;
    rewriteUrl.search = search;
    return NextResponse.rewrite(rewriteUrl);
  }

  return handleI18nRouting(request);
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
