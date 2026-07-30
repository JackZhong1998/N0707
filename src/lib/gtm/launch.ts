import type { ProductResearchResult } from '@/lib/agents/researcher';
import { CHANNEL_DEFINITIONS } from '@/lib/agents/skills/channel-map';
import { launchDirectories } from '@/lib/directories/data';
import { directoryAdapterId } from '@/lib/directories/automation';
import {
  matchDirectories,
  type ProductFitProfile,
} from '@/lib/directories/matching';
import { addDays, todayStr } from './dates';
import type {
  DirectorySubmission,
  GtmStore,
  LaunchBlueprint,
  LaunchBrief,
  LaunchChannelPlan,
  LaunchState,
  LaunchWeeklyReview,
  ResearchProgressStep,
  StrategyResponse,
  Todo,
} from './types';

const INTERNAL_CHANNELS = new Set([
  'user_interview',
  'competitor_research',
]);

/** Every customer-facing capability joins a new launch automatically. */
export const SUPPORTED_LAUNCH_CHANNELS = CHANNEL_DEFINITIONS.filter(
  (channel) => !INTERNAL_CHANNELS.has(channel.channelId)
);

/** Directory is a fixed capability for every user — never ranked by the recommender. */
export const FIXED_LAUNCH_CHANNEL_IDS = ['directory'] as const;

/** Channels eligible for recommend_channels / user channel picks. */
export const RECOMMENDABLE_LAUNCH_CHANNELS = SUPPORTED_LAUNCH_CHANNELS.filter(
  (channel) =>
    !(FIXED_LAUNCH_CHANNEL_IDS as readonly string[]).includes(channel.channelId)
);

/** Channels confirmed for this Launch; always includes fixed Directory. */
export function resolveLaunchChannelIds(store: {
  channels: string[];
  launch?: { selectedChannelIds?: string[] };
}): string[] {
  const selected = store.launch?.selectedChannelIds;
  const base =
    selected && selected.length > 0
      ? selected
      : store.channels.length > 0
        ? store.channels
        : [];
  return [...new Set([...base, ...FIXED_LAUNCH_CHANNEL_IDS])];
}

const DIRECTORY_SEEDS: Array<Pick<DirectorySubmission, 'name' | 'url'>> = [
  { name: 'Product Hunt', url: 'https://www.producthunt.com' },
  { name: 'BetaList', url: 'https://betalist.com' },
  { name: 'AlternativeTo', url: 'https://alternativeto.net' },
  { name: 'SaaSHub', url: 'https://www.saashub.com' },
  { name: 'There is an AI for That', url: 'https://theresanaiforthat.com' },
  { name: 'Futurepedia', url: 'https://www.futurepedia.io' },
  { name: 'Toolify', url: 'https://www.toolify.ai' },
  { name: 'Indie Hackers Products', url: 'https://www.indiehackers.com/products' },
  { name: 'Uneed', url: 'https://www.uneed.best' },
  { name: 'Startup Stash', url: 'https://startupstash.com' },
  { name: 'Launching Next', url: 'https://www.launchingnext.com' },
  { name: 'Microlaunch', url: 'https://microlaunch.net' },
];

function normalizeUrl(raw: string): string {
  const value = /^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`;
  const url = new URL(value);
  url.hash = '';
  return url.toString();
}

export function productNameFromUrl(raw: string): string {
  try {
    const hostname = new URL(normalizeUrl(raw)).hostname.replace(/^www\./, '');
    const label = hostname.split('.')[0] || 'Your product';
    return label
      .split(/[-_]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  } catch {
    return 'Your product';
  }
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createBriefResearchSteps(isZh: boolean): ResearchProgressStep[] {
  return [
    { id: 'website', label: isZh ? '读取产品网站' : 'Reading your website', status: 'running' },
    { id: 'product', label: isZh ? '理解产品与商业模式' : 'Understanding the product', status: 'pending' },
    { id: 'competitors', label: isZh ? '寻找竞品与替代方案' : 'Finding competitors', status: 'pending' },
    { id: 'audience', label: isZh ? '识别目标用户' : 'Mapping target audiences', status: 'pending' },
    { id: 'brief', label: isZh ? '准备项目文档' : 'Preparing your project document', status: 'pending' },
  ];
}

export function createCampaignBuildSteps(isZh: boolean): ResearchProgressStep[] {
  return [
    { id: 'blueprint', label: isZh ? '建立 30 天 Campaign Blueprint' : 'Building the campaign blueprint', status: 'pending' },
    { id: 'channels', label: isZh ? '组建全部 Channel Agents' : 'Building every channel plan', status: 'pending' },
    { id: 'calendar', label: isZh ? '安排 30 天全渠道任务' : 'Scheduling the 30-day calendar', status: 'pending' },
    { id: 'day1', label: isZh ? '安排 Day 1 任务' : 'Scheduling Day 1 tasks', status: 'pending' },
  ];
}

export function createLaunchSkeleton(productUrl: string, isZh: boolean): LaunchState {
  const now = Date.now();
  const startDate = todayStr();
  const normalized = normalizeUrl(productUrl);
  const productName = productNameFromUrl(normalized);
  return {
    project: {
      id: makeId('launch'),
      productUrl: normalized,
      productName,
      startDate,
      endDate: addDays(startDate, 29),
      currentDay: 1,
      phase: 'researching',
      status: 'building',
      createdAt: now,
      updatedAt: now,
    },
    researchProgress: createBriefResearchSteps(isZh),
    researchConfidence: 'medium',
    researchSources: [],
    channelPlans: Object.fromEntries(
      SUPPORTED_LAUNCH_CHANNELS.map((channel) => [
        channel.channelId,
        createChannelPlan(channel.channelId, channel.name, productName, isZh),
      ])
    ),
    directories: createDirectoryPipeline(productName, isZh),
    weeklyReviews: createWeeklyReviews(isZh),
    revisions: [],
    briefEditUsed: 0,
  };
}

/** Reset campaign artifacts when a user starts a fresh product URL. */
export function storePatchForNewLaunch(launch: LaunchState): Partial<GtmStore> {
  return {
    launch,
    startDate: launch.project.startDate,
    planReady: false,
    postPayProfileComplete: false,
    targetMarketLocale: undefined,
    channels: [],
    todos: [],
    topics: [],
    topicVariants: [],
    todoChats: {},
    channelStrategies: {},
    strategy: undefined,
  };
}

export function markBriefResearchStepsDone(
  launch: LaunchState,
  isZh: boolean
): LaunchState {
  const steps = launch.researchProgress.some((step) => step.id === 'brief')
    ? launch.researchProgress
    : createBriefResearchSteps(isZh);
  return {
    ...launch,
    researchProgress: steps.map((step) => ({
      ...step,
      status: step.status === 'warning' ? 'warning' : ('done' as const),
    })),
    project: {
      ...launch.project,
      phase: 'brief_ready',
      status: 'building',
      updatedAt: Date.now(),
    },
  };
}

function firstMeaningfulLine(markdown: string, fallback: string): string {
  return (
    markdown
      .split('\n')
      .map((line) => line.replace(/^#+\s*/, '').replace(/^[-*]\s*/, '').trim())
      .find((line) => line.length > 24 && !line.startsWith('http')) || fallback
  ).slice(0, 420);
}

export function buildLaunchBrief(
  launch: LaunchState,
  research: ProductResearchResult | null,
  isZh: boolean
): LaunchBrief {
  if (research?.brief) {
    return {
      ...research.brief,
      sourceMarkdown:
        research.brief.sourceMarkdown || research.productProfileMarkdown,
      revision: 1,
      updatedAt: Date.now(),
    };
  }

  const unknown = isZh ? '官网未说明' : 'Not stated on the website';
  const summary =
    research?.product.summary ||
    firstMeaningfulLine(
      research?.productProfileMarkdown ?? '',
      unknown
    );
  const competitors = (research?.competitors ?? []).slice(0, 5).map((item) => ({
    name: item.name,
    url: item.url,
    positioning: item.reason || unknown,
    difference: unknown,
  }));
  return {
    product: {
      summary,
      problem: unknown,
      features: research?.product.capabilities?.slice(0, 8) ?? [],
      stage: unknown,
      pricing: research?.product.pricing || unknown,
    },
    audience: {
      primary: research?.product.targetUsers?.[0] || unknown,
      currentAlternative: unknown,
      scenarios: [],
      motivations: [],
    },
    competitors,
    positioning: {
      statement: unknown,
      sellingPoints: [],
      painPoints: [],
      voice: unknown,
      nonGoals: [],
    },
    evidence: [
      {
        label: isZh ? '产品描述与公开功能' : 'Product description and public capabilities',
        confidence: research ? 'website' : 'inferred',
        sourceUrl: launch.project.productUrl,
      },
      {
        label: isZh ? '目标用户与场景' : 'Audience and scenarios',
        confidence: 'inferred',
      },
      {
        label: isZh ? '竞品与替代方案' : 'Competitors and alternatives',
        confidence: research?.competitors.length ? 'website' : 'inferred',
      },
    ],
    sourceMarkdown: research?.productProfileMarkdown,
    revision: 1,
    updatedAt: Date.now(),
  };
}

export function buildLaunchBlueprint(
  launch: LaunchState,
  brief: LaunchBrief,
  strategy: StrategyResponse | null,
  isZh: boolean
): LaunchBlueprint {
  const name = launch.project.productName;
  const goal = strategy?.goal || (isZh
    ? `在 30 天内让 ${name} 在全部已支持渠道形成一致的市场认知，并获得第一批高意向用户信号。`
    : `In 30 days, build consistent market awareness for ${name} across every supported channel and earn the first high-intent user signals.`);
  const weeks = isZh
    ? [
        { week: 1, objective: '建立问题认知', narrative: `让目标用户先认出 ${name} 所解决的问题和现有做法的代价。`, productIntensity: 'low' as const },
        { week: 2, objective: '建立可信度', narrative: '分享 Founder 观察、构建判断与真实工作过程。', productIntensity: 'low-medium' as const },
        { week: 3, objective: '展示解决方案', narrative: '通过场景、功能、对比和具体使用方式建立理解。', productIntensity: 'medium' as const },
        { week: 4, objective: '集中 Launch', narrative: '聚合已形成的证据、社会证明与明确行动邀请。', productIntensity: 'high' as const },
      ]
    : [
        { week: 1, objective: 'Build problem awareness', narrative: `Help the audience recognize the problem ${name} solves and the cost of current workarounds.`, productIntensity: 'low' as const },
        { week: 2, objective: 'Build credibility', narrative: 'Share founder observations, product judgment, and the real building process.', productIntensity: 'low-medium' as const },
        { week: 3, objective: 'Show the solution', narrative: 'Use scenarios, capabilities, comparisons, and concrete workflows.', productIntensity: 'medium' as const },
        { week: 4, objective: 'Concentrated launch', narrative: 'Bring evidence, social proof, and a clear invitation together.', productIntensity: 'high' as const },
      ];
  return {
    campaignGoal: goal,
    corePositioning: brief.positioning.statement,
    targetAudience: brief.audience.primary,
    campaignPillars: isZh ? ['问题与错误认知', 'Founder 判断', '真实使用场景', '构建与学习', '证明与邀请'] : ['Problem & misconceptions', 'Founder judgment', 'Real use cases', 'Building & learning', 'Proof & invitation'],
    weeks,
    channelRoles: SUPPORTED_LAUNCH_CHANNELS.map((channel, index) => ({
      channelId: channel.channelId,
      channelName: isZh ? channel.name : channel.nameEn,
      role: channelRole(channel.channelId, isZh),
      priority: index < 4 ? 'high' : index < 8 ? 'medium' : 'supporting',
    })),
    guardrails: isZh
      ? ['所有渠道共享同一产品事实与定位', '同一周围绕共同 Campaign 主题', '不机械复制同一篇内容', '采用各平台原生格式与语言', '不编造网站无法确认的数据', '已发布内容不会被策略修改覆盖']
      : ['Every channel shares the same product facts and positioning', 'Every channel follows the shared weekly narrative', 'Never copy-paste one asset everywhere', 'Use native formats and language', 'Never invent unverified data', 'Published work is never overwritten'],
    language: isZh ? '按渠道受众使用中文或英文；全局事实保持一致。' : 'Use the audience-native language for each channel while keeping product facts consistent.',
    sourceMarkdown: strategy?.overviewMarkdown,
    revision: 1,
    updatedAt: Date.now(),
  };
}

function channelRole(channelId: string, isZh: boolean): string {
  const roles: Record<string, [string, string]> = {
    twitter_x: ['高频观点、公开构建和 Builder 社区触达', 'High-frequency points of view, build-in-public, and builder reach'],
    linkedin: ['Founder authority 与专业叙事', 'Founder authority and professional narrative'],
    reddit: ['社区原生的经验分享与问题讨论', 'Community-native experience sharing and problem discussions'],
    seo: ['围绕搜索意图建立长期内容资产', 'Compounding content around search intent'],
    directory: ['扩大产品被发现、收录和引用的覆盖面', 'Expand product discovery, listings, and citations'],
    product_hunt: ['集中 Launch 节点与早期产品反馈', 'A concentrated launch moment and early product feedback'],
    xiaohongshu: ['故事化场景内容与中文公域发现', 'Story-led scenarios and Chinese-market discovery'],
    wechat_official: ['深度内容与可复用的专业解释', 'Deep content and reusable expert explanation'],
    user_outreach: ['高信任的一对一触达与反馈闭环', 'High-trust one-to-one outreach and feedback'],
    website_copy: ['承接所有渠道流量并完成价值解释', 'Convert cross-channel attention into clear product understanding'],
    github_growth: ['开发者信任、开源证据与技术传播', 'Developer trust, open-source proof, and technical distribution'],
  };
  return roles[channelId]?.[isZh ? 0 : 1] || (isZh ? '将共同 Campaign 转译为渠道原生执行' : 'Translate the shared campaign into channel-native execution');
}

function createChannelPlan(channelId: string, channelName: string, productName: string, isZh: boolean): LaunchChannelPlan {
  const definition = SUPPORTED_LAUNCH_CHANNELS.find((channel) => channel.channelId === channelId);
  return {
    channelId,
    channelName: isZh ? channelName : definition?.nameEn ?? channelName,
    mission: channelRole(channelId, isZh),
    whyItMatters: isZh ? `用该渠道最自然的方式让合适的人理解并验证 ${productName}。` : `Use this channel's native behavior to help the right people understand and validate ${productName}.`,
    targetAudience: isZh ? `${productName} 的高意向早期用户与相关社区成员` : `High-intent early users and relevant community members for ${productName}`,
    pillars: isZh ? ['问题洞察', 'Founder 经验', '真实场景', '证明与反馈'] : ['Problem insight', 'Founder experience', 'Real scenarios', 'Proof & feedback'],
    formats: definition?.defaultTaskTypes ?? ['post', 'engage'],
    cadence: isZh ? `每周 ${Math.max(1, definition?.postsPerWeek ?? 2)} 个主要交付，并配合必要互动` : `${Math.max(1, definition?.postsPerWeek ?? 2)} core deliverables per week plus necessary engagement`,
    productMentionRules: isZh ? '前两周以问题和经验为主；第三周增加场景；第四周使用明确但克制的 CTA。' : 'Lead with problems and experience in weeks 1–2, add scenarios in week 3, and use a clear but restrained CTA in week 4.',
    weeklyPlan: isZh ? ['建立问题认知', '建立可信度', '展示解决方案', '集中 Launch 与复盘'] : ['Problem awareness', 'Credibility', 'Solution demonstration', 'Concentrated launch and review'],
    successSignals: isZh ? ['高质量回复或评论', '目标用户访问', '收藏、分享或点击', '可验证的发布 URL'] : ['High-quality replies', 'Target-user visits', 'Saves, shares, or clicks', 'Verifiable published URLs'],
    risks: isZh ? ['过度推广', '忽略社区规范', '跨渠道机械复制', '使用未经证实的数据'] : ['Over-promotion', 'Ignoring community norms', 'Cross-posting without adaptation', 'Unverified claims'],
    status: 'queued',
    completedTasks: 0,
    revision: 1,
    updatedAt: Date.now(),
  };
}

export function applyStrategyToChannelPlans(
  launch: LaunchState,
  strategy: StrategyResponse | null,
  isZh: boolean
): Record<string, LaunchChannelPlan> {
  const next = { ...launch.channelPlans };
  for (const channel of SUPPORTED_LAUNCH_CHANNELS) {
    const generated = strategy?.channels.find((item) => item.channelId === channel.channelId);
    const base = next[channel.channelId] ?? createChannelPlan(channel.channelId, channel.name, launch.project.productName, isZh);
    next[channel.channelId] = {
      ...base,
      ...(generated
        ? {
            mission: generated.positioning || base.mission,
            whyItMatters: generated.direction || base.whyItMatters,
            pillars: generated.contentPillars.length ? generated.contentPillars : base.pillars,
          }
        : {}),
      status: 'ready',
      updatedAt: Date.now(),
    };
  }
  return next;
}

function taskPurpose(day: number, isZh: boolean): string {
  const week = Math.min(4, Math.ceil(day / 7));
  const zh = ['建立问题认知', '建立 Founder 可信度', '展示解决方案与场景', '集中 Launch 并获得行动'];
  const en = ['Build problem awareness', 'Build founder credibility', 'Show the solution in context', 'Concentrate the launch and invite action'];
  return (isZh ? zh : en)[week - 1];
}

export function createFallbackLaunchTasks(launch: LaunchState, isZh: boolean): Todo[] {
  const tasks: Todo[] = [];
  for (const channel of SUPPORTED_LAUNCH_CHANNELS) {
    const frequency = Math.max(1, channel.postsPerWeek);
    const interval = Math.max(1, Math.floor(7 / frequency));
    for (let day = 1; day <= 30; day += interval) {
      const week = Math.min(4, Math.ceil(day / 7));
      const type = channel.defaultTaskTypes[(tasks.length + day) % channel.defaultTaskTypes.length] ?? 'post';
      const purpose = taskPurpose(day, isZh);
      const isDirectory = channel.channelId === 'directory';
      tasks.push({
        id: `${channel.channelId}-${day}-launch`,
        channelId: channel.channelId,
        channelName: isZh ? channel.name : channel.nameEn,
        dayIndex: day,
        date: addDays(launch.project.startDate, day - 1),
        time: channel.channelId === 'twitter_x' ? '09:30' : channel.channelId === 'reddit' ? '20:00' : '10:00',
        title: isDirectory
          ? (isZh ? `处理第 ${week} 周目录提交批次` : `Process the week ${week} directory batch`)
          : (isZh ? `${purpose} · ${channel.name}` : `${purpose} · ${channel.nameEn}`),
        brief: isZh ? `围绕 Week ${week} 共同叙事，为 ${channel.name} 准备原生的 ${type} 交付。` : `Prepare a native ${type} deliverable for ${channel.nameEn}, aligned with the shared week ${week} narrative.`,
        purpose,
        pillar: week === 1 ? (isZh ? '问题与错误认知' : 'Problem & misconceptions') : week === 2 ? (isZh ? 'Founder 判断' : 'Founder judgment') : week === 3 ? (isZh ? '真实使用场景' : 'Real use cases') : (isZh ? '证明与邀请' : 'Proof & invitation'),
        taskType: type,
        phase: `Week ${week}`,
        audience: launch.brief?.audience.primary,
        status: 'pending',
        launchStatus: day === 1 ? (isDirectory ? 'needs_action' : 'ready') : day <= 3 ? 'draft' : 'planned',
        contentStatus: day === 1 && !isDirectory ? 'none' : 'none',
        revision: 1,
      });
    }
  }
  return tasks.sort((a, b) => a.dayIndex - b.dayIndex || (a.time ?? '').localeCompare(b.time ?? ''));
}

function createDirectoryPipeline(productName: string, isZh: boolean): DirectorySubmission[] {
  return DIRECTORY_SEEDS.map((directory, index) => ({
    id: `directory-${index + 1}`,
    name: directory.name,
    url: directory.url,
    matchReason: isZh ? `${directory.name} 是 ${productName} 的候选发现入口；适配性、费用和提交要求尚待核实。` : `${directory.name} is a candidate discovery surface for ${productName}; fit, pricing, and submission requirements still need verification.`,
    pricing: 'unknown',
    requiredAssets: [isZh ? '待核实' : 'Needs verification'],
    automationLevel: 'manual',
    lastVerified: '',
    status: 'discovered',
  }));
}

export function createMatchedDirectoryPipeline(
  product: ProductFitProfile,
  isZh: boolean
): DirectorySubmission[] {
  const matches = matchDirectories(product, launchDirectories).sort((a, b) => {
    const automation =
      Number(Boolean(directoryAdapterId(b.directory.url))) -
      Number(Boolean(directoryAdapterId(a.directory.url)));
    if (automation) return automation;
    const free =
      Number(b.directory.pricing !== 'Paid') -
      Number(a.directory.pricing !== 'Paid');
    if (free) return free;
    return b.score - a.score || b.directory.dr - a.directory.dr;
  });
  const recommended = matches
    .filter((match) => match.tier === 'recommended')
    .slice(0, 15);
  const verify = matches.filter((match) => match.tier === 'verify').slice(0, 10);

  return [...recommended, ...verify].map((match, index) => {
    const reasonList = match.reasons.length
      ? match.reasons
      : [
          isZh
            ? '存在基础分类重合，但需要进一步核实'
            : 'Some category overlap exists, but further verification is required',
        ];
    const pricing =
      match.directory.pricing === 'Free'
        ? 'free'
        : match.directory.pricing === 'Paid'
          ? 'paid'
          : match.directory.pricing === 'Free + Paid'
            ? 'freemium'
            : 'unknown';

    return {
      id: `directory-${index + 1}-${match.directory.domain.replace(/[^a-z0-9]+/gi, '-')}`,
      name: match.directory.name,
      url: match.directory.url,
      matchReason: isZh
        ? `${match.score} 分 · ${reasonList.join('；')}。`
        : `${match.score}/100 · ${reasonList.join('; ')}.`,
      pricing,
      requiredAssets: [
        isZh ? '产品名称与官网' : 'Product name and website',
        isZh ? '简短介绍' : 'Short description',
        isZh
          ? 'Logo 与截图（待按平台核实）'
          : 'Logo and screenshots (verify per platform)',
      ],
      automationLevel: directoryAdapterId(match.directory.url) ? 'assisted' : 'manual',
      lastVerified: match.profile.lastVerified,
      status: match.tier === 'recommended' ? 'matched' : 'discovered',
      fitScore: match.score,
      fitTier: match.tier,
      fitReasons: match.reasons,
      fitRisks: match.risks,
    };
  });
}

function createWeeklyReviews(isZh: boolean): LaunchWeeklyReview[] {
  return [1, 2, 3, 4].map((week) => ({
    id: `review-week-${week}`,
    week,
    status: 'upcoming',
    summary: isZh ? `Week ${week} 结束后将自动读取任务、发布链接、目录状态和用户反馈。` : `After week ${week}, the review will read task outcomes, published URLs, directory status, and user feedback.`,
    channelFindings: [],
    appliedChanges: [],
    revision: 1,
  }));
}
