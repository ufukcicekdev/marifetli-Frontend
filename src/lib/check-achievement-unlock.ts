import api from '@/src/lib/api';
import { queryClient } from '@/src/lib/query-client';
import { gamificationRoadmapQueryKey } from '@/src/components/gamification-motivation-strip';
import {
  useAchievementUnlockStore,
  type AchievementUnlockPayload,
  type BadgeUnlockPayload,
} from '@/src/stores/achievement-unlock-store';

/**
 * Son 2 dakikada açılan başarı veya itibar rozeti varsa modalı gösterir.
 * Yoksa ölçülebilir başarı ilerlemesinde eşik (25/50/75/90/95) geçildiyse toast gösterir.
 * Soru/cevap / tasarım vb. işlemlerden sonra veya periyodik poller ile çağrılır.
 */
export async function checkRecentAchievementUnlock(): Promise<void> {
  try {
    const { data } = await api.getRecentAchievementUnlock();
    const badge = data?.badge_unlocked;
    if (badge) {
      useAchievementUnlockStore.getState().setFromApi({ ...badge, kind: 'badge' } as BadgeUnlockPayload);
      void queryClient.invalidateQueries({ queryKey: gamificationRoadmapQueryKey });
      return;
    }
    const unlocked = data?.unlocked;
    if (unlocked) {
      const kind = unlocked.kind === 'achievement' || unlocked.kind === undefined ? 'achievement' : unlocked.kind;
      useAchievementUnlockStore.getState().setFromApi({
        ...unlocked,
        kind: kind === 'badge' ? 'badge' : 'achievement',
      } as AchievementUnlockPayload | BadgeUnlockPayload);
      void queryClient.invalidateQueries({ queryKey: gamificationRoadmapQueryKey });
      return;
    }

    const { data: prog } = await api.getProgressNudge();
    const nudge = prog?.nudge;
    if (nudge?.kind === 'progress' && nudge.hint) {
      const { showProgressNudgeToast } = await import('@/src/components/progress-nudge-toast');
      showProgressNudgeToast(nudge);
      void queryClient.invalidateQueries({ queryKey: gamificationRoadmapQueryKey });
    }
  } catch {
    // Giriş yok veya API hatası — sessizce geç
  }
}
