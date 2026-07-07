import type { Metadata } from 'next';
import { GtmProvider } from '@/lib/gtm/storage';
import WorkspaceSidebar from '@/components/gtm/WorkspaceSidebar';

// Private, logged-in product area: keep out of search indexes.
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <GtmProvider>
      <div className="flex min-h-screen bg-gray-50">
        <WorkspaceSidebar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </GtmProvider>
  );
}
