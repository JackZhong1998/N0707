import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Navbar from '@/components/Navbar';
import Footer from '@/components/landing/Footer';
import { Link } from '@/i18n/navigation';
import { buildAbsoluteUrl, localePath, languageAlternates } from '@/lib/seo';
import { BRAND_MISSION } from '@/lib/brand';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata.about' });
  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: localePath(locale, '/about'),
      languages: languageAlternates('/about'),
    },
  };
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'About' });
  const isZh = locale === 'zh';

  const homeUrl = buildAbsoluteUrl(localePath(locale));
  const aboutUrl = buildAbsoluteUrl(localePath(locale, '/about'));
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'AboutPage',
        '@id': `${aboutUrl}#webpage`,
        url: aboutUrl,
        name: t('title'),
        description: t('subtitle'),
        inLanguage: locale === 'zh' ? 'zh-CN' : 'en',
        isPartOf: {
          '@type': 'WebSite',
          '@id': `${homeUrl}#website`,
          url: homeUrl,
          name: 'NowBuild',
        },
        about: {
          '@type': 'Organization',
          '@id': `${buildAbsoluteUrl('/')}#organization`,
          name: 'NowBuild',
          url: buildAbsoluteUrl('/'),
        },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${aboutUrl}#breadcrumb`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: locale === 'zh' ? '首页' : 'Home',
            item: homeUrl,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: t('title'),
            item: aboutUrl,
          },
        ],
      },
    ],
  };

  const values = Array.from({ length: 4 }, (_, i) => ({
    title: t(`values.items.${i}.title`),
    description: t(`values.items.${i}.description`),
  }));

  const valueIcons = [
    <svg key="dev" className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" /></svg>,
    <svg key="ship" className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" /></svg>,
    <svg key="open" className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    <svg key="quality" className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>,
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <Navbar />
      <main className="bg-white">
        {/* Hero */}
        <section className="relative overflow-hidden bg-night py-24 text-white sm:py-32">
          <div className="bg-grid-dark absolute inset-0 opacity-60" aria-hidden />
          <div className="absolute left-1/2 top-0 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-brand-500/10 blur-[150px]" aria-hidden />
          <div className="relative mx-auto max-w-5xl px-5 text-center sm:px-8">
            <p className="font-mono text-xs uppercase tracking-[.18em] text-brand-300">{t('title')}</p>
            <h1 className="mx-auto mt-7 font-[family-name:var(--font-display)] text-5xl font-bold leading-[.96] tracking-[-.055em] text-white sm:text-7xl">
              {BRAND_MISSION}
            </h1>
            <p className="mx-auto mt-7 max-w-3xl text-lg leading-8 text-zinc-300">{t('subtitle')}</p>
          </div>
        </section>

        {/* Story */}
        <section className="py-16">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <h2 className="font-display text-2xl font-bold text-gray-900">
              {t('story.title')}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-gray-600">
              {t('story.content')}
            </p>
          </div>
        </section>

        {/* Mission */}
        <section className="bg-surface py-20 sm:py-24">
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            <p className="index-label">{isZh ? '我们想做成的事' : 'Our brand mission'}</p>
            <h2 className="mt-5 max-w-3xl font-display text-3xl font-bold text-gray-900 sm:text-4xl">
              {t('mission.title')}
            </h2>
            <p className="mt-5 max-w-3xl text-base leading-8 text-gray-600">
              {t('mission.content')}
            </p>

            <div className="mt-10 grid gap-3 md:grid-cols-3">
              {[
                {
                  step: '01',
                  title: isZh ? 'Build your product.' : 'Build your product.',
                  detail: isZh ? '从真实问题出发，做出真正有人愿意使用的软件。' : 'Turn a real problem into software people can use.',
                },
                {
                  step: '02',
                  title: isZh ? 'Build your market.' : 'Build your market.',
                  detail: isZh ? '持续走近用户、验证需求，捕捉最早的产品市场契合信号。' : 'Reach users, test demand, and find the earliest PMF signals.',
                },
                {
                  step: '03',
                  title: isZh ? 'Build your business.' : 'Build your business.',
                  detail: isZh ? '让产品、用户反馈与商业结果彼此推动，形成可持续的循环。' : 'Turn product, market feedback, and revenue into a repeatable loop.',
                },
              ].map((item, index) => (
                <article key={item.step} className={`rounded-[1.5rem] p-6 ${index === 1 ? 'bg-ink text-white' : 'border border-zinc-200 bg-white'}`}>
                  <span className={`font-mono text-[10px] font-semibold ${index === 1 ? 'text-brand-300' : 'text-brand-700'}`}>{item.step}</span>
                  <h3 className={`mt-7 text-xl font-semibold ${index === 1 ? 'text-white' : 'text-ink'}`}>{item.title}</h3>
                  <p className={`mt-3 text-sm leading-6 ${index === 1 ? 'text-zinc-400' : 'text-ink-muted'}`}>{item.detail}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-12 text-center font-display text-2xl font-bold text-gray-900 sm:text-3xl">
              {t('values.title')}
            </h2>
            <div className="grid gap-8 sm:grid-cols-2">
              {values.map((value, i) => (
                <div key={i} className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                    {valueIcons[i]}
                  </div>
                  <h3 className="font-display text-lg font-bold text-gray-900">{value.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500">{value.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-gray-100 bg-surface py-16 sm:py-24">
          <div className="mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="font-display text-2xl font-bold text-gray-900 sm:text-3xl">
              {t('cta.title')}
            </h2>
            <p className="mt-4 text-gray-500">{t('cta.description')}</p>
            <Link
              href="/sign-up"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-primary-600/25 transition-all hover:bg-primary-700"
            >
              {t('cta.button')}
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
