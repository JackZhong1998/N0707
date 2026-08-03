import type { TargetMarket, Todo } from './types';

const LOCALE_ALIASES: Array<{ locale: string; patterns: RegExp[] }> = [
  { locale: 'zh-CN', patterns: [/中文|简体|中国大陆|mainland china/i] },
  { locale: 'zh-TW', patterns: [/繁体|台(?:湾|灣)|taiwan/i] },
  { locale: 'zh-HK', patterns: [/香港|hong kong|粤语|廣東話|cantonese/i] },
  { locale: 'fr-CA', patterns: [/加拿大法语|法语加拿大|french canada|qu[eé]bec/i] },
  { locale: 'en-CA', patterns: [/加拿大英语|英语加拿大|english canada/i] },
  { locale: 'es-MX', patterns: [/墨西哥|mexico|español.*m[eé]xico/i] },
  { locale: 'pt-BR', patterns: [/巴西|brazil|portugu[eê]s.*brasil/i] },
  { locale: 'en-GB', patterns: [/英国|united kingdom|\buk\b|british english/i] },
  { locale: 'en-AU', patterns: [/澳大利亚|澳洲|australia/i] },
  { locale: 'en-US', patterns: [/美国|美國|united states|\busa?\b|american english/i] },
  { locale: 'fr-FR', patterns: [/法语|法語|fran[cç]ais|\bfrance\b/i] },
  { locale: 'de-DE', patterns: [/德语|德語|deutsch|germany|德国|德國/i] },
  { locale: 'es-ES', patterns: [/西班牙语|西班牙語|español|spain|西班牙/i] },
  { locale: 'ja-JP', patterns: [/日语|日語|日本語|japanese|japan|日本/i] },
  { locale: 'ko-KR', patterns: [/韩语|韓語|한국어|korean|south korea|韩国|韓國/i] },
  { locale: 'it-IT', patterns: [/意大利语|義大利語|italiano|italy|意大利/i] },
  { locale: 'pt-PT', patterns: [/葡萄牙语|葡萄牙語|portugu[eê]s|portugal|葡萄牙/i] },
  { locale: 'ar-SA', patterns: [/阿拉伯语|阿拉伯語|العربية|arabic|saudi/i] },
  { locale: 'hi-IN', patterns: [/印地语|印地語|हिन्दी|hindi|india|印度/i] },
  { locale: 'id-ID', patterns: [/印尼语|印尼語|bahasa indonesia|indonesia|印度尼西亚/i] },
  { locale: 'th-TH', patterns: [/泰语|泰語|ภาษาไทย|thai|thailand|泰国|泰國/i] },
  { locale: 'vi-VN', patterns: [/越南语|越南語|tiếng việt|vietnamese|vietnam|越南/i] },
  { locale: 'en-US', patterns: [/英语|英語|english/i] },
];

export const COMMON_OUTPUT_LOCALES = [
  'en-US', 'en-GB', 'en-CA', 'en-AU', 'zh-CN', 'zh-TW', 'zh-HK',
  'fr-FR', 'fr-CA', 'de-DE', 'es-ES', 'es-MX', 'ja-JP', 'ko-KR',
  'pt-BR', 'pt-PT', 'it-IT', 'ar-SA', 'hi-IN', 'id-ID', 'th-TH', 'vi-VN',
] as const;

export function normalizeOutputLocale(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  try {
    const canonical = Intl.getCanonicalLocales(trimmed)[0];
    return canonical || undefined;
  } catch {
    return undefined;
  }
}

export function inferOutputLocale(value: string, fallback = 'en-US'): string {
  const explicit = value.match(/\b[a-z]{2,3}(?:-[A-Z]{2})\b/);
  const normalized = normalizeOutputLocale(explicit?.[0]);
  if (normalized) return normalized;
  for (const candidate of LOCALE_ALIASES) {
    if (candidate.patterns.some((pattern) => pattern.test(value))) {
      return candidate.locale;
    }
  }
  return fallback;
}

export function outputLanguageLabel(locale: string, uiLocale: string): string {
  const normalized = normalizeOutputLocale(locale) ?? locale;
  try {
    const display = new Intl.DisplayNames(
      [uiLocale === 'zh' ? 'zh-CN' : 'en-US'],
      { type: 'language' }
    ).of(normalized);
    return display || normalized;
  } catch {
    return normalized;
  }
}

function marketId(region: string, index: number): string {
  const slug = region
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 48);
  return `market-${slug || 'custom'}-${index + 1}`;
}

/**
 * Parse one user-entered market per line.
 * Recommended shape: Region | Language or locale | Audience.
 */
export function parseTargetMarkets(raw: string, uiLocale: string): TargetMarket[] {
  const lines = raw
    .split(/\r?\n|;/)
    .map((line) => line.replace(/^[-*\d.)\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, 12);
  return lines.map((line, index) => {
    const [regionRaw, languageRaw, audienceRaw] = line
      .split(/[|｜]/)
      .map((part) => part.trim());
    const region = regionRaw || line;
    const locale = inferOutputLocale(
      [languageRaw, region].filter(Boolean).join(' '),
      uiLocale === 'zh' ? 'zh-CN' : 'en-US'
    );
    const language = languageRaw || outputLanguageLabel(locale, uiLocale);
    return {
      id: marketId(region, index),
      name: region,
      region,
      language,
      locale,
      audience: audienceRaw || undefined,
      isDefault: index === 0,
    };
  });
}

export function defaultTargetMarket(markets: TargetMarket[] | undefined): TargetMarket | undefined {
  return markets?.find((market) => market.isDefault) ?? markets?.[0];
}

export function resolveTodoMarket<T extends {
  market?: string;
  targetMarketId?: string;
  outputLocale?: string;
  audience?: string;
}>(todo: T, markets: TargetMarket[] | undefined): Pick<Todo, 'market' | 'targetMarketId' | 'outputLocale' | 'audience'> {
  const selected =
    markets?.find((market) => market.id === todo.targetMarketId) ??
    markets?.find((market) => market.name.toLowerCase() === todo.market?.toLowerCase()) ??
    defaultTargetMarket(markets);
  return {
    market: todo.market || selected?.name,
    targetMarketId: selected?.id || todo.targetMarketId,
    outputLocale:
      normalizeOutputLocale(todo.outputLocale) ||
      selected?.locale ||
      (todo.market ? inferOutputLocale(todo.market) : undefined),
    audience: todo.audience || selected?.audience,
  };
}
