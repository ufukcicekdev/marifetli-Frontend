'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import { kidsStudentListTests, type KidsStudentTestListItem } from '@/src/lib/kids-api';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';
import { useKidsI18n } from '@/src/providers/kids-language-provider';

export default function KidsStudentTestsPage() {
  const router = useRouter();
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();
  const { t } = useKidsI18n();
  const [rows, setRows] = useState<KidsStudentTestListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'student') {
      router.replace(kidsLoginPortalHref(pathPrefix, 'ogrenci'));
      return;
    }
    void (async () => {
      setLoading(true);
      try {
        const list = await kidsStudentListTests();
        setRows(list);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t('tests.studentList.loadError'));
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, user, router, pathPrefix]);

  if (authLoading || loading) return <p className="text-center text-sm">{t('common.loading')}</p>;
  if (!user || user.role !== 'student') return <p className="text-center text-sm">{t('common.redirecting')}</p>;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="font-logo text-2xl font-bold text-violet-950 dark:text-violet-50">{t('tests.studentList.title')}</h1>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-violet-300 p-4 text-sm text-slate-500">{t('tests.studentList.empty')}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={`${pathPrefix}/ogrenci/testler/${row.id}`}
                className="block rounded-xl border border-violet-200 bg-white px-4 py-3 transition hover:border-fuchsia-300 dark:border-violet-800 dark:bg-gray-900/70"
              >
                <p className="font-semibold text-violet-950 dark:text-violet-100">{row.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {row.question_count} {t('tests.reports.question')} · {row.duration_minutes ? `${row.duration_minutes} ${t('tests.reports.min')}` : t('tests.reports.unlimited')}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
