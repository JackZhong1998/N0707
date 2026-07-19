import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export default async function ClosingCta() {
  const locale = await getLocale();
  const isZh = locale === 'zh';

  return (
    <section className="bg-white px-3 pb-3 sm:px-4 sm:pb-4">
      <div className="mx-auto max-w-[1500px] rounded-[2rem] bg-[#0a0a0a] px-5 py-24 text-center sm:px-12 sm:py-32">
        <p className="index-label !text-zinc-500">{isZh ? '现在' : 'Now'}</p>
        <h2 className="display-tight mx-auto mt-6 max-w-3xl font-[family-name:var(--font-display)] text-4xl font-bold text-white sm:text-5xl lg:text-6xl">
          {isZh ? '面向用户，成为乔布斯' : 'Build for users. Be Steve Jobs.'}
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
          {isZh
            ? '一个很好的产品，值得被一群与你共鸣的人看见。'
            : 'A great product deserves to be seen by people who truly resonate with you.'}
        </p>
        <div className="mt-10 flex justify-center">
          <Link
            href="/sign-in"
            className="inline-flex h-13 items-center rounded-full bg-white px-9 text-[15px] font-semibold text-black transition-colors hover:bg-zinc-200"
          >
            {isZh ? '开启 30 天获客行动' : 'Start your 30-day customer acquisition plan'}
          </Link>
        </div>
      </div>
    </section>
  );
}
