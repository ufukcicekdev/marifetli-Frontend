'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/src/lib/api';

/** Uygulama açıldığında kategorileri cache'e yükler; topic/sidebar vb. sayfalarda anında gelir. */
export function CategoriesPrefetcher() {
  const queryClient = useQueryClient();
  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: ['categories'],
      queryFn: () => api.getCategories().then((r) => r.data),
    });
  }, [queryClient]);
  return null;
}
