import { callOpenRouterJson } from '@/lib/openrouter';
import type { TaskFeedback, WeeklyReview, UnifiedDayPlan } from '@/lib/gtm/types';
import { WEEKLY_REVIEWER_PROMPT } from './prompts';

export { computeCurrentDayIndex, getTodayTasks, getWeekCompletionRate } from '@/lib/gtm/plan-utils';

export async function runWeeklyReview(
  dayIndex: number,
  calendar: UnifiedDayPlan[],
  feedbacks: Record<string, TaskFeedback>
): Promise<WeeklyReview> {
  const allTasks = calendar.flatMap((d) => d.tasks);
  const completed = allTasks.filter((t) => t.status === 'done').length;
  const total = allTasks.filter((t) => t.status !== 'skipped').length;
  const executionRate = total > 0 ? completed / total : 0;

  const feedbackList = Object.values(feedbacks);
  const signals = feedbackList.flatMap((f) => f.signals);

  const messages = [
    { role: 'system' as const, content: WEEKLY_REVIEWER_PROMPT },
    {
      role: 'user' as const,
      content: `战报节点：第 ${dayIndex} 天
执行率：${(executionRate * 100).toFixed(0)}%（${completed}/${total} 任务完成）
市场信号：${JSON.stringify(signals)}
用户感受：${feedbackList.map((f) => f.feelingNote).filter(Boolean).join('; ')}
任务详情：${JSON.stringify(
        allTasks.slice(0, 20).map((t) => ({
          day: t.dayIndex,
          channel: t.channelName,
          brief: t.brief,
          status: t.status,
          feedback: feedbacks[t.id],
        }))
      )}`,
    },
  ];

  const result = await callOpenRouterJson<Omit<WeeklyReview, 'dayIndex'>>(messages, {
    temperature: 0.6,
  });

  return { ...result, dayIndex, executionRate };
}
