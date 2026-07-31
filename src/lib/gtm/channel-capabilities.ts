import type { PostMetrics, Todo } from './types';

export type ExtensionSupport = 'stable' | 'beta' | 'none';
export type LinkCaptureSupport = 'automatic' | 'confirm' | 'manual' | 'none';
export type PublishAction = 'extension' | 'copy_and_open' | 'none';

export interface ChannelCapability {
  channelId: string;
  name: string;
  nameEn: string;
  planned: boolean;
  publishAction: PublishAction;
  extensionSupport: ExtensionSupport;
  linkCapture: LinkCaptureSupport;
  automaticMetrics: boolean;
  metricFields: Array<keyof PostMetrics>;
  postHosts: string[];
  postPathPatterns: RegExp[];
  linkHelp: { zh: string; en: string };
}

const DEFAULT_FIELDS: Array<keyof PostMetrics> = [
  'views',
  'likes',
  'comments',
  'shares',
];

/**
 * Directory execution is tracked in its own submission pipeline, so it owns no
 * calendar days and no todos — every entry point links to the Directory page.
 */
export const PIPELINE_ONLY_CHANNEL_IDS = ['directory'] as const;

export function channelHasCalendarTodos(channelId: string): boolean {
  return !(PIPELINE_ONLY_CHANNEL_IDS as readonly string[]).includes(channelId);
}

/** Keep only channels whose 30-day work belongs on the calendar. */
export function filterCalendarChannelIds(channelIds: string[]): string[] {
  return channelIds.filter(channelHasCalendarTodos);
}

const NONE = {
  publishAction: 'none' as const,
  extensionSupport: 'none' as const,
  linkCapture: 'none' as const,
  automaticMetrics: false,
  metricFields: DEFAULT_FIELDS,
  postHosts: [],
  postPathPatterns: [],
};

/**
 * Product-wide source of truth for the difference between planning, production,
 * browser-assisted publishing, post-link capture, and metrics collection.
 */
export const CHANNEL_CAPABILITIES: ChannelCapability[] = [
  {
    channelId: 'twitter_x',
    name: 'Twitter / X',
    nameEn: 'Twitter / X',
    planned: true,
    publishAction: 'extension',
    extensionSupport: 'stable',
    linkCapture: 'automatic',
    automaticMetrics: true,
    metricFields: ['impressions', 'likes', 'comments', 'shares', 'saves'],
    postHosts: ['x.com', 'twitter.com'],
    postPathPatterns: [/^\/[^/]+\/status\/\d+(?:\/|$)/i],
    linkHelp: {
      zh: '打开 X 个人主页，进入刚发布的帖子，再复制浏览器地址栏中的 /status/ 链接。',
      en: 'Open the post from your X profile and copy its /status/ URL from the address bar.',
    },
  },
  {
    channelId: 'xiaohongshu',
    name: '小红书',
    nameEn: 'Xiaohongshu',
    planned: true,
    publishAction: 'extension',
    extensionSupport: 'stable',
    linkCapture: 'automatic',
    automaticMetrics: true,
    metricFields: ['views', 'likes', 'saves', 'comments', 'shares'],
    postHosts: ['xiaohongshu.com', 'xhslink.com'],
    postPathPatterns: [/^\/explore\/[a-z0-9]+(?:\/|$)/i, /^\/m\/[a-z0-9]+(?:\/|$)/i],
    linkHelp: {
      zh: '在小红书中打开刚发布的笔记，点击分享并复制链接；不要复制创作中心地址。',
      en: 'Open the published note in Xiaohongshu and use Share → Copy link; do not use the creator-studio URL.',
    },
  },
  {
    channelId: 'hacker_news',
    name: 'Hacker News',
    nameEn: 'Hacker News',
    planned: true,
    publishAction: 'extension',
    extensionSupport: 'beta',
    linkCapture: 'confirm',
    automaticMetrics: false,
    metricFields: ['likes', 'comments'],
    postHosts: ['news.ycombinator.com'],
    postPathPatterns: [/^\/item\?id=\d+$/i],
    linkHelp: {
      zh: '打开 Hacker News 的 submitted 页面，点进刚提交的标题，复制 item?id=… 地址。',
      en: 'Open your Hacker News submitted page, open the new item, and copy its item?id=… URL.',
    },
  },
  {
    channelId: 'reddit',
    name: 'Reddit',
    nameEn: 'Reddit',
    planned: true,
    publishAction: 'extension',
    extensionSupport: 'beta',
    linkCapture: 'confirm',
    automaticMetrics: false,
    metricFields: ['views', 'likes', 'comments', 'shares'],
    postHosts: ['reddit.com', 'redd.it'],
    postPathPatterns: [
      /^\/r\/[^/]+\/comments\/[a-z0-9]+(?:\/|$)/i,
      /^\/comments\/[a-z0-9]+(?:\/|$)/i,
    ],
    linkHelp: {
      zh: '进入 Reddit 个人主页的 Posts，打开刚发布的帖子，再复制包含 /comments/ 的地址。',
      en: 'Open the post from your Reddit profile and copy the URL containing /comments/.',
    },
  },
  {
    channelId: 'linkedin',
    name: 'LinkedIn',
    nameEn: 'LinkedIn',
    planned: true,
    publishAction: 'extension',
    extensionSupport: 'beta',
    linkCapture: 'confirm',
    automaticMetrics: false,
    metricFields: ['impressions', 'likes', 'comments', 'shares', 'clicks'],
    postHosts: ['linkedin.com', 'lnkd.in'],
    postPathPatterns: [
      /^\/feed\/update\/urn:li:(?:activity|share):\d+(?:\/|$)/i,
      /^\/posts\/[^/]+(?:\/|$)/i,
    ],
    linkHelp: {
      zh: '在 LinkedIn 个人动态中找到刚发布的帖子，打开“复制帖子链接”，不要复制 Feed 首页。',
      en: 'Find the post in your LinkedIn activity and choose Copy link to post; do not copy the feed URL.',
    },
  },
  {
    channelId: 'indie_hackers',
    name: 'Indie Hackers',
    nameEn: 'Indie Hackers',
    planned: true,
    publishAction: 'extension',
    extensionSupport: 'beta',
    linkCapture: 'confirm',
    automaticMetrics: false,
    metricFields: ['views', 'likes', 'comments'],
    postHosts: ['indiehackers.com'],
    postPathPatterns: [/^\/post\/[^/]+(?:\/|$)/i],
    linkHelp: {
      zh: '打开 Indie Hackers Profile 的 Posts，进入刚发布的帖子并复制 /post/ 地址。',
      en: 'Open the new post from your Indie Hackers profile and copy its /post/ URL.',
    },
  },
  {
    channelId: 'devto',
    name: 'DEV Community',
    nameEn: 'DEV Community',
    planned: false,
    publishAction: 'extension',
    extensionSupport: 'beta',
    linkCapture: 'confirm',
    automaticMetrics: false,
    metricFields: ['views', 'likes', 'comments'],
    postHosts: ['dev.to'],
    postPathPatterns: [/^\/[^/]+\/[^/]+-[a-z0-9]+(?:\/|$)/i],
    linkHelp: {
      zh: '打开 DEV Dashboard 的 Posts，进入文章后复制公开文章地址。',
      en: 'Open the article from DEV Dashboard → Posts and copy its public article URL.',
    },
  },
  {
    channelId: 'medium',
    name: 'Medium',
    nameEn: 'Medium',
    planned: false,
    publishAction: 'extension',
    extensionSupport: 'beta',
    linkCapture: 'confirm',
    automaticMetrics: false,
    metricFields: ['views', 'likes', 'comments'],
    postHosts: ['medium.com'],
    postPathPatterns: [
      /^\/@[^/]+\/[^/]+-[a-f0-9]+(?:\/|$)/i,
      /^\/[^/]+\/[^/]+-[a-f0-9]+(?:\/|$)/i,
      /^\/p\/[a-f0-9]+(?:\/|$)/i,
    ],
    linkHelp: {
      zh: '从 Medium Stories 列表打开已发布文章，复制公开阅读地址，不要复制 /edit 草稿地址。',
      en: 'Open the published story from Medium Stories and copy its public URL, not an /edit draft URL.',
    },
  },
  {
    channelId: 'hashnode',
    name: 'Hashnode',
    nameEn: 'Hashnode',
    planned: false,
    publishAction: 'extension',
    extensionSupport: 'beta',
    linkCapture: 'confirm',
    automaticMetrics: false,
    metricFields: ['views', 'likes', 'comments'],
    postHosts: ['hashnode.com', 'hashnode.dev'],
    postPathPatterns: [
      /^\/[^/]+\/[^/]+(?:\/|$)/i,
      /^\/[a-z0-9][a-z0-9-]+(?:\/|$)/i,
    ],
    linkHelp: {
      zh: '从 Hashnode Dashboard 的 Published 列表打开文章，复制公开文章地址，不要复制 draft/editor 地址。',
      en: 'Open the article from Hashnode Dashboard → Published and copy the public URL, not a draft/editor URL.',
    },
  },
  {
    channelId: 'wechat_official',
    name: '微信公众号',
    nameEn: 'WeChat Official',
    planned: true,
    publishAction: 'copy_and_open',
    extensionSupport: 'none',
    linkCapture: 'manual',
    automaticMetrics: false,
    metricFields: ['views', 'likes', 'shares', 'followersGained'],
    postHosts: ['mp.weixin.qq.com'],
    postPathPatterns: [/^\/s\/[a-z0-9_-]+(?:\/|$)/i],
    linkHelp: {
      zh: '发布后在公众号后台打开文章，点击“复制链接”，粘贴 mp.weixin.qq.com/s/… 地址。',
      en: 'Open the published article in WeChat Official Account and copy its mp.weixin.qq.com/s/… URL.',
    },
  },
  {
    channelId: 'instagram',
    name: 'Instagram',
    nameEn: 'Instagram',
    planned: true,
    ...NONE,
    metricFields: ['views', 'likes', 'comments', 'shares', 'saves'],
    linkHelp: {
      zh: '当前只生成视觉制作方案，尚不支持自动发布。',
      en: 'NowBuild currently produces a visual package but does not publish it automatically.',
    },
  },
  {
    channelId: 'tiktok',
    name: 'TikTok',
    nameEn: 'TikTok',
    planned: true,
    ...NONE,
    metricFields: ['views', 'likes', 'comments', 'shares', 'followersGained'],
    linkHelp: {
      zh: '当前只生成视频制作方案，尚不支持自动上传或发布。',
      en: 'NowBuild currently produces a video package but does not upload or publish it.',
    },
  },
  {
    channelId: 'youtube',
    name: 'YouTube',
    nameEn: 'YouTube',
    planned: true,
    ...NONE,
    metricFields: ['views', 'likes', 'comments', 'shares', 'followersGained'],
    linkHelp: {
      zh: '当前只生成视频制作方案，尚不支持自动上传或发布。',
      en: 'NowBuild currently produces a video package but does not upload or publish it.',
    },
  },
  ...[
    ['user_outreach', '私域 / 朋友圈', 'Private Outreach'],
    ['website_copy', '官网 / 落地页', 'Website Copy'],
    ['user_interview', '用户访谈', 'User Interview'],
    ['product_hunt', 'Product Hunt', 'Product Hunt'],
    ['seo', 'SEO 内容', 'SEO'],
    ['directory', '产品目录', 'Product Directories'],
    ['github_growth', 'GitHub Growth', 'GitHub Growth'],
    ['competitor_research', '竞品研究', 'Competitor Research'],
  ].map(([channelId, name, nameEn]) => ({
    channelId,
    name,
    nameEn,
    planned: true,
    ...NONE,
    linkHelp: {
      zh: '该任务使用独立执行流程，不通过内容发布插件。',
      en: 'This task uses its own workflow rather than the content publisher.',
    },
  })),
];

const CAPABILITY_BY_ID = new Map(
  CHANNEL_CAPABILITIES.map((capability) => [capability.channelId, capability])
);

export function getChannelCapability(channelId: string): ChannelCapability {
  return (
    CAPABILITY_BY_ID.get(channelId) ?? {
      channelId,
      name: channelId,
      nameEn: channelId,
      planned: true,
      ...NONE,
      linkHelp: {
        zh: '该渠道尚未配置发布自动化。',
        en: 'Publishing automation is not configured for this channel.',
      },
    }
  );
}

export function canPublishTodo(todo: Todo): boolean {
  return (
    Boolean(todo.content) &&
    todo.contentStatus === 'ready' &&
    getChannelCapability(todo.channelId).publishAction !== 'none'
  );
}

export type PostUrlConfidence = 'high' | 'low' | 'invalid';

export function validatePostUrl(
  channelId: string,
  input: string
): { url: string; confidence: PostUrlConfidence } {
  const pasted = input.trim().match(/https?:\/\/[^\s]+/)?.[0] ?? input.trim();
  const normalized = pasted.replace(/[),.;，。；）]+$/, '');
  const capability = getChannelCapability(channelId);
  try {
    const url = new URL(normalized);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { url: normalized, confidence: 'invalid' };
    }
    const hostMatches = capability.postHosts.some(
      (host) => url.hostname === host || url.hostname.endsWith(`.${host}`)
    );
    if (!hostMatches) return { url: normalized, confidence: 'invalid' };
    const pathWithSearch = `${url.pathname}${url.search}`;
    const pathMatches = capability.postPathPatterns.some((pattern) =>
      pattern.test(pathWithSearch)
    );
    return { url: normalized, confidence: pathMatches ? 'high' : 'low' };
  } catch {
    return { url: normalized, confidence: 'invalid' };
  }
}

export function capabilityLabels(
  capability: ChannelCapability,
  isZh: boolean
): string[] {
  const labels: string[] = [];
  if (capability.extensionSupport !== 'none') {
    labels.push(isZh ? '可自动填充' : 'Auto-fill');
  } else if (capability.publishAction === 'copy_and_open') {
    labels.push(isZh ? '复制文案并打开平台' : 'Copy and open');
  }
  if (capability.publishAction !== 'none') {
    labels.push(isZh ? '需手动发布' : 'You publish');
  }
  if (capability.linkCapture === 'automatic') {
    labels.push(isZh ? '可自动获取链接' : 'Auto link capture');
  } else if (capability.linkCapture === 'confirm' || capability.linkCapture === 'manual') {
    labels.push(isZh ? '可能需手动补链接' : 'May need post URL');
  }
  if (capability.automaticMetrics) {
    labels.push(isZh ? '支持数据追踪' : 'Metrics tracking');
  } else if (capability.publishAction !== 'none') {
    labels.push(isZh ? '指标需手动录入' : 'Manual metrics');
  }
  return labels;
}
