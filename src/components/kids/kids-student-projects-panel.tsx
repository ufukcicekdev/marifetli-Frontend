'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  kidsAssignmentSubmissionGate,
  kidsFormatAssignmentWindowTr,
  kidsStudentAssignmentAllRoundsSubmitted,
  type KidsAssignment,
} from '@/src/lib/kids-api';
import { KidsEmptyState, KidsTabs } from '@/src/components/kids/kids-ui';
import { BadgeCheck, Clock3, Lock, MailOpen, PartyPopper, Rocket, Star, Target } from 'lucide-react';
import { useKidsI18n } from '@/src/providers/kids-language-provider';

const projectShells = [
  'from-violet-500/20 via-fuchsia-500/15 to-amber-400/20 ring-violet-400/40 hover:ring-fuchsia-400/60',
  'from-sky-500/20 via-cyan-500/15 to-emerald-400/20 ring-sky-400/40 hover:ring-emerald-400/50',
  'from-amber-500/25 via-orange-400/15 to-rose-400/20 ring-amber-400/40 hover:ring-rose-400/50',
  'from-emerald-500/20 via-teal-500/15 to-sky-400/20 ring-emerald-400/40 hover:ring-sky-400/50',
];

type PlayTone = 'violet' | 'sky' | 'amber' | 'emerald' | 'rose' | 'slate';

const toneChip: Record<PlayTone, string> = {
  violet: 'bg-violet-500/15 text-violet-900 dark:bg-violet-500/25 dark:text-violet-100',
  sky: 'bg-sky-500/15 text-sky-900 dark:bg-sky-500/25 dark:text-sky-100',
  amber: 'bg-amber-400/25 text-amber-950 dark:bg-amber-500/20 dark:text-amber-100',
  emerald: 'bg-emerald-500/15 text-emerald-950 dark:bg-emerald-500/20 dark:text-emerald-100',
  rose: 'bg-rose-500/15 text-rose-900 dark:bg-rose-500/25 dark:text-rose-100',
  slate: 'bg-slate-500/15 text-slate-800 dark:bg-slate-500/25 dark:text-slate-100',
};

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
): { emoji: string; label: string; tone: PlayTone } {
  if (!gate.ok) {
    if (gate.phase === 'not_yet')
      return { emoji: 'time', label: t('student.projects.playSoon'), tone: 'slate' };
    return { emoji: 'lock', label: t('student.projects.playClosed'), tone: 'slate' };
  }
  const s = a.my_submission;
  if (!s) return { emoji: 'rocket', label: t('student.projects.playStart'), tone: 'violet' };
  if (s.is_teacher_pick) return { emoji: 'star', label: t('student.projects.playStarPick'), tone: 'amber' };
  if (!s.teacher_reviewed_at) return { emoji: 'mail', label: t('student.projects.playReviewing'), tone: 'sky' };
  if (s.teacher_review_positive === true)
    return { emoji: 'star', label: t('student.projects.playGreatFeedback'), tone: 'emerald' };
  if (s.teacher_review_positive === false) return { emoji: 'rocket', label: t('student.projects.playMore'), tone: 'rose' };
  return { emoji: 'ok', label: t('student.projects.playSent'), tone: 'sky' };
}

export type KidsStudentProjectsPanelProps = {
  pathPrefix: string;
  assignments: KidsAssignment[];
  loading: boolean;
  /** Panel üstünde “Panele dön” vb. */
  showBackToPanel?: boolean;
};

const PROJECT_TAB_META = [
  { id: 'ongoing' as const, icon: '▶' },
  { id: 'done' as const, icon: '✓' },
  { id: 'expired' as const, icon: '⏱' },
];

export function KidsStudentProjectsPanel({
  pathPrefix,
  assignments,
  loading,
  showBackToPanel,
}: KidsStudentProjectsPanelProps) {
  const { t } = useKidsI18n();
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

  const [tab, setTab] = useState<string>(() => 'ongoing');

  const tabsWithCounts = useMemo(() => {
    const labels = [
      t('student.projects.tabOngoing'),
      t('student.projects.tabDone'),
      t('student.projects.tabExpired'),
    ];
    return PROJECT_TAB_META.map((tab, i) => {
      const n =
        tab.id === 'ongoing' ? ongoing.length : tab.id === 'done' ? done.length : expired.length;
      return { ...tab, label: `${labels[i]} (${n})` };
    });
  }, [t, ongoing.length, expired.length, done.length]);

  const visible = tab === 'expired' ? expired : tab === 'done' ? done : ongoing;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {showBackToPanel ? (
        <Link
          href={`${pathPrefix}/ogrenci/panel`}
          className="inline-flex text-sm font-bold text-fuchsia-700 hover:underline dark:text-fuchsia-300"
        >
          {t('student.projects.backToPanel')}
        </Link>
      ) : null}
      <section className="rounded-3xl border-2 border-violet-200 bg-gradient-to-b from-violet-50/50 to-white p-5 shadow-lg dark:border-violet-900/50 dark:from-violet-950/20 dark:to-gray-950/80">
        <h1 className="font-logo flex items-center gap-2 text-xl font-black text-violet-900 dark:text-violet-100 sm:text-2xl">
          <Target className="h-5 w-5" aria-hidden /> {t('student.projects.pageTitle')}
        </h1>
        <p className="mt-1 text-xs font-medium text-violet-800/70 dark:text-violet-200/70">
          {t('student.projects.pageSubtitle')}
        </p>
        {loading ? (
          <p className="mt-4 animate-pulse text-sm text-gray-500">{t('student.projects.loading')}</p>
        ) : assignments.length === 0 ? (
          <p className="mt-4 text-sm font-medium text-gray-600 dark:text-gray-400">
            {t('student.projects.noAssignments')}
          </p>
        ) : (
          <>
            <KidsTabs
              tabs={tabsWithCounts}
              active={tab}
              onChange={setTab}
              ariaLabel={t('student.projects.ariaChallengeList')}
            />
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
              <ul className="mt-0 space-y-3">
                {visible.map((a, i) => {
                  const gate = kidsAssignmentSubmissionGate(a);
                  const wl = kidsFormatAssignmentWindowTr(a);
                  const summaryBits = assignmentSummaryBits(a, wl || null, gate, t);
                  const play = assignmentPlayState(a, gate, t);
                  const rp = a.my_rounds_progress;
                  const roundQs =
                    rp && rp.total > 1 && rp.submitted < rp.total
                      ? `?round=${Math.min(rp.total, rp.submitted + 1)}`
                      : '';
                  const shellIdx =
                    tab === 'done'
                      ? done.findIndex((x) => x.id === a.id)
                      : tab === 'expired'
                        ? expired.findIndex((x) => x.id === a.id)
                        : ongoing.findIndex((x) => x.id === a.id);
                  const si = shellIdx >= 0 ? shellIdx : i;
                  return (
                    <li key={a.id}>
                      <Link
                        href={`${pathPrefix}/ogrenci/proje/${a.id}${roundQs}`}
                        className={`group flex flex-col rounded-2xl bg-gradient-to-br p-[2px] shadow-md ring-2 transition hover:scale-[1.01] hover:shadow-xl ${projectShells[si % projectShells.length]}`}
                      >
                        <div className="flex flex-col rounded-[0.9rem] bg-white/95 px-4 py-4 dark:bg-gray-950/95">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <span className="font-logo text-lg font-black text-violet-950 dark:text-white">
                                {a.title}
                              </span>
                              {(a.class_name || a.teacher_display) ? (
                                <p className="mt-0.5 line-clamp-1 text-xs font-medium text-violet-800/80 dark:text-violet-200/80">
                                  {[a.class_name, a.teacher_display ? `${a.teacher_display}${a.teacher_subject ? ` (${a.teacher_subject})` : ''}` : '']
                                    .filter(Boolean)
                                    .join(' · ')}
                                </p>
                              ) : null}
                            </div>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${toneChip[play.tone]}`}
                            >
                              <span aria-hidden>
                                {play.emoji === 'time' ? <Clock3 className="h-3.5 w-3.5" /> : null}
                                {play.emoji === 'lock' ? <Lock className="h-3.5 w-3.5" /> : null}
                                {play.emoji === 'rocket' ? <Rocket className="h-3.5 w-3.5" /> : null}
                                {play.emoji === 'star' ? <Star className="h-3.5 w-3.5" /> : null}
                                {play.emoji === 'mail' ? <MailOpen className="h-3.5 w-3.5" /> : null}
                                {play.emoji === 'ok' ? <BadgeCheck className="h-3.5 w-3.5" /> : null}
                              </span>
                              {play.label}
                            </span>
                          </div>
                          {summaryBits.length > 0 ? (
                            <span className="mt-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                              {summaryBits.join(' · ')}
                            </span>
                          ) : null}
                          {a.my_rounds_progress && a.my_rounds_progress.total > 1 ? (
                            <p className="mt-1 text-xs font-black text-fuchsia-800 dark:text-fuchsia-200">
                              {t('student.projects.progressRounds')
                                .replace('{sub}', String(a.my_rounds_progress.submitted))
                                .replace('{tot}', String(a.my_rounds_progress.total))}
                            </p>
                          ) : null}
                          {a.my_submission?.review_hint_title && gate.ok ? (
                            <p className="mt-2 rounded-xl bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-900 dark:bg-violet-950/50 dark:text-violet-100">
                              {a.my_submission.review_hint_title}
                            </p>
                          ) : null}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  );
}
