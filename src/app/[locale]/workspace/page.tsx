'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useLocale } from 'next-intl';
import { useGtm } from '@/lib/gtm/storage';

export default function WorkspaceIndexPage() {
  const router = useRouter();
  const { state, hydrated } = useGtm();

  useEffect(() => {
    if (!hydrated) return;
    if (!state.onboardingCompleted) {
      router.replace('/workspace/onboarding');
    } else if (state.phase === 'execution' || state.phase === 'review') {
      router.replace('/workspace/marketing/today');
    } else if (
      state.phase === 'confirm' ||
      state.phase === 'strategy' ||
      state.phase === 'calendar'
    ) {
      router.replace('/workspace/marketing/confirm');
    } else {
      router.replace('/workspace/marketing');
    }
  }, [hydrated, state, router]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center text-gray-400">
      Loading...
    </div>
  );
}
