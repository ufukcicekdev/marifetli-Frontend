'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import { useKidsI18n } from '@/src/providers/kids-language-provider';

/** Eski `/ogrenci/odev/:id` adresleri → `/ogrenci/proje/:id` */
export default function KidsStudentLegacyOdevRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const { pathPrefix } = useKidsAuth();
  const { t } = useKidsI18n();
  const id = params.id;

  useEffect(() => {
    if (id == null) return;
    router.replace(`${pathPrefix}/ogrenci/proje/${String(id)}`);
  }, [router, pathPrefix, id]);

  return <p className="p-6 text-center text-gray-600">{t('common.redirecting')}</p>;
}
