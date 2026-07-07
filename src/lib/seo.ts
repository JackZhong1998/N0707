const FALLBACK_BASE_URL = 'https://nowbuild.ai';

function normalizeBaseUrl(url: string) {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

export function getBaseUrl() {
  const rawUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  // Canonical URLs, sitemap and JSON-LD must always point at the public
  // domain — never localhost or a placeholder.
  if (
    !rawUrl ||
    rawUrl.includes('yourdomain.com') ||
    rawUrl.includes('localhost') ||
    rawUrl.includes('127.0.0.1')
  ) {
    return FALLBACK_BASE_URL;
  }

  return normalizeBaseUrl(rawUrl);
}

export function getSiteName() {
  return process.env.NEXT_PUBLIC_APP_NAME?.trim() || 'NowBuild';
}

export function buildAbsoluteUrl(pathname: string) {
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${getBaseUrl()}${normalizedPath}`;
}

const DEFAULT_LOCALE = 'en';

/**
 * Public path for a locale. Routing uses localePrefix "as-needed", so the
 * default locale (en) lives at unprefixed URLs (/pricing) while other
 * locales are prefixed (/zh/pricing). Canonical URLs, hreflang and JSON-LD
 * must use these public URLs — /en/... only 307-redirects.
 */
export function localePath(locale: string, path = '') {
  const normalized = !path || path === '/' ? '' : path.startsWith('/') ? path : `/${path}`;
  if (locale === DEFAULT_LOCALE) return normalized || '/';
  return `/${locale}${normalized}`;
}

/** hreflang map for Next metadata `alternates.languages`. */
export function languageAlternates(path = '') {
  return {
    en: localePath('en', path),
    zh: localePath('zh', path),
    'x-default': localePath('en', path),
  };
}
