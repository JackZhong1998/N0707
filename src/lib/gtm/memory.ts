import type {
  GtmKickoffForm,
  GtmState,
  ProductProfile,
  StrategySummary,
  TaskFeedback,
  UnifiedDayPlan,
} from './types';

/**
 * Agent 记忆分层：
 * - 长期记忆：ProductProfile（产品画像，跨对话累积）+ StrategySummary（已确认策略）
 * - 中期记忆：执行洞察（从复盘反馈中派生的信号统计）
 * - 短期记忆：最近 N 条对话（compactHistory 截断）
 * MemoryPayload 由客户端组装后随请求发给各 Agent 路由。
 */
export interface MemoryPayload {
  profile: ProductProfile;
  form: GtmKickoffForm;
  strategySummary?: StrategySummary;
  insights: string[];
  progress?: string;
}

export function getMemoryPayload(state: GtmState): MemoryPayload {
  return {
    profile: state.productProfile,
    form: state.kickoffForm,
    strategySummary: state.strategySummary,
    insights: deriveInsights(state.unifiedCalendar, state.taskFeedbacks),
    progress:
      state.phase === 'execution' || state.phase === 'review'
        ? `战役第 ${state.currentDayIndex}/30 天`
        : undefined,
  };
}

/** 中期记忆：从任务反馈派生执行洞察 */
export function deriveInsights(
  calendar: UnifiedDayPlan[],
  feedbacks: Record<string, TaskFeedback>
): string[] {
  const allTasks = calendar.flatMap((d) => d.tasks);
  if (allTasks.length === 0) return [];

  const insights: string[] = [];
  const done = allTasks.filter((t) => t.status === 'done').length;
  const attempted = allTasks.filter(
    (t) => t.status === 'done' || t.status === 'skipped'
  ).length;
  if (attempted > 0) {
    insights.push(`已执行 ${attempted} 个任务，完成 ${done} 个`);
  }

  const signalByChannel = new Map<string, number>();
  const conversionNotes: string[] = [];
  for (const task of allTasks) {
    const fb = feedbacks[task.id];
    if (!fb) continue;
    const strong = fb.signals.filter((s) =>
      ['comment_dm', 'click_lead', 'conversion'].includes(s)
    ).length;
    if (strong > 0) {
      signalByChannel.set(
        task.channelName,
        (signalByChannel.get(task.channelName) ?? 0) + strong
      );
    }
    if (fb.signals.includes('conversion') && fb.conversionNote) {
      conversionNotes.push(fb.conversionNote);
    }
    if (fb.feelingNote) {
      insights.push(`用户复盘（${task.channelName}·D${task.dayIndex}）：${fb.feelingNote}`);
    }
  }

  for (const [channel, count] of signalByChannel) {
    insights.push(`${channel} 已产生 ${count} 次强市场信号（评论/私信/点击/成交）`);
  }
  if (conversionNotes.length > 0) {
    insights.push(`成交记录：${conversionNotes.join('；')}`);
  }

  return insights.slice(0, 10);
}

/** 服务端：把 MemoryPayload 组装成注入 Agent 的上下文块 */
export function buildMemoryContext(memory: MemoryPayload): string {
  const p = memory.profile ?? { keyFacts: [] };
  const f = memory.form ?? {};
  const lines: string[] = ['【产品画像（长期记忆，务必基于此回答，不要凭空假设）】'];

  const fields: Array<[string, string | undefined]> = [
    ['产品名称', p.name],
    ['产品是什么', p.description],
    ['一句话价值', p.valueProp],
    ['差异化', p.differentiation],
    ['目标用户 ICP', p.icp],
    ['用户痛点', p.icpPains],
    ['过往有效内容', p.bestContent],
    ['不想做的推广', p.avoidPromotion],
    ['用户活跃平台', p.activePlatforms],
    ['产品链接', f.productUrl],
    ['产品类型', f.productType],
    ['目标市场', f.targetMarket],
    ['每日时间预算', f.dailyTimeBudget],
    ['30天目标', f.thirtyDayGoal],
  ];
  for (const [label, value] of fields) {
    if (value) lines.push(`- ${label}：${value}`);
  }
  if (p.keyFacts.length > 0) {
    lines.push(`- 其他关键事实：${p.keyFacts.join('；')}`);
  }

  if (memory.strategySummary) {
    const s = memory.strategySummary;
    lines.push('', '【已确认的 30 天策略】');
    lines.push(`- 目标：${s.thirtyDayGoal}`);
    lines.push(`- 主战场：${s.mainChannels.join(' + ')}`);
    lines.push(`- 节奏：${s.rhythm}`);
    if (s.weeklyArc?.length) {
      lines.push(
        `- 四周主线：${s.weeklyArc.map((w) => `W${w.week} ${w.theme}`).join(' → ')}`
      );
    }
    lines.push(`- 明确不做：${s.notDoing.join('、')}`);
  }

  if (memory.insights.length > 0) {
    lines.push('', '【执行洞察（来自用户真实复盘）】');
    for (const insight of memory.insights) lines.push(`- ${insight}`);
  }

  if (memory.progress) {
    lines.push('', `【当前进度】${memory.progress}`);
  }

  return lines.join('\n');
}

/** 短期记忆：截断对话历史，保留最近 max 条 */
export function compactHistory<T extends { role: string; content: string }>(
  messages: T[],
  max = 12
): T[] {
  if (messages.length <= max) return messages;
  return messages.slice(-max);
}
