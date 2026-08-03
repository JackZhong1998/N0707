import { redirect } from 'next/navigation';

/** Legacy route: the channel mix now lives inside the Market Strategy Report. */
export default async function LegacyChannelRecommendationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/app/documents/recommendations`);
}
