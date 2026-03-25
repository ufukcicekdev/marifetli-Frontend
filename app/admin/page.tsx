'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/src/stores/auth-store';

/** Staff/süper kullanıcı ana oturumuyla doğrudan Kids yönetim paneli (ayrı admin şifresi yok). */
export default function SiteAdminEntryPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.replace('/');
      return;
    }
    if (!user.is_staff && !user.is_superuser) {
      router.replace('/');
      return;
    }
    router.replace('/kids/admin/panel');
  }, [isAuthenticated, user, router]);

  return (
    <main className="mx-auto max-w-md px-4 py-20">
      <p className="text-center text-slate-600 dark:text-gray-300">Yönetim paneline yönlendiriliyorsunuz…</p>
    </main>
  );
}
