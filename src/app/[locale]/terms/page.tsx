import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Navbar from '@/components/Navbar';
import Footer from '@/components/landing/Footer';
import { localePath, languageAlternates } from '@/lib/seo';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata.terms' });
  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: localePath(locale, '/terms'),
      languages: languageAlternates('/terms'),
    },
  };
}

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'Terms' });

  const sections = Array.from({ length: 13 }, (_, i) => ({
    title: t(`sections.${i}.title`),
    content: t(`sections.${i}.content`),
  }));

  return (
    <>
      <Navbar />
      <main className="bg-white">
        <article className="py-16 sm:py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <header className="mb-12 text-center">
              <h1 className="font-display text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                {t('title')}
              </h1>
              <p className="mt-3 text-sm text-gray-500">{t('lastUpdated')}</p>
            </header>

            <div className="space-y-10">
              {sections.map((section, i) => (
                <section key={i}>
                  <h2 className="font-display text-xl font-bold text-gray-900">
                    {section.title}
                  </h2>
                  <div className="mt-3 space-y-3 text-base leading-relaxed text-gray-600">
                    {section.content.split('\n\n').map((para, j) => (
                      <p key={j} className="whitespace-pre-line">{para}</p>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
