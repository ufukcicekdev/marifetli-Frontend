'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/src/stores/auth-store';
import { checkRecentAchievementUnlock } from '@/src/lib/check-achievement-unlock';

/**
 * Başka kullanıcıların eylemleriyle (ör. beğeni) kazanılan rozetler için periyodik kontrol.
 */
export function RecentUnlockPoller() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const tick = () => {
      void checkRecentAchievementUnlock();
    };
    intervalRef.current = setInterval(tick, 120_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void tick();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [isAuthenticated]);

  return null;
}
