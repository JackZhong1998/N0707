import type {
  DirectoryLaunchKit,
  DirectoryMaterialKey,
  DirectoryMaterialsCard,
} from '@/lib/gtm/types';

const FIELD_META: Partial<
  Record<
    DirectoryMaterialKey,
    {
      label: [string, string];
      source: 'detected' | 'ai_draft' | 'user_required';
      input: 'text' | 'url' | 'email' | 'textarea' | 'list';
    }
  >
> = {
  productName: { label: ['产品名称', 'Product name'], source: 'detected', input: 'text' },
  productUrl: { label: ['产品官网', 'Product website'], source: 'detected', input: 'url' },
  pricing: { label: ['定价方式', 'Pricing'], source: 'detected', input: 'text' },
  tagline: { label: ['一句话介绍', 'Tagline'], source: 'ai_draft', input: 'text' },
  shortDescription: { label: ['简短介绍', 'Short description'], source: 'ai_draft', input: 'textarea' },
  longDescription: { label: ['完整介绍', 'Long description'], source: 'ai_draft', input: 'textarea' },
  categories: { label: ['分类', 'Categories'], source: 'ai_draft', input: 'list' },
  tags: { label: ['标签', 'Tags'], source: 'ai_draft', input: 'list' },
  founderName: { label: ['创始人姓名', 'Founder name'], source: 'user_required', input: 'text' },
  founderBio: { label: ['创始人简介', 'Founder bio'], source: 'user_required', input: 'textarea' },
  founderEmail: { label: ['联系邮箱', 'Contact email'], source: 'user_required', input: 'email' },
  founderUrl: { label: ['创始人主页', 'Founder website'], source: 'user_required', input: 'url' },
  twitterUrl: { label: ['X / Twitter', 'X / Twitter'], source: 'user_required', input: 'url' },
  linkedinUrl: { label: ['LinkedIn', 'LinkedIn'], source: 'user_required', input: 'url' },
  githubUrl: { label: ['GitHub', 'GitHub'], source: 'user_required', input: 'url' },
  discordUrl: { label: ['Discord', 'Discord'], source: 'user_required', input: 'url' },
  youtubeUrl: { label: ['YouTube', 'YouTube'], source: 'user_required', input: 'url' },
};

const INITIAL_KEYS: DirectoryMaterialKey[] = [
  'productName',
  'productUrl',
  'pricing',
  'tagline',
  'shortDescription',
  'longDescription',
  'categories',
  'tags',
  'founderName',
  'founderBio',
  'founderEmail',
  'founderUrl',
  'twitterUrl',
  'linkedinUrl',
  'githubUrl',
  'discordUrl',
  'youtubeUrl',
];

function fieldValue(kit: DirectoryLaunchKit, key: DirectoryMaterialKey): string {
  if (key === 'logo' || key === 'screenshots') return '';
  const value = kit[key];
  return Array.isArray(value) ? value.join(', ') : typeof value === 'string' ? value : '';
}

export function createDirectoryMaterialsCard(
  kit: DirectoryLaunchKit,
  isZh: boolean,
  requestedKeys?: DirectoryMaterialKey[],
  requiredKeys: DirectoryMaterialKey[] = []
): DirectoryMaterialsCard {
  const keys = requestedKeys?.length
    ? [...new Set([...requestedKeys.filter((key) => key !== 'logo' && key !== 'screenshots'), ...INITIAL_KEYS.filter((key) => FIELD_META[key]?.source === 'ai_draft')])]
    : INITIAL_KEYS;
  const required = new Set(requiredKeys);
  return {
    title: isZh ? '完善 Directory 提交资料' : 'Complete directory submission materials',
    description: isZh
      ? '我已填入官网检测结果和 AI 文案草稿。请确认并补充只能由你提供的信息。'
      : 'I added website findings and AI copy drafts. Confirm them and add the details only you can provide.',
    fields: keys.flatMap((key) => {
      const meta = FIELD_META[key];
      if (!meta) return [];
      const value = fieldValue(kit, key);
      return [{
        key,
        label: meta.label[isZh ? 0 : 1],
        value,
        source:
          value && meta.source === 'user_required'
            ? 'detected' as const
            : !value && meta.source === 'detected'
              ? 'user_required' as const
              : meta.source,
        input: meta.input,
        required: required.has(key),
      }];
    }),
    needsLogo: requestedKeys?.includes('logo') && !kit.assets.some((asset) => asset.kind === 'logo'),
    needsScreenshots: requestedKeys?.includes('screenshots') && !kit.assets.some((asset) => asset.kind === 'screenshot'),
  };
}

export function applyDirectoryMaterialValues(
  kit: DirectoryLaunchKit,
  values: Partial<Record<DirectoryMaterialKey, string>>
): DirectoryLaunchKit {
  const next = { ...kit };
  for (const [rawKey, rawValue] of Object.entries(values)) {
    const key = rawKey as DirectoryMaterialKey;
    const value = String(rawValue ?? '').trim();
    if (key === 'categories' || key === 'tags') {
      next[key] = value
        .split(/[,，\n]/)
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, key === 'categories' ? 5 : 10);
      continue;
    }
    if (key === 'logo' || key === 'screenshots') continue;
    (next as unknown as Record<string, unknown>)[key] = value;
  }
  return { ...next, confirmedAt: Date.now() };
}
