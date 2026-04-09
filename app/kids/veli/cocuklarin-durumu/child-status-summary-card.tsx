'use client';

import { useEffect, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Lightbulb,
  Lock,
  Rocket,
  Sparkles,
  Star,
  Zap,
} from 'lucide-react';
import type { KidsParentChildOverview } from '@/src/lib/kids-api';

export type SummaryCardTab = 'challenges' | 'homework' | 'tests' | 'preschool';

function initials(first: string, last: string): string {
  const a = (first[0] || '?').toUpperCase();
  const b = (last[0] || first[1] || '?').toUpperCase();
  return `${a}${b}`;
}

function testPct(c: KidsParentChildOverview): number | null {
  const tests = c.test_attempts_history ?? [];
  const last = tests[0];
  if (!last || !last.total_questions) return null;
  return Math.round((last.total_correct / last.total_questions) * 100);
}

function weeklyTimeParts(c: KidsParentChildOverview): { h: number; m: number; ratio: number } | null {
  let sub = 0;
  let tot = 0;
  for (const a of c.assignments_recent ?? []) {
    sub += a.rounds_submitted;
    tot += Math.max(1, a.submission_rounds);
  }
  if (tot <= 0) return null;
  const ratio = Math.min(1, sub / tot);
  const minutes = Math.round(ratio * 14 * 60);
  return { h: Math.floor(minutes / 60), m: minutes % 60, ratio };
}

function completedHomeworkCount(c: KidsParentChildOverview): number {
  return (c.homework_history ?? []).filter((h) =>
    ['teacher_approved', 'parent_approved'].includes(h.status),
  ).length;
}

function presenceKind(
  c: KidsParentChildOverview,
): 'online' | 'attention' | 'away' {
  if ((c.pending_parent_actions ?? []).length > 0) return 'attention';
  const ch = c.challenges ?? [];
  if (ch.some((x) => x.status !== 'completed' && x.status !== 'rejected')) return 'online';
  return 'away';
}

export function ChildStatusSummaryCard({
  child: c,
  index,
  t,
  challengeStatusLabel,
  homeworkStatusLabel,
  hasPreschool = false,
  onOpenDetail,
}: {
  child: KidsParentChildOverview;
  index: number;
  t: (key: string) => string;
  challengeStatusLabel: Record<string, string>;
  homeworkStatusLabel: Record<string, string>;
  hasPreschool?: boolean;
  onOpenDetail: () => void;
}) {
  const [cardTab, setCardTab] = useState<SummaryCardTab>(
    index % 2 === 0 ? 'challenges' : 'homework',
  );
  useEffect(() => {
    if (!hasPreschool && cardTab === 'preschool') setCardTab('challenges');
  }, [hasPreschool, cardTab]);
  const primary = index % 2 === 0;
  const score = testPct(c);
  const presence = presenceKind(c);
  const className = c.classes[0]?.name ?? '—';
  const wt = weeklyTimeParts(c);
  const hwDone = completedHomeworkCount(c);
  const hwTotal = Math.max(1, (c.homework_history ?? []).length);
  const hwBar = Math.round((hwDone / hwTotal) * 100);
  const weekBar = wt ? Math.max(12, Math.round(wt.ratio * 100)) : 0;

  const ch0 = (c.challenges ?? [])[0];
  const hw0 = (c.homework_history ?? [])[0];
  const te0 = (c.test_attempts_history ?? [])[0];

  const tabs: { id: SummaryCardTab; label: string }[] = (
    hasPreschool
      ? [
          { id: 'challenges', label: t('childrenStatus.mockupTabChallenge') },
          { id: 'homework', label: t('childrenStatus.mockupTabHomework') },
          { id: 'tests', label: t('childrenStatus.mockupTabTests') },
          { id: 'preschool', label: t('childrenStatus.mockupTabFollow') },
        ]
      : [
          { id: 'challenges', label: t('childrenStatus.mockupTabChallenge') },
          { id: 'homework', label: t('childrenStatus.mockupTabHomework') },
          { id: 'tests', label: t('childrenStatus.mockupTabTests') },
        ]
  ) as { id: SummaryCardTab; label: string }[];

  const glass =
    'rounded-3xl border border-white/60 bg-white/75 p-8 shadow-lg shadow-slate-900/5 backdrop-blur-md dark:border-zinc-700/80 dark:bg-zinc-900/70';
  const hoverRing = primary
    ? 'hover:shadow-2xl hover:shadow-violet-500/15'
    : 'hover:shadow-2xl hover:shadow-fuchsia-500/15';

  return (
    <div className={`${glass} flex flex-col gap-8 transition-all duration-500 ${hoverRing}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
            <div
              className={`flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl font-black text-white shadow-lg ring-4 ring-white dark:ring-zinc-800 ${
                primary ? 'from-violet-500 to-fuchsia-500' : 'from-fuchsia-500 to-pink-500'
              }`}
            >
              {initials(c.first_name, c.last_name)}
            </div>
            <div
              className={`absolute -bottom-2 -right-2 rounded-lg p-1 text-white shadow-md ${
                primary ? 'bg-emerald-500' : 'bg-pink-500'
              }`}
            >
              {primary ? (
                <Zap className="block h-3.5 w-3.5" strokeWidth={2.5} />
              ) : (
                <Star className="block h-3.5 w-3.5" strokeWidth={2.5} fill="currentColor" />
              )}
            </div>
          </div>
          <div className="min-w-0">
            <h3 className="font-logo text-2xl font-bold tracking-tight text-slate-900 dark:text-white md:text-3xl">
              {c.first_name} {c.last_name}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500 dark:text-zinc-400">
              <span>{className}</span>
            </div>
            <div className="mt-3">
              {presence === 'online' ? (
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
                  <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-500" />
                  {t('childrenStatus.mockupOnline')}
                </span>
              ) : presence === 'attention' ? (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                  <span className="mr-2 inline-block h-2 w-2 rounded-full bg-amber-500" />
                  {t('childrenStatus.mockupAttention')}
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <span className="mr-2 inline-block h-2 w-2 rounded-full bg-slate-400" />
                  {t('childrenStatus.mockupAway')}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="shrink-0 text-right sm:pl-4">
          <div
            className={`inline-block rounded-2xl p-4 ${
              primary ? 'bg-violet-500/10' : 'bg-fuchsia-500/10'
            }`}
          >
            <span
              className={`block font-logo text-3xl font-black ${
                primary ? 'text-violet-600 dark:text-violet-400' : 'text-fuchsia-600 dark:text-fuchsia-400'
              }`}
            >
              {score != null ? `%${score}` : '—'}
            </span>
            <span
              className={`text-[10px] font-bold uppercase tracking-tight ${
                primary ? 'text-violet-700/80 dark:text-violet-300/90' : 'text-fuchsia-700/80 dark:text-fuchsia-300/90'
              }`}
            >
              {t('childrenStatus.mockupSuccessScore')}
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-1 rounded-2xl bg-slate-100/90 p-1.5 dark:bg-zinc-800/90">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setCardTab(tab.id)}
            className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
              cardTab === tab.id
                ? primary
                  ? 'bg-white text-violet-700 shadow-sm dark:bg-zinc-900 dark:text-violet-300'
                  : 'bg-white text-fuchsia-700 shadow-sm dark:bg-zinc-900 dark:text-fuchsia-300'
                : 'text-slate-500 hover:bg-white/60 dark:text-zinc-400 dark:hover:bg-zinc-700/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {cardTab === 'challenges' && ch0 ? (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/50 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
            <div className="flex min-w-0 items-center gap-4">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  primary ? 'bg-violet-100 text-violet-600' : 'bg-fuchsia-100 text-fuchsia-600'
                }`}
              >
                <Rocket className="h-5 w-5" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <h4 className="truncate font-bold text-slate-900 dark:text-white">{ch0.title}</h4>
                <p className="truncate text-xs text-slate-500 dark:text-zinc-400">
                  {ch0.class_name} · {challengeStatusLabel[ch0.status] ?? ch0.status}
                </p>
              </div>
            </div>
            {ch0.status !== 'completed' && ch0.status !== 'rejected' ? (
              <div className="flex shrink-0 items-center gap-2 font-bold text-fuchsia-600 dark:text-fuchsia-400">
                <span className="hidden text-xs sm:inline">{t('childrenStatus.mockupInProgress')}</span>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fuchsia-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-fuchsia-500" />
                </span>
              </div>
            ) : (
              <div className="flex shrink-0 items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
              </div>
            )}
          </div>
        ) : null}

        {cardTab === 'homework' && hw0 ? (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/50 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
            <div className="flex min-w-0 items-center gap-4">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  primary ? 'bg-violet-100 text-violet-600' : 'bg-pink-100 text-pink-600'
                }`}
              >
                <BookOpen className="h-5 w-5" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <h4 className="truncate font-bold text-slate-900 dark:text-white">{hw0.title}</h4>
                <p className="line-clamp-2 text-xs text-slate-500 dark:text-zinc-400">
                  {(hw0.description || '').slice(0, 120) || hw0.class_name}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <span>{homeworkStatusLabel[hw0.status] ?? hw0.status}</span>
              <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
            </div>
          </div>
        ) : null}

        {cardTab === 'tests' && te0 ? (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/50 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300">
                <ClipboardList className="h-5 w-5" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <h4 className="truncate font-bold text-slate-900 dark:text-white">{te0.title}</h4>
                <p className="truncate text-xs text-slate-500 dark:text-zinc-400">{te0.class_name}</p>
              </div>
            </div>
            <span className="shrink-0 font-logo text-lg font-black text-violet-600 dark:text-violet-400">
              {te0.total_questions > 0
                ? `%${Math.round((te0.total_correct / te0.total_questions) * 100)}`
                : '—'}
            </span>
          </div>
        ) : null}

        {cardTab === 'preschool' ? (
          <div className="rounded-2xl border border-white/50 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
            <p className="text-sm font-medium text-slate-600 dark:text-zinc-300">
              {t('childrenStatus.mockupPreschoolHint')}
            </p>
          </div>
        ) : null}

        {!(
          (cardTab === 'challenges' && ch0) ||
          (cardTab === 'homework' && hw0) ||
          (cardTab === 'tests' && te0) ||
          cardTab === 'preschool'
        ) ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-zinc-600 dark:text-zinc-400">
            {t('childrenStatus.mockupEmptyTab')}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/60 bg-slate-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
              {t('childrenStatus.mockupWeeklyTime')}
            </span>
            <p className="mt-1 font-logo text-xl font-bold text-slate-900 dark:text-white">
              {wt ? `${wt.h}s ${wt.m}dk` : '—'}
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-zinc-700">
              <div
                className={`h-full rounded-full ${primary ? 'bg-violet-500' : 'bg-fuchsia-500'}`}
                style={{ width: `${wt ? weekBar : 8}%` }}
              />
            </div>
          </div>
          <div className="rounded-2xl border border-white/60 bg-slate-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
              {t('childrenStatus.mockupCompleted')}
            </span>
            <p className="mt-1 font-logo text-xl font-bold text-slate-900 dark:text-white">
              {hwDone} {t('childrenStatus.mockupHomeworkUnit')}
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-zinc-700">
              <div
                className="h-full rounded-full bg-amber-400 dark:bg-amber-500"
                style={{ width: `${hwBar}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenDetail}
        className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-4 font-extrabold text-white shadow-lg shadow-violet-500/25 transition hover:from-violet-500 hover:to-fuchsia-500 active:scale-[0.99] dark:shadow-violet-900/30"
      >
        {index % 2 === 0 ? t('childrenStatus.mockupViewDetails') : t('childrenStatus.mockupReview')}
      </button>
    </div>
  );
}

export function LearningAnalyticsSection({
  childrenList,
  pathPrefix,
  t,
}: {
  childrenList: KidsParentChildOverview[];
  pathPrefix: string;
  t: (key: string) => string;
}) {
  const focus = childrenList[0];
  const tests = (focus?.test_attempts_history ?? []).slice(0, 4);
  const heights = [60, 80, 95, 45, 0];
  const badge = focus?.badges?.[0];

  const weekdays = [
    t('childrenStatus.weekdayMon'),
    t('childrenStatus.weekdayTue'),
    t('childrenStatus.weekdayWed'),
    t('childrenStatus.weekdayThu'),
    t('childrenStatus.weekdayFri'),
  ];

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="flex items-center gap-3 font-logo text-2xl font-extrabold text-slate-900 dark:text-white">
          <span className="h-1 w-8 rounded-full bg-violet-600" />
          {t('childrenStatus.mockupAnalyticsTitle')}
        </h3>
        <a
          href={`${pathPrefix}/uzman`}
          className="inline-flex items-center gap-2 self-start rounded-full border border-violet-200 bg-white px-4 py-2 text-xs font-bold text-violet-700 shadow-sm transition hover:bg-violet-50 dark:border-violet-800 dark:bg-zinc-900 dark:text-violet-300 dark:hover:bg-violet-950/50"
        >
          <Sparkles className="h-4 w-4" strokeWidth={2} />
          {t('childrenStatus.mockupAskExpert')}
        </a>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-slate-100/60 p-8 dark:border-zinc-700 dark:bg-zinc-800/40 lg:col-span-8">
          <div className="max-w-lg">
            <h4 className="font-logo text-2xl font-extrabold leading-tight text-slate-900 dark:text-white md:text-3xl">
              {t('childrenStatus.mockupAnalyticsHeadline')}
            </h4>
            <p className="mt-4 leading-relaxed text-slate-600 dark:text-zinc-400">
              {t('childrenStatus.mockupAnalyticsBody')}
            </p>
          </div>
          <div className="mt-10 flex items-end gap-6 overflow-x-auto pb-2">
            {weekdays.map((d, i) => {
              const isLock = i === 4;
              const fromTest = tests[Math.min(i, tests.length - 1)];
              const pct =
                !isLock && fromTest && fromTest.total_questions > 0
                  ? Math.round((fromTest.total_correct / fromTest.total_questions) * 100)
                  : heights[i] ?? 40;
              const fill = Math.min(100, Math.max(15, isLock ? 0 : pct));
              return (
                <div key={d} className="flex flex-shrink-0 flex-col items-center gap-2">
                  <div
                    className={`relative h-32 w-14 overflow-hidden rounded-full ${
                      isLock
                        ? 'flex items-center justify-center border-2 border-dashed border-violet-300/50 dark:border-violet-600/40'
                        : 'bg-violet-200/60 dark:bg-violet-950/50'
                    }`}
                  >
                    {!isLock ? (
                      <div
                        className="absolute bottom-0 left-0 right-0 rounded-full bg-violet-600 transition-all dark:bg-violet-500"
                        style={{ height: `${fill}%` }}
                      />
                    ) : (
                      <Lock className="h-6 w-6 text-violet-400/50" strokeWidth={2} />
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-slate-600 dark:text-zinc-400">{d}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-4">
          <div className="relative flex-1 overflow-hidden rounded-3xl bg-gradient-to-br from-violet-900 via-violet-800 to-fuchsia-700 p-8 text-white shadow-xl">
            <Sparkles
              className="pointer-events-none absolute -bottom-8 -right-8 h-40 w-40 text-white/10"
              strokeWidth={1}
            />
            <p className="text-xs font-bold uppercase tracking-widest opacity-80">
              {t('childrenStatus.mockupNewBadge')}
            </p>
            <p className="mt-4 font-logo text-2xl font-black md:text-3xl">
              {badge?.label ?? t('childrenStatus.mockupNoBadgeYet')}
            </p>
            <p className="mt-2 text-sm opacity-85">
              {badge
                ? t('childrenStatus.mockupBadgeEarned')
                : t('childrenStatus.mockupBadgeHint')}
            </p>
            <div className="mt-8 flex">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/40 bg-amber-400/20">
                <Lightbulb className="h-5 w-5 text-amber-200" strokeWidth={2} />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
            <h5 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
              {t('childrenStatus.mockupConsultantNote')}
            </h5>
            <p className="mt-4 font-semibold text-slate-800 dark:text-zinc-100">
              {t('childrenStatus.mockupConsultantBody')}
            </p>
            <a
              href={`${pathPrefix}/mesajlar`}
              className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-violet-600 transition hover:gap-3 dark:text-violet-400"
            >
              {t('childrenStatus.mockupMessageCounselor')}
              <span aria-hidden>→</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
