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

  return (
    <section className="bg-paper-dim">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid items-end gap-8 lg:grid-cols-[1.2fr_.8fr]">
          <div className="max-w-3xl">
            <p className="index-label">{isZh ? '每天打开，都有事可做' : 'Your team’s daily output'}</p>
            <h2 className="mt-5 font-[family-name:var(--font-display)] text-4xl font-bold leading-[1.02] tracking-[-0.045em] text-ink sm:text-5xl">
              {isZh ? (
                <>打开 NowBuild，<br />今天该做什么，一目了然。</>
              ) : (
                <>Open NowBuild.<br />The next move is ready.</>
              )}
            </h2>
          </div>
          <p className="max-w-lg text-base leading-8 text-ink-muted lg:justify-self-end">
            {isZh
              ? '每项任务都写清渠道、目标和安排它的理由，草稿或制作说明也已备好。原本数小时的准备工作，浓缩成每天约 30 分钟的审核与决策。'
              : 'Every task arrives with a channel, goal, finished draft or production brief—and why it matters today. Hours of preparation become about 30 minutes of review and decisions.'}
          </p>
        </div>

        <div className="mt-12 overflow-x-auto rounded-[2rem] border border-zinc-200 bg-white p-3 shadow-[0_20px_70px_rgba(13,16,17,0.07)]">
          <div className="grid min-w-[980px] grid-cols-[.8fr_1fr_1.55fr_.8fr] gap-2">
            {columns.map((column) => (
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

        <p className="mt-5 text-center text-xs text-zinc-400">
          {isZh
            ? '工作台示例 · 完整计划覆盖 30 天 · 草稿、进度与反馈始终围绕同一套策略'
            : 'Product workspace example · the full campaign spans 30 days · drafts, status, and feedback stay in one context'}
        </p>
      </div>
    </section>
  );
}
