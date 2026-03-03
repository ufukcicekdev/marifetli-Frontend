import { create } from 'zustand';

type AuthTab = 'login' | 'register' | 'forgot';

interface AuthModalState {
  isOpen: boolean;
  tab: AuthTab;
  open: (tab?: AuthTab) => void;
  close: () => void;
  setTab: (tab: AuthTab) => void;
}

export const useAuthModalStore = create<AuthModalState>((set) => ({
  isOpen: false,
  tab: 'login',
  open: (tab = 'login') => set({ isOpen: true, tab }),
  close: () => set({ isOpen: false }),
  setTab: (tab) => set({ tab }),
}));
