import { redirect } from 'next/navigation';

/** Topics are now managed inside Channel Agents and the launch calendar. */
export default async function LegacyTopicsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/app/channels`);
}
