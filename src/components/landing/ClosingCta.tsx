import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export default async function ClosingCta() {
  const locale = await getLocale();
  const isZh = locale === 'zh';

  return (
    <section className="border-t border-hairline bg-[#0a0a0a]">
      <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
        <p className="index-label !text-zinc-500">{isZh ? '现在' : 'Now'}</p>
        <h2 className="display-tight mt-6 max-w-3xl font-[family-name:var(--font-display)] text-4xl font-bold text-white sm:text-6xl">
          {isZh ? '你打着灯，我们一起去找那群人。' : 'Carry the light. Find your people.'}
        </h2>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-zinc-400">
          {isZh
            ? '一个很好的产品，值得被一群与你共鸣的人看见。接下来 30 天，每天知道该做什么。'
            : 'A product this good deserves to be found. For the next 30 days, you will know exactly what to do — every single day.'}
        </p>
        <div className="mt-10">
          <Link
            href="/sign-in"
            className="inline-flex h-12 items-center bg-white px-8 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
          >
            {isZh ? '开始 30 天冷启动' : 'Start your 30-day launch'}
          </Link>
        </div>
      </div>
    </section>
  );
}
