import { create } from 'zustand';

type State = {
  open: boolean;
  /** Panel açılırken seçilecek ana kategori id (bir kez uygulanır) */
  preselectMainCategoryId: number | null;
  /** opts verilmezse veya mainCategoryId yoksa ön seçim temizlenir */
  openPanel: (opts?: { mainCategoryId?: number | null }) => void;
  closePanel: () => void;
  togglePanel: () => void;
  clearPreselect: () => void;
};

export const useCategoryExpertPanelStore = create<State>((set) => ({
  open: false,
  preselectMainCategoryId: null,
  openPanel: (opts) =>
    set({
      open: true,
      preselectMainCategoryId: opts?.mainCategoryId ?? null,
    }),
  closePanel: () => set({ open: false, preselectMainCategoryId: null }),
  togglePanel: () => set((s) => ({ open: !s.open })),
  clearPreselect: () => set({ preselectMainCategoryId: null }),
}));
