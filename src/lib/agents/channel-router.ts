import { callOpenRouterJson } from '@/lib/openrouter';
import type { CmoChannelRecommendation, StrategySummary } from '@/lib/gtm/types';
import { buildMemoryContext, type MemoryPayload } from '@/lib/gtm/memory';
import { CHANNEL_ROUTER_PROMPT } from './prompts';
import { getSkillRegistryMeta } from './skills/registry';

export async function runCmoRecommend(
  memory: MemoryPayload
): Promise<CmoChannelRecommendation> {
  const registry = getSkillRegistryMeta();
  const messages = [
    { role: 'system' as const, content: CHANNEL_ROUTER_PROMPT },
    {
      role: 'user' as const,
      content: `${buildMemoryContext(memory)}

【可用渠道注册表】
${JSON.stringify(registry, null, 2)}`,
    },
  ];

  const result = await callOpenRouterJson<CmoChannelRecommendation>(messages, {
    temperature: 0.4,
  });
  return clampChannelRecommendation(result, memory);
}

function clampChannelRecommendation(
  rec: CmoChannelRecommendation,
  memory: MemoryPayload
): CmoChannelRecommendation {
  const form = memory.form;
  const isDomestic =
    !form.targetMarket || form.targetMarket === 'domestic' || form.targetMarket === 'both';
  const maxChannels = form.dailyTimeBudget === '15min' ? 2 : 3;

  let wave1 = (rec.wave1 ?? []).slice(0, maxChannels);

  if (wave1.length === 0) {
    wave1 = isDomestic
      ? [
          {
            channelId: 'xiaohongshu',
            name: '小红书',
            reason: '国内 First Launch 默认主战场：故事化内容 + 公域曝光',
            selected: true,
          },
          {
            channelId: 'user_outreach',
            name: '私域 / 朋友圈',
            reason: '转化路径最短的信任型渠道',
            selected: true,
          },
        ]
      : [
          {
            channelId: 'twitter_x',
            name: 'Twitter / X',
            reason: 'Build in public，海外 builder 社区主阵地',
            selected: true,
          },
          {
            channelId: 'product_hunt',
            name: 'Product Hunt',
            reason: '海外产品发布的集中曝光节点',
            selected: true,
          },
        ];
  }

  if (!wave1.some((c) => c.selected)) {
    wave1.forEach((c) => {
      c.selected = true;
    });
  }

  return {
    wave1,
    wave2: rec.wave2 ?? [],
    phase0: rec.phase0 ?? [],
  };
}

export function buildStrategySummary(
  memory: MemoryPayload,
  selectedChannels: string[],
  channelNames: Record<string, string>,
  weeklyArc?: StrategySummary['weeklyArc']
): StrategySummary {
  const form = memory.form;
  const tasksPerDay =
    form.dailyTimeBudget === '15min' ? 1 : form.dailyTimeBudget === '1h' ? 3 : 2;

  return {
    thirtyDayGoal: form.thirtyDayGoal ?? '获得第一批有效市场反馈',
    mainChannels: selectedChannels.map((id) => channelNames[id] ?? id),
    rhythm: `每天 ${tasksPerDay} 个任务 · 每周约 ${tasksPerDay * 5} 次推广动作`,
    notDoing: ['SEO', '付费投放', '全渠道铺开', '自动群发'],
    successSignals: ['L1 执行率 ≥ 70%', 'L2 评论/私信互动', 'L3 咨询/注册/成交'],
    weeklyArc,
  };
}
