'use client';

import { useEffect } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import LaunchOnboarding from '@/components/app/launch/LaunchOnboarding';
import LaunchProgress from '@/components/app/launch/LaunchProgress';
import LaunchCommandCenter from '@/components/app/launch/LaunchCommandCenter';
import { useGtm } from '@/lib/gtm/store';

export default function AppIndexPage() {
  const { store, hydrated } = useGtm();
  const router = useRouter();
  const isZh = useLocale() !== 'en';

  useEffect(() => {
    if (!hydrated || !store.launch) return;
    if (store.launch.project.phase === 'brief_ready' && !store.paid) {
      router.replace('/app/brief');
    }
  }, [hydrated, router, store.launch, store.paid]);

  if (!store.launch) return <LaunchOnboarding />;

  const phase = store.launch.project.phase;
  if (phase === 'brief_ready' && !store.paid) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <p className="text-sm text-zinc-500">
          {isZh ? '正在打开 Launch Brief…' : 'Opening Launch Brief…'}
        </p>
      </div>
    );
  }
  if (phase === 'researching' || phase === 'building_team' || phase === 'blueprint_ready') {
    return <LaunchProgress launch={store.launch} />;
  }
  if (['active', 'completed'].includes(phase)) {
    return <LaunchCommandCenter />;
  }
  return <LaunchProgress launch={store.launch} />;
}
