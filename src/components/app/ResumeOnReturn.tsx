'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { useGtm } from '@/lib/gtm/store';
import type { GtmStore } from '@/lib/gtm/types';

/**
 * Ignore brief focus blips (alt-tab, app switcher, system overlays). Only
 * surface a sync banner after a meaningful away period.
 */
const AWAY_MS = 60_000;
const QUIET_SYNC_MS = 5_000;

type BannerState = {
  message: string;
  status: 'syncing' | 'ok' | 'error';
};

/**
 * When the user returns after being away, pull the latest server store and
 * nudge the Campaign worker. Short app switches sync quietly; long absences
 * show a brief status toast.
 */
export default function ResumeOnReturn() {
  const gtm = useGtm();
  const locale = useLocale();
  const isZh = locale !== 'en';
  const hiddenAtRef = useRef<number | null>(null);
  const syncingRef = useRef(false);
  const gtmRef = useRef(gtm);
  gtmRef.current = gtm;
  const [banner, setBanner] = useState<BannerState | null>(null);

  useEffect(() => {
    if (!gtm.hydrated || !gtm.remoteReady) return;

    const resume = async (showBanner: boolean) => {
      if (syncingRef.current) return;
      const current = gtmRef.current;
      if (!current.hydrated || !current.remoteReady) return;

      syncingRef.current = true;
      if (showBanner) {
        setBanner({
          status: 'syncing',
          message: isZh
            ? '正在同步最新进度…'
            : 'Syncing latest progress…',
        });
      }

      try {
        let remotePaid = current.store.paid;
        // Free tier state lives in the browser write-ahead cache until checkout.
        // Pulling an empty Supabase snapshot would erase in-progress research.
        if (remotePaid) {
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
        }

        // Paid users: kick the queue worker so unfinished Campaign steps
        // continue (server drains multiple steps per invocation).
        if (remotePaid) {
          await fetch('/api/gtm/campaign-jobs', { cache: 'no-store' });
        }

        if (showBanner) {
          setBanner({
            status: 'ok',
            message: isZh ? '已同步最新进度' : 'Latest progress synced',
          });
        }
      } catch {
        setBanner({
          status: 'error',
          message: isZh
            ? '同步失败，请刷新页面重试'
            : 'Sync failed — refresh the page to retry',
        });
      } finally {
        syncingRef.current = false;
        if (showBanner) {
          window.setTimeout(() => setBanner(null), 4_500);
        }
      }
    };

    const maybeResume = () => {
      const hiddenAt = hiddenAtRef.current;
      hiddenAtRef.current = null;
      if (hiddenAt == null) return;
      const awayMs = Date.now() - hiddenAt;
      if (awayMs < QUIET_SYNC_MS) return;
      void resume(awayMs >= AWAY_MS);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now();
        return;
      }
      maybeResume();
    };

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) void resume(true);
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [gtm.hydrated, gtm.remoteReady, isZh]);

  if (!banner) return null;

  return (
    <div className="fixed right-4 top-16 z-40 w-[min(340px,calc(100vw-2rem))] rounded-2xl bg-ink px-4 py-3 text-white shadow-[0_8px_30px_rgba(0,0,0,0.18)]">
      <div className="flex items-center gap-3">
        <span
          className={`h-3 w-3 shrink-0 rounded-full ${
            banner.status === 'error'
              ? 'bg-rose-400'
              : banner.status === 'ok'
                ? 'bg-emerald-400'
                : 'animate-pulse bg-white'
          }`}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">{banner.message}</p>
          {banner.status === 'error' && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-1 text-[10px] text-zinc-300 underline underline-offset-2"
            >
              {isZh ? '刷新页面' : 'Refresh page'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
