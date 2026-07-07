import type {
  ChannelStrategy,
  DailyTask,
  UnifiedDayPlan,
} from '@/lib/gtm/types';
import type { MemoryPayload } from '@/lib/gtm/memory';
import { runChannelStrategy, runChannelCalendar, runTaskExecutor } from '@/lib/agents/execution';

export async function batchStrategy(
  channelIds: string[],
  memory: MemoryPayload
): Promise<Record<string, ChannelStrategy>> {
  const strategies: Record<string, ChannelStrategy> = {};
  await Promise.all(
    channelIds.map(async (channelId) => {
      strategies[channelId] = await runChannelStrategy(channelId, memory);
    })
  );
  return strategies;
}

export async function batchCalendar(
  channelIds: string[],
  strategies: Record<string, ChannelStrategy>,
  memory: MemoryPayload,
  startDate: Date,
  directives?: string
): Promise<DailyTask[]> {
  const allTasks: DailyTask[] = [];
  await Promise.all(
    channelIds.map(async (channelId) => {
      const tasks = await runChannelCalendar(
        channelId,
        strategies[channelId],
        memory,
        startDate,
        directives
      );
      allTasks.push(...tasks);
    })
  );
  return allTasks;
}

export function mergeDailyTasks(tasks: DailyTask[]): UnifiedDayPlan[] {
  const dayMap = new Map<number, DailyTask[]>();
  for (const task of tasks) {
    const existing = dayMap.get(task.dayIndex) ?? [];
    existing.push(task);
    dayMap.set(task.dayIndex, existing);
  }

  const plans: UnifiedDayPlan[] = [];
  for (const [dayIndex, dayTasks] of dayMap) {
    dayTasks.sort((a, b) => (a.scheduledTime ?? '').localeCompare(b.scheduledTime ?? ''));
    plans.push({
      dayIndex,
      scheduledDate: dayTasks[0].scheduledDate,
      theme: dayTasks[0].strategicNote,
      tasks: dayTasks,
    });
  }
  return plans.sort((a, b) => a.dayIndex - b.dayIndex);
}

export async function pregenerateDeliverables(
  calendar: UnifiedDayPlan[],
  strategies: Record<string, ChannelStrategy>,
  memory: MemoryPayload,
  maxDay = 3
): Promise<UnifiedDayPlan[]> {
  const updated = structuredClone(calendar);
  for (const day of updated) {
    if (day.dayIndex > maxDay) continue;
    for (const task of day.tasks) {
      if (!task.deliverable) {
        const strategy = strategies[task.channelId];
        try {
          task.deliverable = await runTaskExecutor(task, strategy, memory);
        } catch {
          // 预生成失败不阻塞整体流程，用户打开任务时会 lazy load
        }
      }
    }
  }
  return updated;
}

export async function buildGtmPlanFromChannels(
  channelIds: string[],
  memory: MemoryPayload,
  directives?: string
): Promise<{
  strategies: Record<string, ChannelStrategy>;
  calendar: UnifiedDayPlan[];
}> {
  const startDate = new Date();
  const strategies = await batchStrategy(channelIds, memory);
  const tasks = await batchCalendar(channelIds, strategies, memory, startDate, directives);
  let calendar = mergeDailyTasks(tasks);
  calendar = await pregenerateDeliverables(calendar, strategies, memory, 3);
  return { strategies, calendar };
}
