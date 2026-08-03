'use client';

import { useEffect } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import LaunchOnboarding from '@/components/app/launch/LaunchOnboarding';
import LaunchProgress from '@/components/app/launch/LaunchProgress';
import { useGtm } from '@/lib/gtm/store';

export default function AppIndexPage() {
  const { store, hydrated } = useGtm();
  const router = useRouter();
  const isZh = useLocale() !== 'en';

  useEffect(() => {
    if (!hydrated || !store.launch) return;

    // Todos already generated → land on calendar.
    if (store.todos.length > 0) {
      router.replace('/app/calendar');
      return;
    }

    if (store.paid) {
      if (
        store.launch.project.phase === 'strategy_report_ready' &&
        store.launch.channelRecommendations
      ) {
        router.replace('/app/documents/recommendations');
        return;
      }
      if (
        ['active', 'completed', 'blueprint_ready'].includes(
          store.launch.project.phase
        )
      ) {
        router.replace('/app/calendar');
      }
      return;
    }

    const rawPhase = store.launch.project.phase;
    if (
      rawPhase === 'strategy_report_ready' &&
      store.launch.channelRecommendations
    ) {
      router.replace('/app/documents/recommendations');
      return;
    }
    const failedResearch =
      rawPhase === 'researching' &&
      (store.launch.project.status === 'paused' ||
        store.launch.researchProgress.some((step) => step.status === 'error'));
    if (failedResearch) return;
    const shouldOpenDocs =
      Boolean(store.launch.brief) &&
      (rawPhase === 'brief_ready' ||
        ['building_team', 'blueprint_ready', 'active', 'completed'].includes(
          rawPhase
        ));
    if (shouldOpenDocs) {
      router.replace('/app/documents/project');
    }
  }, [hydrated, router, store.launch, store.paid, store.todos.length]);

  if (!store.launch) return <LaunchOnboarding />;

  if (store.todos.length > 0) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <p className="text-sm text-zinc-500">
          {isZh ? '正在打开日历…' : 'Opening calendar…'}
        </p>
      </div>
    );
  }

  const rawPhase = store.launch.project.phase;
  if (
    rawPhase === 'strategy_report_ready' &&
    store.launch.channelRecommendations
  ) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <p className="text-sm text-zinc-500">
          {isZh ? '正在打开市场策略报告…' : 'Opening your market strategy report…'}
        </p>
      </div>
    );
  }
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
          {isZh ? '正在打开项目文档…' : 'Opening project document…'}
        </p>
      </div>
    );
  }
  if (phase === 'researching' || phase === 'building_team' || phase === 'blueprint_ready') {
    return <LaunchProgress launch={store.launch} />;
  }
  if (['active', 'completed'].includes(phase)) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <p className="text-sm text-zinc-500">
          {isZh ? '正在打开日历…' : 'Opening calendar…'}
        </p>
      </div>
    );
  }
  return <LaunchProgress launch={store.launch} />;
}
