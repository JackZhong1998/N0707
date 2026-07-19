/**
 * 策略生成 Agent（Sub-Agent）
 *
 * - 基于对话上下文（两份档案 + 近期对话摘要）生成渠道建议与 30 天冷启动策略
 * - 每个渠道输出方向性文档（账号定位、方向、内容规划）——该文档：
 *   a) 显示在市场策略页面
 *   b) 作为变量注入对应渠道专员的 System Prompt
 * - Skill 渐进式载入：第一阶段看目录选 skill，第二阶段注入全文后产出策略
 * - 支持带 feedback 重新生成（用户评估与调整）
 */

import { callOpenRouterJson, type OpenRouterMessage } from '@/lib/openrouter';
import type { StrategyResponse } from '@/lib/gtm/types';
import { getChannelDefinition } from './skills/channel-map';
import {
  channelName,
  formatSkillCatalog,
  getSkillCatalog,
  loadSkillContents,
} from './catalog';
import { isMockMode, mockStrategy } from './mock';

export interface StrategistInput {
  channelIds: string[];
  userProfileDoc: string;
  projectProfileDoc: string;
  conversationDigest: string;
  /** 用户对已有策略的反馈（重新生成时携带） */
  feedback?: string;
  /** 已发布内容的数据反馈，用于策略迭代 */
  performanceContext?: string;
  /** 已有总体策略（增量补渠道时保持一致性） */
  existingOverview?: string;
  locale: string;
}

function text(value: unknown, maxLength: number, fallback = ''): string {
  return typeof value === 'string'
    ? value.trim().slice(0, maxLength) || fallback
    : fallback;
}

/** 第一阶段：从目录中挑选要精读的 skill */
async function pickSkills(input: StrategistInput): Promise<string[]> {
  const catalog = getSkillCatalog();
  const defaults = input.channelIds.flatMap(
    (id) => getChannelDefinition(id)?.skillIds ?? []
  );

  try {
    const out = await callOpenRouterJson<{ skillIds: string[] }>(
      [
        {
          role: 'system',
          content: `你是 GTM 策略专家。你要为渠道 [${input.channelIds.join(', ')}] 制定 30 天冷启动策略。在动笔前，从下面的 Skill 目录中挑选最多 4 个你需要精读全文的 skill（必须精通目标渠道的 Go-to-Market 方法论）。\n\n${formatSkillCatalog(catalog)}\n\n只输出 JSON：{"skillIds": ["..."]}`,
        },
        {
          role: 'user',
          content: `项目档案：\n${input.projectProfileDoc.slice(0, 2000) || '（无）'}\n\n请选择需要精读的 skill。`,
        },
      ],
      { temperature: 0.2, maxTokens: 512 }
    );
    const valid = (Array.isArray(out.skillIds) ? out.skillIds : []).filter(
      (id): id is string =>
        typeof id === 'string' && catalog.some((c) => c.skillId === id)
    );
    if (valid.length > 0) return [...new Set([...valid, ...defaults])].slice(0, 5);
  } catch {
    // 选择失败时退回默认渠道 skill
  }
  return [...new Set(defaults)].slice(0, 5);
}

export async function runStrategist(input: StrategistInput): Promise<StrategyResponse> {
  if (isMockMode()) {
    return mockStrategy({ channelIds: input.channelIds, feedback: input.feedback });
  }

  const skillIds = await pickSkills(input);
  const skillContent = loadSkillContents(skillIds);
  const isZh = input.locale !== 'en';

  const system = `你是 NowBuild 的「策略生成 Agent」，精通各渠道 Go-to-Market 方法论的市场策略专家。你为一人公司创始人 / 独立开发者输出可执行的 30 天冷启动市场策略。

# 你精读过的渠道方法论（以此为策略依据）
${skillContent || '（无 skill 可用，凭最佳实践输出）'}

# 要求
1. 输出一份总体市场策略（overviewMarkdown）：30 天冷启动计划，明确方向、阶段划分（四周各有主题）、成功信号
2. 为每个渠道输出方向性文档：账号定位（如"创始人账号"）、30 天方向、内容规划支柱（如对需求的认知、市场判断、解决用户痛点的干货等）
3. 这份策略只给方向，不写每天的任务——具体每天做什么由各渠道专员根据此文档编写
4. 策略必须落在用户的具体产品和人群上，禁止空话套话
5. 每个渠道的方向性文档必须明确写出：该渠道面向的**目标市场**（如中国大陆 / United States）
   与**目标人群**，并注明内容语言（英语市场→英文内容，中文市场→中文内容）
6. ${isZh ? '全部用中文输出' : 'Output in English'}
${input.feedback ? `7. 用户对上一版策略的反馈（必须据此调整）：${input.feedback}` : ''}
${input.performanceContext ? `\n# 已发布内容表现（策略调整必须引用这些证据，不可臆测）\n${input.performanceContext.slice(0, 10000)}` : ''}
${input.existingOverview ? `\n# 已有总体策略（增量补渠道时保持一致，不要推翻）\n${input.existingOverview.slice(0, 3000)}` : ''}

# 输出格式（严格 JSON）
{
  "goal": "30 天目标一句话",
  "overviewMarkdown": "总体策略 markdown",
  "channels": [
    {
      "channelId": "渠道id",
      "channelName": "渠道名",
      "positioning": "账号定位一句话",
      "direction": "30 天方向一段话",
      "contentPillars": ["内容支柱1", "内容支柱2", "内容支柱3"],
      "markdown": "该渠道完整方向性文档 markdown（含定位/方向/内容支柱/节奏建议/禁忌）"
    }
  ]
}`;

  const user = `# 用户个人档案
${input.userProfileDoc || '（暂无）'}

# 项目档案
${input.projectProfileDoc || '（暂无）'}

# 近期对话要点
${input.conversationDigest || '（暂无）'}

# 目标渠道
${input.channelIds.map((id) => `- ${id}（${channelName(id)}）`).join('\n')}

请输出策略。`;

  const messages: OpenRouterMessage[] = [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];

  const out = await callOpenRouterJson<StrategyResponse>(messages, {
    temperature: 0.6,
    maxTokens: 8192,
  });

  // 模型输出永远先经过白名单和长度校验，再进入持久化业务数据。
  const requested = new Set(input.channelIds);
  const seen = new Set<string>();
  out.channels = (Array.isArray(out.channels) ? out.channels : []).flatMap(
    (channel) => {
      if (!channel || typeof channel !== 'object') return [];
      const channelId = text(channel.channelId, 80);
      if (!requested.has(channelId) || seen.has(channelId)) return [];
      seen.add(channelId);
      return [
        {
          channelId,
          channelName: channelName(channelId, input.locale),
          positioning: text(channel.positioning, 1_000),
          direction: text(channel.direction, 4_000),
          contentPillars: (Array.isArray(channel.contentPillars)
            ? channel.contentPillars
            : []
          )
            .filter((pillar): pillar is string => typeof pillar === 'string')
            .map((pillar) => pillar.trim().slice(0, 500))
            .filter(Boolean)
            .slice(0, 10),
          markdown: text(channel.markdown, 30_000),
        },
      ];
    }
  );

  // 兜底：确保每个请求的渠道都有产出。
  const covered = new Set(out.channels.map((channel) => channel.channelId));
  const missing = input.channelIds.filter((id) => !covered.has(id));
  if (missing.length > 0) {
    const fallback = await mockStrategy({ channelIds: missing });
    out.channels = [...out.channels, ...fallback.channels];
  }
  return {
    goal: text(
      out.goal,
      1_000,
      isZh ? '在 30 天内验证可重复的市场获客路径' : 'Validate a repeatable GTM path in 30 days'
    ),
    overviewMarkdown: text(
      out.overviewMarkdown,
      50_000,
      isZh ? '# 30 天冷启动策略\n\n请先按渠道计划开始执行。' : '# 30-day GTM strategy'
    ),
    channels: out.channels,
  };
}
