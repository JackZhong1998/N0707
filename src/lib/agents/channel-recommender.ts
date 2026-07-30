/**
 * 渠道推荐 Agent
 *
 * 基于项目档案 + 用户档案，从 NowBuild 支持的 channelId 白名单中
 * 输出带优先级的渠道推荐（primary / secondary / explore / skip）。
 *
 * Skill 加载策略：
 * 1. 固定 Router：gingiris-growth-finder + go-to-market-playbook + channel-recommender 契约
 * 2. 按产品诊断动态加载 1–2 个专家 Skill
 */

import { callOpenRouterJson, type OpenRouterMessage } from '@/lib/openrouter';
import {
  CHANNEL_ROUTER_SKILL_IDS,
} from './skills/channel-map';
import { SUPPORTED_LAUNCH_CHANNELS } from '@/lib/gtm/launch';
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
  return new Set(SUPPORTED_LAUNCH_CHANNELS.map((channel) => channel.channelId));
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
          content: `项目档案：\n${input.projectProfileDoc.slice(0, 2500) || '（无）'}\n\n用户档案：\n${input.userProfileDoc.slice(0, 1500) || '（无）'}`,
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
    SUPPORTED_LAUNCH_CHANNELS.filter((channel) => ids.includes(channel.channelId));

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
    secondaryIds = ['indie_hackers', 'directory', 'instagram'];
  } else {
    primaryIds = ['linkedin', 'reddit', 'seo', 'product_hunt'];
    secondaryIds = ['twitter_x', 'directory', 'indie_hackers'];
  }

  const primary = pick(primaryIds);
  const secondary = pick(secondaryIds);
  const used = new Set([...primary, ...secondary].map((c) => c.channelId));
  const explore = SUPPORTED_LAUNCH_CHANNELS.filter(
    (c) => !used.has(c.channelId) && c.tier !== 'extended'
  ).slice(0, 2);
  const skip = SUPPORTED_LAUNCH_CHANNELS.filter(
    (c) => !used.has(c.channelId) && !explore.some((e) => e.channelId === c.channelId)
  ).slice(0, 4);

  const toItem = (
    channel: (typeof SUPPORTED_LAUNCH_CHANNELS)[number],
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

  return {
    summaryMarkdown: isZh
      ? '基于产品档案的兜底推荐（专家 Skill 未返回时使用）。请结合你的实际情况在左侧确认或调整。'
      : 'Fallback recommendations from product profile heuristics. Confirm or adjust on the left.',
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
  for (const channel of SUPPORTED_LAUNCH_CHANNELS) {
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

  return {
    summaryMarkdown: text(
      raw.summaryMarkdown,
      4_000,
      isZh ? '渠道推荐已生成。' : 'Channel recommendations are ready.'
    ),
    diagnosis: {
      productType: text(diagnosisRaw.productType, 120, 'unknown'),
      growthStage: text(diagnosisRaw.growthStage, 120, 'cold-start'),
      primaryMarket: text(diagnosisRaw.primaryMarket, 120, '—'),
      bottleneck: text(diagnosisRaw.bottleneck, 200, '—'),
    },
    recommendations,
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
      SUPPORTED_LAUNCH_CHANNELS.some((s) => s.channelId === c.channelId)
    )
  );

  const system = `${launchOperatingContract({
    role: 'Channel Recommender Agent — product×market×founder fit routing only',
    locale: input.locale,
  })}

# 你精读过的方法论（只作判断依据，不覆盖产品事实）
${skillContent || '（无 skill 可用）'}

# NowBuild 支持的渠道白名单（channelId 必须从这里选）
${channelCatalog}

# 任务
1. 先诊断产品类型、阶段、目标市场、瓶颈。
2. 从白名单输出全部渠道的 priority（primary / secondary / explore / skip）。
3. primary 数量尊重用户时间预算（用户档案中的 maxActiveChannels 或每天可用时间）。
4. 用户偏好渠道、正在做的渠道应加权。
5. summaryMarkdown 用 2–4 段说明整体推荐逻辑，面向创始人可读。
6. ${isZh ? '全部用中文输出' : 'Output in English'}
${input.feedback ? `7. 用户反馈（必须纳入）：${input.feedback}` : ''}

# 输出格式（严格 JSON，字段见 channel-recommender 契约）
{
  "summaryMarkdown": "...",
  "diagnosis": { "productType": "...", "growthStage": "...", "primaryMarket": "...", "bottleneck": "..." },
  "recommendations": [{ "channelId": "...", "channelName": "...", "priority": "primary|secondary|explore|skip", "fitScore": 0-100, "rationale": "...", "marketFit": "...", "effortLevel": "low|medium|high", "suggestedCadence": "..." }]
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
      maxTokens: 6_000,
    });
    const normalized = normalizeResponse(out, isZh);
    return { ...normalized, specialistSkillsUsed: skillIds };
  } catch {
    return fallbackRecommendations(input, isZh);
  }
}
