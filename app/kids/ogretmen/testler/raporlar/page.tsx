'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  kidsClassTestReport,
  kidsGetTest,
  kidsListClasses,
  kidsListClassTests,
  type KidsClass,
  type KidsTest,
} from '@/src/lib/kids-api';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';
import { KidsTeacherTestReportDetail, type KidsTeacherReportData } from '@/src/components/kids/kids-teacher-test-report-detail';
import { KidsSelect } from '@/src/components/kids/kids-ui';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import { useKidsI18n } from '@/src/providers/kids-language-provider';

export default function KidsTeacherTestReportsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();
  const { t } = useKidsI18n();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<KidsClass[]>([]);
  const [classId, setClassId] = useState<number>(0);
  const [tests, setTests] = useState<KidsTest[]>([]);
  const [testId, setTestId] = useState<string>('');

  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTest, setDetailTest] = useState<KidsTest | null>(null);
  const [detailReport, setDetailReport] = useState<KidsTeacherReportData | null>(null);

  const queryAppliedRef = useRef(false);
  const prevScrollTestId = useRef<string>('');

  const syncUrl = useCallback((nextTestId: string) => {
    if (typeof window === 'undefined' || !pathname) return;
    const base = pathname.split('?')[0];
    if (nextTestId) {
      window.history.replaceState(null, '', `${base}?test=${encodeURIComponent(nextTestId)}`);
    } else {
      window.history.replaceState(null, '', base);
    }
  }, [pathname]);

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
        setTestId((prev) => (prev && rows.some((te) => String(te.id) === prev) ? prev : ''));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t('tests.reports.testsLoadError'));
      }
    })();
  }, [classId]);

  useEffect(() => {
    if (authLoading || !user || classes.length === 0 || queryAppliedRef.current) return;
    const tid = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('test') : null;
    if (!tid || !/^\d+$/.test(tid)) return;
    void (async () => {
      try {
        const row = await kidsGetTest(Number(tid));
        if (row.kids_class != null) setClassId(row.kids_class);
        setTestId(tid);
        queryAppliedRef.current = true;
      } catch {
        // ignore invalid ?test=
      }
    })();
  }, [authLoading, user, classes.length]);

  useEffect(() => {
    syncUrl(testId);
  }, [testId, syncUrl]);

  useEffect(() => {
    if (!testId) {
      setDetailTest(null);
      setDetailReport(null);
      return;
    }
    const id = Number(testId);
    if (!Number.isFinite(id) || id <= 0) return;
    void (async () => {
      setDetailLoading(true);
      try {
        const row = await kidsGetTest(id);
        if (row.kids_class == null) {
          toast.error(t('tests.reports.testNotAssignedToClass'));
          setDetailTest(row);
          setDetailReport(null);
          return;
        }
        const rep = await kidsClassTestReport(row.kids_class, row.id);
        setDetailTest(row);
        setDetailReport(rep);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t('tests.report.loadError'));
        setDetailTest(null);
        setDetailReport(null);
      } finally {
        setDetailLoading(false);
      }
    })();
  }, [testId, t]);

  useEffect(() => {
    if (!testId || !detailReport || testId === prevScrollTestId.current) return;
    prevScrollTestId.current = testId;
    requestAnimationFrame(() => {
      document.getElementById('kids-teacher-report-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [testId, detailReport]);

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

  function scrollToDetail() {
    document.getElementById('kids-teacher-report-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (authLoading || loading) return <p className="text-center text-sm">{t('common.loading')}</p>;
  if (!user || (user.role !== 'teacher' && user.role !== 'admin')) return <p className="text-center text-sm">{t('common.redirecting')}</p>;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 pb-12 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="font-logo text-2xl font-black tracking-tight text-violet-900 dark:text-violet-100 sm:text-3xl">
            {t('tests.reports.title')}
          </h1>
          <Link
            href={`${pathPrefix}/ogretmen/testler`}
            className="inline-flex w-fit items-center rounded-full border-2 border-violet-200 bg-white px-4 py-2 text-xs font-bold text-violet-800 shadow-sm transition hover:bg-violet-50 dark:border-violet-700 dark:bg-zinc-900 dark:text-violet-200 dark:hover:bg-violet-950/50"
          >
            {t('tests.report.backTests')}
          </Link>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-400">{t('tests.reports.subtitle')}</p>

        <section className="rounded-[1.25rem] border border-violet-100/90 bg-white p-4 shadow-[0_8px_30px_-12px_rgba(124,58,237,0.2)] dark:border-violet-900/50 dark:bg-zinc-900/80 sm:p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
            <div className="grid min-w-0 flex-1 gap-4 sm:grid-cols-2">
              <label className="block min-w-0">
                <span className="mb-2 block text-[11px] font-black uppercase tracking-wider text-violet-600 dark:text-violet-300">
                  {t('tests.reports.filterClassCaps')}
                </span>
                <KidsSelect
                  value={classId ? String(classId) : ''}
                  onChange={(next) => {
                    setClassId(Number(next));
                    setTestId('');
                  }}
                  options={classOptions}
                  searchable
                />
              </label>
              <label className="block min-w-0">
                <span className="mb-2 block text-[11px] font-black uppercase tracking-wider text-violet-600 dark:text-violet-300">
                  {t('tests.reports.filterTestCaps')}
                </span>
                <KidsSelect value={testId} onChange={(next) => setTestId(next)} options={testOptions} searchable />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
              {testId ? (
                <button
                  type="button"
                  onClick={scrollToDetail}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-[#9C27B0] to-violet-600 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-violet-500/35 transition hover:brightness-105"
                >
                  <BarChart3 className="h-5 w-5 shrink-0" strokeWidth={2.25} aria-hidden />
                  {t('tests.reports.openReport')}
                </button>
              ) : (
                <span className="inline-flex min-h-11 cursor-not-allowed items-center gap-2 rounded-full bg-violet-200/80 px-5 py-2.5 text-sm font-black text-white/90 dark:bg-violet-950/50 dark:text-violet-300/50">
                  <BarChart3 className="h-5 w-5 shrink-0 opacity-60" aria-hidden />
                  {t('tests.reports.openReport')}
                </span>
              )}
            </div>
          </div>
        </section>

        {classId && tests.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('tests.reports.noTests')}</p>
        ) : null}

        {testId && detailLoading ? (
          <p className="text-center text-sm font-medium text-slate-600 dark:text-slate-400">{t('tests.reports.loadingDetail')}</p>
        ) : null}

        {testId && !detailLoading && detailReport ? (
          <KidsTeacherTestReportDetail
            report={detailReport}
            test={detailTest}
            testId={Number(testId)}
            pathPrefix={pathPrefix}
            embedded
          />
        ) : null}

        {testId && !detailLoading && !detailReport ? (
          <p className="text-center text-sm text-rose-600 dark:text-rose-400">
            {detailTest?.kids_class == null ? t('tests.reports.testNotAssignedToClass') : t('tests.report.notFound')}
          </p>
        ) : null}

        {!testId ? (
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">{t('tests.reports.selectTestHint')}</p>
        ) : null}
    </div>
  );
}
