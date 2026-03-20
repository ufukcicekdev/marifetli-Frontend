'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/src/lib/api';
import { useAuthStore } from '@/src/stores/auth-store';

type Props = {
  className?: string;
  children: React.ReactNode;
  /** Mobil menü / sidebar kapanışı */
  onNavigate?: () => void;
  title?: string;
};

/**
 * Özellik açık ve backend hazırsa `/uzman` tam sayfasına gider (panel FAB ayrı kalır).
 */
export function UzmanFullPageLink({ className, children, onNavigate, title }: Props) {
  const { user } = useAuthStore();
  const { data: cfg } = useQuery({
    queryKey: ['category-experts-config', user?.id ?? 'anon'],
    queryFn: () => api.getCategoryExpertsConfig(),
    staleTime: 60_000,
  });

  if (!cfg?.enabled || !cfg?.backend_ready) {
    return null;
  }

  return (
    <Link href="/uzman" className={className} title={title} onClick={onNavigate}>
      {children}
    </Link>
  );
}
