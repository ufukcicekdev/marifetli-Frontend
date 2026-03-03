'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuthStore } from '../stores/auth-store';

const SKIP_PATHS = ['/onboarding', '/giris', '/kayit', '/sifremi-unuttum', '/reset-password', '/ayarlar', '/soru-sor'];

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const { data: status } = useQuery({
    queryKey: ['onboardingStatus'],
    queryFn: () => api.getOnboardingStatus().then((r) => r.data),
    enabled: isAuthenticated && !SKIP_PATHS.some((p) => pathname?.startsWith(p)),
    retry: false,
  });

  useEffect(() => {
    if (isAuthenticated && status && !status.completed && pathname && !SKIP_PATHS.some((p) => pathname.startsWith(p))) {
      router.replace('/onboarding');
    }
  }, [isAuthenticated, status, pathname, router]);

  return <>{children}</>;
}
