'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  kidsAssignmentSubmissionGate,
  kidsFormatAssignmentWindowTr,
  kidsStudentAssignmentAllRoundsSubmitted,
  type KidsAssignment,
} from '@/src/lib/kids-api';
import { KidsEmptyState } from '@/src/components/kids/kids-ui';
import {
  ArrowRight,
  Award,
  BadgeCheck,
  Calculator,
  CheckCircle2,
  Clock3,
  FlaskConical,
  ListFilter,
  Lock,
  MailOpen,
  Music,
  Palette,
  PartyPopper,
  Rocket,
  Sparkles,
  Star,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { useKidsI18n } from '@/src/providers/kids-language-provider';

/** Mockup (AIDA) görselleri — next.config.ts içinde lh3.googleusercontent.com izli */
const HERO_COSMIC_BG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBNqLITP8Vj_3n6ESyaFmzsEkIhbbgVjtQEZSs_SHk3WiEv5H42PkI3CrY4za-dM-iuVzpd1ih00QVklSmKLXWFHgZbs_hT9FCkHbBsiEZXGAHy5lJfCVw_JLjnRwckG--g2ieyPV8jnNl72Xm55xUzicpoWZeeMMfUmlIMuMVWjAsem73gOwsGEkjJeFTNQX0bSZQiA43kkx38-bBZT7eJw4xn1O7UuYDM2TezgX_7H-qnmX9ibRvTnO5Ctp3rs7LBGLaaa1KbNXN0';
const HERO_BEAR_IMG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAtvwT-J5u-JgP7bmtmUGLdJjTTmJmt6fxThhEvBPiv8oM4lwh_M8gFCmqKFjBOlWS3scCA5fYIzzXFeczs7991u7z52l2Abq4XTCYrLedTHk9p_sqsRQkTHb9Gokzmm_ZKdZi3ISi_TfLYEArwj5a0LPWIYRqVG0Q4Tga_Vxz3VG0gyr8-st1GpD0d6CGD-vcM7ZM1Yi2UcsX2A5w9XHUkeWmzmvDn4_O9vA1R2bWN-uslovhn8C_RbGJ7OlTbQVTRZ9lKDkd7Jsrb';

const glassCard =
  'rounded-lg border border-white/40 bg-white/75 p-6 shadow-sm backdrop-blur-md transition-all hover:shadow-xl dark:border-white/10 dark:bg-zinc-900/55';

const STREAK_WEEKDAY_KEYS = [
  'student.projects.streakWeekday0',
  'student.projects.streakWeekday1',
  'student.projects.streakWeekday2',
  'student.projects.streakWeekday3',
  'student.projects.streakWeekday4',
] as const;

/** Mockuptaki Pzt–Cum çemberleri: bu hafta tamamlanan challenge sayısı (üst sınır 5). */
const WEEKLY_STREAK_GOAL = 5;

const STREAK_DAY_LETTERS = ['M', 'T', 'W', 'T', 'F'] as const;

/** Yerel saat diliminde ISO haftası — Pazartesi 00:00. */
function startOfLocalIsoWeek(ref: Date): Date {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const dow = d.getDay();
  const daysFromMonday = dow === 0 ? 6 : dow - 1;
  d.setDate(d.getDate() - daysFromMonday);
  d.setHours(0, 0, 0, 0);
  return d;
}

function countDoneAssignmentsInLocalIsoWeek(done: KidsAssignment[], ref: Date = new Date()): number {
  const start = startOfLocalIsoWeek(ref);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const t0 = start.getTime();
  const t1 = end.getTime();
  return done.filter((a) => {
    const ts = new Date(a.updated_at).getTime();
    return ts >= t0 && ts < t1;
  }).length;
}

function rubricMaxPoints(a: KidsAssignment): number | null {
  if (!a.rubric_schema?.length) return null;
  const n = a.rubric_schema.reduce((s, r) => s + (typeof r.max_points === 'number' ? r.max_points : 0), 0);
  return n > 0 ? n : null;
}

function progressSteps(a: KidsAssignment): { sub: number; tot: number } {
  const rp = a.my_rounds_progress;
  if (rp && rp.total > 0) return { sub: rp.submitted, tot: rp.total };
  if (a.my_submission) return { sub: 1, tot: 1 };
  return { sub: 0, tot: Math.max(1, a.submission_rounds ?? 1) };
}

function buildRoundQs(a: KidsAssignment): string {
  const rp = a.my_rounds_progress;
  if (rp && rp.total > 1 && rp.submitted < rp.total) {
    return `?round=${Math.min(rp.total, rp.submitted + 1)}`;
  }
  return '';
}

function pickHeroAssignment(ongoing: KidsAssignment[]): KidsAssignment | null {
  if (ongoing.length === 0) return null;
  const scored = ongoing.map((a) => {
    const g = kidsAssignmentSubmissionGate(a);
    const closes = a.submission_closes_at ? new Date(a.submission_closes_at).getTime() : Number.POSITIVE_INFINITY;
    return { a, g, closes };
  });
  const open = scored.filter((x) => x.g.ok);
  const pool = open.length > 0 ? open : scored;
  return [...pool].sort((x, y) => x.closes - y.closes)[0]!.a;
}

function pickSuperChallengeId(list: KidsAssignment[]): number | null {
  if (list.length === 0) return null;
  const music = list.find((x) => x.challenge_card_theme === 'music');
  if (music) return music.id;
  const heavy = list.filter((x) => (x.submission_rounds ?? 1) >= 3);
  if (heavy.length) return heavy.sort((a, b) => b.id - a.id)[0]!.id;
  return list.sort((a, b) => b.id - a.id)[0]!.id;
}

function themeIcon(theme: KidsAssignment['challenge_card_theme']) {
  const cls = 'h-9 w-9';
  if (theme === 'art') return <Palette className={cls} strokeWidth={2} aria-hidden />;
  if (theme === 'science') return <FlaskConical className={cls} strokeWidth={2} aria-hidden />;
  if (theme === 'motion') return <Zap className={cls} strokeWidth={2} aria-hidden />;
  if (theme === 'music') return <Music className={cls} strokeWidth={2} aria-hidden />;
  return <Calculator className={cls} strokeWidth={2} aria-hidden />;
}

function themeIconWrapClass(theme: KidsAssignment['challenge_card_theme'], inverted?: boolean): string {
  if (inverted) return 'rounded-2xl bg-white/20 text-white backdrop-blur-md';
  if (theme === 'art') return 'rounded-2xl bg-fuchsia-100/80 text-fuchsia-600 dark:bg-fuchsia-950/40 dark:text-fuchsia-300';
  if (theme === 'science') return 'rounded-2xl bg-sky-100 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300';
  if (theme === 'motion') return 'rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300';
  if (theme === 'music') return 'rounded-2xl bg-violet-200/80 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300';
  return 'rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300';
}

function themeIconWrapDone(theme: KidsAssignment['challenge_card_theme']): string {
  if (theme === 'art') return 'rounded-2xl bg-green-100 text-green-600 dark:bg-green-950/40 dark:text-green-300';
  if (theme === 'science') return 'rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300';
  return 'rounded-2xl bg-green-100 text-green-600 dark:bg-green-950/40 dark:text-green-300';
}

function formatShortDate(iso: string, lang: string): string {
  const loc = lang === 'tr' ? 'tr-TR' : lang === 'ge' ? 'de-DE' : 'en-US';
  try {
    return new Date(iso).toLocaleDateString(loc, { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

function ChallengeCountdown({ iso }: { iso: string | null | undefined }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!iso) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [iso]);
  if (!iso) return null;
  const end = new Date(iso).getTime();
  const ms = Math.max(0, end - Date.now());
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return (
    <span className="font-mono text-sm font-black tabular-nums">
      {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  );
}

function assignmentSummaryBits(
  a: KidsAssignment,
  wl: string | null,
  gate: ReturnType<typeof kidsAssignmentSubmissionGate>,
  t: (key: string) => string,
): string[] {
  const bits: string[] = [];
  if (a.require_video) {
    bits.push(t('student.projects.summaryVideoMax').replace('{sec}', String(a.video_max_seconds)));
  }
  if (a.require_image) {
    bits.push(t('student.projects.summaryImageOne'));
  }
  if (a.require_image || a.require_video) {
    bits.push(t('student.projects.summaryRounds').replace('{n}', String(a.submission_rounds ?? 1)));
  }
  if (wl) bits.push(t('student.projects.summaryCalendar').replace('{wl}', wl));
  if (!gate.ok) {
    bits.push(gate.phase === 'not_yet' ? t('student.projects.gateNotYet') : t('student.projects.gateClosed'));
  }
  return bits;
}

function assignmentPlayState(
  a: KidsAssignment,
  gate: ReturnType<typeof kidsAssignmentSubmissionGate>,
  t: (key: string) => string,
): { emoji: string; label: string } {
  if (!gate.ok) {
    if (gate.phase === 'not_yet') return { emoji: 'time', label: t('student.projects.playSoon') };
    return { emoji: 'lock', label: t('student.projects.playClosed') };
  }
  const s = a.my_submission;
  if (!s) return { emoji: 'rocket', label: t('student.projects.playStart') };
  if (s.is_teacher_pick) return { emoji: 'star', label: t('student.projects.playStarPick') };
  if (!s.teacher_reviewed_at) return { emoji: 'mail', label: t('student.projects.playReviewing') };
  if (s.teacher_review_positive === true) return { emoji: 'star', label: t('student.projects.playGreatFeedback') };
  if (s.teacher_review_positive === false) return { emoji: 'rocket', label: t('student.projects.playMore') };
  return { emoji: 'ok', label: t('student.projects.playSent') };
}

function cardStatusLabel(a: KidsAssignment, tab: string, t: (key: string) => string): string {
  if (tab === 'done') return t('student.projects.cardStatusCompleted');
  if (tab === 'expired') return t('student.projects.cardStatusExpired');
  const g = kidsAssignmentSubmissionGate(a);
  if (!g.ok && g.phase === 'not_yet') return t('student.projects.cardStatusSoon');
  return t('student.projects.cardStatusInProgress');
}

function cardStatusStyles(tab: string, a: KidsAssignment): string {
  if (tab === 'done') return 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-200';
  if (tab === 'expired') return 'bg-zinc-200/80 text-zinc-600 dark:bg-zinc-500/20 dark:text-zinc-300';
  const g = kidsAssignmentSubmissionGate(a);
  if (!g.ok && g.phase === 'not_yet') return 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-100';
  return 'bg-violet-500/10 text-violet-700 dark:bg-violet-400/15 dark:text-violet-200';
}

function cardCtaLabel(
  a: KidsAssignment,
  tab: string,
  gate: ReturnType<typeof kidsAssignmentSubmissionGate>,
  t: (key: string) => string,
): string {
  if (tab === 'done') return t('student.projects.cardReview');
  if (tab === 'expired') return t('student.projects.cardViewArchived');
  if (!gate.ok) return t('student.projects.cardView');
  const rp = a.my_rounds_progress;
  if (!a.my_submission || (rp && rp.submitted === 0)) return t('student.projects.cardStart');
  return t('student.projects.cardContinue');
}

export type KidsStudentProjectsPanelProps = {
  pathPrefix: string;
  assignments: KidsAssignment[];
  loading: boolean;
  showBackToPanel?: boolean;
};

const TAB_IDS = ['ongoing', 'done', 'expired'] as const;

function CardPeerOrMeta({
  a,
  tab,
  t,
  language,
  isSuper,
}: {
  a: KidsAssignment;
  tab: string;
  t: (key: string) => string;
  language: string;
  isSuper: boolean;
}) {
  if (tab === 'done') {
    const when = a.my_submission?.teacher_reviewed_at || a.updated_at;
    return (
      <div className="mb-6 flex items-center gap-2">
        <span className="text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
        </span>
        <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500">
          {t('student.projects.cardFinishedOn').replace('{date}', formatShortDate(when, language))}
        </span>
      </div>
    );
  }
  const enrolled = a.enrolled_student_count;
  const subc = a.submission_count;
  if (typeof enrolled === 'number' && enrolled > 0) {
    return (
      <div className="mb-6 flex items-center gap-2">
        <div className="flex -space-x-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-6 w-6 rounded-full border-2 border-white bg-linear-to-br from-zinc-200 to-zinc-400 dark:border-zinc-800 dark:from-zinc-600 dark:to-zinc-700"
              aria-hidden
            />
          ))}
        </div>
        <span
          className={`text-[10px] font-bold ${isSuper ? 'text-white/70' : 'text-slate-400 dark:text-zinc-500'}`}
        >
          {t('student.projects.cardPeersJoined').replace('{n}', String(enrolled))}
        </span>
      </div>
    );
  }
  if (typeof subc === 'number' && subc > 0) {
    return (
      <div className={`mb-6 flex items-center gap-2 ${isSuper ? 'text-white/70' : 'text-slate-400 dark:text-zinc-500'}`}>
        <Users className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="text-[10px] font-bold">{t('student.projects.cardSubmissionsLine').replace('{n}', String(subc))}</span>
      </div>
    );
  }
  const snippet = (a.purpose || a.materials || '').trim().slice(0, 96);
  if (snippet) {
    return (
      <p
        className={`mb-6 text-[10px] font-bold leading-snug ${isSuper ? 'text-white/70' : 'text-slate-400 dark:text-zinc-500'}`}
      >
        {snippet}
        {snippet.length >= 96 ? '…' : ''}
      </p>
    );
  }
  return <div className="mb-6" />;
}

function WeeklyStreakSection({
  t,
  doneThisWeek,
  weekdayLabels,
}: {
  t: (key: string) => string;
  doneThisWeek: number;
  weekdayLabels: readonly string[];
}) {
  const goal = WEEKLY_STREAK_GOAL;
  const filledSlots = Math.min(doneThisWeek, goal);
  const need = Math.max(0, goal - doneThisWeek);
  const body =
    need > 0
      ? t('student.projects.streakBodyNeed').replace('{n}', String(need))
      : t('student.projects.streakBodyGreat');
  const days = STREAK_DAY_LETTERS.map((letter, i) => ({
    letter,
    active: i < filledSlots,
  }));
  return (
    <section className="mt-16 flex flex-col gap-8 rounded-xl bg-zinc-100 p-6 shadow-inner dark:bg-zinc-800/80 md:flex-row md:items-center md:justify-between md:p-8">
      <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-violet-200/60 shadow-inner dark:bg-violet-950/50">
          <Trophy className="h-10 w-10 text-violet-600 dark:text-violet-400" aria-hidden />
        </div>
        <div>
          <h3 className="font-logo text-2xl font-black text-slate-900 dark:text-white">{t('student.projects.streakTitle')}</h3>
          <p className="mt-1 max-w-xl text-sm font-medium text-slate-500 dark:text-zinc-400">{body}</p>
        </div>
      </div>
      <div className="flex justify-center gap-4 sm:justify-end">
        {days.map((d, i) => (
          <div key={i} className={`flex flex-col items-center ${d.active ? '' : 'opacity-40'}`}>
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold ring-4 ${
                d.active
                  ? 'bg-violet-600 text-white ring-violet-500/25'
                  : 'bg-zinc-200 text-zinc-500 ring-transparent dark:bg-zinc-700 dark:text-zinc-400'
              }`}
            >
              {d.letter}
            </div>
            <span className="mt-2 text-[10px] font-bold text-slate-500 dark:text-zinc-500">{weekdayLabels[i] ?? ''}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function KidsStudentProjectsPanel({
  pathPrefix,
  assignments,
  loading,
  showBackToPanel,
}: KidsStudentProjectsPanelProps) {
  const { t, language } = useKidsI18n();
  const { ongoing, expired, done } = useMemo(() => {
    const o: KidsAssignment[] = [];
    const e: KidsAssignment[] = [];
    const d: KidsAssignment[] = [];
    for (const a of assignments) {
      if (kidsStudentAssignmentAllRoundsSubmitted(a)) {
        d.push(a);
        continue;
      }
      const gate = kidsAssignmentSubmissionGate(a);
      if (!gate.ok && gate.phase === 'closed') {
        e.push(a);
        continue;
      }
      o.push(a);
    }
    return { ongoing: o, expired: e, done: d };
  }, [assignments]);

  const [tab, setTab] = useState<string>('ongoing');

  const tabLabels = useMemo(
    () => ({
      ongoing: t('student.projects.tabOngoingShort'),
      done: t('student.projects.tabDoneShort'),
      expired: t('student.projects.tabExpiredShort'),
    }),
    [t],
  );

  const tabCounts = useMemo(
    () => ({ ongoing: ongoing.length, done: done.length, expired: expired.length }),
    [ongoing.length, done.length, expired.length],
  );

  const visible = tab === 'expired' ? expired : tab === 'done' ? done : ongoing;

  const sortedVisible = useMemo(() => {
    return [...visible].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [visible]);

  const heroAssignment = useMemo(() => pickHeroAssignment(ongoing), [ongoing]);

  const superId = useMemo(() => pickSuperChallengeId(sortedVisible), [sortedVisible]);

  const doneThisWeek = useMemo(() => countDoneAssignmentsInLocalIsoWeek(done), [done]);

  return (
    <div className="mx-auto min-w-0 max-w-6xl space-y-8 px-1 sm:px-0">
      {showBackToPanel ? (
        <Link
          href={`${pathPrefix}/ogrenci/panel`}
          className="inline-flex text-sm font-bold text-violet-700 hover:underline dark:text-violet-300"
        >
          {t('student.projects.backToPanel')}
        </Link>
      ) : null}

      <header className="space-y-1">
        <h1 className="font-logo text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          {t('student.projects.pageTitle')}
        </h1>
        <p className="max-w-2xl text-sm font-medium text-zinc-600 dark:text-zinc-400">{t('student.projects.pageSubtitle')}</p>
      </header>

      {loading ? (
        <div className="space-y-8">
          <div className="h-[380px] animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-14 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((k) => (
              <div key={k} className="h-72 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
            ))}
          </div>
        </div>
      ) : assignments.length === 0 ? (
        <p className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          {t('student.projects.noAssignments')}
        </p>
      ) : (
        <>
          {heroAssignment ? (
            <ProjectsHeroBanner assignment={heroAssignment} pathPrefix={pathPrefix} t={t} />
          ) : null}

          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div
              className="flex w-full gap-2 overflow-x-auto rounded-2xl bg-zinc-100 p-1.5 dark:bg-zinc-800/90 sm:w-auto"
              role="tablist"
              aria-label={t('student.projects.ariaChallengeList')}
            >
              {TAB_IDS.map((id) => {
                const on = tab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => setTab(id)}
                    className={`shrink-0 rounded-xl px-6 py-3 text-sm font-bold transition-all sm:px-8 ${
                      on
                        ? 'bg-white text-violet-700 shadow-sm dark:bg-zinc-100 dark:text-violet-800'
                        : 'text-slate-500 hover:bg-white/50 dark:text-zinc-400 dark:hover:bg-zinc-700/50'
                    }`}
                  >
                    {tabLabels[id]}
                    <span className="ml-1.5 tabular-nums opacity-70">({tabCounts[id]})</span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-400 dark:text-zinc-500">
              <ListFilter className="h-4 w-4 shrink-0" aria-hidden />
              <span>{t('student.projects.sortByRecent')}</span>
            </div>
          </div>

          {visible.length === 0 ? (
            tab === 'ongoing' ? (
              <KidsEmptyState
                icon={<PartyPopper className="h-12 w-12 text-amber-500" />}
                title={t('student.projects.emptyOngoingTitle')}
                description={
                  done.length > 0
                    ? t('student.projects.emptyOngoingDescDone')
                    : t('student.projects.emptyOngoingDescNone')
                }
              />
            ) : tab === 'done' ? (
              <KidsEmptyState
                icon={<BadgeCheck className="h-12 w-12 text-emerald-500" />}
                title={t('student.projects.emptyDoneTitle')}
                description={t('student.projects.emptyDoneDesc')}
              />
            ) : (
              <KidsEmptyState
                icon={<Clock3 className="h-12 w-12 text-violet-500" />}
                title={t('student.projects.emptyExpiredTitle')}
                description={t('student.projects.emptyExpiredDesc')}
              />
            )
          ) : (
            <div className="grid min-w-0 grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {sortedVisible.map((a) => {
                const gate = kidsAssignmentSubmissionGate(a);
                const wl = kidsFormatAssignmentWindowTr(a);
                const summaryBits = assignmentSummaryBits(a, wl || null, gate, t);
                const play = assignmentPlayState(a, gate, t);
                const roundQs = buildRoundQs(a);
                const href = `${pathPrefix}/ogrenci/proje/${a.id}${roundQs}`;
                const { sub, tot } = progressSteps(a);
                const pct = tot > 0 ? Math.min(100, Math.round((sub / tot) * 100)) : 0;
                const pts = rubricMaxPoints(a);
                const isSuper = Boolean(superId && a.id === superId && sortedVisible.length > 1);
                const barWidth = Math.max(pct, isSuper && pct < 10 && tab !== 'done' ? 8 : 0);
                const status = cardStatusLabel(a, tab, t);
                const cta = cardCtaLabel(a, tab, gate, t);
                const iconWrap = isSuper
                  ? themeIconWrapClass(a.challenge_card_theme, true)
                  : tab === 'done'
                    ? themeIconWrapDone(a.challenge_card_theme)
                    : themeIconWrapClass(a.challenge_card_theme, false);

                return (
                  <article
                    key={a.id}
                    className={
                      isSuper
                        ? 'group relative flex min-h-[280px] flex-col overflow-hidden rounded-lg bg-violet-600 p-6 text-white shadow-xl shadow-violet-500/20 transition-all hover:-translate-y-2'
                        : tab === 'done'
                          ? `${glassCard} group relative flex min-h-0 flex-col opacity-70 hover:opacity-100`
                          : `${glassCard} group relative flex min-h-0 flex-col`
                    }
                  >
                    {isSuper ? (
                      <Sparkles
                        className="pointer-events-none absolute -right-4 -top-4 h-32 w-32 text-white/20 sm:h-40 sm:w-40"
                        strokeWidth={1}
                        aria-hidden
                      />
                    ) : null}
                    <div className="relative z-10 flex min-h-0 flex-1 flex-col">
                      <div className="mb-6 flex items-start justify-between gap-3">
                        <div className={`flex h-16 w-16 shrink-0 items-center justify-center ${iconWrap}`}>
                          {themeIcon(a.challenge_card_theme)}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {isSuper ? (
                            <span className="rounded-full bg-white/30 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white">
                              {t('student.projects.cardSuperChallenge')}
                            </span>
                          ) : (
                            <span
                              className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ${cardStatusStyles(tab, a)}`}
                            >
                              {status}
                            </span>
                          )}
                        </div>
                      </div>

                      <h2
                        className={`font-logo text-xl font-bold leading-tight ${isSuper ? 'text-white' : 'text-slate-900 transition-colors group-hover:text-violet-600 dark:text-white dark:group-hover:text-violet-300'}`}
                      >
                        <Link href={href} className="hover:underline">
                          {a.title}
                        </Link>
                      </h2>

                      <CardPeerOrMeta a={a} tab={tab} t={t} language={language} isSuper={isSuper} />

                      <div className={`mb-8 min-w-0 space-y-4 ${isSuper ? 'mt-auto' : ''}`}>
                        <div
                          className={`flex justify-between text-xs font-bold ${isSuper ? 'text-white/80' : 'text-slate-500 dark:text-zinc-400'}`}
                        >
                          <span>{t('student.projects.cardProgressLabel')}</span>
                          <span>
                            {t('student.projects.cardStepsFraction')
                              .replace('{sub}', String(sub))
                              .replace('{tot}', String(tot))}
                          </span>
                        </div>
                        <div
                          className={`h-3 w-full overflow-hidden rounded-full ${
                            tab === 'done'
                              ? 'bg-green-200 dark:bg-green-900/40'
                              : isSuper
                                ? 'bg-white/10'
                                : 'bg-zinc-200 dark:bg-zinc-700'
                          }`}
                        >
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              tab === 'done'
                                ? 'bg-green-500'
                                : isSuper
                                  ? 'min-w-2 bg-white'
                                  : 'bg-linear-to-r from-violet-600 to-violet-400 shadow-[0_0_10px_rgba(124,58,237,0.35)]'
                            }`}
                            style={{ width: tab === 'done' ? '100%' : `${barWidth}%` }}
                          />
                        </div>
                      </div>

                      <div
                        className={`mt-auto flex flex-wrap items-center justify-between gap-3 border-t pt-4 ${
                          isSuper ? 'border-white/10' : 'border-black/5 dark:border-white/10'
                        }`}
                      >
                        <div
                          className={`flex min-w-0 items-center gap-2 text-sm font-bold ${
                            isSuper
                              ? 'text-amber-200'
                              : tab === 'done'
                                ? 'text-slate-400 dark:text-zinc-500'
                                : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {tab === 'done' ? (
                            <BadgeCheck className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
                          ) : isSuper ? (
                            <Award className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
                          ) : pts != null ? (
                            <Trophy className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
                          ) : (
                            <Award className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
                          )}
                          <span className="truncate">
                            {tab === 'done'
                              ? t('student.projects.cardBadgeEarned')
                              : isSuper
                                ? t('student.projects.cardRareReward')
                                : pts != null
                                  ? t('student.projects.cardXpLine').replace('{n}', String(pts))
                                  : t('student.projects.cardRewardBadge')}
                          </span>
                        </div>
                        <Link
                          href={href}
                          className={`inline-flex shrink-0 items-center justify-center rounded-xl px-6 py-2.5 text-sm font-bold transition-all ${
                            isSuper
                              ? 'bg-white text-violet-600 hover:bg-white/90'
                              : tab === 'done'
                                ? 'cursor-pointer bg-zinc-100 text-slate-500 hover:bg-violet-600 hover:text-white dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-violet-600 dark:hover:text-white'
                                : 'bg-zinc-100 text-violet-700 hover:bg-violet-600 hover:text-white dark:bg-zinc-800 dark:text-violet-300 dark:hover:bg-violet-600 dark:hover:text-white'
                          }`}
                        >
                          {isSuper ? t('student.projects.cardLetsGo') : cta}
                        </Link>
                      </div>

                      {!isSuper && summaryBits.length > 0 ? (
                        <p className="mt-3 line-clamp-2 text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                          {play.emoji === 'time' ? <Clock3 className="mb-0.5 mr-1 inline h-3.5 w-3.5" /> : null}
                          {play.emoji === 'lock' ? <Lock className="mb-0.5 mr-1 inline h-3.5 w-3.5" /> : null}
                          {play.emoji === 'rocket' ? <Rocket className="mb-0.5 mr-1 inline h-3.5 w-3.5" /> : null}
                          {play.emoji === 'star' ? <Star className="mb-0.5 mr-1 inline h-3.5 w-3.5" /> : null}
                          {play.emoji === 'mail' ? <MailOpen className="mb-0.5 mr-1 inline h-3.5 w-3.5" /> : null}
                          {play.emoji === 'ok' ? <BadgeCheck className="mb-0.5 mr-1 inline h-3.5 w-3.5" /> : null}
                          {play.label} · {summaryBits.slice(0, 2).join(' · ')}
                        </p>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {assignments.length > 0 ? (
            <WeeklyStreakSection
              t={t}
              doneThisWeek={doneThisWeek}
              weekdayLabels={STREAK_WEEKDAY_KEYS.map((k) => t(k))}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

function ProjectsHeroBanner({
  assignment,
  pathPrefix,
  t,
}: {
  assignment: KidsAssignment;
  pathPrefix: string;
  t: (key: string) => string;
}) {
  const gate = kidsAssignmentSubmissionGate(assignment);
  const roundQs = buildRoundQs(assignment);
  const href = `${pathPrefix}/ogrenci/proje/${assignment.id}${roundQs}`;
  const pts = rubricMaxPoints(assignment);
  const desc = (assignment.purpose || assignment.materials || '').trim();
  const shortDesc = desc.length > 200 ? `${desc.slice(0, 197)}…` : desc;

  return (
    <section className="relative mb-12 h-[min(380px,70vh)] min-h-[280px] overflow-hidden rounded-xl shadow-2xl shadow-violet-500/10">
      <div className="absolute inset-0">
        <Image
          src={HERO_COSMIC_BG}
          alt=""
          fill
          priority
          className="object-cover"
          sizes="(max-width: 1280px) 100vw, 1152px"
        />
        <div className="absolute inset-0 bg-linear-to-r from-violet-600/85 via-violet-600/50 to-transparent" aria-hidden />
      </div>
      <div className="relative z-10 flex h-full flex-col justify-center px-6 py-8 text-white sm:px-10 md:px-12">
        <div className="max-w-2xl">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-amber-300 px-4 py-1 text-xs font-black text-amber-950">
              <Zap className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} aria-hidden />
              {t('student.projects.heroChallengeOfDay')}
            </span>
            {assignment.submission_closes_at ? (
              <div className="flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-sm font-bold backdrop-blur-md">
                <Clock3 className="h-4 w-4 shrink-0 opacity-95" aria-hidden />
                <span>
                  {t('student.projects.heroEndsIn')}{' '}
                  <ChallengeCountdown iso={assignment.submission_closes_at} />
                </span>
              </div>
            ) : null}
          </div>
          <h2 className="font-logo text-3xl font-black leading-tight sm:text-4xl md:text-5xl lg:text-6xl">
            {assignment.title}
          </h2>
          {shortDesc ? (
            <p className="mb-8 mt-4 max-w-xl text-base font-medium leading-relaxed opacity-90 sm:text-lg">{shortDesc}</p>
          ) : (
            <div className="mb-8" />
          )}
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href={href}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-lg font-bold text-violet-600 shadow-xl transition-all hover:-translate-y-0.5 hover:bg-zinc-50 sm:px-10"
            >
              <span>{t('student.projects.heroStartMission')}</span>
              <ArrowRight className="h-5 w-5 shrink-0" aria-hidden />
            </Link>
            <div className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-4 backdrop-blur-md sm:px-6">
              <Star className="h-5 w-5 shrink-0 text-amber-200" fill="currentColor" aria-hidden />
              <span className="font-bold">
                {pts != null
                  ? t('student.projects.heroXpReward').replace('{n}', String(pts))
                  : t('student.projects.heroXpGeneric')}
              </span>
            </div>
          </div>
          {!gate.ok ? (
            <p className="mt-4 text-xs font-semibold text-amber-200">
              {gate.phase === 'not_yet' ? t('student.projects.gateNotYet') : t('student.projects.gateClosed')}
            </p>
          ) : null}
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-0 right-2 hidden h-52 w-52 sm:block md:right-8 md:h-72 md:w-72 lg:right-12 lg:h-80 lg:w-80">
        <Image
          src={HERO_BEAR_IMG}
          alt=""
          fill
          className="object-contain object-bottom"
          sizes="320px"
        />
      </div>
    </section>
  );
}
