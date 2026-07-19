/**
 * 周度复盘 Agent
 *
 * 只生成有证据的复盘和“待确认”的调整建议，不直接改写正式策略或未来日历。
 */

import { callOpenRouterJson } from '@/lib/openrouter';

export interface ReflectionProposal {
  scope: 'strategy' | 'topics' | 'calendar';
  channelId?: string;
  title: string;
  reason: string;
  expectedSignal: string;
}

export interface WeeklyReflectionResult {
  headline: string;
  summary: string;
  reviewMarkdown: string;
  proposals: ReflectionProposal[];
  evidenceSufficient: boolean;
  generatedAt: number;
}

export async function runWeeklyReflection(input: {
  userProfileDoc: string;
  projectProfileDoc: string;
  strategyMarkdown: string;
  performanceContext: string;
  locale: string;
}): Promise<WeeklyReflectionResult> {
  const isZh = input.locale !== 'en';
  const result = await callOpenRouterJson<Omit<WeeklyReflectionResult, 'generatedAt'>>(
    [
      {
        role: 'system',
        content: `你是 NowBuild 的周度市场复盘 Agent。你负责从帖子数据中提出下一周的学习和调整草案，但无权直接覆盖策略、选题或日历。

# 分析规则
- 只能引用提供的数据，不得编造浏览量、转化或用户反馈。
- 优先做同渠道、相近发布时间和相近观察窗口的比较。
- 明确区分事实、判断、假设；相关性不能写成因果。
- 数据不足时说明需要继续收集什么，不为了产出结论而强行下判断。
- 每个调整建议必须包含预期观察信号，方便下一周验证。
- ${isZh ? '全部使用中文。' : 'Return all prose in English.'}

# 严格 JSON
{
  "headline": "一句话结论",
  "summary": "不超过 100 字的摘要",
  "reviewMarkdown": "完整复盘 Markdown：数据范围、观察、判断、下周实验、暂不调整项",
  "proposals": [
    {
      "scope": "strategy|topics|calendar",
      "channelId": "可选",
      "title": "建议改什么",
      "reason": "证据和判断",
      "expectedSignal": "下周用什么信号验证"
    }
  ],
  "evidenceSufficient": true
}`,
      },
      {
        role: 'user',
        content: `# 用户档案
${input.userProfileDoc || '（暂无）'}

# 产品档案
${input.projectProfileDoc || '（暂无）'}

# 当前策略
${input.strategyMarkdown || '（暂无）'}

# 已发布帖子与数据
${input.performanceContext || '尚无可用数据。'}`,
      },
    ],
    { temperature: 0.3, maxTokens: 6_000 }
  );

  return {
    headline:
      typeof result.headline === 'string' && result.headline.trim()
        ? result.headline.slice(0, 240)
        : isZh
          ? '本周复盘已完成'
          : 'Weekly review complete',
    summary:
      typeof result.summary === 'string' ? result.summary.slice(0, 1_200) : '',
    reviewMarkdown:
      typeof result.reviewMarkdown === 'string'
        ? result.reviewMarkdown.slice(0, 80_000)
        : '',
    proposals: (Array.isArray(result.proposals) ? result.proposals : [])
      .filter(
        (proposal) =>
          proposal &&
          ['strategy', 'topics', 'calendar'].includes(proposal.scope) &&
          typeof proposal.title === 'string' &&
          typeof proposal.reason === 'string' &&
          typeof proposal.expectedSignal === 'string'
      )
      .slice(0, 12)
      .map((proposal) => ({
        scope: proposal.scope,
        channelId:
          typeof proposal.channelId === 'string'
            ? proposal.channelId.slice(0, 80)
            : undefined,
        title: proposal.title.slice(0, 300),
        reason: proposal.reason.slice(0, 2_000),
        expectedSignal: proposal.expectedSignal.slice(0, 1_000),
      })),
    evidenceSufficient: result.evidenceSufficient === true,
    generatedAt: Date.now(),
  };
}
