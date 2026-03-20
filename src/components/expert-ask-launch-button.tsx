'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/src/lib/api';
import { useAuthStore } from '@/src/stores/auth-store';
import { useCategoryExpertPanelStore } from '@/src/stores/category-expert-panel-store';

type Props = {
  className?: string;
  children?: React.ReactNode;
  title?: string;
  /** Opsiyonel: belirli ana kategori ile panel aç */
  mainCategoryId?: number | null;
  /** Panel açıldıktan sonra (ör. mobilde sidebar kapat) */
  onOpen?: () => void;
};

/**
 * Görünür yalnızca kategori uzmanı açık + backend hazırsa. Tıklanınca sağ paneli açar.
 */
export function ExpertAskLaunchButton({ className, children, title, mainCategoryId, onOpen }: Props) {
  const { user } = useAuthStore();
  const openPanel = useCategoryExpertPanelStore((s) => s.openPanel);

  const { data: cfg } = useQuery({
    queryKey: ['category-experts-config', user?.id ?? 'anon'],
    queryFn: () => api.getCategoryExpertsConfig(),
    staleTime: 60_000,
  });

  if (!cfg?.enabled || !cfg?.backend_ready) {
    return null;
  }

  return (
    <button
      type="button"
      title={title}
      onClick={() => {
        if (mainCategoryId != null) openPanel({ mainCategoryId });
        else openPanel();
        onOpen?.();
      }}
      className={className}
    >
      {children ?? 'Uzmana sor'}
    </button>
  );
}
