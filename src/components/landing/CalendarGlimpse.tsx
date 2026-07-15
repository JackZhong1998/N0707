import { getLocale } from 'next-intl/server';

/** 产品一瞥：周日历静态示意（纯排版，无截图） */
export default async function CalendarGlimpse() {
  const locale = await getLocale();
  const isZh = locale === 'zh';

  const days = isZh
    ? ['周一', '周二', '周三', '周四', '周五']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  const cells: Array<Array<{ ch: string; t: string }>> = [
    [{ ch: isZh ? '小红书' : 'XHS', t: isZh ? '创始人自我介绍帖' : 'Founder intro post' }, { ch: isZh ? '官网' : 'Site', t: isZh ? '重写 Hero 文案' : 'Rewrite hero copy' }],
    [{ ch: isZh ? '小红书' : 'XHS', t: isZh ? '「为什么离开大厂」' : 'Why I quit story' }, { ch: isZh ? '朋友圈' : 'WeChat', t: isZh ? '官宣产品启动' : 'Launch announcement' }],
    [{ ch: isZh ? '小红书' : 'XHS', t: isZh ? '行业痛点观察帖' : 'Pain-point post' }, { ch: 'X', t: isZh ? 'Build in public #1' : 'Build in public #1' }],
    [{ ch: isZh ? '私域' : 'DM', t: isZh ? '私信 10 位种子用户' : 'DM 10 seed users' }],
    [{ ch: isZh ? '小红书' : 'XHS', t: isZh ? '30 天实验开篇' : '30-day experiment' }, { ch: 'X', t: isZh ? '回复 5 条大 V 推文' : 'Reply to 5 builders' }],
  ];

  return (
    <section className="border-t border-hairline bg-white">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="index-label">{isZh ? '产品' : 'The product'}</p>
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              {isZh ? '每天打开，就知道今天做什么' : 'Open it. Know exactly what to do today.'}
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-ink-muted">
            {isZh
              ? '30 天行动日历：每条任务都有编写方向和已备好的内容初稿，点开就能过稿、发布。'
              : 'A 30-day action calendar. Every task ships with a brief and a ready draft — review, tweak, publish.'}
          </p>
        </div>

        <div className="mt-12 overflow-x-auto">
          <div className="grid min-w-[720px] grid-cols-5 gap-px border border-hairline bg-hairline">
            {days.map((d, i) => (
              <div key={d} className="bg-paper-dim px-4 py-3">
                <span className="index-label">{d}</span>
                <span className="ml-2 text-xs text-zinc-300">{String(i + 1).padStart(2, '0')}</span>
              </div>
            ))}
            {cells.map((cell, i) => (
              <div key={i} className="min-h-44 space-y-2 bg-white p-3">
                {cell.map((item, j) => (
                  <div key={j} className="border border-hairline p-3">
                    <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-400">
                      {item.ch}
                    </span>
                    <p className="mt-1.5 text-[13px] font-medium leading-snug text-ink">{item.t}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
