'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import { kidsClassTestReport, kidsGetTest, type KidsTest } from '@/src/lib/kids-api';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';

type ReportData = Awaited<ReturnType<typeof kidsClassTestReport>>;

export default function KidsTeacherTestReportPage() {
  const params = useParams();
  const testId = Number(params.id);
  const router = useRouter();
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();
  const [test, setTest] = useState<KidsTest | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      router.replace(kidsLoginPortalHref(pathPrefix, 'ogretmen'));
      return;
    }
    if (!Number.isFinite(testId) || testId <= 0) {
      router.replace(`${pathPrefix}/ogretmen/testler`);
      return;
    }
    void (async () => {
      setLoading(true);
      try {
        const testRow = await kidsGetTest(testId);
        const rep = await kidsClassTestReport(testRow.kids_class, testRow.id);
        setTest(testRow);
        setReport(rep);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Rapor yüklenemedi');
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, user, testId, router, pathPrefix]);

  if (authLoading || loading) return <p className="text-center text-sm">Yükleniyor…</p>;
  if (!report) return <p className="text-center text-sm">Rapor bulunamadı.</p>;

  function formatSolveDuration(seconds: number | null): string {
    if (seconds == null) return 'Süre yok';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins <= 0) return `${secs} sn`;
    return secs === 0 ? `${mins} dk` : `${mins} dk ${secs} sn`;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-logo text-2xl font-bold text-violet-950 dark:text-violet-50">{report.title} · Rapor</h1>
        <Link href={`${pathPrefix}/ogretmen/testler`} className="rounded-full border border-violet-200 px-3 py-1 text-xs font-bold text-violet-700 dark:border-violet-700 dark:text-violet-200">
          ← Testler
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-violet-200 bg-white p-3 dark:border-violet-800 dark:bg-gray-900/70">
          <p className="text-xs text-slate-500">Toplam öğrenci</p>
          <p className="text-xl font-black">{report.students_total}</p>
        </div>
        <div className="rounded-xl border border-violet-200 bg-white p-3 dark:border-violet-800 dark:bg-gray-900/70">
          <p className="text-xs text-slate-500">Testi gönderen</p>
          <p className="text-xl font-black">{report.students_submitted}</p>
        </div>
        <div className="rounded-xl border border-violet-200 bg-white p-3 dark:border-violet-800 dark:bg-gray-900/70">
          <p className="text-xs text-slate-500">Ortalama skor</p>
          <p className="text-xl font-black">{report.average_score.toFixed(2)}</p>
        </div>
      </div>
      <section className="rounded-xl border border-violet-200 bg-white p-3 dark:border-violet-800 dark:bg-gray-900/70">
        <h2 className="mb-2 text-sm font-bold">Öğrenci Sonuçları</h2>
        <ul className="space-y-2">
          {report.students.map((s) => (
            <li key={s.student_id} className="flex items-center justify-between rounded-lg border border-violet-100 px-3 py-2 dark:border-violet-800">
              <span className="text-sm font-semibold">{s.student_name}</span>
              <span className="text-xs text-slate-600 dark:text-slate-300">
                {s.total_correct}/{s.total_questions} doğru · {s.score.toFixed(2)} puan · {formatSolveDuration(s.duration_seconds)}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-xl border border-violet-200 bg-white p-3 dark:border-violet-800 dark:bg-gray-900/70">
        <h2 className="mb-2 text-sm font-bold">Soru Başarı Oranları</h2>
        <ul className="space-y-2">
          {report.question_stats.map((q) => (
            <li key={q.question_id} className="rounded-lg border border-violet-100 px-3 py-2 text-xs dark:border-violet-800">
              {q.order}. soru · {q.correct_count}/{q.attempt_count} doğru · %{(q.success_rate * 100).toFixed(1)}
            </li>
          ))}
        </ul>
      </section>
      {test ? (
        <section className="rounded-xl border border-violet-200 bg-white p-3 dark:border-violet-800 dark:bg-gray-900/70">
          <h2 className="mb-2 text-sm font-bold">Test Detayları</h2>
          <div className="space-y-3">
            {test.questions.map((q) => (
              <div key={q.id} className="rounded-lg border border-violet-100 px-3 py-2 dark:border-violet-800">
                <p className="text-sm font-semibold">
                  {q.order}. {q.stem}
                </p>
                <ul className="mt-1 grid gap-1 sm:grid-cols-2">
                  {q.choices.map((c) => (
                    <li
                      key={`${q.id}-${c.key}`}
                      className={`rounded-md px-2 py-1 text-xs ${
                        c.key === q.correct_choice_key
                          ? 'bg-emerald-100 font-bold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                          : 'bg-slate-50 text-slate-700 dark:bg-slate-900/60 dark:text-slate-300'
                      }`}
                    >
                      {c.key}) {c.text}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
