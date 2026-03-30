'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import { kidsListClasses, kidsListClassTests, type KidsClass, type KidsTest } from '@/src/lib/kids-api';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';
import { KidsSelect } from '@/src/components/kids/kids-ui';

export default function KidsTeacherTestReportsPage() {
  const router = useRouter();
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();
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
        toast.error(e instanceof Error ? e.message : 'Sınıflar yüklenemedi');
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
        toast.error(e instanceof Error ? e.message : 'Testler yüklenemedi');
      }
    })();
  }, [classId]);

  const classOptions = useMemo(
    () => [{ value: '', label: 'Sınıf seç' }, ...classes.map((c) => ({ value: String(c.id), label: c.name }))],
    [classes],
  );
  const testOptions = useMemo(
    () => [
      { value: '', label: 'Test seç' },
      ...tests.map((t) => ({ value: String(t.id), label: `${t.title} (${t.questions?.length || 0} soru)` })),
    ],
    [tests],
  );

  if (authLoading || loading) return <p className="text-center text-sm">Yükleniyor…</p>;
  if (!user || (user.role !== 'teacher' && user.role !== 'admin')) return <p className="text-center text-sm">Yönlendiriliyorsun…</p>;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-logo text-2xl font-bold text-violet-950 dark:text-violet-50">Raporlar</h1>
        <Link
          href={`${pathPrefix}/ogretmen/testler`}
          className="rounded-full border border-violet-200 px-3 py-1 text-xs font-bold text-violet-700 dark:border-violet-700 dark:text-violet-200"
        >
          ← Testler
        </Link>
      </div>

      <section className="rounded-2xl border border-violet-200 bg-white p-4 dark:border-violet-800 dark:bg-gray-900/70">
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">Sınıf ve test seçip ilgili rapora geç.</p>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-xs font-semibold text-violet-900 dark:text-violet-100">
            Sınıf
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
            Test
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
                Raporu aç
              </Link>
            ) : (
              <button type="button" disabled className="inline-flex rounded-lg bg-fuchsia-300 px-4 py-2 text-sm font-bold text-white/90">
                Raporu aç
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-violet-200 bg-white p-4 dark:border-violet-800 dark:bg-gray-900/70">
        <h2 className="mb-3 text-sm font-bold text-violet-950 dark:text-violet-100">Seçili sınıfın testleri</h2>
        {tests.length === 0 ? (
          <p className="text-sm text-slate-500">Bu sınıfta raporlanabilir test bulunamadı.</p>
        ) : (
          <ul className="space-y-2">
            {tests.map((t) => (
              <li key={t.id} className="flex items-center justify-between rounded-xl border border-violet-200 px-3 py-2 dark:border-violet-700">
                <div>
                  <p className="text-sm font-semibold">{t.title}</p>
                  <p className="text-xs text-slate-500">
                    {t.questions?.length || 0} soru · {t.duration_minutes ? `${t.duration_minutes} dk` : 'Süresiz'}
                  </p>
                </div>
                <Link href={`${pathPrefix}/ogretmen/testler/${t.id}`} className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-800 dark:bg-violet-900/40 dark:text-violet-200">
                  Rapor
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
