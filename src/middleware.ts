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

function redirectToSignIn(request: NextRequest) {
  const signInUrl = new URL('/sign-in', request.url);
  // Keep users on the public (as-needed) path after auth — /en/app only 307s away.
  const returnUrl = new URL(request.url);
  if (returnUrl.pathname === `/${routing.defaultLocale}` || returnUrl.pathname.startsWith(`/${routing.defaultLocale}/`)) {
    returnUrl.pathname =
      returnUrl.pathname === `/${routing.defaultLocale}`
        ? '/'
        : returnUrl.pathname.slice(`/${routing.defaultLocale}`.length) || '/';
  }
  signInUrl.searchParams.set('redirect_url', returnUrl.toString());
  return NextResponse.redirect(signInUrl);
}

// Clerk 未配置（本地演示）时跳过鉴权，仅做 i18n 路由。
const middleware = isClerkConfigured
  ? clerkMiddleware(
      async (auth, request) => {
        if (isProtectedRoute(request)) {
          const { userId } = await auth();
          // Do not use auth.protect(): its internal /clerk_* rewrite is captured by
          // [locale] and becomes a 404, which also breaks post-OAuth redirects to /app.
          if (!userId) {
            return redirectToSignIn(request);
          }
        }
        return routeRequest(request);
      },
      {
        signInUrl: '/sign-in',
        signUpUrl: '/sign-up',
      }
    )
  : (request: NextRequest) => routeRequest(request);

export default middleware;

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
