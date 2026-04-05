'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';
import { useKidsI18n } from '@/src/providers/kids-language-provider';

/** Eski `/ogretmen/testler/[id]` adresleri tek sayfalık rapor ekranına yönlendirilir. */
export default function KidsTeacherTestReportRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useKidsI18n();
  const { loading: authLoading, pathPrefix, user } = useKidsAuth();
  const raw = params?.id;
  const id = typeof raw === 'string' ? Number(raw) : Array.isArray(raw) ? Number(raw[0]) : Number.NaN;

  useEffect(() => {
    if (authLoading) return;
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      router.replace(kidsLoginPortalHref(pathPrefix, 'ogretmen'));
      return;
    }
    if (!Number.isFinite(id) || id <= 0) {
      router.replace(`${pathPrefix}/ogretmen/testler/raporlar`);
      return;
    }
    router.replace(`${pathPrefix}/ogretmen/testler/raporlar?test=${id}`);
  }, [authLoading, user, id, pathPrefix, router]);

  return <p className="p-6 text-center text-sm text-slate-600 dark:text-slate-400">{t('common.redirecting')}</p>;
}
