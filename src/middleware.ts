import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';

const handleI18nRouting = createMiddleware(routing);

const isProtectedRoute = createRouteMatcher([
  '/:locale/dashboard(.*)',
  '/dashboard(.*)',
  '/:locale/app(.*)',
  '/app(.*)',
]);

const isClerkConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('xxxxx') &&
    process.env.CLERK_SECRET_KEY &&
    !process.env.CLERK_SECRET_KEY.includes('xxxxx')
);

function routeRequest(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasLocalePrefix = routing.locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );
  const isRootPath = pathname === '/';
  const isStaticAsset = /\.[^/]+$/.test(pathname);
  const isApiRoute = pathname.startsWith('/api');

  if (isApiRoute || isStaticAsset) {
    return NextResponse.next();
  }

  // Internally rewrite routes like /pricing to /en/pricing while keeping the URL.
  if (!hasLocalePrefix && !isRootPath) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = `/${routing.defaultLocale}${pathname}`;
    rewriteUrl.search = search;
    return NextResponse.rewrite(rewriteUrl);
  }

  return handleI18nRouting(request);
}

// Clerk 未配置（本地演示）时跳过鉴权，仅做 i18n 路由。
const middleware = isClerkConfigured
  ? clerkMiddleware(async (auth, request) => {
      if (isProtectedRoute(request)) {
        await auth.protect();
      }
      return routeRequest(request);
    })
  : (request: NextRequest) => routeRequest(request);

export default middleware;

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
