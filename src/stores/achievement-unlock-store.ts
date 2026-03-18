import { create } from 'zustand';

export interface UnlockedAchievement {
  id: number;
  name: string;
  description: string;
  code: string;
  icon: string;
  unlocked_at: string;
}

interface AchievementUnlockState {
  /** Gösterilecek son açılan başarı (modal açık) */
  pending: UnlockedAchievement | null;
  /** Aynı başarıyı tekrar göstermemek için son gösterilen id */
  lastShownId: number | null;
  show: (achievement: UnlockedAchievement) => void;
  dismiss: () => void;
  /** recent-unlock API'den gelen veriyi işle; daha önce gösterilmediyse show çağır */
  setFromApi: (unlocked: UnlockedAchievement | null) => void;
}

export const useAchievementUnlockStore = create<AchievementUnlockState>((set, get) => ({
  pending: null,
  lastShownId: null,
  show: (achievement) => set({ pending: achievement, lastShownId: achievement.id }),
  dismiss: () => set({ pending: null }),
  setFromApi: (unlocked) => {
    if (!unlocked) return;
    const { lastShownId } = get();
    if (lastShownId === unlocked.id) return;
    set({ pending: unlocked, lastShownId: unlocked.id });
  },
}));
