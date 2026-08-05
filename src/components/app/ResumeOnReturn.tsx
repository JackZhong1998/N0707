'use client';

import { useEffect, useRef } from 'react';
import { useGtm } from '@/lib/gtm/store';
import type { GtmStore } from '@/lib/gtm/types';

/** Ignore brief focus blips (alt-tab, app switcher, system overlays). */
const QUIET_SYNC_MS = 5_000;

/**
 * When the user returns after being away, pull the latest server store and
 * nudge the Campaign worker. Runs silently — the offline cron worker keeps
 * draining the queues either way, so there is nothing for the user to act on.
 */
export default function ResumeOnReturn() {
  const gtm = useGtm();
  const hiddenAtRef = useRef<number | null>(null);
  const syncingRef = useRef(false);
  const gtmRef = useRef(gtm);
  gtmRef.current = gtm;

  useEffect(() => {
    if (!gtm.hydrated || !gtm.remoteReady) return;

    const resume = async () => {
      if (syncingRef.current) return;
      const current = gtmRef.current;
      if (!current.hydrated || !current.remoteReady) return;

      syncingRef.current = true;

      try {
        let remotePaid = current.store.paid;
        // Signed-in free + paid users persist to Supabase. Anonymous sessions
        // stay local-only (401 from /api/gtm/state is ignored below).
        const stateResponse = await fetch('/api/gtm/state', {
          cache: 'no-store',
        });
        if (stateResponse.ok) {
          const payload = (await stateResponse.json()) as {
            store?: GtmStore;
            revision?: string;
          };
          if (payload.store) {
            current.adoptRemoteStore(payload.store, payload.revision);
            remotePaid = Boolean(payload.store.paid);
          }
        }

        // Paid users: kick the queue worker so unfinished Campaign / channel-plan
        // steps continue (server drains multiple steps per invocation).
        if (remotePaid) {
          await Promise.all([
            fetch('/api/gtm/campaign-jobs', { cache: 'no-store' }),
            fetch('/api/agents/channel-plans', { cache: 'no-store' }),
            fetch('/api/agents/work', { cache: 'no-store' }),
          ]);
        }
      } catch {
        // Ignored: the offline cron worker retries queued work on its own.
      } finally {
        syncingRef.current = false;
      }
    };

    const maybeResume = () => {
      const hiddenAt = hiddenAtRef.current;
      hiddenAtRef.current = null;
      if (hiddenAt == null) return;
      if (Date.now() - hiddenAt < QUIET_SYNC_MS) return;
      void resume();
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now();
        return;
      }
      maybeResume();
    };

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) void resume();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [gtm.hydrated, gtm.remoteReady]);

  return null;
}
