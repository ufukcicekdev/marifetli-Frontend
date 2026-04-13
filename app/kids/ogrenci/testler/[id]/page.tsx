'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  BookOpen,
  Calculator,
  CheckCircle2,
  Eye,
  FlaskConical,
  Languages,
  ListChecks,
  Star,
  Timer,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { KidsCenteredModal, KidsPanelMax, KidsPrimaryButton } from '@/src/components/kids/kids-ui';
import { KidsMascot } from '@/src/components/kids/kids-mascot';
import { KidsMascotBubble } from '@/src/components/kids/kids-mascot-bubble';
import { kidsStudentGetTest, kidsStudentStartTest, kidsStudentSubmitTest, type KidsTestAttempt } from '@/src/lib/kids-api';
import {
  kidsLocalizedReadingAnswerIntro,
  kidsSplitReadingFromInstructions,
  kidsStripTrailingParenTopicSuffix,
} from '@/src/lib/kids-test-stem';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import { useKidsI18n } from '@/src/providers/kids-language-provider';

type StudentTestDetail = Awaited<ReturnType<typeof kidsStudentGetTest>>;
type StudentTestQuestion = StudentTestDetail['questions'][number];

/** Backend `kids/badges.py` içindeki `TEST_FIRST_SUBMIT_GP` ile aynı kalmalı. */
const KIDS_TEST_SUBMIT_XP = 2;

function interpolate(template: string, vars: Record<string, string | number>): string {
  let s = template;
  for (const [k, v] of Object.entries(vars)) {
    s = s.split(`{${k}}`).join(String(v));
  }
  return s;
}

function testSubjectIcon(title: string): LucideIcon {
  const s = title.toLowerCase();
  if (s.includes('mat') || s.includes('sayı') || s.includes('sayi') || s.includes('geometri'))
    return Calculator;
  if (s.includes('fen') || s.includes('bilim') || s.includes('science')) return FlaskConical;
  if (s.includes('ingiliz') || s.includes('english')) return Languages;
  if (s.includes('türk') || s.includes('turk') || s.includes('edeb')) return BookOpen;
  return BookOpen;
}

const glassResultsCard =
  'rounded-2xl border border-white/50 bg-white/70 p-6 shadow-lg shadow-violet-200/25 backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/60 dark:shadow-none';

function formatAttemptDuration(attempt: KidsTestAttempt | null, t: (k: string) => string): string {
  if (!attempt?.started_at || !attempt?.submitted_at) return t('tests.studentList.durationUnknown');
  const ms = new Date(attempt.submitted_at).getTime() - new Date(attempt.started_at).getTime();
  if (!Number.isFinite(ms) || ms < 0) return t('tests.studentList.durationUnknown');
  const minutes = Math.max(1, Math.round(ms / 60000));
  if (minutes > 48 * 60) return t('tests.studentList.durationUnknown');
  if (minutes >= 120) {
    return interpolate(t('tests.studentSolve.durationAboutHours'), { h: Math.max(1, Math.round(minutes / 60)) });
  }
  return interpolate(t('tests.studentList.attemptMinutes'), { n: minutes });
}

export default function KidsStudentTestSolvePage() {
  const params = useParams();
  const testId = Number(params.id);
  const router = useRouter();
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();
  const { t } = useKidsI18n();
  const [detail, setDetail] = useState<StudentTestDetail | null>(null);
  const [attempt, setAttempt] = useState<KidsTestAttempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [remainingSec, setRemainingSec] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
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

  const sortedPassages = useMemo(() => {
    if (!detail) return [];
    return [...(detail.passages ?? [])].sort((a, b) => a.order - b.order);
  }, [detail]);

  const hasApiReadingContent = useMemo(
    () => sortedPassages.some((p) => Boolean((p.title || '').trim() || (p.body || '').trim())),
    [sortedPassages],
  );

  const { instructionIntro, instructionStoryFallback } = useMemo(() => {
    if (!detail?.instructions) return { instructionIntro: '', instructionStoryFallback: null as string | null };
    const split = kidsSplitReadingFromInstructions(detail.instructions);
    return { instructionIntro: split.intro, instructionStoryFallback: split.story };
  }, [detail?.instructions]);

  const showFallbackReading = Boolean(!hasApiReadingContent && instructionStoryFallback);

  const looksLikeReadingComprehension = useMemo(() => {
    if (!detail) return false;
    const ins = (detail.instructions || '').toLowerCase();
    const tit = (detail.title || '').toLowerCase();
    const hay = `${ins} ${tit}`;
    const needles = [
      'metne göre',
      'metne gore',
      'okuduğunuz',
      'okudugunuz',
      'metni',
      'metne',
      'parçaya göre',
      'parcaya gore',
      'hikayeye',
      'hikâye',
      'metin',
    ];
    return needles.some((n) => hay.includes(n));
  }, [detail]);

  const questionsByPassageOrder = useMemo(() => {
    const m = new Map<number, StudentTestQuestion[]>();
    if (!detail) return m;
    for (const q of detail.questions) {
      const po = q.reading_passage_order;
      if (po == null) continue;
      if (!m.has(po)) m.set(po, []);
      m.get(po)!.push(q);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.order - b.order);
    return m;
  }, [detail]);

  const ungroupedQuestions = useMemo(() => {
    if (!detail) return [];
    return detail.questions
      .filter((q) => q.reading_passage_order == null)
      .slice()
      .sort((a, b) => a.order - b.order);
  }, [detail]);

  const showReadingMissingHint = Boolean(
    detail &&
      looksLikeReadingComprehension &&
      !hasApiReadingContent &&
      !showFallbackReading,
  );

  const renderQuestionCard = useCallback(
    (q: StudentTestQuestion) => {
      const isConstructed = q.question_format === 'constructed';
      let chosenRaw =
        submitted && q.selected_choice_key !== undefined
          ? (q.selected_choice_key || '').trim()
          : (answers[String(q.id)] || '').trim();
      if (!isConstructed) {
        chosenRaw = chosenRaw.toUpperCase();
      }
      const chosen = chosenRaw;
      const correctKey = (q.correct_choice_key || '').trim().toUpperCase();
      const correctConstructed = (q.constructed_correct_display || '').trim();
      const reviewMode = submitted && (isConstructed ? Boolean(correctConstructed) : correctKey !== '');
      const correctChoiceRow = correctKey
        ? q.choices.find((c) => (c.key || '').trim().toUpperCase() === correctKey)
        : undefined;
      const correctText = (correctChoiceRow?.text || '').trim();
      return (
        <div key={q.id} className="rounded-xl border border-violet-200 bg-white p-3 dark:border-violet-800 dark:bg-gray-900/70">
          {q.source_image_url ? (
            <img
              src={q.source_image_url}
              alt=""
              className="mb-2 max-h-64 w-full rounded-lg border border-slate-200 object-contain dark:border-slate-600"
            />
          ) : null}
          {q.illustration_url ? (
            <img
              src={q.illustration_url}
              alt=""
              className="mb-2 max-h-52 w-full rounded-lg border border-violet-200 object-contain dark:border-violet-700"
            />
          ) : null}
          <p className="mb-2 text-sm font-semibold">
            {q.order}. {kidsStripTrailingParenTopicSuffix(q.stem)}
          </p>
          {submitted && !chosen ? (
            <p className="mb-2 text-xs font-medium text-amber-800 dark:text-amber-200">{t('tests.studentSolve.noAnswer')}</p>
          ) : null}
          {isConstructed ? (
            <div className="space-y-2">
              <input
                type="text"
                name={`q-${q.id}`}
                value={submitted ? chosen : answers[String(q.id)] ?? ''}
                disabled={submitted}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [String(q.id)]: e.target.value }))}
                placeholder={t('tests.studentSolve.answerPlaceholder')}
                className={`w-full rounded-lg border px-3 py-2 text-sm dark:bg-gray-900/80 ${
                  reviewMode && q.is_correct
                    ? 'border-emerald-400 bg-emerald-50/90 dark:border-emerald-600 dark:bg-emerald-950/35'
                    : reviewMode && chosen && !q.is_correct
                      ? 'border-rose-300 bg-rose-50/80 dark:border-rose-600 dark:bg-rose-950/30'
                      : 'border-violet-200 dark:border-violet-700'
                }`}
              />
              {submitted && chosen ? (
                <p className="text-xs text-violet-800 dark:text-violet-200">
                  <span className="font-semibold">{t('tests.studentSolve.yourChoice')}:</span> {chosen}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-1">
              {q.choices.map((c) => {
                const keyU = (c.key || '').trim().toUpperCase();
                const isPicked = chosen === keyU;
                const isCorrectOption = Boolean(correctKey && keyU === correctKey);
                let rowClass = 'flex items-start gap-2 rounded-lg border border-transparent px-2 py-1.5 text-sm';
                if (reviewMode) {
                  if (isCorrectOption) {
                    rowClass += ' border-emerald-300 bg-emerald-50/90 dark:border-emerald-700 dark:bg-emerald-950/40';
                  }
                  if (isPicked && !q.is_correct && !isCorrectOption) {
                    rowClass =
                      'flex items-start gap-2 rounded-lg border border-rose-300 bg-rose-50/90 px-2 py-1.5 text-sm dark:border-rose-700 dark:bg-rose-950/35';
                  }
                  if (isPicked && q.is_correct) {
                    rowClass += ' ring-1 ring-emerald-400 dark:ring-emerald-600';
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
          )}
          {submitted && isConstructed && correctConstructed ? (
            <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/90 px-3 py-2 text-sm font-semibold leading-snug text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/45 dark:text-emerald-50">
              {t('tests.studentSolve.correctConstructedLine').replace('{text}', correctConstructed)}
            </p>
          ) : null}
          {submitted && !isConstructed && correctKey ? (
            <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/90 px-3 py-2 text-sm font-semibold leading-snug text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/45 dark:text-emerald-50">
              {correctText
                ? t('tests.studentSolve.correctAnswerLine').replace('{key}', correctKey).replace('{text}', correctText)
                : t('tests.studentSolve.correctAnswerKeyOnly').replace('{key}', correctKey)}
            </p>
          ) : null}
        </div>
      );
    },
    [submitted, answers, t],
  );

  async function onSubmit(auto = false) {
    if (!detail || submitting || submitted) return;
    setSubmitting(true);
    try {
      const row = await kidsStudentSubmitTest(detail.id, answers, auto);
      setAttempt(row);
      const refreshed = await kidsStudentGetTest(detail.id);
      setDetail(refreshed);
      if (refreshed.attempt) setAttempt(refreshed.attempt);
      setShowCelebration(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('tests.studentSolve.submitError'));
    } finally {
      setSubmitting(false);
    }
  }

  const resultSubtitle = useMemo(() => {
    const raw = detail?.instructions?.trim();
    if (!raw) return '';
    const line = raw.split('\n').filter(Boolean)[0]?.slice(0, 160) || '';
    return kidsLocalizedReadingAnswerIntro(line, t);
  }, [detail?.instructions, t]);

  const durationLabel = useMemo(() => formatAttemptDuration(attempt, t), [attempt, t]);

  const resultSubIcon = useMemo(() => {
    if (!detail) return BookOpen;
    return testSubjectIcon(detail.title);
  }, [detail]);

  const scoreRounded = useMemo(() => {
    if (!attempt || typeof attempt.score !== 'number' || !Number.isFinite(attempt.score)) return null;
    return Math.round(attempt.score);
  }, [attempt]);

  if (authLoading || loading) return <p className="text-center text-sm">{t('common.loading')}</p>;
  if (!detail) return <p className="text-center text-sm">{t('tests.studentSolve.notFound')}</p>;

  const showReadingPanel = hasApiReadingContent || showFallbackReading;
  const SummaryIcon = resultSubIcon;

  return (
    <KidsPanelMax className="max-w-4xl space-y-6 px-1 pb-12 pt-2 sm:px-3 lg:px-6">
      {/* Marfi — test baslamadan once motivasyon, tamamlandiysa yok */}
      {!submitted && (
        <KidsMascotBubble
          mood="happy"
          messageKey="marfi.tests.goodLuck"
          dismissible
          storageKey={`marfi-test-solve-${testId}-${new Date().toDateString()}`}
          placement="left"
          mascotSize={82}
        />
      )}
      {/* ─── Teslim Kutlama Modali ─── */}
      {showCelebration && (
        <KidsCenteredModal
          title={
            <span className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" aria-hidden />
              {t('tests.studentSolve.celebrationTitle') || 'Testi Tamamladın!'}
            </span>
          }
          onClose={() => setShowCelebration(false)}
          maxWidthClass="max-w-sm"
          footer={
            <KidsPrimaryButton
              type="button"
              className="w-full"
              onClick={() => setShowCelebration(false)}
            >
              {t('tests.studentSolve.celebrationContinue') || 'Sonuçlara Bak'}
            </KidsPrimaryButton>
          }
        >
          <div className="relative pb-2 text-center">
            <div className="relative mx-auto flex justify-center">
              <div className="absolute inset-0 -m-6 rounded-full bg-gradient-to-br from-amber-300/30 to-violet-400/25 blur-2xl" aria-hidden />
              <KidsMascot mood="excited" size={150} />
            </div>
            <p className="relative mt-3 font-logo text-xl font-black text-violet-950 dark:text-violet-100">
              {t('tests.studentSolve.celebrationHeadline') || 'Harika iş çıkardın! 🎉'}
            </p>
            <p className="relative mt-2 text-sm font-semibold leading-relaxed text-slate-600 dark:text-gray-300">
              {t('tests.studentSolve.celebrationBody') || 'Cevapların kaydedildi. Sonuçlarını aşağıda görebilirsin.'}
            </p>
          </div>
        </KidsCenteredModal>
      )}

      <Link
        href={`${pathPrefix}/ogrenci/testler`}
        className="inline-flex rounded-full border border-violet-200/80 bg-white/60 px-4 py-2 text-xs font-bold text-violet-800 shadow-sm backdrop-blur-sm transition hover:bg-violet-50 dark:border-violet-800 dark:bg-zinc-900/60 dark:text-violet-200 dark:hover:bg-violet-950/40"
      >
        {t('tests.report.backTests')}
      </Link>

      {submitted && attempt ? (
        <div
          className={`relative border-emerald-400/30 dark:border-emerald-700/35 ${glassResultsCard}`}
        >
          <div className="absolute right-4 top-4 rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200">
            {t('tests.studentList.badgeCompleted')}
          </div>
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100/90 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
            <SummaryIcon className="h-7 w-7" strokeWidth={2} />
          </div>
          <h1 className="mb-2 pr-16 font-logo text-2xl font-extrabold uppercase leading-tight tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {detail.title}
          </h1>
          {resultSubtitle ? (
            <p className="mb-6 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">{resultSubtitle}</p>
          ) : (
            <div className="mb-6" />
          )}
          <div className="mb-6 grid grid-cols-2 gap-x-3 gap-y-4 text-sm">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span className="font-medium leading-tight">{t('tests.studentList.finishedLabel')}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600 dark:text-zinc-400">
              <ListChecks className="h-5 w-5 shrink-0 text-emerald-600" />
              <span className="leading-tight">
                {attempt.total_questions} {t('tests.reports.question')}
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-600 dark:text-zinc-400">
              <Timer className="h-5 w-5 shrink-0 text-emerald-600" />
              <span className="leading-tight">{durationLabel}</span>
            </div>
            <div className="flex items-center gap-2 text-fuchsia-700 dark:text-fuchsia-400">
              <Trophy className="h-5 w-5 shrink-0 fill-current" />
              <span className="font-bold leading-tight">
                {interpolate(t('tests.studentList.xpEarnedDisplay'), { n: KIDS_TEST_SUBMIT_XP })}
              </span>
            </div>
            <div className="col-span-2 flex items-center gap-2 text-slate-600 dark:text-zinc-400">
              <Star className="h-5 w-5 shrink-0 fill-amber-400 text-amber-500" />
              <span className="font-semibold leading-tight">
                {scoreRounded != null
                  ? interpolate(t('tests.studentSolve.resultScoreLine'), {
                      correct: attempt.total_correct,
                      total: attempt.total_questions,
                      score: scoreRounded,
                    })
                  : t('tests.studentList.scoreUnavailable')}
              </span>
            </div>
          </div>
          <a
            href="#ogrenci-test-sorular"
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-emerald-500/30 bg-white/40 py-4 text-sm font-bold text-emerald-800 transition-colors hover:bg-emerald-50/90 dark:border-emerald-600/40 dark:bg-zinc-900/40 dark:text-emerald-200 dark:hover:bg-emerald-950/40"
          >
            {t('tests.studentSolve.reviewQuestionsAnchor')}
            <Eye className="h-5 w-5" />
          </a>
        </div>
      ) : (
        <h1 className="font-logo text-2xl font-bold text-violet-950 dark:text-violet-50 sm:text-3xl">{detail.title}</h1>
      )}
      {showFallbackReading ? (
        instructionIntro.trim() ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {kidsLocalizedReadingAnswerIntro(instructionIntro, t)}
          </p>
        ) : null
      ) : detail.instructions?.trim() ? (
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {kidsLocalizedReadingAnswerIntro(detail.instructions.trim(), t)}
        </p>
      ) : null}

      {showReadingPanel ? (
        <div className="space-y-4">
          {hasApiReadingContent
            ? sortedPassages.map((p) => {
                if (!(p.title?.trim() || p.body?.trim())) return null;
                return (
                  <div
                    key={`read-${p.id}`}
                    className="rounded-2xl border-2 border-amber-200/90 bg-linear-to-b from-amber-50/90 to-white p-5 shadow-sm dark:border-amber-800/70 dark:from-amber-950/35 dark:to-gray-900/80"
                  >
                    <p className="text-[11px] font-black uppercase tracking-wider text-amber-800/90 dark:text-amber-300/90">
                      {t('tests.studentSolve.readingPassageHeading')}
                    </p>
                    {p.title?.trim() ? (
                      <h2 className="mt-2 text-lg font-bold text-amber-950 dark:text-amber-50">{p.title.trim()}</h2>
                    ) : null}
                    {p.body?.trim() ? (
                      <div className="mt-3 max-h-[min(70vh,28rem)] overflow-y-auto rounded-xl border border-amber-100/80 bg-white/80 p-4 text-base leading-relaxed text-slate-900 dark:border-amber-900/40 dark:bg-gray-950/50 dark:text-slate-100">
                        <p className="whitespace-pre-wrap">{p.body.trim()}</p>
                      </div>
                    ) : null}
                  </div>
                );
              })
            : null}
          {showFallbackReading && instructionStoryFallback ? (
            <div className="rounded-2xl border-2 border-amber-200/90 bg-linear-to-b from-amber-50/90 to-white p-5 shadow-sm dark:border-amber-800/70 dark:from-amber-950/35 dark:to-gray-900/80">
              <p className="text-[11px] font-black uppercase tracking-wider text-amber-800/90 dark:text-amber-300/90">
                {t('tests.studentSolve.readingPassageHeading')}
              </p>
              <div className="mt-3 max-h-[min(70vh,28rem)] overflow-y-auto rounded-xl border border-amber-100/80 bg-white/80 p-4 text-base leading-relaxed text-slate-900 dark:border-amber-900/40 dark:bg-gray-950/50 dark:text-slate-100">
                <p className="whitespace-pre-wrap">{instructionStoryFallback}</p>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {showReadingMissingHint ? (
        <div className="rounded-xl border border-amber-300/80 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100">
          {t('tests.studentSolve.readingMissingHint')}
        </div>
      ) : null}

      {!submitted ? (
        <div className="rounded-xl border border-violet-200 bg-white p-3 text-sm dark:border-violet-800 dark:bg-gray-900/70">
          {detail.duration_minutes ? (
            <p className="font-semibold text-violet-800 dark:text-violet-200">
              {t('tests.studentSolve.remainingTime')}{' '}
              {remainingSec == null
                ? t('tests.studentSolve.completed')
                : `${String(Math.floor(remainingSec / 60)).padStart(2, '0')}:${String(remainingSec % 60).padStart(2, '0')}`}
            </p>
          ) : (
            <p className="font-semibold text-violet-800 dark:text-violet-200">{t('tests.studentSolve.noTimeLimit')}</p>
          )}
        </div>
      ) : null}

      <div id="ogrenci-test-sorular" className="space-y-6 scroll-mt-28">
        {sortedPassages.map((p) => {
          const group = questionsByPassageOrder.get(p.order) ?? [];
          if (!group.length) return null;
          const showedReadingAbove = Boolean(p.title?.trim() || p.body?.trim());
          return (
            <section key={`passage-q-${p.id}`} className="space-y-3">
              {hasApiReadingContent && showedReadingAbove ? (
                <h2 className="border-b border-violet-200 pb-2 text-sm font-bold text-violet-900 dark:border-violet-800 dark:text-violet-100">
                  {p.title?.trim() || t('tests.studentSolve.followUpQuestions')}
                </h2>
              ) : null}
              <div className="space-y-3">{group.map((q) => renderQuestionCard(q))}</div>
            </section>
          );
        })}
        {ungroupedQuestions.length > 0 ? (
          <section className="space-y-3">
            {(hasApiReadingContent && questionsByPassageOrder.size > 0) || showFallbackReading ? (
              <h2 className="text-sm font-bold text-violet-900 dark:text-violet-100">{t('tests.studentSolve.otherQuestions')}</h2>
            ) : null}
            <div className="space-y-3">{ungroupedQuestions.map((q) => renderQuestionCard(q))}</div>
          </section>
        ) : null}
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
    </KidsPanelMax>
  );
}
