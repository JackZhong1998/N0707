import { notFound } from 'next/navigation';
import { getAdminAccess } from '@/lib/admin-access';

export default async function AgentTracesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await getAdminAccess();
  if (!access.admin) notFound();
  return children;
}
