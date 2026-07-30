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
    if (!hydrated || !store.launch || store.paid) return;
    const rawPhase = store.launch.project.phase;
    const failedResearch =
      rawPhase === 'researching' &&
      (store.launch.project.status === 'paused' ||
        store.launch.researchProgress.some((step) => step.status === 'error'));
    if (failedResearch) return;
    const shouldOpenBrief =
      Boolean(store.launch.brief) &&
      (rawPhase === 'brief_ready' ||
        ['building_team', 'blueprint_ready', 'active', 'completed'].includes(
          rawPhase
        ));
    if (shouldOpenBrief) {
      router.replace('/app/documents');
    }
  }, [hydrated, router, store.launch, store.paid]);

  if (!store.launch) return <LaunchOnboarding />;

  const rawPhase = store.launch.project.phase;
  const phase =
    !store.paid &&
    store.launch.brief &&
    ['building_team', 'blueprint_ready', 'active', 'completed'].includes(rawPhase)
      ? 'brief_ready'
      : rawPhase;
  if (phase === 'brief_ready' && !store.paid) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <p className="text-sm text-zinc-500">
          {isZh ? '正在打开文档…' : 'Opening documents…'}
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
