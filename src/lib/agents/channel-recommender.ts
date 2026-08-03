/**
 * 推广计划 Agent（保留 channel-recommender 文件名兼容现有调用）
 *
 * 合并产品启动判断、30 天发布计划、渠道推荐与 Directory 提交计划，
 * 同时从 channelId 白名单输出结构化优先级供产品界面使用。
 *
 * Skill 加载策略：
 * 1. 固定 Router：gingiris-growth-finder + go-to-market-playbook + channel-recommender 契约
 * 2. 按产品诊断动态加载 1–2 个专家 Skill
 */

import { callOpenRouterJson, type OpenRouterMessage } from '@/lib/openrouter';
import {
  CHANNEL_ROUTER_SKILL_IDS,
} from './skills/channel-map';
import {
  RECOMMENDABLE_LAUNCH_CHANNELS,
} from '@/lib/gtm/launch';
import {
  formatChannelCatalog,
  formatSkillCatalog,
  getChannelCatalog,
  getSkillCatalog,
  loadSkillContents,
} from './catalog';
import { isMockMode, mockChannelRecommendations } from './mock';
import { boundedBusinessContext, launchOperatingContract } from './prompts';
import type { ChannelRecommendationResponse } from '@/lib/gtm/types';

export interface ChannelRecommenderInput {
  userProfileDoc: string;
  projectProfileDoc: string;
  conversationDigest: string;
  campaignContext: string;
  locale: string;
  feedback?: string;
}

const CHANNEL_RECOMMENDER_CONTRACT_SKILL = 'custom/channel-recommender';

const SPECIALIST_SKILL_MAP: Record<string, string[]> = {
  dev_tool: ['gingiris-opensource', 'developer-marketing-playbook'],
  oss: ['gingiris-opensource', 'github-stars-playbook'],
  b2b_saas: ['gingiris-b2b-growth', 'gingiris-go-global'],
  mobile_app: ['gingiris-aso-growth', 'gingiris-seo-geo'],
  consumer_2c: ['gingiris-seo-geo', 'gingiris-ugc-matrix'],
  ecommerce: ['gingiris-aso-growth', 'gingiris-ugc-matrix'],
  launch_focused: ['gingiris-launch', 'product-hunt-playbook'],
  china_market: ['gingiris-go-global', 'gingiris-seo-geo'],
};

function text(value: unknown, maxLength: number, fallback = ''): string {
  return typeof value === 'string'
    ? value.trim().slice(0, maxLength) || fallback
    : fallback;
}

function allowedChannelIds(): Set<string> {
  return new Set(
    RECOMMENDABLE_LAUNCH_CHANNELS.map((channel) => channel.channelId)
  );
}

async function pickSpecialistSkills(
  input: ChannelRecommenderInput
): Promise<string[]> {
  const catalog = getSkillCatalog();
  const defaults = [
    ...CHANNEL_ROUTER_SKILL_IDS,
    CHANNEL_RECOMMENDER_CONTRACT_SKILL,
  ];

  try {
    const out = await callOpenRouterJson<{
      productCategory?: string;
      skillIds?: string[];
    }>(
      [
        {
          role: 'system',
          content: `你是 GTM 诊断专家。根据项目与用户档案，判断产品类别并挑选最多 2 个需要精读的渠道推荐专家 Skill。

可选 productCategory：
dev_tool | oss | b2b_saas | mobile_app | consumer_2c | ecommerce | launch_focused | china_market

Skill 目录：
${formatSkillCatalog(catalog)}

只输出 JSON：{"productCategory":"...","skillIds":["..."]}`,
        },
        {
          role: 'user',
          content: `项目档案：\n${input.projectProfileDoc.slice(0, 6000) || '（无）'}\n\n用户档案：\n${input.userProfileDoc.slice(0, 1500) || '（无）'}`,
        },
      ],
      { temperature: 0.2, maxTokens: 512 }
    );

    const categorySkills =
      SPECIALIST_SKILL_MAP[out.productCategory ?? ''] ?? [];
    const valid = (Array.isArray(out.skillIds) ? out.skillIds : []).filter(
      (id): id is string =>
        typeof id === 'string' && catalog.some((entry) => entry.skillId === id)
    );
    const merged = [
      ...new Set([...defaults, ...categorySkills, ...valid]),
    ].slice(0, 6);
    if (merged.length > defaults.length) return merged;
  } catch {
    // fall through to defaults
  }

  return [...new Set(defaults)].slice(0, 6);
}

function fallbackRecommendations(
  input: ChannelRecommenderInput,
  isZh: boolean
): ChannelRecommendationResponse {
  const profile = `${input.projectProfileDoc}\n${input.userProfileDoc}`.toLowerCase();
  const china =
    profile.includes('中文') ||
    profile.includes('china') ||
    profile.includes('小红书') ||
    profile.includes('微信');
  const dev =
    profile.includes('developer') ||
    profile.includes('coding') ||
    profile.includes('github') ||
    profile.includes('开源');
  const consumer =
    profile.includes('app') ||
    profile.includes('笔记') ||
    profile.includes('mobile');

  const pick = (ids: string[]) =>
    RECOMMENDABLE_LAUNCH_CHANNELS.filter((channel) =>
      ids.includes(channel.channelId)
    );

  let primaryIds: string[];
  let secondaryIds: string[];
  if (china && !profile.includes('北美') && !profile.includes('north america')) {
    primaryIds = ['xiaohongshu', 'wechat_official', 'website_copy'];
    secondaryIds = ['seo', 'user_outreach', 'product_hunt'];
  } else if (dev) {
    primaryIds = ['hacker_news', 'twitter_x', 'reddit', 'product_hunt'];
    secondaryIds = ['github_growth', 'indie_hackers', 'seo', 'linkedin'];
  } else if (consumer) {
    primaryIds = ['reddit', 'product_hunt', 'seo', 'twitter_x'];
    secondaryIds = ['indie_hackers', 'instagram', 'website_copy'];
  } else {
    primaryIds = ['linkedin', 'reddit', 'seo', 'product_hunt'];
    secondaryIds = ['twitter_x', 'indie_hackers', 'website_copy'];
  }

  const primary = pick(primaryIds);
  const secondary = pick(secondaryIds);
  const used = new Set([...primary, ...secondary].map((c) => c.channelId));
  const explore = RECOMMENDABLE_LAUNCH_CHANNELS.filter(
    (c) => !used.has(c.channelId) && c.tier !== 'extended'
  ).slice(0, 2);
  const skip = RECOMMENDABLE_LAUNCH_CHANNELS.filter(
    (c) => !used.has(c.channelId) && !explore.some((e) => e.channelId === c.channelId)
  ).slice(0, 4);

  const toItem = (
    channel: (typeof RECOMMENDABLE_LAUNCH_CHANNELS)[number],
    priority: 'primary' | 'secondary' | 'explore' | 'skip',
    fitScore: number
  ) => ({
    channelId: channel.channelId,
    channelName: isZh ? channel.name : channel.nameEn,
    priority,
    fitScore,
    rationale: channel.description,
    marketFit: isZh
      ? `适合 ${channel.locales.join('/')} 市场受众`
      : `Fits ${channel.locales.join('/')} audience markets`,
    effortLevel:
      channel.postsPerWeek >= 3
        ? ('high' as const)
        : channel.postsPerWeek >= 2
          ? ('medium' as const)
          : ('low' as const),
    suggestedCadence: isZh
      ? `每周约 ${channel.postsPerWeek} 个主要交付`
      : `About ${channel.postsPerWeek} core deliverables per week`,
  });

  const summaryMarkdown = isZh
      ? '基于产品档案的兜底推荐（专家 Skill 未返回时使用）。请结合你的实际情况在左侧确认或调整。'
      : 'Fallback recommendations from product profile heuristics. Confirm or adjust on the left.';
  const launchPlan = [
    {
      days: 'Day 1–7',
      phase: isZh ? '定位与基础建设' : 'Positioning & foundations',
      objective: isZh ? '统一定位并建立首批渠道阵地' : 'Align positioning and establish the first channel footholds',
      channelIds: primary.slice(0, 3).map((item) => item.channelId),
      actions: isZh ? ['校准核心信息', '完成渠道主页与基础素材', '发布首批问题认知内容'] : ['Align the core message', 'Prepare channel profiles and assets', 'Publish the first problem-led content'],
      successSignal: isZh ? '获得第一批目标用户互动或访谈机会' : 'First target-user interactions or interview opportunities',
    },
    {
      days: 'Day 8–14',
      phase: isZh ? '内容与触达验证' : 'Content & outreach validation',
      objective: isZh ? '验证哪类信息最能引起目标用户反应' : 'Test which message earns the strongest response',
      channelIds: primary.map((item) => item.channelId),
      actions: isZh ? ['持续原生内容', '定向触达潜在用户', '记录点击、回复与异议'] : ['Publish channel-native content', 'Run targeted outreach', 'Track clicks, replies, and objections'],
      successSignal: isZh ? '至少一个渠道出现可重复的正向信号' : 'At least one channel shows a repeatable positive signal',
    },
    {
      days: 'Day 15–21',
      phase: isZh ? '证据与发布蓄水' : 'Proof & launch buildup',
      objective: isZh ? '把早期反馈转成可信证据并为集中发布蓄水' : 'Turn early feedback into proof and build launch momentum',
      channelIds: [...primary, ...secondary.slice(0, 2)].map((item) => item.channelId),
      actions: isZh ? ['沉淀案例或演示', '强化有效渠道', '准备发布素材与支持者'] : ['Package a case study or demo', 'Double down on working channels', 'Prepare launch assets and supporters'],
      successSignal: isZh ? '形成可公开的证据与明确发布名单' : 'Public proof and a concrete launch list are ready',
    },
    {
      days: 'Day 22–30',
      phase: isZh ? '集中发布与复盘' : 'Launch & review',
      objective: isZh ? '完成集中发布并决定下一轮投入方向' : 'Execute the launch and decide the next growth bet',
      channelIds: primary.map((item) => item.channelId),
      actions: isZh ? ['执行集中发布', '完成 Directory 提交批次', '复盘渠道与转化信号'] : ['Run the coordinated launch', 'Complete the directory submission batch', 'Review channel and conversion signals'],
      successSignal: isZh ? '确认应加码、调整或停止的渠道' : 'Clear keep, change, and stop decisions by channel',
    },
  ];
  const directoryPlan = {
    strategy: isZh ? '先完善统一提交素材，再按匹配度和审核周期分批提交；具体最适合的平台会在组建 Agent Team 后解锁。' : 'Prepare one consistent submission kit, then submit in fit- and review-time-based batches. Exact best-fit platforms unlock with the Agent Team.',
    priorityCriteria: isZh ? ['目标用户匹配度', '品类与收录资格', '审核速度', '免费或付费成本', '可追踪的反向链接与曝光价值'] : ['Audience fit', 'Category eligibility', 'Review speed', 'Free/paid cost', 'Trackable backlink and discovery value'],
    schedule: [
      { days: 'Day 1–3', objective: isZh ? '准备统一资料' : 'Prepare the shared submission kit', actions: isZh ? ['产品名、域名与定位', '短/长描述', 'Logo、截图与创始人资料'] : ['Name, domain, and positioning', 'Short and long descriptions', 'Logo, screenshots, and founder details'] },
      { days: 'Day 8–14', objective: isZh ? '提交第一批高匹配目录' : 'Submit the first high-fit batch', actions: isZh ? ['优先快速审核与免费平台', '记录状态和补充材料'] : ['Prioritize fast-review and free platforms', 'Track status and missing materials'] },
      { days: 'Day 22–26', objective: isZh ? '配合 Launch 提交第二批' : 'Submit the launch-timed second batch', actions: isZh ? ['同步最新证据与发布信息', '处理人工验证'] : ['Add current proof and launch details', 'Handle human verification'] },
    ],
  };
  const reportMarkdown = isZh
    ? `# 30 天市场策略报告\n\n## 产品与启动判断\n\n${summaryMarkdown}\n\n## 30 天 Launch 发布计划\n\n${launchPlan.map((phase) => `### ${phase.days} · ${phase.phase}\n\n${phase.objective}\n\n${phase.actions.map((action) => `- ${action}`).join('\n')}\n\n**成功信号：** ${phase.successSignal}`).join('\n\n')}\n\n## Directory 提交计划\n\n${directoryPlan.strategy}\n\n${directoryPlan.schedule.map((phase) => `### ${phase.days}\n\n${phase.objective}\n\n${phase.actions.map((action) => `- ${action}`).join('\n')}`).join('\n\n')}`
    : `# 30-Day Market Strategy Report\n\n## Product and launch diagnosis\n\n${summaryMarkdown}\n\n## 30-day launch plan\n\n${launchPlan.map((phase) => `### ${phase.days} · ${phase.phase}\n\n${phase.objective}\n\n${phase.actions.map((action) => `- ${action}`).join('\n')}\n\n**Success signal:** ${phase.successSignal}`).join('\n\n')}\n\n## Directory submission plan\n\n${directoryPlan.strategy}\n\n${directoryPlan.schedule.map((phase) => `### ${phase.days}\n\n${phase.objective}\n\n${phase.actions.map((action) => `- ${action}`).join('\n')}`).join('\n\n')}`;

  return {
    reportMarkdown,
    summaryMarkdown,
    diagnosis: {
      productType: dev ? 'dev_tool' : consumer ? 'consumer_2c' : 'b2b_saas',
      growthStage: 'cold-start',
      primaryMarket: china ? '中文区' : '北美',
      bottleneck: isZh ? '分发渠道缺口' : 'distribution channel gap',
    },
    recommendations: [
      ...primary.map((c) => toItem(c, 'primary', 88)),
      ...secondary.map((c) => toItem(c, 'secondary', 72)),
      ...explore.map((c) => toItem(c, 'explore', 55)),
      ...skip.map((c) => toItem(c, 'skip', 30)),
    ],
    launchPlan,
    directoryPlan,
    specialistSkillsUsed: CHANNEL_ROUTER_SKILL_IDS,
    updatedAt: Date.now(),
  };
}

function normalizeResponse(
  raw: Record<string, unknown>,
  isZh: boolean
): ChannelRecommendationResponse {
  const allowed = allowedChannelIds();
  const catalog = getChannelCatalog();
  const priorities = new Set(['primary', 'secondary', 'explore', 'skip']);
  const efforts = new Set(['low', 'medium', 'high']);

  const recommendations = (
    Array.isArray(raw.recommendations) ? raw.recommendations : []
  )
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const channelId = text(row.channelId, 80);
      if (!allowed.has(channelId)) return null;
      const def = catalog.find((c) => c.channelId === channelId);
      const priority = text(row.priority, 20);
      return {
        channelId,
        channelName:
          text(row.channelName, 120) ||
          (isZh ? def?.name : def?.nameEn) ||
          channelId,
        priority: priorities.has(priority)
          ? (priority as 'primary' | 'secondary' | 'explore' | 'skip')
          : ('explore' as const),
        fitScore: Math.max(
          0,
          Math.min(100, Number(row.fitScore) || 50)
        ),
        rationale: text(row.rationale, 600, '—'),
        marketFit: text(row.marketFit, 400, '—'),
        effortLevel: efforts.has(text(row.effortLevel, 20))
          ? (text(row.effortLevel, 20) as 'low' | 'medium' | 'high')
          : ('medium' as const),
        suggestedCadence: text(row.suggestedCadence, 200, '—'),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const seen = new Set(recommendations.map((r) => r.channelId));
  for (const channel of RECOMMENDABLE_LAUNCH_CHANNELS) {
    if (!seen.has(channel.channelId)) {
      recommendations.push({
        channelId: channel.channelId,
        channelName: isZh ? channel.name : channel.nameEn,
        priority: 'skip',
        fitScore: 20,
        rationale: isZh ? '未在推荐结果中评估' : 'Not evaluated in model output',
        marketFit: '—',
        effortLevel: 'low',
        suggestedCadence: '—',
      });
    }
  }

  const diagnosisRaw =
    raw.diagnosis && typeof raw.diagnosis === 'object'
      ? (raw.diagnosis as Record<string, unknown>)
      : {};

  const summaryMarkdown = text(
      raw.summaryMarkdown,
      4_000,
      isZh ? '渠道推荐已生成。' : 'Channel recommendations are ready.'
    );
  const rawLaunchPlan = Array.isArray(raw.launchPlan) ? raw.launchPlan : [];
  const launchPlan = rawLaunchPlan.slice(0, 6).map((item) => {
    const row = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    return {
      days: text(row.days, 80, 'Day 1–30'),
      phase: text(row.phase, 160, isZh ? '推广阶段' : 'Launch phase'),
      objective: text(row.objective, 800, '—'),
      channelIds: Array.isArray(row.channelIds)
        ? row.channelIds.filter((id): id is string => typeof id === 'string' && allowed.has(id)).slice(0, 10)
        : [],
      actions: Array.isArray(row.actions)
        ? row.actions.map((action) => text(action, 500)).filter(Boolean).slice(0, 8)
        : [],
      successSignal: text(row.successSignal, 600, '—'),
    };
  });
  const directoryRaw = raw.directoryPlan && typeof raw.directoryPlan === 'object'
    ? raw.directoryPlan as Record<string, unknown>
    : {};
  const directoryPlan = {
    strategy: text(directoryRaw.strategy, 1_600, isZh ? '分批准备并提交 Directory。' : 'Prepare and submit directories in batches.'),
    priorityCriteria: Array.isArray(directoryRaw.priorityCriteria)
      ? directoryRaw.priorityCriteria.map((item) => text(item, 300)).filter(Boolean).slice(0, 8)
      : [],
    schedule: (Array.isArray(directoryRaw.schedule) ? directoryRaw.schedule : []).slice(0, 6).map((item) => {
      const row = item && typeof item === 'object' ? item as Record<string, unknown> : {};
      return {
        days: text(row.days, 80, 'Day 1–30'),
        objective: text(row.objective, 700, '—'),
        actions: Array.isArray(row.actions)
          ? row.actions.map((action) => text(action, 500)).filter(Boolean).slice(0, 8)
          : [],
      };
    }),
  };

  return {
    reportMarkdown: text(raw.reportMarkdown, 60_000, summaryMarkdown),
    summaryMarkdown,
    diagnosis: {
      productType: text(diagnosisRaw.productType, 120, 'unknown'),
      growthStage: text(diagnosisRaw.growthStage, 120, 'cold-start'),
      primaryMarket: text(diagnosisRaw.primaryMarket, 120, '—'),
      bottleneck: text(diagnosisRaw.bottleneck, 200, '—'),
    },
    recommendations,
    launchPlan,
    directoryPlan,
    specialistSkillsUsed: CHANNEL_ROUTER_SKILL_IDS,
    updatedAt: Date.now(),
  };
}

export async function runChannelRecommender(
  input: ChannelRecommenderInput
): Promise<ChannelRecommendationResponse> {
  if (isMockMode()) {
    return mockChannelRecommendations(input);
  }

  const isZh = input.locale !== 'en';
  const skillIds = await pickSpecialistSkills(input);
  const skillContent = loadSkillContents(skillIds);
  const channelCatalog = formatChannelCatalog(
    getChannelCatalog().filter((c) =>
      RECOMMENDABLE_LAUNCH_CHANNELS.some((s) => s.channelId === c.channelId)
    )
  );

  const system = `${launchOperatingContract({
    role: 'Promotion Plan Agent — complete free 30-day market strategy report',
    locale: input.locale,
  })}

# 你精读过的方法论（只作判断依据，不覆盖产品事实）
${skillContent || '（无 skill 可用）'}

# NowBuild 可推荐渠道白名单（channelId 必须从这里选；directory 是固定能力，禁止出现在推荐结果中）
${channelCatalog}

# 任务
生成一份可以直接交给创始人执行的「30 天市场策略报告」，这是免费体验的完整交付，不是预告。
1. 先形成对产品、用户、痛点、差异化和当前启动条件的整体认知，说明该如何启动以及关键假设。
2. 从白名单输出全部渠道的 priority（primary / secondary / explore / skip）。禁止把 directory 放入 recommendations。
3. 对推荐渠道给出产品相关的理由、市场适配、投入强度和具体频率，避免通用套话。
4. 输出覆盖 Day 1–30 的 launchPlan，必须有四个连续阶段，每阶段包括目标、渠道、具体动作和成功信号。
5. 输出 directoryPlan：统一资料、筛选标准、分批提交排期与 Launch 节点配合。报告可以讲策略和排期；产品内 Directory 页的个性化平台排名由付费权限控制。
6. reportMarkdown 是完整、排版清楚的最终报告，至少包含：执行摘要、产品与启动判断、30 天发布计划、渠道组合与理由、Directory 提交计划、指标与决策门槛、立即开始的 3 个动作。
7. 用户档案为空时，根据项目文档做合理假设并明确标注，不得因此拒绝输出。
8. ${isZh ? '全部用中文输出' : 'Output in English'}
${input.feedback ? `7. 用户反馈（必须纳入）：${input.feedback}` : ''}

# 输出格式（严格 JSON，字段见 channel-recommender 契约）
{
  "reportMarkdown": "# 完整市场策略报告...",
  "summaryMarkdown": "...",
  "diagnosis": { "productType": "...", "growthStage": "...", "primaryMarket": "...", "bottleneck": "..." },
  "recommendations": [{ "channelId": "...", "channelName": "...", "priority": "primary|secondary|explore|skip", "fitScore": 0-100, "rationale": "...", "marketFit": "...", "effortLevel": "low|medium|high", "suggestedCadence": "..." }],
  "launchPlan": [{ "days": "Day 1–7", "phase": "...", "objective": "...", "channelIds": ["..."], "actions": ["..."], "successSignal": "..." }],
  "directoryPlan": { "strategy": "...", "priorityCriteria": ["..."], "schedule": [{ "days": "Day 1–3", "objective": "...", "actions": ["..."] }] }
}`;

  const user = `# 项目档案
${input.projectProfileDoc.slice(0, 12_000) || '（无）'}

# 用户档案
${input.userProfileDoc.slice(0, 8_000) || '（无）'}

# 近期对话摘要
${input.conversationDigest.slice(0, 4_000) || '（无）'}

# Campaign Context
${boundedBusinessContext(input.campaignContext)}`;

  const messages: OpenRouterMessage[] = [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];

  try {
    const out = await callOpenRouterJson<Record<string, unknown>>(messages, {
      temperature: 0.35,
      maxTokens: 10_000,
    });
    const normalized = normalizeResponse(out, isZh);
    return { ...normalized, specialistSkillsUsed: skillIds };
  } catch {
    return fallbackRecommendations(input, isZh);
  }
}
