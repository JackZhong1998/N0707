import { callOpenRouterJson } from '@/lib/openrouter';
import type {
  ChannelStrategy,
  ChatMessage,
  DailyTask,
  Deliverable,
} from '@/lib/gtm/types';
import {
  buildMemoryContext,
  compactHistory,
  type MemoryPayload,
} from '@/lib/gtm/memory';
import {
  CHANNEL_STRATEGIST_PROMPT,
  CALENDAR_PLANNER_PROMPT,
  CONTENT_AGENT_PROMPT,
  buildTaskExecutorPrompt,
} from './prompts';
import { loadSkill, getChannelName } from './skills/registry';

export async function runChannelStrategy(
  channelId: string,
  memory: MemoryPayload
): Promise<ChannelStrategy> {
  const skill = loadSkill(channelId);
  if (!skill) throw new Error(`Skill not found: ${channelId}`);

  const messages = [
    { role: 'system' as const, content: CHANNEL_STRATEGIST_PROMPT },
    {
      role: 'user' as const,
      content: `${buildMemoryContext(memory)}

【渠道】${channelId}（${skill.name}）

【渠道方法论（来自实战 Playbook，严格遵循）】
${skill.methodology}

【渠道格式规范】
${skill.reference}`,
    },
  ];

  const result = await callOpenRouterJson<ChannelStrategy>(messages, {
    temperature: 0.6,
    maxTokens: 4000,
  });
  result.channelId = channelId;
  result.defaultTaskTypes = result.defaultTaskTypes ?? skill.defaultTaskTypes;
  return result;
}

interface PlannedTask {
  dayIndex: number;
  scheduledTime?: string;
  taskType: string;
  brief: string;
  angle?: string;
  strategicNote?: string;
}

export async function runChannelCalendar(
  channelId: string,
  strategy: ChannelStrategy,
  memory: MemoryPayload,
  startDate: Date,
  directives?: string
): Promise<DailyTask[]> {
  const skill = loadSkill(channelId);
  if (!skill) throw new Error(`Skill not found: ${channelId}`);

  const messages = [
    { role: 'system' as const, content: CALENDAR_PLANNER_PROMPT },
    {
      role: 'user' as const,
      content: `${buildMemoryContext(memory)}

【渠道】${channelId}
【渠道策略】
${JSON.stringify(strategy, null, 2)}

【Skill 节奏参数】每周 ${skill.postsPerWeek} 帖 · 默认任务类型 ${skill.defaultTaskTypes.join('/')}
${directives ? `\n【本次重排指令（优先遵循）】\n${directives}` : ''}`,
    },
  ];

  let planned = await callOpenRouterJson<PlannedTask[] | { tasks: PlannedTask[] }>(messages, {
    temperature: 0.5,
    maxTokens: 8000,
  });
  if (!Array.isArray(planned)) planned = planned.tasks ?? [];

  return planned.map((t, i) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + t.dayIndex - 1);
    return {
      id: `${channelId}-d${t.dayIndex}-${i}-${Date.now().toString(36)}`,
      channelId,
      channelName: getChannelName(channelId),
      dayIndex: t.dayIndex,
      scheduledDate: date.toISOString().split('T')[0],
      scheduledTime: t.scheduledTime ?? defaultTimeForIndex(i),
      taskType: t.taskType,
      brief: t.brief,
      angle: t.angle,
      status: 'pending' as const,
      strategicNote: t.strategicNote,
    };
  });
}

function defaultTimeForIndex(i: number): string {
  const times = ['09:00', '14:00', '20:00'];
  return times[i % times.length];
}

export async function runTaskExecutor(
  task: DailyTask,
  strategy: ChannelStrategy | undefined,
  memory: MemoryPayload
): Promise<Deliverable> {
  const skill = loadSkill(task.channelId);
  if (!skill) throw new Error(`Skill not found: ${task.channelId}`);

  const prompt = buildTaskExecutorPrompt(task.channelId, skill.methodology, skill.reference);

  const messages = [
    { role: 'system' as const, content: prompt },
    {
      role: 'user' as const,
      content: `${buildMemoryContext(memory)}

【任务】${task.brief}
【内容角度】${task.angle ?? '按任务描述'}
【任务类型】${task.taskType}
【战略目的】${task.strategicNote ?? ''}
【渠道策略摘要】${strategy?.positioningNote ?? ''} ${strategy?.contentThemes?.slice(0, 3).join('；') ?? ''}`,
    },
  ];

  return callOpenRouterJson<Deliverable>(messages, { temperature: 0.75, maxTokens: 2500 });
}

export interface ContentAgentResult {
  reply: string;
  revisedBody?: string;
  revisedTitle?: string;
}

export async function runContentAgent(
  task: DailyTask,
  deliverable: Deliverable,
  history: ChatMessage[],
  userMessage: string,
  memory: MemoryPayload
): Promise<ContentAgentResult> {
  const skill = loadSkill(task.channelId);

  const messages = [
    { role: 'system' as const, content: CONTENT_AGENT_PROMPT },
    {
      role: 'user' as const,
      content: `${buildMemoryContext(memory)}

【当前任务】${task.brief}（${task.channelName} · 第 ${task.dayIndex} 天）
【战略目的】${task.strategicNote ?? ''}

【当前内容稿】
标题：${deliverable.title}
正文：
${deliverable.body}

【渠道格式约束】
${skill?.reference ?? ''}`,
    },
    ...compactHistory(history, 8).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: userMessage },
  ];

  return callOpenRouterJson<ContentAgentResult>(messages, { temperature: 0.7, maxTokens: 2500 });
}
