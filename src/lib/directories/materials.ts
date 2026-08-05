import { directoryAdapterId } from './automation';
import generatedRequirements from './requirements.generated.json';
import type {
  DirectoryAssetSpec,
  DirectoryLaunchKit,
  DirectoryMaterialCheck,
  DirectoryMaterialKey,
  DirectoryMaterialRequirement,
  DirectoryPreflightResult,
  DirectorySubmission,
  LaunchState,
} from '@/lib/gtm/types';

const BASE_REQUIREMENTS: DirectoryMaterialRequirement[] = [
  { key: 'productName', resolution: 'user', required: true },
  { key: 'productUrl', resolution: 'user', required: true },
  { key: 'tagline', resolution: 'ai', required: true },
  {
    key: 'shortDescription',
    resolution: 'ai',
    required: true,
    minLength: 20,
  },
];

interface GeneratedDirectoryProfile {
  requirements: Array<{
    key: string;
    resolution: string;
    required: boolean;
    minLength?: number;
    detail?: string;
    assetSpec?: DirectoryAssetSpec;
  }>;
}

const GENERATED_DIRECTORY_REQUIREMENTS = generatedRequirements.directories as unknown as Record<
  string,
  GeneratedDirectoryProfile
>;

const REQUIREMENT_DETAILS: Partial<
  Record<string, Partial<Record<DirectoryMaterialKey, [string, string]>>>
> = {
  aura_plus_plus: {
    longDescription: ['至少 200 词', 'At least 200 words'],
    screenshots: ['至少一张 16:9 产品图', 'At least one 16:9 product image'],
  },
  tinylaunch: {
    screenshots: ['最多 3 张产品图片', 'Up to 3 product images'],
  },
  micro_saas_examples: {
    screenshots: ['需要一张 1200×630 缩略图', 'Requires a 1200×630 thumbnail'],
  },
  launchy: {
    screenshots: ['需要一张 1280×720 缩略图', 'Requires a 1280×720 thumbnail'],
  },
};

const LABELS: Record<DirectoryMaterialKey, [string, string]> = {
  productName: ['产品名称', 'Product name'],
  productUrl: ['产品网址', 'Product URL'],
  tagline: ['一句话介绍', 'Tagline'],
  shortDescription: ['简短介绍', 'Short description'],
  longDescription: ['完整介绍', 'Long description'],
  categories: ['产品分类', 'Categories'],
  tags: ['产品标签', 'Tags'],
  companyName: ['公司名称', 'Company name'],
  featureHighlights: ['核心功能', 'Feature highlights'],
  supportedPlatforms: ['支持平台', 'Supported platforms'],
  integrations: ['集成服务', 'Integrations'],
  techStack: ['技术栈', 'Tech stack'],
  productStage: ['产品阶段', 'Product stage'],
  apiAvailability: ['API 可用性', 'API availability'],
  communityAvailability: ['社区可用性', 'Community availability'],
  backlinkUrl: ['反向链接页面', 'Backlink page'],
  pricing: ['定价方式', 'Pricing'],
  founderName: ['创始人姓名', 'Founder name'],
  founderBio: ['创始人简介', 'Founder bio'],
  founderEmail: ['联系邮箱', 'Contact email'],
  founderUrl: ['创始人主页', 'Founder URL'],
  twitterUrl: ['X / Twitter 链接', 'X / Twitter URL'],
  linkedinUrl: ['LinkedIn 链接', 'LinkedIn URL'],
  githubUrl: ['GitHub 链接', 'GitHub URL'],
  discordUrl: ['Discord 链接', 'Discord URL'],
  youtubeUrl: ['YouTube 链接', 'YouTube URL'],
  demoUrl: ['演示链接', 'Demo URL'],
  launchDate: ['发布日期', 'Launch date'],
  logo: ['Logo', 'Logo'],
  screenshots: ['产品截图', 'Product screenshots'],
};

export function getDirectoryMaterialRequirements(
  directory: Pick<DirectorySubmission, 'url'>,
  isZh = true
): DirectoryMaterialRequirement[] {
  const adapterId = directoryAdapterId(directory.url) ?? undefined;
  const profile = adapterId
    ? GENERATED_DIRECTORY_REQUIREMENTS[adapterId]
    : undefined;
  if (!profile) return BASE_REQUIREMENTS.map((item) => ({ ...item }));

  return profile.requirements.map((item) => {
    const key = item.key as DirectoryMaterialKey;
    return {
      key,
      resolution: item.resolution as DirectoryMaterialRequirement['resolution'],
      required: item.required,
      minLength: item.minLength,
      detail:
        REQUIREMENT_DETAILS[adapterId!]?.[key]?.[isZh ? 0 : 1] ||
        (isZh ? item.detail : undefined),
      assetSpec: item.assetSpec,
    };
  });
}

function documentField(markdown: string, labels: string[]): string {
  const escaped = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const matcher = new RegExp(
    `^(?:#{1,6}\\s*)?(?:[-*]\\s*)?(?:${escaped.join('|')})\\s*[:：-]\\s*(.+)$`,
    'im'
  );
  return markdown.match(matcher)?.[1]?.trim().slice(0, 2_000) || '';
}

function documentUrl(markdown: string, labels: string[]): string {
  const value = documentField(markdown, labels);
  return value.match(/https?:\/\/[^\s<>()]+/i)?.[0]?.replace(/[),.;，。]+$/, '') || '';
}

export function buildDirectoryLaunchKit(launch: LaunchState): DirectoryLaunchKit {
  const existing = launch.directoryLaunchKit;
  const brief = launch.brief;
  const source = brief?.sourceMarkdown || '';
  return {
    productName: existing?.productName || launch.project.productName,
    productUrl: existing?.productUrl || launch.project.productUrl,
    tagline:
      existing?.tagline ||
      brief?.positioning.statement ||
      brief?.product.summary ||
      '',
    shortDescription:
      existing?.shortDescription || brief?.product.summary || '',
    longDescription:
      existing?.longDescription ||
      brief?.sourceMarkdown ||
      brief?.product.summary ||
      '',
    categories: existing?.categories ?? [],
    tags:
      existing?.tags?.length
        ? existing.tags
        : brief?.positioning.sellingPoints ?? [],
    companyName: existing?.companyName || launch.project.productName,
    featureHighlights: existing?.featureHighlights?.length
      ? existing.featureHighlights
      : brief?.positioning.sellingPoints ?? [],
    supportedPlatforms: existing?.supportedPlatforms ?? [],
    integrations: existing?.integrations ?? [],
    techStack: existing?.techStack ?? [],
    productStage: existing?.productStage || documentField(source, ['产品阶段', 'product stage', 'startup stage']),
    apiAvailability: existing?.apiAvailability || documentField(source, ['API 可用性', '是否有 API', 'API availability']),
    communityAvailability: existing?.communityAvailability || documentField(source, ['社区可用性', '是否有社区', 'community availability']),
    backlinkUrl: existing?.backlinkUrl || documentUrl(source, ['反向链接', '徽章页面', 'backlink url', 'badge page']),
    pricing: existing?.pricing || brief?.product.pricing || '',
    founderName: existing?.founderName || documentField(source, ['创始人姓名', '创始人', 'founder name', 'founder']),
    founderBio: existing?.founderBio || documentField(source, ['创始人简介', 'founder bio', 'founder biography']),
    founderEmail: existing?.founderEmail || documentField(source, ['创始人邮箱', '联系邮箱', 'founder email', 'contact email']),
    founderUrl: existing?.founderUrl || documentUrl(source, ['创始人主页', 'founder url', 'founder website']),
    twitterUrl: existing?.twitterUrl || documentUrl(source, ['X / Twitter', 'Twitter', 'X URL', 'Twitter URL']),
    linkedinUrl: existing?.linkedinUrl || documentUrl(source, ['LinkedIn', 'LinkedIn URL']),
    githubUrl: existing?.githubUrl || documentUrl(source, ['GitHub', 'GitHub URL']),
    discordUrl: existing?.discordUrl || documentUrl(source, ['Discord', 'Discord URL']),
    youtubeUrl: existing?.youtubeUrl || documentUrl(source, ['YouTube', 'YouTube URL']),
    demoUrl: existing?.demoUrl || launch.project.productUrl,
    launchDate: existing?.launchDate || launch.project.startDate,
    assets: existing?.assets ?? [],
    confirmedAt: existing?.confirmedAt,
  };
}

function hasValue(
  kit: DirectoryLaunchKit,
  requirement: DirectoryMaterialRequirement
): boolean {
  if (requirement.key === 'logo') {
    return kit.assets.some((asset) => asset.kind === 'logo');
  }
  if (requirement.key === 'screenshots') {
    return kit.assets.some((asset) => asset.kind === 'screenshot');
  }
  const value = kit[requirement.key];
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value !== 'string') return false;
  const normalized = value.trim();
  return Boolean(normalized) && normalized.length >= (requirement.minLength ?? 1);
}

export function preflightDirectory(
  directory: Pick<DirectorySubmission, 'url'>,
  kit: DirectoryLaunchKit,
  isZh: boolean,
  options: {
    aiUnavailable?: boolean;
    requirements?: DirectoryMaterialRequirement[];
  } = {}
): DirectoryPreflightResult {
  const checks: DirectoryMaterialCheck[] =
    (
      options.requirements?.filter((item) => item.required) ??
      getDirectoryMaterialRequirements(directory, isZh)
    ).map((item) => {
      const ready = hasValue(kit, item);
      const status: DirectoryMaterialCheck['status'] = ready
        ? 'ready'
        : item.resolution === 'ai' && !options.aiUnavailable
          ? 'ai_generatable'
          : 'needs_user';
      return {
        key: item.key,
        label: LABELS[item.key][isZh ? 0 : 1],
        status,
        detail:
          item.detail ||
          (item.assetSpec
            ? `${item.assetSpec.width}×${item.assetSpec.height} · ${
                item.assetSpec.type.split('/')[1].toUpperCase()
              }${
                item.assetSpec.maxBytes
                  ? ` · ≤${Math.round(item.assetSpec.maxBytes / 1_000_000)}MB`
                  : ''
              }`
            : undefined),
      };
    });
  const readyCount = checks.filter((item) => item.status === 'ready').length;
  const aiCount = checks.filter(
    (item) => item.status === 'ai_generatable'
  ).length;
  const userCount = checks.filter(
    (item) => item.status === 'needs_user'
  ).length;
  return {
    checkedAt: Date.now(),
    ready: aiCount === 0 && userCount === 0,
    checks,
    readyCount,
    aiCount,
    userCount,
  };
}

export function aiGeneratableKeys(
  results: DirectoryPreflightResult[]
): DirectoryMaterialKey[] {
  return [
    ...new Set(
      results.flatMap((result) =>
        result.checks
          .filter((check) => check.status === 'ai_generatable')
          .map((check) => check.key)
      )
    ),
  ];
}

export function mergeGeneratedDirectoryMaterials(
  kit: DirectoryLaunchKit,
  generated: Partial<
    Pick<
      DirectoryLaunchKit,
      | 'tagline'
      | 'shortDescription'
      | 'longDescription'
      | 'categories'
      | 'tags'
      | 'featureHighlights'
      | 'supportedPlatforms'
      | 'integrations'
      | 'techStack'
    >
  >
): DirectoryLaunchKit {
  return {
    ...kit,
    tagline: generated.tagline?.trim() || kit.tagline,
    shortDescription:
      generated.shortDescription?.trim() || kit.shortDescription,
    longDescription:
      generated.longDescription?.trim() || kit.longDescription,
    categories: generated.categories?.filter(Boolean).slice(0, 5).length
      ? generated.categories.filter(Boolean).slice(0, 5)
      : kit.categories,
    tags: generated.tags?.filter(Boolean).slice(0, 10).length
      ? generated.tags.filter(Boolean).slice(0, 10)
      : kit.tags,
    featureHighlights: generated.featureHighlights?.filter(Boolean).slice(0, 10).length
      ? generated.featureHighlights.filter(Boolean).slice(0, 10)
      : kit.featureHighlights,
    supportedPlatforms: generated.supportedPlatforms?.filter(Boolean).slice(0, 10).length
      ? generated.supportedPlatforms.filter(Boolean).slice(0, 10)
      : kit.supportedPlatforms,
    integrations: generated.integrations?.filter(Boolean).slice(0, 10).length
      ? generated.integrations.filter(Boolean).slice(0, 10)
      : kit.integrations,
    techStack: generated.techStack?.filter(Boolean).slice(0, 10).length
      ? generated.techStack.filter(Boolean).slice(0, 10)
      : kit.techStack,
  };
}

/** Limits mirrored by browser-extension `validDirectoryPayload`. */
const EXTENSION_STRING_LIMITS = {
  productName: 120,
  productUrl: 2048,
  tagline: 180,
  shortDescription: 1000,
  longDescription: 12_000,
  pricing: 80,
  founderName: 160,
  founderEmail: 320,
  founderUrl: 2048,
  twitterUrl: 2048,
  linkedinUrl: 2048,
  demoUrl: 2048,
  launchDate: 40,
} as const;

const EXTENSION_URL_KEYS = [
  'founderUrl',
  'twitterUrl',
  'linkedinUrl',
  'demoUrl',
] as const;

const EXTENSION_MAX_ASSET_CHARS = 7_000_000;

function clipText(value: unknown, limit: number): string {
  return String(value ?? '').slice(0, limit);
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function clipStringList(
  values: unknown,
  maxItems: number,
  maxItemLength: number
): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().slice(0, maxItemLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

/**
 * Normalize Launch Kit fields so the publisher extension accepts the payload.
 * Selling points used as tags, long source markdown, and soft-invalid URLs are
 * common reasons for "Invalid directory submission request".
 */
export function sanitizeDirectoryLaunchKitForExtension(
  kit: DirectoryLaunchKit
): DirectoryLaunchKit {
  const next: DirectoryLaunchKit = {
    ...kit,
    productName: clipText(kit.productName, EXTENSION_STRING_LIMITS.productName).trim(),
    productUrl: clipText(kit.productUrl, EXTENSION_STRING_LIMITS.productUrl).trim(),
    tagline: clipText(kit.tagline, EXTENSION_STRING_LIMITS.tagline).trim(),
    shortDescription: clipText(
      kit.shortDescription,
      EXTENSION_STRING_LIMITS.shortDescription
    ).trim(),
    longDescription: clipText(
      kit.longDescription,
      EXTENSION_STRING_LIMITS.longDescription
    ),
    pricing: clipText(kit.pricing, EXTENSION_STRING_LIMITS.pricing),
    founderName: clipText(kit.founderName, EXTENSION_STRING_LIMITS.founderName),
    founderEmail: clipText(kit.founderEmail, EXTENSION_STRING_LIMITS.founderEmail),
    founderUrl: clipText(kit.founderUrl, EXTENSION_STRING_LIMITS.founderUrl).trim(),
    twitterUrl: clipText(kit.twitterUrl, EXTENSION_STRING_LIMITS.twitterUrl).trim(),
    linkedinUrl: clipText(kit.linkedinUrl, EXTENSION_STRING_LIMITS.linkedinUrl).trim(),
    demoUrl: clipText(kit.demoUrl, EXTENSION_STRING_LIMITS.demoUrl).trim(),
    launchDate: clipText(kit.launchDate, EXTENSION_STRING_LIMITS.launchDate).trim(),
    categories: clipStringList(kit.categories, 5, 80),
    tags: clipStringList(kit.tags, 10, 80),
    featureHighlights: clipStringList(kit.featureHighlights, 10, 160),
    supportedPlatforms: clipStringList(kit.supportedPlatforms, 10, 80),
    integrations: clipStringList(kit.integrations, 10, 80),
    techStack: clipStringList(kit.techStack, 10, 80),
    assets: Array.isArray(kit.assets) ? [...kit.assets] : [],
  };

  for (const key of EXTENSION_URL_KEYS) {
    const value = next[key].trim();
    next[key] = value && isHttpUrl(value) ? value : '';
  }

  next.assets = next.assets
    .filter(
      (asset) =>
        asset &&
        (asset.kind === 'logo' || asset.kind === 'screenshot') &&
        typeof asset.dataUrl === 'string' &&
        asset.dataUrl.startsWith('data:image/')
    )
    .slice(0, 6);

  let assetSize = next.assets.reduce(
    (sum, asset) => sum + asset.dataUrl.length,
    0
  );
  while (assetSize > EXTENSION_MAX_ASSET_CHARS && next.assets.length > 0) {
    const dropIndex = [...next.assets]
      .map((asset, index) => ({ asset, index }))
      .reverse()
      .find((item) => item.asset.kind === 'screenshot')?.index;
    const index =
      dropIndex === undefined ? next.assets.length - 1 : dropIndex;
    assetSize -= next.assets[index].dataUrl.length;
    next.assets.splice(index, 1);
  }

  return next;
}
