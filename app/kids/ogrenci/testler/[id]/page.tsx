'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import { kidsStudentGetTest, kidsStudentStartTest, kidsStudentSubmitTest, type KidsTestAttempt } from '@/src/lib/kids-api';
import { kidsStripTrailingParenTopicSuffix } from '@/src/lib/kids-test-stem';
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
      const refreshed = await kidsStudentGetTest(detail.id);
      setDetail(refreshed);
      if (refreshed.attempt) setAttempt(refreshed.attempt);
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
        {detail.questions.map((q) => {
          const chosen =
            submitted && q.selected_choice_key !== undefined
              ? (q.selected_choice_key || '').trim().toUpperCase()
              : (answers[String(q.id)] || '').trim().toUpperCase();
          const correctKey = (q.correct_choice_key || '').trim().toUpperCase();
          const reviewMode = submitted && correctKey !== '';
          const correctChoiceRow = correctKey
            ? q.choices.find((c) => (c.key || '').trim().toUpperCase() === correctKey)
            : undefined;
          const correctText = (correctChoiceRow?.text || '').trim();
          return (
            <div key={q.id} className="rounded-xl border border-violet-200 bg-white p-3 dark:border-violet-800 dark:bg-gray-900/70">
              <p className="mb-2 text-sm font-semibold">
                {q.order}. {kidsStripTrailingParenTopicSuffix(q.stem)}
              </p>
              {submitted && !chosen ? (
                <p className="mb-2 text-xs font-medium text-amber-800 dark:text-amber-200">
                  {t('tests.studentSolve.noAnswer')}
                </p>
              ) : null}
              <div className="space-y-1">
                {q.choices.map((c) => {
                  const keyU = (c.key || '').trim().toUpperCase();
                  const isPicked = chosen === keyU;
                  const isCorrectOption = Boolean(correctKey && keyU === correctKey);
                  let rowClass =
                    'flex items-start gap-2 rounded-lg border border-transparent px-2 py-1.5 text-sm';
                  if (reviewMode) {
                    if (isCorrectOption) {
                      rowClass +=
                        ' border-emerald-300 bg-emerald-50/90 dark:border-emerald-700 dark:bg-emerald-950/40';
                    }
                    if (isPicked && !q.is_correct && !isCorrectOption) {
                      rowClass =
                        'flex items-start gap-2 rounded-lg border border-rose-300 bg-rose-50/90 px-2 py-1.5 text-sm dark:border-rose-700 dark:bg-rose-950/35';
                    }
                    if (isPicked && q.is_correct) {
                      rowClass +=
                        ' ring-1 ring-emerald-400 dark:ring-emerald-600';
                    }
                  }
                  return (
                    <label key={`${q.id}-${c.key}`} className={rowClass}>
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        value={c.key}
                        disabled={submitted}
                        checked={isPicked}
                        onChange={(e) => setAnswers((prev) => ({ ...prev, [String(q.id)]: e.target.value }))}
                        className="mt-0.5"
                      />
                      <span>
                        {c.key}) {c.text}
                        {submitted && isPicked ? (
                          <span className="ml-2 text-xs font-bold text-violet-700 dark:text-violet-300">
                            ({t('tests.studentSolve.yourChoice')})
                          </span>
                        ) : null}
                        {reviewMode && isCorrectOption ? (
                          <span className="ml-2 text-xs font-bold text-emerald-800 dark:text-emerald-200">
                            ({t('tests.studentSolve.correctChoice')})
                          </span>
                        ) : null}
                      </span>
                    </label>
                  );
                })}
              </div>
              {submitted && correctKey ? (
                <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/90 px-3 py-2 text-sm font-semibold leading-snug text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/45 dark:text-emerald-50">
                  {correctText
                    ? t('tests.studentSolve.correctAnswerLine').replace('{key}', correctKey).replace('{text}', correctText)
                    : t('tests.studentSolve.correctAnswerKeyOnly').replace('{key}', correctKey)}
                </p>
              ) : null}
            </div>
          );
        })}
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
