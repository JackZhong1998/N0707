import { callOpenRouterJson } from '@/lib/openrouter';
import type { ChatMessage, UnifiedDayPlan } from '@/lib/gtm/types';
import {
  buildMemoryContext,
  compactHistory,
  type MemoryPayload,
} from '@/lib/gtm/memory';
import { STRATEGY_AGENT_PROMPT } from './prompts';

export interface StrategyAgentResult {
  reply: string;
  adjustments: string[];
  replanDirective?: string;
}

export async function runStrategyAgent(
  memory: MemoryPayload,
  calendar: UnifiedDayPlan[],
  history: ChatMessage[],
  userMessage: string
): Promise<StrategyAgentResult> {
  const calendarOverview = calendar
    .slice(0, 30)
    .map((d) => {
      const tasks = d.tasks
        .map((t) => `${t.channelName}:${t.brief.slice(0, 30)}(${t.status})`)
        .join(' | ');
      return `D${d.dayIndex}: ${tasks}`;
    })
    .join('\n');

  const messages = [
    { role: 'system' as const, content: STRATEGY_AGENT_PROMPT },
    {
      role: 'user' as const,
      content: `${buildMemoryContext(memory)}

【当前 30 天日历概览】
${calendarOverview || '（日历尚未生成）'}`,
    },
    ...compactHistory(history, 10).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: userMessage },
  ];

  const parsed = await callOpenRouterJson<Partial<StrategyAgentResult>>(messages, {
    temperature: 0.6,
    maxTokens: 1500,
  });
  return {
    reply: parsed.reply ?? '抱歉，我没组织好语言，能再说一次吗？',
    adjustments: parsed.adjustments ?? [],
    replanDirective: parsed.replanDirective,
  };
}
