'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';
import { KidsPanelMax } from '@/src/components/kids/kids-ui';
import { useKidsI18n } from '@/src/providers/kids-language-provider';

export default function KidsParentFreeChallengesPage() {
  const router = useRouter();
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();
  const { t } = useKidsI18n();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(kidsLoginPortalHref(pathPrefix, 'veli'));
      return;
    }
    if (user.role === 'student') {
      router.replace(`${pathPrefix}/ogrenci/panel`);
      return;
    }
    router.replace(`${pathPrefix}/veli/panel`);
  }, [authLoading, user, pathPrefix, router]);

  return (
    <KidsPanelMax>
      <p className="text-center text-violet-800 dark:text-violet-200">{t('common.redirecting')}</p>
    </KidsPanelMax>
  );
}
