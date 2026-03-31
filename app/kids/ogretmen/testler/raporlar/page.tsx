'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import { kidsListClasses, kidsListClassTests, type KidsClass, type KidsTest } from '@/src/lib/kids-api';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';
import { KidsSelect } from '@/src/components/kids/kids-ui';
import { useKidsI18n } from '@/src/providers/kids-language-provider';

export default function KidsTeacherTestReportsPage() {
  const router = useRouter();
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();
  const { t } = useKidsI18n();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<KidsClass[]>([]);
  const [classId, setClassId] = useState<number>(0);
  const [tests, setTests] = useState<KidsTest[]>([]);
  const [testId, setTestId] = useState<string>('');

  useEffect(() => {
    if (authLoading) return;
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      router.replace(kidsLoginPortalHref(pathPrefix, 'ogretmen'));
      return;
    }
    void (async () => {
      setLoading(true);
      try {
        const rows = await kidsListClasses();
        setClasses(rows);
        if (rows.length > 0) setClassId(rows[0].id);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t('tests.reports.classesLoadError'));
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, user, router, pathPrefix]);

  useEffect(() => {
    if (!classId) {
      setTests([]);
      setTestId('');
      return;
    }
    void (async () => {
      try {
        const rows = await kidsListClassTests(classId);
        setTests(rows);
        setTestId((prev) => (prev && rows.some((t) => String(t.id) === prev) ? prev : ''));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t('tests.reports.testsLoadError'));
      }
    })();
  }, [classId]);

  const classOptions = useMemo(
    () => [{ value: '', label: t('tests.reports.selectClass') }, ...classes.map((c) => ({ value: String(c.id), label: c.name }))],
    [classes, t],
  );
  const testOptions = useMemo(
    () => [
      { value: '', label: t('tests.reports.selectTest') },
      ...tests.map((row) => ({ value: String(row.id), label: `${row.title} (${row.questions?.length || 0} ${t('tests.reports.question')})` })),
    ],
    [tests, t],
  );

  if (authLoading || loading) return <p className="text-center text-sm">{t('common.loading')}</p>;
  if (!user || (user.role !== 'teacher' && user.role !== 'admin')) return <p className="text-center text-sm">{t('common.redirecting')}</p>;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-logo text-2xl font-bold text-violet-950 dark:text-violet-50">{t('tests.reports.title')}</h1>
        <Link
          href={`${pathPrefix}/ogretmen/testler`}
          className="rounded-full border border-violet-200 px-3 py-1 text-xs font-bold text-violet-700 dark:border-violet-700 dark:text-violet-200"
        >
          {t('tests.report.backTests')}
        </Link>
      </div>

      <section className="rounded-2xl border border-violet-200 bg-white p-4 dark:border-violet-800 dark:bg-gray-900/70">
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{t('tests.reports.subtitle')}</p>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-xs font-semibold text-violet-900 dark:text-violet-100">
            {t('announcements.class')}
            <div className="mt-1">
              <KidsSelect
                value={classId ? String(classId) : ''}
                onChange={(next) => {
                  setClassId(Number(next));
                  setTestId('');
                }}
                options={classOptions}
                searchable
              />
            </div>
          </label>

          <label className="text-xs font-semibold text-violet-900 dark:text-violet-100">
            {t('tests.reports.test')}
            <div className="mt-1">
              <KidsSelect value={testId} onChange={(next) => setTestId(next)} options={testOptions} searchable />
            </div>
          </label>

          <div className="flex items-end">
            {testId ? (
              <Link
                href={`${pathPrefix}/ogretmen/testler/${testId}`}
                className="inline-flex rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-bold text-white"
              >
                {t('tests.reports.openReport')}
              </Link>
            ) : (
              <button type="button" disabled className="inline-flex rounded-lg bg-fuchsia-300 px-4 py-2 text-sm font-bold text-white/90">
                {t('tests.reports.openReport')}
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-violet-200 bg-white p-4 dark:border-violet-800 dark:bg-gray-900/70">
        <h2 className="mb-3 text-sm font-bold text-violet-950 dark:text-violet-100">{t('tests.reports.selectedClassTests')}</h2>
        {tests.length === 0 ? (
          <p className="text-sm text-slate-500">{t('tests.reports.noTests')}</p>
        ) : (
          <ul className="space-y-2">
            {tests.map((row) => (
              <li key={row.id} className="flex items-center justify-between rounded-xl border border-violet-200 px-3 py-2 dark:border-violet-700">
                <div>
                  <p className="text-sm font-semibold">{row.title}</p>
                  <p className="text-xs text-slate-500">
                    {row.questions?.length || 0} {t('tests.reports.question')} · {row.duration_minutes ? `${row.duration_minutes} ${t('tests.reports.min')}` : t('tests.reports.unlimited')}
                  </p>
                </div>
                <Link href={`${pathPrefix}/ogretmen/testler/${row.id}`} className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-800 dark:bg-violet-900/40 dark:text-violet-200">
                  {t('tests.reports.report')}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
