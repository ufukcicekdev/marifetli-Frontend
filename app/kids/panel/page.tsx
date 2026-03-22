'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';

/** Eski /panel bağlantıları rolüne göre yönlendirilir. */
export default function KidsPanelRedirectPage() {
  const router = useRouter();
  const { user, loading, pathPrefix } = useKidsAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`${pathPrefix}/giris`);
      return;
    }
    if (user.role === 'student') {
      router.replace(`${pathPrefix}/ogrenci/panel`);
      return;
    }
    if (user.role === 'teacher' || user.role === 'admin') {
      router.replace(`${pathPrefix}/ogretmen/panel`);
      return;
    }
    router.replace(`${pathPrefix}/giris`);
  }, [user, loading, pathPrefix, router]);

  return <p className="text-center text-gray-600 dark:text-gray-400">Yönlendiriliyorsun…</p>;
}
