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
            ? 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
            : 'image/avif,image/webp,image/png,image/jpeg,image/svg+xml,image/*;q=0.8,*/*;q=0.5',
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        ...(options.accept === 'html'
          ? { 'Cache-Control': 'no-cache', 'Upgrade-Insecure-Requests': '1' }
          : {}),
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
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    const last = [...parts].reverse().find((part) => {
      const lower = part.toLowerCase();
      return (
        !['f=auto', 'auto', 'original', 'public'].includes(lower) &&
        !/^(w|h|q|fit|crop)=\d+/i.test(part)
      );
    });
    const cleaned = (last || fallback).split('?')[0] || fallback;
    return cleaned.slice(0, 120);
  } catch {
    return fallback;
  }
}

function hostKey(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, '');
}

function isRelatedHost(assetHost: string, pageHost: string): boolean {
  const asset = hostKey(assetHost);
  const page = hostKey(pageHost);
  if (asset === page) return true;
  if (asset.endsWith(`.${page}`)) return true;
  // Common first-party asset CDNs: assets.example.com, cdn.example.com, static.example.com
  const pageRoot = page.split('.').slice(-2).join('.');
  return asset === pageRoot || asset.endsWith(`.${pageRoot}`);
}

function sameOriginBoost(url: string, baseUrl: URL): number {
  try {
    return isRelatedHost(new URL(url).hostname, baseUrl.hostname) ? 20 : -25;
  } catch {
    return -30;
  }
}

const LOGO_WALL =
  /\/(?:logos?|customers?|partners?|clients?|companies|backers|investors|press|wall-of)\/|(?:customer|partner|client|trusted|backer|investor|logo[-_]?wall|as[-_]?seen|featured[-_]?in|sponsor)s?\b/i;
const LOGO_NEGATIVE =
  /avatar|testimonial|customer|partner|client|trusted|backer|investor|sponsor|press|badge|emoji|flag|wallpaper|background|hero[-_]?bg|abstract/i;
const LOGO_STRONG =
  /\b(?:site[-_]?logo|header[-_]?logo|nav(?:bar)?[-_]?logo|brand[-_]?logo|company[-_]?logo|wordmark|apple[-_]?touch[-_]?icon)\b/i;
const SCREENSHOT_POSITIVE =
  /screenshot|dashboard|product[-_ ]?(?:ui|shot|image|preview)?|interface|preview|mockup|app[-_ ]?screen|og[-_]?image|social[-_]?card/i;
const SCREENSHOT_NEGATIVE =
  /avatar|testimonial|customer|partner|client|logo|badge|emoji|flag|icon|favicon|sprite|author|team|portrait|headshot|integration/i;

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
  if (kind === 'logo' && LOGO_WALL.test(url)) return;
  list.push({
    kind,
    score: score + sameOriginBoost(url, baseUrl),
    url,
    name: fileName(url, name),
  });
}

function jsonLdPrimaryImages(value: unknown): Array<{ url: string; kind: AssetKind }> {
  const items = Array.isArray(value) ? value : value ? [value] : [];
  const output: Array<{ url: string; kind: AssetKind }> = [];
  for (const item of items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    const type = String(record['@type'] || '').toLowerCase();
    if (
      type &&
      !/(organization|website|softwareapplication|product|webapplication)/.test(type)
    ) {
      continue;
    }
    for (const key of ['logo', 'image'] as const) {
      const field = record[key];
      const urls: string[] = [];
      if (typeof field === 'string') urls.push(field);
      else if (Array.isArray(field)) {
        for (const entry of field) {
          if (typeof entry === 'string') urls.push(entry);
          else if (entry && typeof entry === 'object' && typeof (entry as { url?: unknown }).url === 'string') {
            urls.push((entry as { url: string }).url);
          }
        }
      } else if (field && typeof field === 'object' && typeof (field as { url?: unknown }).url === 'string') {
        urls.push((field as { url: string }).url);
      }
      for (const url of urls.slice(0, 2)) {
        output.push({
          url,
          kind: key === 'logo' || /logo|icon|mark/i.test(url) ? 'logo' : 'screenshot',
        });
      }
    }
  }
  return output;
}

function readImageSize(
  buffer: Buffer,
  contentType: string
): { width: number; height: number } | null {
  try {
    if (
      (contentType.includes('png') || buffer[0] === 0x89) &&
      buffer.length >= 24 &&
      buffer.toString('ascii', 1, 4) === 'PNG'
    ) {
      return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
    }
    if (
      (contentType.includes('jpeg') || contentType.includes('jpg') || buffer[0] === 0xff) &&
      buffer.length > 4
    ) {
      let offset = 2;
      while (offset + 9 < buffer.length) {
        if (buffer[offset] !== 0xff) break;
        const marker = buffer[offset + 1]!;
        const size = buffer.readUInt16BE(offset + 2);
        if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
          return {
            height: buffer.readUInt16BE(offset + 5),
            width: buffer.readUInt16BE(offset + 7),
          };
        }
        offset += 2 + size;
      }
    }
    if (contentType.includes('gif') || buffer.toString('ascii', 0, 3) === 'GIF') {
      return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
    }
    if (
      (contentType.includes('webp') || buffer.toString('ascii', 0, 4) === 'RIFF') &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    ) {
      if (buffer.toString('ascii', 12, 16) === 'VP8X' && buffer.length >= 30) {
        const width =
          1 + buffer[24]! + (buffer[25]! << 8) + (buffer[26]! << 16);
        const height =
          1 + buffer[27]! + (buffer[28]! << 8) + (buffer[29]! << 16);
        return { width, height };
      }
      if (buffer.toString('ascii', 12, 16) === 'VP8 ' && buffer.length >= 30) {
        return {
          width: buffer.readUInt16LE(26) & 0x3fff,
          height: buffer.readUInt16LE(28) & 0x3fff,
        };
      }
    }
  } catch {
    return null;
  }
  return null;
}

function extractCandidates(html: string, baseUrl: URL): Candidate[] {
  const candidates: Candidate[] = [];
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attrs = attributes(tag);
    const key = (attrs.property || attrs.name || attrs.itemprop || '').toLowerCase();
    if (key === 'og:logo' || key === 'logo') {
      addCandidate(candidates, baseUrl, attrs.content, 'logo', 110, 'website-logo');
    }
    if (['og:image', 'og:image:secure_url', 'twitter:image', 'twitter:image:src'].includes(key)) {
      // Social cards are the most reliable public product visual when present.
      addCandidate(candidates, baseUrl, attrs.content, 'screenshot', 120, 'website-social-image');
    }
  }
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const attrs = attributes(tag);
    const rel = (attrs.rel || '').toLowerCase();
    if (/\b(?:apple-touch-icon)\b/.test(rel)) {
      const sizes = attrs.sizes || '';
      const sizeScore = Number(sizes.match(/(\d+)x/i)?.[1] || 180);
      addCandidate(
        candidates,
        baseUrl,
        attrs.href,
        'logo',
        95 + Math.min(sizeScore / 20, 15),
        'apple-touch-icon'
      );
    } else if (/\b(?:icon|mask-icon|shortcut icon)\b/.test(rel)) {
      const sizes = attrs.sizes || '';
      const sizeScore = Number(sizes.match(/(\d+)x/i)?.[1] || 0);
      // Prefer large PNG/SVG icons over tiny favicons.
      const typeBonus = /svg|png/i.test(attrs.type || attrs.href || '') ? 8 : 0;
      addCandidate(
        candidates,
        baseUrl,
        attrs.href,
        'logo',
        70 + Math.min(sizeScore / 12, 25) + typeBonus,
        'website-icon'
      );
    }
  }

  const imgLogoHints: string[] = [];
  for (const tag of html.match(/<img\b[^>]*>/gi) ?? []) {
    const attrs = attributes(tag);
    const hint = [attrs.alt, attrs.class, attrs.id, attrs.src, attrs['data-src']]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    const width = Number(attrs.width || 0);
    const height = Number(attrs.height || 0);
    const src = attrs.src || attrs['data-src'] || attrs['data-lazy-src'] || attrs.srcset;
    if (LOGO_STRONG.test(hint) || (/\blogo\b|\bwordmark\b/.test(hint) && !LOGO_NEGATIVE.test(hint))) {
      imgLogoHints.push(hint);
      // Bare "logo" matches are weak: customer walls and partner rows use the same class names.
      const strong = LOGO_STRONG.test(hint);
      addCandidate(
        candidates,
        baseUrl,
        src,
        'logo',
        strong ? 60 : 40,
        'website-logo'
      );
      continue;
    }
    const positive = SCREENSHOT_POSITIVE.test(hint);
    const negative = SCREENSHOT_NEGATIVE.test(hint) || LOGO_WALL.test(hint);
    // Do not vacuum every large image on the page — that pulls partner/integration art.
    const largeEnough = positive && (width >= 480 || height >= 300 || (!width && !height));
    if (positive && !negative && largeEnough) {
      addCandidate(candidates, baseUrl, src, 'screenshot', 55, 'website-product-image');
    }
  }
  // If the page has a logo wall / many logo-like images, trust icons & meta instead.
  if (imgLogoHints.length >= 3) {
    for (let index = candidates.length - 1; index >= 0; index -= 1) {
      if (
        candidates[index]?.kind === 'logo' &&
        candidates[index]!.score < 70
      ) {
        candidates.splice(index, 1);
      }
    }
  }

  for (const match of html.matchAll(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )) {
    try {
      const parsed = JSON.parse(match[1]!.trim());
      for (const image of jsonLdPrimaryImages(parsed)) {
        addCandidate(
          candidates,
          baseUrl,
          image.url,
          image.kind,
          image.kind === 'logo' ? 88 : 80,
          image.kind === 'logo' ? 'structured-logo' : 'structured-product-image'
        );
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
  addCandidate(candidates, baseUrl, '/favicon.ico', 'logo', 15, 'favicon.ico');
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
  // ICO is a weak logo fallback; prefer PNG/SVG/JPEG when available.
  if (candidate.kind === 'logo' && contentType.includes('x-icon') && candidate.score < 40) {
    throw new Error('Skipping tiny favicon fallback');
  }
  const declaredSize = Number(response.headers.get('content-length') || 0);
  if (declaredSize > MAX_IMAGE_BYTES) throw new Error('Image is too large');
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) throw new Error('Image is too large');

  const size = readImageSize(buffer, contentType);
  if (size) {
    const maxSide = Math.max(size.width, size.height);
    const minSide = Math.min(size.width, size.height);
    if (maxSide < 32 || minSide < 16) throw new Error('Image is too small');
    if (candidate.kind === 'logo' && maxSide < 48) throw new Error('Logo is too small');
    if (candidate.kind === 'screenshot') {
      // Reject tiny icons mislabeled as product images.
      if (maxSide < 200) throw new Error('Screenshot is too small');
      // Very tall/narrow portraits are usually people or phone mock ads, not product UI.
      if (size.height > size.width * 2.2 && size.width < 700) {
        throw new Error('Screenshot aspect ratio looks wrong');
      }
    }
  }

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
  // Prefer high-confidence meta/icon candidates first; page <img> guesses come later.
  const selected = [
    ...candidates.filter((item) => item.kind === 'logo').slice(0, 6),
    ...candidates.filter((item) => item.kind === 'screenshot').slice(0, 8),
  ];
  const assets: CrawledSiteAsset[] = [];
  let totalBytes = 0;
  let logoCount = 0;
  let screenshotCount = 0;
  for (const candidate of selected) {
    if (candidate.kind === 'logo' && logoCount >= 1) continue;
    if (candidate.kind === 'screenshot' && screenshotCount >= 3) continue;
    try {
      const downloaded = await downloadCandidate(candidate);
      if (totalBytes + downloaded.bytes > MAX_TOTAL_IMAGE_BYTES) continue;
      // Avoid storing the same visual as both logo and screenshot.
      if (
        assets.some(
          (asset) =>
            asset.sourceUrl === downloaded.asset.sourceUrl ||
            asset.dataUrl === downloaded.asset.dataUrl
        )
      ) {
        continue;
      }
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
