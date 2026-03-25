'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuthStore } from '../stores/auth-store';

const SKIP_PATHS = [
  '/onboarding',
  '/giris',
  '/kayit',
  '/sifremi-unuttum',
  '/reset-password',
  '/ayarlar',
  '/soru-sor',
  '/marifetli-kids',
];

function isOwnProfilePath(pathname: string | null, currentUsername: string | undefined): boolean {
  if (!pathname?.startsWith('/profil/') || !currentUsername) return false;
  const segment = pathname.replace(/^\/profil\//, '').split('/')[0];
  return segment?.toLowerCase() === currentUsername.toLowerCase();
}

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const skipRedirect = SKIP_PATHS.some((p) => pathname?.startsWith(p)) || isOwnProfilePath(pathname, user?.username);

  const { data: status } = useQuery({
    queryKey: ['onboardingStatus'],
    queryFn: () => api.getOnboardingStatus().then((r) => r.data),
    enabled: isAuthenticated && !skipRedirect,
    retry: false,
  });

  useEffect(() => {
    if (isAuthenticated && status && !status.completed && pathname && !skipRedirect) {
      router.replace('/onboarding');
    }
  }, [isAuthenticated, status, pathname, router, skipRedirect]);

  return <>{children}</>;
}
