import { redirect } from 'next/navigation';

/** Keep old bookmarks working without maintaining a second strategy UI. */
export default async function LegacyStrategyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/app/blueprint`);
}
