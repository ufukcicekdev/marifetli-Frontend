'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';
import { useKidsI18n } from '@/src/providers/kids-language-provider';

/** Ortak admin girişi: `/admin` veya `/kids/admin` -> admin paneli. */
export default function KidsAdminEntryPage() {
  const router = useRouter();
  const { user, loading, pathPrefix } = useKidsAuth();
  const { t } = useKidsI18n();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(kidsLoginPortalHref(pathPrefix));
      return;
    }
    if (user.role !== 'admin') {
      router.replace(`${pathPrefix}/panel`);
      return;
    }
    router.replace(`${pathPrefix}/admin/panel`);
  }, [user, loading, pathPrefix, router]);

  return <p className="text-center text-violet-800 dark:text-violet-200">{t('common.loading')}</p>;
}
