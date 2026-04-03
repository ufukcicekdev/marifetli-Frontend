'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import { kidsStudentGetTest, kidsStudentStartTest, kidsStudentSubmitTest, type KidsTestAttempt } from '@/src/lib/kids-api';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';
import { useKidsI18n } from '@/src/providers/kids-language-provider';

type StudentTestDetail = Awaited<ReturnType<typeof kidsStudentGetTest>>;

export default function KidsStudentTestSolvePage() {
  const params = useParams();
  const testId = Number(params.id);
  const router = useRouter();
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();
  const { t, language } = useKidsI18n();
  const [detail, setDetail] = useState<StudentTestDetail | null>(null);
  const [attempt, setAttempt] = useState<KidsTestAttempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [remainingSec, setRemainingSec] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const autoSubmitRef = useRef(false);

  const submitted = Boolean(attempt?.submitted_at);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'student') {
      router.replace(kidsLoginPortalHref(pathPrefix, 'ogrenci'));
      return;
    }
    if (!Number.isFinite(testId) || testId <= 0) {
      router.replace(`${pathPrefix}/ogrenci/testler`);
      return;
    }
    void (async () => {
      setLoading(true);
      try {
        const d = await kidsStudentGetTest(testId);
        const st = await kidsStudentStartTest(testId);
        setDetail(d);
        setAttempt(st);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t('tests.studentSolve.loadError'));
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, user, testId, router, pathPrefix]);

  const endMs = useMemo(() => {
    if (!attempt?.started_at || !detail?.duration_minutes) return null;
    return new Date(attempt.started_at).getTime() + detail.duration_minutes * 60 * 1000;
  }, [attempt?.started_at, detail?.duration_minutes]);

  useEffect(() => {
    if (!endMs || submitted) return;
    const tick = () => {
      const sec = Math.max(0, Math.floor((endMs - Date.now()) / 1000));
      setRemainingSec(sec);
    };
    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, [endMs, submitted]);

  useEffect(() => {
    if (remainingSec !== 0 || submitted || autoSubmitRef.current || !detail) return;
    autoSubmitRef.current = true;
    void onSubmit(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSec, submitted, detail]);

  async function onSubmit(auto = false) {
    if (!detail || submitting || submitted) return;
    setSubmitting(true);
    try {
      const row = await kidsStudentSubmitTest(detail.id, answers, auto);
      setAttempt(row);
      toast.success(auto ? t('tests.studentSolve.autoSubmitted') : t('tests.studentSolve.submitted'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('tests.studentSolve.submitError'));
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || loading) return <p className="text-center text-sm">{t('common.loading')}</p>;
  if (!detail) return <p className="text-center text-sm">{t('tests.studentSolve.notFound')}</p>;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-logo text-2xl font-bold text-violet-950 dark:text-violet-50">{detail.title}</h1>
        <Link href={`${pathPrefix}/ogrenci/testler`} className="rounded-full border border-violet-200 px-3 py-1 text-xs font-bold text-violet-700 dark:border-violet-700 dark:text-violet-200">
          {t('tests.report.backTests')}
        </Link>
      </div>
      {detail.instructions ? <p className="text-sm text-slate-600 dark:text-slate-300">{detail.instructions}</p> : null}
      <div className="rounded-xl border border-violet-200 bg-white p-3 text-sm dark:border-violet-800 dark:bg-gray-900/70">
        {detail.duration_minutes ? (
          <p className="font-semibold text-violet-800 dark:text-violet-200">
            {t('tests.studentSolve.remainingTime')}{' '}
            {submitted || remainingSec == null
              ? t('tests.studentSolve.completed')
              : `${String(Math.floor(remainingSec / 60)).padStart(2, '0')}:${String(remainingSec % 60).padStart(2, '0')}`}
          </p>
        ) : (
          <p className="font-semibold text-violet-800 dark:text-violet-200">{t('tests.studentSolve.noTimeLimit')}</p>
        )}
        {submitted ? (
          <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
            {t('tests.studentSolve.result')}: {attempt?.total_correct}/{attempt?.total_questions} {t('tests.studentSolve.correct')} · {(attempt?.score ?? 0).toLocaleString(language)}/100 {t('tests.studentSolve.points')}
          </p>
        ) : null}
      </div>

      <div className="space-y-3">
        {detail.questions.map((q) => (
          <div key={q.id} className="rounded-xl border border-violet-200 bg-white p-3 dark:border-violet-800 dark:bg-gray-900/70">
            {q.source_image_url ? (
              <div className="mb-3 overflow-hidden rounded-lg border border-violet-100 bg-violet-50/40 dark:border-violet-800 dark:bg-violet-950/20">
                <img
                  src={q.source_image_url}
                  alt=""
                  className="max-h-72 w-full object-contain"
                />
              </div>
            ) : null}
            <p className="mb-2 text-sm font-semibold">
              {q.order}. {q.stem}
            </p>
            <div className="space-y-1">
              {q.choices.map((c) => (
                <label key={`${q.id}-${c.key}`} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    value={c.key}
                    disabled={submitted}
                    checked={(answers[String(q.id)] || '') === c.key}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [String(q.id)]: e.target.value }))}
                  />
                  <span>
                    {c.key}) {c.text}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {!submitted ? (
        <button
          type="button"
          onClick={() => void onSubmit(false)}
          disabled={submitting}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
        >
          {submitting ? t('tests.studentSolve.submitting') : t('tests.studentSolve.submit')}
        </button>
      ) : null}
    </div>
  );
}
