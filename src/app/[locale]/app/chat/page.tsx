import { redirect } from 'next/navigation';

/** The right-side market partner is now the single conversation entrance. */
export default async function LegacyChatPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/app/calendar`);
}
