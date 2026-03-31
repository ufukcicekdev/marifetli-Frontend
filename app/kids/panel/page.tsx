'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import { useKidsI18n } from '@/src/providers/kids-language-provider';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';

/** Eski /panel bağlantıları rolüne göre yönlendirilir. */
export default function KidsPanelRedirectPage() {
  const router = useRouter();
  const { user, loading, pathPrefix } = useKidsAuth();
  const { t } = useKidsI18n();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(kidsLoginPortalHref(pathPrefix));
      return;
    }
    if (user.role === 'student') {
      router.replace(`${pathPrefix}/ogrenci/panel`);
      return;
    }
    if (user.role === 'parent') {
      router.replace(`${pathPrefix}/veli/panel`);
      return;
    }
    if (user.role === 'admin') {
      router.replace(`${pathPrefix}/admin/panel`);
      return;
    }
    if (user.role === 'teacher') {
      router.replace(`${pathPrefix}/ogretmen/panel`);
      return;
    }
    router.replace(kidsLoginPortalHref(pathPrefix));
  }, [user, loading, pathPrefix, router]);

  return <p className="text-center text-gray-600 dark:text-gray-400">{t('common.redirecting')}</p>;
}
