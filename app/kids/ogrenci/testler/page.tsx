'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  ArrowRight,
  BookOpen,
  Calculator,
  CheckCircle2,
  Clock,
  Eye,
  FlaskConical,
  Languages,
  ListChecks,
  Play,
  Sparkles,
  Star,
  Timer,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { KidsPanelMax } from '@/src/components/kids/kids-ui';
import {
  kidsGetBadgeRoadmap,
  kidsStudentListTests,
  type KidsBadgeRoadmap,
  type KidsStudentTestListAttemptStatus,
  type KidsStudentTestListItem,
} from '@/src/lib/kids-api';
import { kidsLocalizedReadingAnswerIntro } from '@/src/lib/kids-test-stem';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';
import { localizedGrowthStageTitle, localizedMilestoneCopy } from '@/src/lib/kids-roadmap-i18n';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import { useKidsI18n } from '@/src/providers/kids-language-provider';

const MILESTONE_ILLUSTRATION_SRC =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDiDkC0SYyUS1MQ_cbaMBQnLayMpminKKtPfrMSGJGlPVzLgLIQrzpHPaK6lDyUWSiGtwHckXM_2HElT3BVEi5aFPP1_KyOhBKWFx6VRgT08NsWVvx64uHlaK_aJbqSKUd8xwWqFANgTq8I-xcasx7g-IM_RxHyLVYM0dE2tLVctu1mMU80ZGFICc_KHCaV7rnS3YP4A_QZs5nw_BLei74mado-_YQcP0SZfF8qXbnP94tQvu3gUgqYdB5XUv7X-aA8AMem1Txb152g';

function rowStatus(r: KidsStudentTestListItem): KidsStudentTestListAttemptStatus {
  const s = r.attempt_status;
  if (s === 'submitted' || s === 'in_progress' || s === 'pending') return s;
  return 'pending';
}

function interpolate(template: string, vars: Record<string, string | number>): string {
  let s = template;
  for (const [k, v] of Object.entries(vars)) {
    s = s.split(`{${k}}`).join(String(v));
  }
  return s;
}

function estimateXpReward(row: KidsStudentTestListItem): number {
  const q = Math.max(1, row.question_count || 1);
  return Math.min(120, Math.max(25, Math.round(q * 5)));
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

function growthLocale(lang: string): string {
  if (lang === 'tr') return 'tr-TR';
  if (lang === 'ge') return 'de-DE';
  return 'en-US';
}

/** Kart gövdesi: mockup’taki glass-card hissi + eşit yükseklik için üst bileşenle birlikte `h-full` kullan. */
const glassCardBase =
  'h-full border border-white/50 bg-white/70 shadow-lg shadow-violet-200/25 backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/60 dark:shadow-none';

export default function KidsStudentTestsPage() {
  const router = useRouter();
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();
  const { t, language } = useKidsI18n();
  const [rows, setRows] = useState<KidsStudentTestListItem[]>([]);
  const [roadmap, setRoadmap] = useState<KidsBadgeRoadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<KidsStudentTestListAttemptStatus>('pending');

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'student') {
      router.replace(kidsLoginPortalHref(pathPrefix, 'ogrenci'));
      return;
    }
    void (async () => {
      setLoading(true);
      try {
        const [list, map] = await Promise.all([
          kidsStudentListTests(),
          kidsGetBadgeRoadmap().catch(() => null),
        ]);
        setRows(list);
        setRoadmap(map);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t('tests.studentList.loadError'));
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, user, router, pathPrefix, t]);

  const counts = useMemo(() => {
    let submitted = 0;
    let pending = 0;
    let inProgress = 0;
    for (const r of rows) {
      const st = rowStatus(r);
      if (st === 'submitted') submitted += 1;
      else if (st === 'in_progress') inProgress += 1;
      else pending += 1;
    }
    return { submitted, pending, in_progress: inProgress };
  }, [rows]);

  const filtered = useMemo(() => rows.filter((r) => rowStatus(r) === tab), [rows, tab]);

  const tabs: { id: KidsStudentTestListAttemptStatus; labelKey: string; count: number }[] = [
    { id: 'pending', labelKey: 'tests.studentList.tabAssigned', count: counts.pending },
    { id: 'in_progress', labelKey: 'tests.studentList.tabOngoing', count: counts.in_progress },
    { id: 'submitted', labelKey: 'tests.studentList.tabDone', count: counts.submitted },
  ];

  const sortedMilestones = useMemo(() => {
    const list = roadmap?.milestones ?? [];
    return [...list].sort((a, b) => a.order - b.order);
  }, [roadmap]);

  const nextMilestone = useMemo(
    () => sortedMilestones.find((m) => !m.unlocked) ?? null,
    [sortedMilestones],
  );

  const nextMilestoneProgress = roadmap?.next_milestone_progress ?? null;

  const milestoneProgressPct = useMemo(() => {
    const np = roadmap?.next_milestone_progress;
    if (np != null && typeof np.percent === 'number' && Number.isFinite(np.percent)) {
      return Math.min(100, Math.max(0, Math.round(np.percent)));
    }
    const total = sortedMilestones.length;
    if (total === 0) return 0;
    if (sortedMilestones.every((m) => m.unlocked)) return 100;
    const unlocked = sortedMilestones.filter((m) => m.unlocked).length;
    return Math.min(100, Math.round((unlocked / total) * 100));
  }, [roadmap?.next_milestone_progress, sortedMilestones]);

  const milestoneCopy = useMemo(() => {
    if (!roadmap || sortedMilestones.length === 0) {
      return {
        title: t('tests.studentList.milestoneTeaserTitle'),
        subtitle: t('tests.studentList.milestoneTeaserBody'),
      };
    }
    if (!nextMilestone) {
      return {
        title: t('tests.studentList.milestoneAllUnlockedTitle'),
        subtitle: t('tests.studentList.milestoneAllUnlockedBody'),
      };
    }
    const loc = localizedMilestoneCopy(nextMilestone, t);
    return { title: loc.title, subtitle: loc.subtitle };
  }, [nextMilestone, roadmap, sortedMilestones.length, t]);

  const rankLabel = localizedGrowthStageTitle(user?.growth_stage, t, 'roadmap.rankExplorer');
  const xpTotal = user?.growth_points ?? roadmap?.growth_points ?? 0;
  const loc = growthLocale(language);
  const xpFmt = xpTotal.toLocaleString(loc);

  if (authLoading || loading) {
    return (
      <KidsPanelMax className="max-w-6xl space-y-10 px-1 pb-12 pt-2 sm:px-3 lg:px-6">
        <div className="h-40 animate-pulse rounded-2xl bg-violet-100/80 dark:bg-violet-950/40" />
        <div className="h-12 w-72 animate-pulse rounded-full bg-slate-200/80 dark:bg-zinc-800" />
        <div className="grid animate-pulse grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 rounded-2xl bg-slate-100 dark:bg-zinc-800" />
          ))}
        </div>
      </KidsPanelMax>
    );
  }

  if (!user || user.role !== 'student') {
    return <p className="text-center text-sm text-slate-600 dark:text-zinc-400">{t('common.redirecting')}</p>;
  }

  return (
    <KidsPanelMax className="max-w-6xl space-y-10 px-1 pb-12 pt-2 sm:px-3 lg:px-6">
      {/* Stats + streak */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/50 bg-white/75 p-8 shadow-xl shadow-violet-200/40 backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/65 dark:shadow-none md:col-span-2 md:flex-row md:items-center">
          <div className="relative z-10 max-w-xl">
            <h1 className="font-logo text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              {t('tests.studentList.heroTitle')}
            </h1>
            <p className="mt-2 text-base text-slate-600 dark:text-zinc-400 sm:text-lg">{t('tests.studentList.heroSubtitle')}</p>
          </div>
          <div className="relative z-10 mt-8 flex gap-10 md:mt-0">
            <div className="text-center">
              <span className="block font-logo text-3xl font-black text-violet-600 tabular-nums dark:text-violet-400">
                {counts.submitted}
              </span>
              <span className="mt-1 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                {t('tests.studentList.statCompletedLabel')}
              </span>
            </div>
            <div className="text-center">
              <span className="block font-logo text-3xl font-black text-fuchsia-600 tabular-nums dark:text-fuchsia-400">
                {xpFmt}
              </span>
              <span className="mt-1 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                {t('tests.studentList.statXpLabel')}
              </span>
            </div>
          </div>
          <div
            className="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-violet-400/15 blur-3xl dark:bg-fuchsia-500/10"
            aria-hidden
          />
        </div>

        <div className="flex flex-col items-center justify-center rounded-2xl bg-linear-to-br from-violet-600 via-violet-600 to-fuchsia-600 p-8 text-center text-white shadow-xl shadow-violet-500/25">
          <Sparkles className="mb-2 h-12 w-12 text-white/95" strokeWidth={1.75} aria-hidden />
          <h3 className="text-xl font-bold">{t('tests.studentList.streakTitle')}</h3>
          <p className="mt-2 text-sm font-medium text-white/85">{t('tests.studentList.streakSubtitle')}</p>
        </div>
      </section>

      <div className="space-y-6">
        <div
          className="inline-flex flex-wrap items-center gap-1 rounded-full border border-white/30 bg-white/55 p-1.5 shadow-sm backdrop-blur-sm dark:border-zinc-700/80 dark:bg-zinc-800/80"
          role="tablist"
          aria-label={t('tests.studentList.tabsAria')}
        >
          {tabs.map((x) => {
            const active = tab === x.id;
            return (
              <button
                key={x.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(x.id)}
                className={`rounded-full px-5 py-3 text-sm font-bold transition-all duration-300 sm:px-8 ${
                  active
                    ? 'bg-linear-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/30'
                    : 'text-slate-600 hover:bg-white/60 dark:text-zinc-300 dark:hover:bg-zinc-700/60'
                }`}
              >
                <span>{t(x.labelKey)}</span>
                <span className={`ml-1 text-xs font-semibold ${active ? 'text-white/90' : 'text-slate-400 dark:text-zinc-500'}`}>
                  ({x.count})
                </span>
              </button>
            );
          })}
        </div>

        <div className="min-h-[280px]">
          {rows.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-violet-300/80 bg-white/50 p-8 text-center text-slate-600 dark:border-violet-800 dark:bg-zinc-900/40 dark:text-zinc-400">
              {t('tests.studentList.empty')}
            </p>
          ) : filtered.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-violet-300/80 bg-white/50 p-8 text-center text-slate-600 dark:border-violet-800 dark:bg-zinc-900/40 dark:text-zinc-400">
              {tab === 'submitted'
                ? t('tests.studentList.emptySubmitted')
                : tab === 'pending'
                  ? t('tests.studentList.emptyPending')
                  : t('tests.studentList.emptyInProgress')}
            </p>
          ) : (
            <section
              key={tab}
              className="animate-in fade-in slide-in-from-bottom-4 duration-500"
            >
              <div className="grid grid-cols-1 items-stretch gap-8 md:grid-cols-2 lg:grid-cols-3">
                {filtered.map((row) => {
                  const st = rowStatus(row);
                  const SubIcon = testSubjectIcon(row.title);
                  const rawSub = row.instructions?.trim().split('\n').filter(Boolean)[0]?.slice(0, 120) || '';
                  const subtitle = rawSub
                    ? kidsLocalizedReadingAnswerIntro(rawSub, t)
                    : t('tests.studentList.cardTopicFallback');
                  const xp = estimateXpReward(row);
                  const href = `${pathPrefix}/ogrenci/testler/${row.id}`;

                  if (st === 'submitted') {
                    const dur =
                      typeof row.attempt_duration_minutes === 'number' && row.attempt_duration_minutes > 0
                        ? row.attempt_duration_minutes
                        : null;
                    const xpGot = typeof row.xp_earned === 'number' ? row.xp_earned : null;
                    const scoreVal = typeof row.attempt_score === 'number' ? row.attempt_score : null;
                    return (
                      <div
                        key={row.id}
                        className={`group relative flex flex-col rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${glassCardBase} border-emerald-400/30 dark:border-emerald-700/35`}
                      >
                        <div className="absolute right-4 top-4 rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200">
                          {t('tests.studentList.badgeCompleted')}
                        </div>
                        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100/90 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                          <SubIcon className="h-7 w-7" strokeWidth={2} />
                        </div>
                        <h3 className="mb-1 min-h-8 text-2xl font-bold leading-tight text-slate-900 dark:text-white">
                          {row.title}
                        </h3>
                        <p className="mb-6 min-h-11 line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
                          {subtitle}
                        </p>
                        <div className="mb-6 grid min-h-34 flex-1 grid-cols-2 gap-x-3 gap-y-4 text-sm content-start">
                          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-5 w-5 shrink-0" />
                            <span className="font-medium leading-tight">{t('tests.studentList.finishedLabel')}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-600 dark:text-zinc-400">
                            <ListChecks className="h-5 w-5 shrink-0 text-emerald-600" />
                            <span className="leading-tight">
                              {row.question_count} {t('tests.reports.question')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-600 dark:text-zinc-400">
                            <Timer className="h-5 w-5 shrink-0 text-emerald-600" />
                            <span className="leading-tight">
                              {dur != null
                                ? interpolate(t('tests.studentList.attemptMinutes'), { n: dur })
                                : t('tests.studentList.durationUnknown')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-fuchsia-700 dark:text-fuchsia-400">
                            <Trophy className="h-5 w-5 shrink-0 fill-current" />
                            <span className="font-bold leading-tight">
                              {xpGot != null
                                ? interpolate(t('tests.studentList.xpEarnedDisplay'), { n: xpGot })
                                : t('tests.studentList.valueUnknown')}
                            </span>
                          </div>
                          <div className="col-span-2 flex items-center gap-2 text-slate-600 dark:text-zinc-400">
                            <Star className="h-5 w-5 shrink-0 fill-amber-400 text-amber-500" />
                            <span className="font-semibold leading-tight">
                              {scoreVal != null
                                ? interpolate(t('tests.studentList.scoreDisplay'), { score: scoreVal })
                                : t('tests.studentList.scoreUnavailable')}
                            </span>
                          </div>
                        </div>
                        <Link
                          href={href}
                          className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl border-2 border-emerald-500/30 bg-white/40 py-4 text-sm font-bold text-emerald-800 transition-colors hover:bg-emerald-50/90 dark:border-emerald-600/40 dark:bg-zinc-900/40 dark:text-emerald-200 dark:hover:bg-emerald-950/40"
                        >
                          {t('tests.studentList.ctaViewResults')}
                          <Eye className="h-5 w-5" />
                        </Link>
                      </div>
                    );
                  }

                  if (st === 'in_progress') {
                    return (
                      <div
                        key={row.id}
                        className={`group relative flex flex-col rounded-2xl border-2 border-amber-400/40 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl dark:border-amber-700/40 ${glassCardBase}`}
                      >
                        <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-900 dark:bg-amber-950/80 dark:text-amber-200">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" aria-hidden />
                          {t('tests.studentList.badgeInProgress')}
                        </div>
                        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
                          <SubIcon className="h-7 w-7" strokeWidth={2} />
                        </div>
                        <h3 className="mb-1 min-h-8 text-2xl font-bold leading-tight text-slate-900 dark:text-white">
                          {row.title}
                        </h3>
                        <p className="mb-6 min-h-11 line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
                          {subtitle}
                        </p>
                        <div className="mb-6 grid min-h-26 flex-1 grid-cols-2 gap-4 content-start">
                          <div className="flex items-center gap-2 text-slate-600 dark:text-zinc-400">
                            <Clock className="h-5 w-5 shrink-0 text-amber-500" />
                            <span className="text-sm font-medium leading-tight">
                              {row.duration_minutes
                                ? `${row.duration_minutes} ${t('tests.reports.min')}`
                                : t('tests.reports.unlimited')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-600 dark:text-zinc-400">
                            <ListChecks className="h-5 w-5 shrink-0 text-amber-500" />
                            <span className="text-sm font-medium leading-tight">
                              {row.question_count} {t('tests.reports.question')}
                            </span>
                          </div>
                          <div className="col-span-2 flex items-center gap-2 text-fuchsia-700 dark:text-fuchsia-400">
                            <Trophy className="h-5 w-5 shrink-0 fill-current" />
                            <span className="text-sm font-bold leading-tight">
                              {interpolate(t('tests.studentList.xpRewardLine'), { n: xp })}
                            </span>
                          </div>
                        </div>
                        <Link
                          href={href}
                          className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-4 text-sm font-bold text-white shadow-lg shadow-amber-200/50 transition-transform active:scale-[0.98] dark:shadow-amber-900/20"
                        >
                          {t('tests.studentList.ctaContinue')}
                          <Play className="h-5 w-5 fill-current" />
                        </Link>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={row.id}
                      className={`group relative flex flex-col rounded-2xl border-violet-300/50 p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl dark:border-violet-700/40 ${glassCardBase}`}
                    >
                      <div className="absolute right-4 top-4 rounded-full bg-violet-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-violet-700 dark:bg-violet-950/80 dark:text-violet-200">
                        {t('tests.studentList.badgeNew')}
                      </div>
                      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300">
                        <SubIcon className="h-7 w-7" strokeWidth={2} />
                      </div>
                      <h3 className="mb-1 min-h-8 text-2xl font-bold leading-tight text-slate-900 dark:text-white">
                        {row.title}
                      </h3>
                      <p className="mb-6 min-h-11 line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
                        {subtitle}
                      </p>
                      <div className="mb-6 grid min-h-26 flex-1 grid-cols-2 gap-4 content-start">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-zinc-400">
                          <Clock className="h-5 w-5 shrink-0 text-violet-500" />
                          <span className="text-sm font-medium leading-tight">
                            {row.duration_minutes
                              ? `${row.duration_minutes} ${t('tests.reports.min')}`
                              : t('tests.reports.unlimited')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 dark:text-zinc-400">
                          <ListChecks className="h-5 w-5 shrink-0 text-violet-500" />
                          <span className="text-sm font-medium leading-tight">
                            {row.question_count} {t('tests.reports.question')}
                          </span>
                        </div>
                        <div className="col-span-2 flex items-center gap-2 text-fuchsia-700 dark:text-fuchsia-400">
                          <Trophy className="h-5 w-5 shrink-0 fill-current" />
                          <span className="text-sm font-bold leading-tight">
                            {interpolate(t('tests.studentList.xpRewardLine'), { n: xp })}
                          </span>
                        </div>
                      </div>
                      <Link
                        href={href}
                        className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-br from-violet-600 to-fuchsia-600 py-4 text-sm font-bold text-white shadow-lg shadow-violet-500/25 transition-transform active:scale-[0.98]"
                      >
                        {t('tests.studentList.ctaStart')}
                        <ArrowRight className="h-5 w-5" />
                      </Link>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Milestone teaser */}
      <section className="flex flex-col items-center gap-10 rounded-2xl border border-slate-200/80 bg-slate-50/90 p-8 dark:border-zinc-800 dark:bg-zinc-900/50 md:flex-row md:p-10">
        <div className="relative aspect-video w-full max-w-md overflow-hidden rounded-xl bg-white shadow-inner dark:bg-zinc-950">
          <Image
            src={MILESTONE_ILLUSTRATION_SRC}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width:768px) 100vw, 400px"
          />
        </div>
        <div className="min-w-0 flex-1 space-y-4">
          <span className="inline-block rounded-full bg-violet-100 px-4 py-1 text-xs font-bold uppercase tracking-widest text-violet-800 dark:bg-violet-950/80 dark:text-violet-200">
            {t('tests.studentList.milestoneBadge')}
          </span>
          <h2 className="font-logo text-2xl font-extrabold text-slate-900 dark:text-white sm:text-3xl">
            {milestoneCopy.title}
          </h2>
          <p className="leading-relaxed text-slate-600 dark:text-zinc-400">{milestoneCopy.subtitle}</p>
          <div className="mt-4 h-4 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-linear-to-r from-violet-600 to-fuchsia-500 transition-all duration-500"
              style={{ width: `${milestoneProgressPct}%` }}
            />
          </div>
          <div className="flex flex-wrap justify-between gap-2 text-sm font-bold text-slate-500 dark:text-zinc-400">
            <span>
              {nextMilestoneProgress != null &&
              typeof nextMilestoneProgress.current === 'number' &&
              typeof nextMilestoneProgress.target === 'number'
                ? interpolate(t('tests.studentList.milestoneProgressToNext'), {
                    current: nextMilestoneProgress.current,
                    target: nextMilestoneProgress.target,
                    pct: milestoneProgressPct,
                  })
                : sortedMilestones.length > 0 && sortedMilestones.every((m) => m.unlocked)
                  ? t('tests.studentList.milestoneProgressAllDone')
                  : interpolate(t('tests.studentList.milestoneProgressLine'), { pct: milestoneProgressPct })}
            </span>
            <span>{interpolate(t('tests.studentList.milestoneRankLine'), { rank: rankLabel })}</span>
          </div>
          <Link
            href={`${pathPrefix}/ogrenci/yol`}
            className="inline-flex text-sm font-bold text-violet-600 underline-offset-2 hover:underline dark:text-violet-400"
          >
            {t('tests.studentList.milestoneCtaRoadmap')}
          </Link>
        </div>
      </section>
    </KidsPanelMax>
  );
}
