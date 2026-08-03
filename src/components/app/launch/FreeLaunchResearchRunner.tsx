'use client';

import { useEffect, useRef } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useGtm } from '@/lib/gtm/store';
import {
  isFreeLaunchResearchInFlight,
  needsFreeMarketStrategyReport,
  needsFreeLaunchResearchResume,
  runFreeMarketStrategyReport,
  runFreeLaunchResearch,
} from '@/lib/gtm/free-launch-research';

/**
 * Keeps free-tier product research alive when the onboarding form unmounts,
 * the tab is backgrounded, or the user returns after a short absence.
 */
export default function FreeLaunchResearchRunner() {
  const gtm = useGtm();
  const locale = useLocale();
  const isZh = locale !== 'en';
  const router = useRouter();
  const activeLaunchIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!gtm.hydrated || gtm.store.paid || gtm.accessStatus === 'checking') return;

    const launch = gtm.store.launch;
    const resumeResearch = needsFreeLaunchResearchResume(launch);
    const resumeReport = needsFreeMarketStrategyReport(launch);
    if (!resumeResearch && !resumeReport) {
      activeLaunchIdRef.current = null;
      return;
    }

    const launchId = launch!.project.id;
    if (activeLaunchIdRef.current === launchId || isFreeLaunchResearchInFlight(launchId)) {
      return;
    }

    activeLaunchIdRef.current = launchId;
    const task = resumeResearch
      ? runFreeLaunchResearch({ launch: launch!, locale, isZh, gtm })
      : runFreeMarketStrategyReport({ launch: launch!, locale, isZh, gtm });
    void task
      .then(() => {
        if (activeLaunchIdRef.current === launchId) {
          router.replace('/app/documents/recommendations');
        }
      })
      .catch((error) => {
        console.error('Free launch research failed:', error);
      })
      .finally(() => {
        if (activeLaunchIdRef.current === launchId) {
          activeLaunchIdRef.current = null;
        }
      });
  }, [
    gtm,
    gtm.hydrated,
    gtm.store.launch,
    gtm.store.paid,
    gtm.accessStatus,
    isZh,
    locale,
    router,
  ]);

  return null;
}
