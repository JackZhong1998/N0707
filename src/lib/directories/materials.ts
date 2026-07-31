import { directoryAdapterId } from './automation';
import type {
  DirectoryLaunchKit,
  DirectoryMaterialCheck,
  DirectoryMaterialKey,
  DirectoryMaterialRequirement,
  DirectoryPreflightResult,
  DirectorySubmission,
  LaunchState,
} from '@/lib/gtm/types';

type Resolution = DirectoryMaterialRequirement['resolution'];

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

const LONG_DESCRIPTION = new Set([
  'aura_plus_plus',
  'openhunts',
  'earlyhunt',
  'tinylaunch',
  'open_launch',
  'micro_saas_examples',
  'made_with_lovable',
  'made_with_bolt',
  'devhunt',
  'launchy',
]);

const CATEGORY = new Set([
  'aura_plus_plus',
  'openhunts',
  'earlyhunt',
  'twelve_tools',
  'hot100',
  'findly_tools',
  'tinylaunch',
  'open_launch',
  'micro_saas_examples',
  'future_tools',
  'devhunt',
  'launchy',
]);

const PRICING = new Set([
  'openhunts',
  'hot100',
  'future_tools',
  'findly_tools',
  'devhunt',
]);

const LOGO = new Set([
  'aura_plus_plus',
  'openhunts',
  'earlyhunt',
  'twelve_tools',
  'hot100',
  'findly_tools',
  'tinylaunch',
  'foundrlist',
  'open_launch',
  'micro_saas_examples',
  'made_with_lovable',
  'made_with_bolt',
  'devhunt',
]);

const SCREENSHOTS = new Set([
  'aura_plus_plus',
  'openhunts',
  'earlyhunt',
  'findly_tools',
  'tinylaunch',
  'open_launch',
  'micro_saas_examples',
  'launchy',
  'devhunt',
]);

const FOUNDER_NAME = new Set(['hot100', 'future_tools', 'tinylaunch']);
const FOUNDER_EMAIL = new Set([
  'twelve_tools',
  'hot100',
  'micro_saas_examples',
  'future_tools',
  'devhunt',
]);

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
  pricing: ['定价方式', 'Pricing'],
  founderName: ['创始人姓名', 'Founder name'],
  founderEmail: ['联系邮箱', 'Contact email'],
  founderUrl: ['创始人主页', 'Founder URL'],
  twitterUrl: ['X / Twitter 链接', 'X / Twitter URL'],
  linkedinUrl: ['LinkedIn 链接', 'LinkedIn URL'],
  demoUrl: ['演示链接', 'Demo URL'],
  launchDate: ['发布日期', 'Launch date'],
  logo: ['Logo', 'Logo'],
  screenshots: ['产品截图', 'Product screenshots'],
};

function requirement(
  key: DirectoryMaterialKey,
  resolution: Resolution,
  adapterId: string | undefined,
  isZh: boolean,
  minLength?: number
): DirectoryMaterialRequirement {
  return {
    key,
    resolution,
    required: true,
    minLength,
    detail: adapterId
      ? REQUIREMENT_DETAILS[adapterId]?.[key]?.[isZh ? 0 : 1]
      : undefined,
  };
}

export function getDirectoryMaterialRequirements(
  directory: Pick<DirectorySubmission, 'url'>,
  isZh = true
): DirectoryMaterialRequirement[] {
  const adapterId = directoryAdapterId(directory.url) ?? undefined;
  const result = [...BASE_REQUIREMENTS];
  if (!adapterId) return result;
  if (LONG_DESCRIPTION.has(adapterId)) {
    result.push(
      requirement(
        'longDescription',
        'ai',
        adapterId,
        isZh,
        adapterId === 'aura_plus_plus' ? 900 : 80
      )
    );
  }
  if (CATEGORY.has(adapterId)) {
    result.push(requirement('categories', 'ai', adapterId, isZh));
  }
  if (PRICING.has(adapterId)) {
    result.push(requirement('pricing', 'user', adapterId, isZh));
  }
  if (LOGO.has(adapterId)) {
    result.push(requirement('logo', 'user', adapterId, isZh));
  }
  if (SCREENSHOTS.has(adapterId)) {
    result.push(requirement('screenshots', 'user', adapterId, isZh));
  }
  if (FOUNDER_NAME.has(adapterId)) {
    result.push(requirement('founderName', 'user', adapterId, isZh));
  }
  if (FOUNDER_EMAIL.has(adapterId)) {
    result.push(requirement('founderEmail', 'user', adapterId, isZh));
  }
  return result;
}

export function buildDirectoryLaunchKit(launch: LaunchState): DirectoryLaunchKit {
  const existing = launch.directoryLaunchKit;
  const brief = launch.brief;
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
    pricing: existing?.pricing || brief?.product.pricing || '',
    founderName: existing?.founderName || '',
    founderEmail: existing?.founderEmail || '',
    founderUrl: existing?.founderUrl || '',
    twitterUrl: existing?.twitterUrl || '',
    linkedinUrl: existing?.linkedinUrl || '',
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
  };
}
