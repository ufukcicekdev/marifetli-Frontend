import { create } from 'zustand';

type Tab = 'general' | 'personal';

interface GamificationRoadmapModalState {
  open: boolean;
  /** Açılışta hangi sekme (misafirde yalnızca genel kullanılır) */
  initialTab: Tab;
  openModal: (opts?: { tab?: Tab }) => void;
  closeModal: () => void;
}

export const useGamificationRoadmapModalStore = create<GamificationRoadmapModalState>((set) => ({
  open: false,
  initialTab: 'general',
  openModal: (opts) =>
    set({
      open: true,
      initialTab: opts?.tab ?? 'general',
    }),
  closeModal: () => set({ open: false }),
}));
