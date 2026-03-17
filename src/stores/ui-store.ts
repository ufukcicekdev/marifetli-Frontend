import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

/** Topluluklar sayfasında seçilen kategori → header arama scope'u (persist edilmez) */
export type PageSearchScope =
  | { type: 'category'; slug: string }
  | { type: 'community'; slug: string }
  | null;

interface UIState {
  theme: Theme;
  sidebarOpen: boolean;
  /** Sadece /topluluklar sayfasında kullanılır; seçilen kategori/topluluk header aramada scope olur */
  pageSearchScope: PageSearchScope;
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setPageSearchScope: (scope: PageSearchScope) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'light',
      sidebarOpen: true,
      pageSearchScope: null,
      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setPageSearchScope: (scope) => set({ pageSearchScope: scope }),
    }),
    { name: 'marifetli-ui', partialize: (s) => ({ theme: s.theme, sidebarOpen: s.sidebarOpen }) }
  )
);
