import { getLocale } from 'next-intl/server';
import { buildDemoTodos } from '@/lib/gtm/demo-calendar';

export default async function CalendarGlimpse() {
  const locale = await getLocale();
  const isZh = locale === 'zh';
  const todos = buildDemoTodos(locale);
  const columns = [
    {
      label: isZh ? '定方向' : 'Direction',
      day: 'DAY 01',
      items: todos.slice(0, 2),
    },
    {
      label: isZh ? '做内容' : 'Production',
      day: 'DAY 07',
      items: todos.slice(2, 5),
    },
    {
      label: isZh ? '今天' : 'Today',
      day: isZh ? '下一步已就绪' : 'NEXT MOVE READY',
      items: todos.slice(5, 8),
      focus: true,
    },
    {
      label: isZh ? '看反馈' : 'Review',
      day: 'DAY 30',
      items: todos.slice(8, 10),
    },
  ];

  const agentFor = (channelId: string) => {
    if (channelId === 'website_copy') return isZh ? 'Conversion Agent' : 'Conversion Agent';
    if (channelId === 'product_hunt') return 'Launch Agent';
    if (channelId === 'reddit') return 'Community Agent';
    return 'Channel Agent';
  };

  const statusFor = (columnIndex: number, itemIndex: number) => {
    if (columnIndex === 0) return isZh ? '已完成' : 'Completed';
    if (columnIndex === 1) return isZh ? '草稿已就绪' : 'Draft ready';
    if (columnIndex === 2 && itemIndex === 0) return isZh ? '待你审核' : 'Ready for review';
    if (columnIndex === 2) return isZh ? '发布材料已准备' : 'Publishing prepared';
    return isZh ? '已收到反馈' : 'Feedback received';
  };

  return (
    <section className="bg-paper-dim">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid items-end gap-8 lg:grid-cols-[1.2fr_.8fr]">
          <div className="max-w-3xl">
            <p className="index-label">{isZh ? 'AGENTS 的每日产出' : "YOUR AGENTS' DAILY OUTPUT"}</p>
            <h2 className="mt-5 font-[family-name:var(--font-display)] text-4xl font-bold leading-[1.15] tracking-[-0.045em] text-ink sm:text-5xl sm:leading-[1.05]">
              {isZh ? (
                <>每天打开，<br />Agent 已经把下一步准备好了。</>
              ) : (
                <>Open NowBuild.<br />Your Agents already prepared the next move.</>
              )}
            </h2>
          </div>
          <p className="max-w-lg text-base leading-8 text-ink-muted lg:justify-self-end">
            {isZh
              ? '选题、草稿、制作说明、发布材料和 Directory 任务都会按优先级进入工作台。原本数小时的准备，被压缩成每天约 30 分钟审核与判断。'
              : 'Topics, drafts, production briefs, publishing materials, and Directory tasks arrive by priority—turning hours of preparation into about 30 minutes of review and judgment.'}
          </p>
        </div>

        <div className="mt-12 overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-[0_20px_70px_rgba(13,16,17,0.07)]">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-zinc-200 px-5 py-4 sm:px-6">
            <p className="text-sm font-semibold text-ink">{isZh ? '今日执行摘要' : 'Today’s agent summary'}</p>
            <span className="text-xs text-ink-muted"><strong className="text-ink">6</strong> {isZh ? 'Agents 执行中' : 'Agents working'}</span>
            <span className="text-xs text-ink-muted"><strong className="text-ink">3</strong> {isZh ? '项等你审核' : 'items ready for you'}</span>
            <span className="text-xs text-ink-muted"><strong className="text-brand-700">8</strong> {isZh ? '项已自动完成' : 'tasks completed automatically'}</span>
            <span className="ml-auto flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.12em] text-zinc-400"><span className="h-2 w-2 animate-pulse-soft rounded-full bg-brand-500" />LIVE CAMPAIGN</span>
          </div>
          <div className="overflow-x-auto p-3">
          <div className="grid min-w-[980px] grid-cols-[.8fr_1fr_1.55fr_.8fr] gap-2">
            {columns.map((column, columnIndex) => (
              <article key={column.day} className={`min-h-[430px] rounded-[1.35rem] p-3 ${column.focus ? 'bg-ink text-white' : 'bg-paper-dim'}`}>
                <div className={`flex items-center justify-between border-b px-2 pb-3 pt-1 ${column.focus ? 'border-white/10' : 'border-zinc-200'}`}>
                  <span className={`font-mono text-[10px] font-semibold uppercase tracking-[.14em] ${column.focus ? 'text-brand-300' : 'text-brand-700'}`}>{column.label}</span>
                  <span className={`font-mono text-[9px] uppercase tracking-[.1em] ${column.focus ? 'text-zinc-500' : 'text-zinc-400'}`}>{column.day}</span>
                </div>
                <div className="mt-3 space-y-2">
                  {column.items.map((task, index) => (
                    <div key={task.id} className={`rounded-xl border p-3 ${column.focus ? 'border-white/10 bg-white/[0.055]' : 'border-zinc-200 bg-white'}`}>
                      <div className="flex items-center justify-between gap-3">
                        <span className={`text-[10px] font-medium uppercase tracking-[.08em] ${column.focus ? 'text-zinc-400' : 'text-zinc-500'}`}>{task.channelName}</span>
                        <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${column.focus && index === 0 ? 'bg-brand-300 text-black' : column.focus ? 'border border-white/15 text-zinc-500' : 'border border-zinc-200 text-zinc-400'}`}>
                          {column.focus && index === 0 ? '→' : '✓'}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className={`font-mono text-[8px] uppercase tracking-[.08em] ${column.focus ? 'text-zinc-500' : 'text-zinc-400'}`}>{agentFor(task.channelId)}</span>
                        <span className={`rounded-full px-2 py-1 text-[8px] font-semibold ${column.focus && index === 0 ? 'bg-brand-300 text-black' : column.focus ? 'bg-white/[0.07] text-zinc-300' : 'bg-brand-50 text-brand-800'}`}>{statusFor(columnIndex, index)}</span>
                      </div>
                      <p className={`mt-3 text-[13px] font-semibold leading-5 ${column.focus ? 'text-white' : 'text-ink'}`}>{task.title}</p>
                      {column.focus && task.brief && (
                        <p className="mt-2 line-clamp-3 text-[11px] leading-5 text-zinc-400">{task.brief}</p>
                      )}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-zinc-400">
          {isZh
            ? '同一份产品认知 · 同一个 Campaign 目标 · 草稿、进度与反馈始终在同一个上下文中'
            : 'One product memory · one campaign goal · drafts, status, and feedback stay in the same context'}
        </p>
      </div>
    </section>
  );
}
