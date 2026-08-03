import { redirect } from 'next/navigation';

/** Legacy route kept only so old checkout sessions and bookmarks never 404. */
export default async function LegacyLaunchBriefPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/app/documents/recommendations`);
}
