/** @type {import('next-sitemap').IConfig} */
const rawUrl = process.env.NEXT_PUBLIC_APP_URL || '';
const siteUrl =
  rawUrl &&
  !rawUrl.includes('yourdomain.com') &&
  !rawUrl.includes('localhost') &&
  !rawUrl.includes('127.0.0.1')
    ? rawUrl.replace(/\/$/, '')
    : 'https://nowbuild.ai';

const LOCALES = ['en', 'zh'];
const DEFAULT_LOCALE = 'en';

/** Strip the locale prefix from a build path like /en/blog -> /blog */
function stripLocale(path) {
  for (const locale of LOCALES) {
    if (path === `/${locale}`) return '/';
    if (path.startsWith(`/${locale}/`)) return path.slice(locale.length + 1);
  }
  return path;
}

/**
 * Public URL path for a locale. Routing uses localePrefix "as-needed":
 * the default locale (en) is served at unprefixed URLs, /en/* redirects.
 */
function publicPath(locale, basePath) {
  const suffix = basePath === '/' ? '' : basePath;
  return locale === DEFAULT_LOCALE ? suffix || '/' : `/${locale}${suffix}`;
}

/** Per-page priority: marketing pages matter most */
function priorityFor(basePath) {
  if (basePath === '/') return 1.0;
  if (basePath === '/pricing') return 0.9;
  if (basePath.startsWith('/blog')) return 0.8;
  if (basePath === '/about') return 0.6;
  return 0.5;
}

module.exports = {
  siteUrl,
  generateRobotsTxt: true,
  generateIndexSitemap: false,
  exclude: [
    '/api/*',
    '/sign-in*',
    '/sign-up*',
    '/*/sign-in*',
    '/*/sign-up*',
    '/*/workspace*',
    '/*/dashboard*',
    // Bare root: the '/' entry is emitted from the '/en' build path instead
    '/',
  ],
  transform: async (config, path) => {
    const basePath = stripLocale(path);
    const isDefaultLocalePath = path === `/${DEFAULT_LOCALE}` || path.startsWith(`/${DEFAULT_LOCALE}/`);
    return {
      // /en/* build paths 307-redirect in production; index unprefixed URLs
      loc: isDefaultLocalePath ? publicPath(DEFAULT_LOCALE, basePath) : path,
      changefreq: basePath.startsWith('/blog') ? 'weekly' : 'monthly',
      priority: priorityFor(basePath),
      lastmod: new Date().toISOString(),
      alternateRefs: [
        ...LOCALES.map((locale) => ({
          href: `${siteUrl}${publicPath(locale, basePath)}`,
          hreflang: locale,
          hrefIsAbsolute: true,
        })),
        {
          href: `${siteUrl}${publicPath(DEFAULT_LOCALE, basePath)}`,
          hreflang: 'x-default',
          hrefIsAbsolute: true,
        },
      ],
    };
  },
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/sign-in',
          '/sign-up',
          '/workspace',
          '/dashboard',
          '/en/workspace',
          '/zh/workspace',
          '/en/dashboard',
          '/zh/dashboard',
        ],
      },
      // Explicitly welcome AI search / answer-engine crawlers (GEO)
      { userAgent: 'GPTBot', allow: '/' },
      { userAgent: 'OAI-SearchBot', allow: '/' },
      { userAgent: 'ChatGPT-User', allow: '/' },
      { userAgent: 'ClaudeBot', allow: '/' },
      { userAgent: 'Claude-Web', allow: '/' },
      { userAgent: 'anthropic-ai', allow: '/' },
      { userAgent: 'PerplexityBot', allow: '/' },
      { userAgent: 'Perplexity-User', allow: '/' },
      { userAgent: 'Google-Extended', allow: '/' },
      { userAgent: 'Bingbot', allow: '/' },
    ],
  },
};
