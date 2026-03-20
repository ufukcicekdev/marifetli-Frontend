import { create } from 'zustand';

export type UnlockPending = AchievementUnlockPayload | BadgeUnlockPayload;

export interface AchievementUnlockPayload {
  kind?: 'achievement';
  id: number;
  name: string;
  description: string;
  code: string;
  icon: string;
  unlocked_at: string;
}

export interface BadgeUnlockPayload {
  kind: 'badge';
  id: number;
  slug: string;
  name: string;
  description: string;
  icon: string;
  icon_svg: string;
  unlocked_at: string;
}

interface AchievementUnlockState {
  pending: UnlockPending | null;
  lastShownKey: string | null;
  show: (payload: UnlockPending) => void;
  dismiss: () => void;
  setFromApi: (payload: UnlockPending | null) => void;
}

function normalizeKey(payload: UnlockPending): string {
  const kind = payload.kind === 'badge' ? 'badge' : 'achievement';
  return `${kind}-${payload.id}`;
}

export const useAchievementUnlockStore = create<AchievementUnlockState>((set, get) => ({
  pending: null,
  lastShownKey: null,
  show: (payload) =>
    set({
      pending: { ...payload, kind: payload.kind === 'badge' ? 'badge' : 'achievement' } as UnlockPending,
      lastShownKey: normalizeKey(payload),
    }),
  dismiss: () => set({ pending: null }),
  setFromApi: (payload) => {
    if (!payload) return;
    const key = normalizeKey(payload);
    if (get().lastShownKey === key) return;
    set({
      pending: { ...payload, kind: payload.kind === 'badge' ? 'badge' : 'achievement' } as UnlockPending,
      lastShownKey: key,
    });
  },
}));
