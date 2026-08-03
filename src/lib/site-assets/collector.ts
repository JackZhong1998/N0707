import 'server-only';

import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

type AssetKind = 'logo' | 'screenshot';

interface Candidate {
  kind: AssetKind;
  name: string;
  url: string;
  score: number;
}

export interface CrawledSiteAsset {
  kind: AssetKind;
  name: string;
  dataUrl: string;
  sourceUrl: string;
  source: 'metadata';
}

export interface CrawledSocialLinks {
  twitterUrl?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  discordUrl?: string;
  youtubeUrl?: string;
}

const MAX_HTML_BYTES = 2_000_000;
// Launch state is currently mirrored to browser storage, so keep the first MVP
// comfortably below common localStorage quotas until object storage lands.
const MAX_IMAGE_BYTES = 600_000;
const MAX_TOTAL_IMAGE_BYTES = 1_500_000;
const REQUEST_TIMEOUT_MS = 12_000;

function isPrivateIpv4(address: string): boolean {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
    return true;
  }
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

function isPrivateIp(address: string): boolean {
  if (isIP(address) === 4) return isPrivateIpv4(address);
  const normalized = address.toLowerCase();
  if (normalized.startsWith('::ffff:')) {
    return isPrivateIpv4(normalized.slice('::ffff:'.length));
  }
  return (
    normalized === '::' ||
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    /^fe[89ab]/.test(normalized)
  );
}

async function assertPublicUrl(url: URL): Promise<void> {
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Only public HTTP(S) websites can be collected');
  }
  if (url.username || url.password) throw new Error('Credentials are not allowed in URLs');
  if (url.port && !['80', '443'].includes(url.port)) {
    throw new Error('Only standard website ports are allowed');
  }
  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    throw new Error('Private websites cannot be collected');
  }
  const addresses = isIP(hostname)
    ? [{ address: hostname }]
    : await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((item) => isPrivateIp(item.address))) {
    throw new Error('Private network addresses cannot be collected');
  }
}

async function safeFetch(
  initialUrl: URL,
  options: { accept: 'html' | 'image' }
): Promise<{ response: Response; finalUrl: URL }> {
  let current = initialUrl;
  for (let redirect = 0; redirect <= 4; redirect += 1) {
    await assertPublicUrl(current);
    const response = await fetch(current, {
      redirect: 'manual',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        Accept:
          options.accept === 'html'
            ? 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1'
            : 'image/avif,image/webp,image/png,image/jpeg,image/svg+xml,image/*;q=0.8',
        'User-Agent': 'NowBuildAssetCollector/1.0 (+https://nowbuild.co)',
      },
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location || redirect === 4) throw new Error('Too many website redirects');
      current = new URL(location, current);
      continue;
    }
    return { response, finalUrl: current };
  }
  throw new Error('Unable to load website');
}

function attributes(tag: string): Record<string, string> {
  const result: Record<string, string> = {};
  const matcher = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const match of tag.matchAll(matcher)) {
    result[match[1]!.toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return result;
}

function absoluteUrl(raw: string | undefined, baseUrl: URL): string | null {
  if (!raw) return null;
  const first = raw.split(',')[0]?.trim().split(/\s+/)[0];
  if (!first || first.startsWith('data:') || first.startsWith('blob:')) return null;
  try {
    const url = new URL(first, baseUrl);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function fileName(url: string, fallback: string): string {
  try {
    const last = new URL(url).pathname.split('/').filter(Boolean).pop();
    return (last || fallback).slice(0, 120);
  } catch {
    return fallback;
  }
}

function addCandidate(
  list: Candidate[],
  baseUrl: URL,
  rawUrl: string | undefined,
  kind: AssetKind,
  score: number,
  name: string
) {
  const url = absoluteUrl(rawUrl, baseUrl);
  if (!url) return;
  list.push({ kind, score, url, name: fileName(url, name) });
}

function jsonLdImageUrls(value: unknown, output: string[] = []): string[] {
  if (!value || typeof value !== 'object') return output;
  if (Array.isArray(value)) {
    value.forEach((item) => jsonLdImageUrls(item, output));
    return output;
  }
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (['logo', 'image', 'screenshot'].includes(key.toLowerCase())) {
      if (typeof item === 'string') output.push(item);
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const url = (item as Record<string, unknown>).url;
        if (typeof url === 'string') output.push(url);
      }
    }
    jsonLdImageUrls(item, output);
  }
  return output;
}

function extractCandidates(html: string, baseUrl: URL): Candidate[] {
  const candidates: Candidate[] = [];
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attrs = attributes(tag);
    const key = (attrs.property || attrs.name || attrs.itemprop || '').toLowerCase();
    if (key === 'og:logo' || key === 'logo') {
      addCandidate(candidates, baseUrl, attrs.content, 'logo', 100, 'website-logo');
    }
    if (['og:image', 'og:image:secure_url', 'twitter:image', 'twitter:image:src'].includes(key)) {
      addCandidate(candidates, baseUrl, attrs.content, 'screenshot', 95, 'website-social-image');
    }
  }
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const attrs = attributes(tag);
    const rel = (attrs.rel || '').toLowerCase();
    if (/\b(?:icon|apple-touch-icon|mask-icon)\b/.test(rel)) {
      const sizes = attrs.sizes || '';
      const sizeScore = Number(sizes.match(/(\d+)x/i)?.[1] || 0);
      addCandidate(candidates, baseUrl, attrs.href, 'logo', 65 + Math.min(sizeScore / 20, 20), 'website-icon');
    }
  }
  for (const tag of html.match(/<img\b[^>]*>/gi) ?? []) {
    const attrs = attributes(tag);
    const hint = [attrs.alt, attrs.class, attrs.id, attrs.src, attrs['data-src']]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    const width = Number(attrs.width || 0);
    const height = Number(attrs.height || 0);
    const src = attrs.src || attrs['data-src'] || attrs['data-lazy-src'] || attrs.srcset;
    if (/logo|brand|site-mark|wordmark/.test(hint)) {
      addCandidate(candidates, baseUrl, src, 'logo', 85, 'website-logo');
      continue;
    }
    const positive = /screenshot|dashboard|product|interface|preview|mockup|hero|app[-_ ]?screen/.test(hint);
    const negative = /avatar|testimonial|customer|partner|badge|icon|emoji|flag/.test(hint);
    const largeEnough = width >= 480 || height >= 300 || (!width && !height && positive);
    if ((positive || largeEnough) && !negative) {
      addCandidate(candidates, baseUrl, src, 'screenshot', positive ? 75 : 45, 'website-product-image');
    }
  }
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(match[1]!.trim());
      for (const url of jsonLdImageUrls(parsed)) {
        const isLogo = /logo|icon|mark/i.test(url);
        addCandidate(candidates, baseUrl, url, isLogo ? 'logo' : 'screenshot', 80, isLogo ? 'structured-logo' : 'structured-product-image');
      }
    } catch {
      // Invalid structured data should not prevent other public assets loading.
    }
  }
  // Common conventional paths cover sites whose header logo is an inline SVG
  // and whose favicon is injected by JavaScript rather than present in HTML.
  addCandidate(candidates, baseUrl, '/apple-touch-icon.png', 'logo', 35, 'apple-touch-icon.png');
  addCandidate(candidates, baseUrl, '/favicon.svg', 'logo', 30, 'favicon.svg');
  addCandidate(candidates, baseUrl, '/favicon.png', 'logo', 25, 'favicon.png');
  addCandidate(candidates, baseUrl, '/favicon.ico', 'logo', 20, 'favicon.ico');
  const bestByUrl = new Map<string, Candidate>();
  for (const candidate of candidates) {
    const previous = bestByUrl.get(candidate.url);
    if (!previous || candidate.score > previous.score) bestByUrl.set(candidate.url, candidate);
  }
  return [...bestByUrl.values()].sort((a, b) => b.score - a.score);
}

function extractSocialLinks(html: string, baseUrl: URL): CrawledSocialLinks {
  const result: CrawledSocialLinks = {};
  for (const tag of html.match(/<a\b[^>]*>/gi) ?? []) {
    const href = absoluteUrl(attributes(tag).href, baseUrl);
    if (!href) continue;
    let url: URL;
    try { url = new URL(href); } catch { continue; }
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    const path = url.pathname.toLowerCase();
    if (!result.twitterUrl && ['x.com', 'twitter.com'].includes(host) && !/^\/(?:intent|share|search)\b/.test(path)) {
      result.twitterUrl = href;
    } else if (!result.linkedinUrl && host === 'linkedin.com' && /\/(?:company|in)\//.test(path)) {
      result.linkedinUrl = href;
    } else if (!result.githubUrl && host === 'github.com' && path.split('/').filter(Boolean).length >= 1) {
      result.githubUrl = href;
    } else if (!result.discordUrl && (host === 'discord.gg' || (host === 'discord.com' && path.startsWith('/invite/')))) {
      result.discordUrl = href;
    } else if (!result.youtubeUrl && (host === 'youtube.com' || host === 'youtu.be')) {
      result.youtubeUrl = href;
    }
  }
  return result;
}

async function downloadCandidate(candidate: Candidate): Promise<{ asset: CrawledSiteAsset; bytes: number }> {
  const { response, finalUrl } = await safeFetch(new URL(candidate.url), { accept: 'image' });
  if (!response.ok) throw new Error(`Image returned ${response.status}`);
  const contentType = (response.headers.get('content-type') || '').split(';')[0]!.trim().toLowerCase();
  if (!contentType.startsWith('image/')) throw new Error('URL is not an image');
  const declaredSize = Number(response.headers.get('content-length') || 0);
  if (declaredSize > MAX_IMAGE_BYTES) throw new Error('Image is too large');
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) throw new Error('Image is too large');
  return {
    bytes: buffer.length,
    asset: {
      kind: candidate.kind,
      name: candidate.name,
      dataUrl: `data:${contentType};base64,${buffer.toString('base64')}`,
      sourceUrl: finalUrl.href,
      source: 'metadata',
    },
  };
}

export async function collectPublicSiteAssets(productUrl: string): Promise<{
  assets: CrawledSiteAsset[];
  pageUrl: string;
  socialLinks: CrawledSocialLinks;
}> {
  const normalized = /^https?:\/\//i.test(productUrl.trim())
    ? productUrl.trim()
    : `https://${productUrl.trim()}`;
  const { response, finalUrl } = await safeFetch(new URL(normalized), { accept: 'html' });
  if (!response.ok) throw new Error(`Website returned ${response.status}`);
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
    throw new Error('URL did not return a website');
  }
  const declaredSize = Number(response.headers.get('content-length') || 0);
  if (declaredSize > MAX_HTML_BYTES) throw new Error('Website HTML is too large');
  const html = (await response.text()).slice(0, MAX_HTML_BYTES);
  const candidates = extractCandidates(html, finalUrl);
  const socialLinks = extractSocialLinks(html, finalUrl);
  const selected = [
    ...candidates.filter((item) => item.kind === 'logo').slice(0, 4),
    ...candidates.filter((item) => item.kind === 'screenshot').slice(0, 10),
  ];
  const assets: CrawledSiteAsset[] = [];
  let totalBytes = 0;
  let logoCount = 0;
  let screenshotCount = 0;
  for (const candidate of selected) {
    if (candidate.kind === 'logo' && logoCount >= 1) continue;
    if (candidate.kind === 'screenshot' && screenshotCount >= 4) continue;
    try {
      const downloaded = await downloadCandidate(candidate);
      if (totalBytes + downloaded.bytes > MAX_TOTAL_IMAGE_BYTES) continue;
      assets.push(downloaded.asset);
      totalBytes += downloaded.bytes;
      if (candidate.kind === 'logo') logoCount += 1;
      else screenshotCount += 1;
    } catch {
      // Try the next candidate; many sites expose stale or protected image URLs.
    }
  }
  if (!assets.length) throw new Error('No usable public product images were found');
  return { assets, pageUrl: finalUrl.href, socialLinks };
}
