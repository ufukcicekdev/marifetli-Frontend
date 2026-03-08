'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/src/stores/auth-store';
import api from '@/src/lib/api';

export function OnboardingBanner() {
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuthStore();

  const { data: status } = useQuery({
    queryKey: ['onboardingStatus'],
    queryFn: () => api.getOnboardingStatus().then((r) => r.data),
    enabled: isAuthenticated,
  });

  if (!isAuthenticated || status?.completed) return null;
  if (pathname === '/onboarding') return null;
  if (pathname?.startsWith('/profil/') && user?.username) {
    const segment = pathname.replace(/^\/profil\//, '').split('/')[0];
    if (segment?.toLowerCase() === user.username.toLowerCase()) return null;
  }

  return (
    <div className="bg-orange-50 dark:bg-orange-950/40 border-b border-orange-200 dark:border-orange-800 text-orange-900 dark:text-orange-100">
      <div className="container mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm">
          <span className="font-medium">Profilini tamamla.</span>
          {' '}
          İlgi alanları, cinsiyet ve yaş gibi birkaç bilgiyi seçerek toplulukta daha iyi tanın.
        </p>
        <Link
          href="/onboarding"
          className="shrink-0 px-4 py-1.5 text-sm font-medium bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
        >
          Tamamla
        </Link>
      </div>
    </div>
  );
}
