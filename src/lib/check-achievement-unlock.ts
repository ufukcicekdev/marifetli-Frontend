import api from '@/src/lib/api';
import { useAchievementUnlockStore } from '@/src/stores/achievement-unlock-store';

/**
 * Son 2 dakikada açılan başarı varsa modalı gösterir.
 * Soru/cevap oluşturma vb. işlemlerden sonra çağrılır.
 */
export async function checkRecentAchievementUnlock(): Promise<void> {
  try {
    const { data } = await api.getRecentAchievementUnlock();
    if (data?.unlocked) {
      useAchievementUnlockStore.getState().setFromApi(data.unlocked);
    }
  } catch {
    // Giriş yok veya API hatası — sessizce geç
  }
}
