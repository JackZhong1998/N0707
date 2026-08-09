/** Generate one channel-native strategy for each selected channel. */

import { callOpenRouterJson, type OpenRouterMessage } from '@/lib/openrouter';
import type { StrategyResponse } from '@/lib/gtm/types';
import {
  channelName,
  formatChannelCatalog,
  getChannelCatalog,
  loadSkillContents,
} from './catalog';
import { isMockMode, mockStrategy } from './mock';
import { boundedBusinessContext, launchOperatingContract } from './prompts';

export interface StrategistInput {
  channelIds: string[];
  userProfileDoc: string;
  projectProfileDoc: string;
  conversationDigest: string;
  feedback?: string;
  performanceContext?: string;
  /** The already-generated market strategy report. */
  existingOverview?: string;
  campaignContext: string;
  locale: string;
  /** Kept only so older callers can be read safely; all new work is channel-scoped. */
  phase?: 'blueprint' | 'channel' | 'full';
}

function text(value: unknown, maxLength: number, fallback = ''): string {
  return typeof value === 'string'
    ? value.trim().slice(0, maxLength) || fallback
    : fallback;
}

async function runOneChannel(
  input: StrategistInput,
  channelId: string
): Promise<StrategyResponse> {
  const selected = getChannelCatalog().find(
    (channel) => channel.channelId === channelId
  );
  if (!selected) throw new Error(`Unknown channel: ${channelId}`);

  const skillIds = [...new Set(selected.skillIds)].slice(0, 6);
  const skillContent = loadSkillContents(skillIds);
  const isZh = input.locale !== 'en';
  const marketReport = input.existingOverview?.trim();

  const system = `${launchOperatingContract({
    role: 'Channel Strategy Agent — write one channel-native execution plan',
    locale: input.locale,
  })}

# 本渠道的方法
${skillContent || '（无 Skill 可用）'}

# 任务
只为 ${selected.name} 生成一份 30 天渠道策略。

必须包含：
1. 渠道在本项目中的作用和目标用户。
2. 3–5 个适合该平台的内容方向。
3. 适合的内容格式、发布频率和产品出现方式。
4. 四周推进方向，每周只写目标，不写每日 Todo。
5. 成功信号、主要风险和停止条件。

不得：
- 重新推荐渠道或改变用户已选渠道。
- 重新生成一份总市场报告。
- 编造产品功能、客户、数据、定价或个人经历。
- 把“找帖子”“去调研”这类操作步骤当成内容策略。

${isZh ? '全部用中文输出。' : 'Output entirely in English.'}
${input.feedback ? `\n# 用户修改意见\n${input.feedback}` : ''}
${input.performanceContext ? `\n# 已发布内容表现\n${input.performanceContext.slice(0, 10_000)}` : ''}
${marketReport ? `\n# 已有市场策略报告（只用于保持一致）\n${marketReport.slice(0, 8_000)}` : ''}

# 输出格式（严格 JSON）
{
  "goal": "该渠道 30 天的具体目标",
  "overviewMarkdown": "对该渠道策略的两三句摘要",
  "channels": [{
    "channelId": "${channelId}",
    "channelName": "${isZh ? selected.name : selected.nameEn}",
    "positioning": "渠道定位一句话",
    "direction": "30 天方向",
    "contentPillars": ["内容方向 1", "内容方向 2", "内容方向 3"],
    "markdown": "完整渠道策略 Markdown"
  }]
}`;

  const user = `# 用户档案
${input.userProfileDoc || '（暂无）'}

# 项目文档
${input.projectProfileDoc || '（暂无）'}

# 近期对话要点
${input.conversationDigest || '（暂无）'}

# 当前项目状态
${boundedBusinessContext(input.campaignContext)}

# 目标渠道
${formatChannelCatalog([selected])}

请输出该渠道的策略。`;

  const messages: OpenRouterMessage[] = [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
  const out = await callOpenRouterJson<StrategyResponse>(messages, {
    temperature: 0.35,
    maxTokens: 4_000,
    trace: {
      agentName: 'channel_strategy',
      operation: 'generate_channel_strategy',
      traceId: crypto.randomUUID(),
      metadata: {
        channelId,
        skillIds,
        skillContentChars: skillContent.length,
        reusedMarketReport: Boolean(marketReport),
      },
    },
  });

  const raw = Array.isArray(out.channels)
    ? out.channels.find((channel) => channel?.channelId === channelId) ??
      out.channels[0]
    : undefined;
  if (!raw) {
    return mockStrategy({ channelIds: [channelId], feedback: input.feedback });
  }
  return {
    goal: text(
      out.goal,
      1_000,
      isZh ? `验证 ${selected.name} 的可持续获客方式` : `Validate ${selected.nameEn} as an acquisition channel`
    ),
    overviewMarkdown: text(out.overviewMarkdown, 8_000),
    channels: [
      {
        channelId,
        channelName: channelName(channelId, input.locale),
        positioning: text(raw.positioning, 1_000),
        direction: text(raw.direction, 4_000),
        contentPillars: (Array.isArray(raw.contentPillars)
          ? raw.contentPillars
          : []
        )
          .filter((pillar): pillar is string => typeof pillar === 'string')
          .map((pillar) => pillar.trim().slice(0, 500))
          .filter(Boolean)
          .slice(0, 6),
        markdown: text(raw.markdown, 30_000),
      },
    ],
  };
}

export async function runStrategist(
  input: StrategistInput
): Promise<StrategyResponse> {
  const channelIds = [...new Set(input.channelIds)].slice(0, 16);
  if (isMockMode()) {
    return mockStrategy({ channelIds, feedback: input.feedback });
  }
  const results = await Promise.all(
    channelIds.map((channelId) => runOneChannel(input, channelId))
  );
  return {
    goal: results[0]?.goal ?? '',
    overviewMarkdown:
      input.existingOverview?.slice(0, 50_000) ||
      results.map((result) => result.overviewMarkdown).filter(Boolean).join('\n\n'),
    channels: results.flatMap((result) => result.channels),
  };
}
