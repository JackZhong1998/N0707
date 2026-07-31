import type { LaunchDirectory } from './data';
import { getDirectoryFitProfile, type DirectoryFitProfile } from './fit-profiles';

export type ProductFitProfile = {
  category: string;
  productTypes: string[];
  audiences: string[];
  stage: string;
  goals: string[];
  markets: Array<'B2B' | 'B2C' | 'Developer'>;
  isAiNative: boolean;
};

export type DirectoryMatchTier = 'recommended' | 'verify' | 'not_suitable';

export type DirectoryMatch = {
  directory: LaunchDirectory;
  profile: DirectoryFitProfile;
  score: number;
  tier: DirectoryMatchTier;
  reasons: string[];
  risks: string[];
};

const aliases: Record<string, string[]> = {
  ai: ['ai', 'artificial intelligence', 'generative', 'llm', 'agent'],
  software: ['software', 'saas', 'app', 'tool', 'platform'],
  developer: ['developer', 'devtool', 'devops', 'api', 'open source', 'technical'],
  business: ['business', 'b2b', 'enterprise', 'team', 'professional', 'smb'],
  consumer: ['consumer', 'b2c', 'personal', 'mobile'],
  startup: ['startup', 'indie', 'maker', 'founder'],
  launch: ['launch', 'launched', 'beta', 'early adopter', 'recently launched'],
};

function normalizedTokens(values: string[]): Set<string> {
  const text = values.join(' ').toLowerCase();
  const tokens = new Set(
    text
      .split(/[^a-z0-9]+/)
      .map((value) => value.trim())
      .filter(Boolean)
  );
  for (const [canonical, terms] of Object.entries(aliases)) {
    if (terms.some((term) => text.includes(term))) tokens.add(canonical);
  }
  return tokens;
}

function overlapScore(left: string[], right: string[], maximum: number): number {
  const a = normalizedTokens(left);
  const b = normalizedTokens(right);
  const shared = [...a].filter((token) => b.has(token));
  if (!shared.length) return 0;
  return Math.min(maximum, Math.round(maximum * (0.45 + shared.length * 0.18)));
}

function includesAiOnly(profile: DirectoryFitProfile): boolean {
  const types = normalizedTokens(profile.productTypes);
  return types.has('ai') && !types.has('software');
}

function confidencePenalty(profile: DirectoryFitProfile): number {
  if (profile.confidence === 'high') return 0;
  if (profile.confidence === 'medium') return 4;
  return 12;
}

const copy = {
  aiOnlyRisk: {
    zh: '该平台只面向 AI 产品，但产品的核心价值并不依赖 AI。',
    en: 'This directory only accepts AI products, but the product does not rely on AI for its core value.',
  },
  typeReason: {
    zh: '产品类型与平台收录范围匹配',
    en: 'Product type matches what the directory lists',
  },
  audienceReason: {
    zh: '平台用户与目标用户有重合',
    en: 'Directory audience overlaps with the target users',
  },
  marketReason: {
    zh: 'B2B/B2C/开发者市场方向匹配',
    en: 'B2B/B2C/developer market direction matches',
  },
  stageReason: {
    zh: '产品阶段符合平台定位',
    en: 'Product stage fits the directory positioning',
  },
  goalReason: {
    zh: '符合当前推广目标',
    en: 'Aligned with the current promotion goals',
  },
  authorityReason: {
    zh: '平台具有较高的公开域名权重',
    en: 'Directory has high public domain authority',
  },
  paidRisk: {
    zh: '需要付费，提交前应核实投入产出',
    en: 'Paid submission, so verify the return on investment first',
  },
  lowConfidenceRisk: {
    zh: '平台档案来自目录分类推断，需要逐站核实',
    en: 'Directory profile is inferred from category data and needs per-site verification',
  },
  mediumConfidenceRisk: {
    zh: '部分适配信息属于平台定位推断',
    en: 'Some fit details are inferred from the directory positioning',
  },
} satisfies Record<string, { zh: string; en: string }>;

export function scoreDirectoryFit(
  product: ProductFitProfile,
  directory: LaunchDirectory,
  isZh = true
): DirectoryMatch {
  const t = (key: keyof typeof copy) => (isZh ? copy[key].zh : copy[key].en);
  const profile = getDirectoryFitProfile(directory);
  const reasons: string[] = [];
  const risks: string[] = [];

  if (includesAiOnly(profile) && !product.isAiNative) {
    return {
      directory,
      profile,
      score: 0,
      tier: 'not_suitable',
      reasons: [],
      risks: [t('aiOnlyRisk')],
    };
  }

  const typeScore = overlapScore(
    [product.category, ...product.productTypes],
    profile.productTypes,
    30
  );
  const audienceScore = overlapScore(product.audiences, profile.audiences, 22);
  const marketScore = overlapScore(product.markets, profile.markets, 12);
  const stageScore = overlapScore([product.stage], profile.stages, 10);
  const goalScore = overlapScore(product.goals, profile.goals, 14);
  const qualityScore = Math.min(8, Math.round(directory.dr / 15));
  const pricingPenalty =
    directory.pricing === 'Paid' ? 8 : directory.pricing === 'Unknown' ? 3 : 0;
  const evidencePenalty = confidencePenalty(profile);
  const score = Math.max(
    0,
    Math.min(
      100,
      typeScore +
        audienceScore +
        marketScore +
        stageScore +
        goalScore +
        qualityScore -
        pricingPenalty -
        evidencePenalty
    )
  );

  if (typeScore >= 16) reasons.push(t('typeReason'));
  if (audienceScore >= 10) reasons.push(t('audienceReason'));
  if (marketScore >= 7) reasons.push(t('marketReason'));
  if (stageScore >= 5) reasons.push(t('stageReason'));
  if (goalScore >= 7) reasons.push(t('goalReason'));
  if (directory.dr >= 70) reasons.push(t('authorityReason'));
  if (directory.pricing === 'Paid') risks.push(t('paidRisk'));
  if (profile.confidence === 'low') risks.push(t('lowConfidenceRisk'));
  if (profile.confidence === 'medium') risks.push(t('mediumConfidenceRisk'));

  const tier: DirectoryMatchTier =
    score >= 58 && typeScore >= 16
      ? 'recommended'
      : score >= 30 && typeScore > 0
        ? 'verify'
        : 'not_suitable';

  return { directory, profile, score, tier, reasons, risks };
}

export function matchDirectories(
  product: ProductFitProfile,
  directories: LaunchDirectory[],
  isZh = true
): DirectoryMatch[] {
  return directories
    .map((directory) => scoreDirectoryFit(product, directory, isZh))
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.directory.dr - a.directory.dr ||
        a.directory.sourceOrder - b.directory.sourceOrder
    );
}

export function deriveProductFitProfile(input: {
  category?: string;
  targetUsers?: string[];
  summary?: string;
  capabilities?: string[];
  stage?: string;
}): ProductFitProfile {
  const category = input.category?.trim() || 'software';
  const corpus = [
    category,
    input.summary ?? '',
    ...(input.capabilities ?? []),
    ...(input.targetUsers ?? []),
  ].join(' ').toLowerCase();
  const isAiNative = /\b(ai|artificial intelligence|llm|generative|machine learning|agent)\b/i.test(
    corpus
  );
  const isDeveloper = /\b(developer|devops|api|sdk|code|open source|github)\b/i.test(corpus);
  const isConsumer = /\b(consumer|personal|individual|mobile|ios|android|creator)\b/i.test(corpus);
  const productTypes = [
    isAiNative ? 'AI tool' : '',
    isDeveloper ? 'Developer tool' : '',
    /\bmobile|ios|android\b/i.test(corpus) ? 'Mobile app' : '',
    /\bopen source|github\b/i.test(corpus) ? 'Open source' : '',
    /\bsaas|software|platform|web app|tool\b/i.test(corpus) ? 'SaaS' : 'Software',
  ].filter(Boolean);
  const markets: ProductFitProfile['markets'] = [
    ...(isDeveloper ? (['Developer'] as const) : []),
    ...(isConsumer ? (['B2C'] as const) : []),
    ...(!isConsumer || /\b(business|team|company|enterprise|b2b|professional)\b/i.test(corpus)
      ? (['B2B'] as const)
      : []),
  ];
  const resolvedMarkets: ProductFitProfile['markets'] = markets.length
    ? [...new Set(markets)]
    : ['B2B'];

  return {
    category,
    productTypes: [...new Set(productTypes)],
    audiences: input.targetUsers?.length ? input.targetUsers : ['Early adopters'],
    stage: input.stage || 'Launched',
    goals: ['Launch exposure', 'Early users', 'Feedback', 'SEO discovery'],
    markets: resolvedMarkets,
    isAiNative,
  };
}
