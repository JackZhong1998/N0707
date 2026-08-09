import { redirect } from 'next/navigation';

export default async function LegacyBlueprintPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/app/documents/recommendations`);
}
