'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Ref,
  type RefObject,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  Award,
  BookOpen,
  Flag,
  FlaskConical,
  Footprints,
  Gamepad2,
  Image as ImageIcon,
  Leaf,
  Lock,
  Medal,
  Rocket,
  Sparkles,
  Star,
  TreePine,
  TrendingUp,
} from 'lucide-react';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import {
  kidsGetBadgeRoadmap,
  type KidsBadgeRoadmap,
  type KidsRoadmapMilestone,
} from '@/src/lib/kids-api';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';
import { KidsPanelMax } from '@/src/components/kids/kids-ui';
import { localizedGrowthStageTitle, localizedMilestoneCopy } from '@/src/lib/kids-roadmap-i18n';
import { useKidsI18n } from '@/src/providers/kids-language-provider';

const CHALLENGE_STARS_GOAL = 50;

function interpolate(template: string, vars: Record<string, string | number>): string {
  let s = template;
  for (const [k, v] of Object.entries(vars)) {
    s = s.split(`{${k}}`).join(String(v));
  }
  return s;
}

/** Üstten alta: hedef/kilit (yukarı) → ilk adım (aşağı) */
function milestonesForColumn(list: KidsRoadmapMilestone[]): KidsRoadmapMilestone[] {
  return [...list].sort((a, b) => a.order - b.order).reverse();
}

function milestoneIconNode(icon: string, className: string) {
  if (icon === 'seed') return <Footprints className={className} strokeWidth={2} aria-hidden />;
  if (icon === 'sprout') return <Leaf className={className} strokeWidth={2} aria-hidden />;
  if (icon === 'tree') return <TreePine className={className} strokeWidth={2} aria-hidden />;
  if (icon === 'star_tree') return <Sparkles className={className} strokeWidth={2} aria-hidden />;
  if (icon === 'book') return <BookOpen className={className} strokeWidth={2} aria-hidden />;
  if (icon === 'flag') return <Flag className={className} strokeWidth={2} aria-hidden />;
  if (icon === 'medal_pick') return <Award className={className} strokeWidth={2} aria-hidden />;
  if (icon === 'gamepad') return <Gamepad2 className={className} strokeWidth={2} aria-hidden />;
  if (icon === 'flask') return <FlaskConical className={className} strokeWidth={2} aria-hidden />;
  if (icon === 'gallery') return <ImageIcon className={className} strokeWidth={2} aria-hidden />;
  return <Star className={className} strokeWidth={2} aria-hidden />;
}

type NodeVariant = 'locked' | 'current' | 'done';

/**
 * Alttan üste zikzaklı yol eğrisi; merkez civarından geçerek düğümlerle kesişir.
 */
const ROAD_PATH_D =
  'M500 810 C265 745 235 685 520 615 S785 535 475 465 S210 385 515 315 S795 235 465 165 S220 95 340 45 S460 12 500 8';

const ROAD_VIEW_W = 1000;
const ROAD_VIEW_H = 820;

type RoadmapPathAnchor = {
  leftPct: number;
  topPct: number;
  /** İkon yolun solunda ise metin sağ kolonda */
  labelOnRight: boolean;
};

function useRoadmapPathAnchors(count: number): { pathRef: RefObject<SVGPathElement | null>; anchors: RoadmapPathAnchor[] } {
  const pathRef = useRef<SVGPathElement | null>(null);
  const [anchors, setAnchors] = useState<RoadmapPathAnchor[]>([]);

  const measure = useCallback(() => {
    const el = pathRef.current;
    if (!el || count < 1) {
      setAnchors([]);
      return;
    }
    try {
      const len = el.getTotalLength();
      const next: RoadmapPathAnchor[] = [];
      for (let i = 0; i < count; i++) {
        const along = count <= 1 ? len * 0.5 : len * (1 - i / (count - 1));
        const p = el.getPointAtLength(along);
        next.push({
          leftPct: (p.x / ROAD_VIEW_W) * 100,
          topPct: (p.y / ROAD_VIEW_H) * 100,
          labelOnRight: p.x < 500,
        });
      }
      setAnchors(next);
    } catch {
      setAnchors([]);
    }
  }, [count]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  return { pathRef, anchors };
}

function RoadmapPathBackground() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      preserveAspectRatio="none"
      viewBox={`0 0 ${ROAD_VIEW_W} ${ROAD_VIEW_H}`}
      aria-hidden
    >
      <defs>
        <linearGradient id="kidsRoadmapPathGrad" x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity={1} />
          <stop offset="55%" stopColor="#a855f7" stopOpacity={1} />
          <stop offset="100%" stopColor="#e9d5ff" stopOpacity={0.95} />
        </linearGradient>
        <linearGradient id="kidsRoadmapPathEdge" x1="0%" x2="100%" y1="0%" y2="0%">
          <stop offset="0%" stopColor="#4c1d95" stopOpacity={0.55} />
          <stop offset="50%" stopColor="#6d28d9" stopOpacity={0.35} />
          <stop offset="100%" stopColor="#4c1d95" stopOpacity={0.55} />
        </linearGradient>
      </defs>
      {/* Yol tabanı */}
      <path
        d={ROAD_PATH_D}
        fill="none"
        stroke="url(#kidsRoadmapPathEdge)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={44}
        className="opacity-[0.22] dark:opacity-[0.32]"
      />
      {/* Orta kesik çizgi */}
      <path
        d={ROAD_PATH_D}
        fill="none"
        stroke="white"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={3}
        strokeDasharray="14 22"
        className="opacity-[0.2] dark:opacity-[0.14]"
      />
      {/* Ana mor şerit */}
      <path
        d={ROAD_PATH_D}
        fill="none"
        stroke="url(#kidsRoadmapPathGrad)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={26}
        className="opacity-[0.38] dark:opacity-[0.48]"
      />
    </svg>
  );
}

function RoadmapMilestoneRow({
  m,
  variant,
  layoutIndex,
  pathAnchor,
  t,
  language,
}: {
  m: KidsRoadmapMilestone;
  variant: NodeVariant;
  layoutIndex: number;
  /** Masaüstü: yol üzeri konum; null = mobil dikey liste */
  pathAnchor: RoadmapPathAnchor | null;
  t: (key: string) => string;
  language: 'tr' | 'en' | 'ge';
}) {
  const { title: mileTitle, subtitle: mileSubtitle } = localizedMilestoneCopy(m, t);
  const labelOnRight = pathAnchor ? pathAnchor.labelOnRight : layoutIndex % 2 === 0;
  const tilt =
    variant === 'current'
      ? 'rotate-6 md:rotate-6'
      : layoutIndex % 2 === 0
        ? 'rotate-3 md:rotate-3'
        : '-rotate-12 md:-rotate-12';

  const iconBox =
    variant === 'locked'
      ? 'relative z-10 flex h-28 w-28 items-center justify-center rounded-3xl bg-zinc-200/90 opacity-80 ring-4 ring-slate-900/80 dark:bg-zinc-800/90 dark:ring-slate-950/80'
      : variant === 'current'
        ? 'relative z-10 kids-roadmap-node-pulse flex h-32 w-32 items-center justify-center rounded-3xl bg-linear-to-br from-violet-600 to-violet-800 shadow-2xl shadow-violet-500/40 ring-4 ring-slate-900/50 dark:ring-slate-950/60'
        : 'relative z-10 flex h-28 w-28 items-center justify-center rounded-3xl border-4 border-emerald-400 bg-white shadow-xl ring-4 ring-slate-900/40 dark:bg-zinc-900 dark:ring-slate-950/50';

  const desc =
    variant === 'locked'
      ? t('roadmap.lockedBadgeShort')
      : variant === 'current'
        ? `${t('roadmap.currentTargetPrefix')} ${mileSubtitle}`
        : mileSubtitle;

  const labelOpacity = variant === 'locked' ? 'opacity-50' : '';

  const desktopLabels = (
    <div className={`space-y-1 ${labelOpacity}`}>
      <h4
        className={`font-logo text-lg font-bold leading-snug sm:text-xl ${
          variant === 'current' ? 'text-violet-600 dark:text-violet-400' : 'text-slate-900 dark:text-white'
        }`}
      >
        {mileTitle}
      </h4>
      <p className="text-sm leading-snug text-slate-500 dark:text-zinc-400">{desc}</p>
      {variant === 'done' && m.earned_at ? (
        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          {new Date(m.earned_at).toLocaleString(language === 'tr' ? 'tr-TR' : language === 'ge' ? 'de-DE' : 'en-US', {
            dateStyle: 'medium',
          })}
        </p>
      ) : null}
    </div>
  );

  return (
    <div className="relative w-full max-w-none">
      {/* Mobil: ikon ortada, metin altta */}
      <div className="flex flex-col items-center md:hidden">
        <div
          className={`flex items-center justify-center transition-transform duration-500 group-hover:rotate-0 ${tilt} ${iconBox}`}
        >
          {variant === 'locked' ? (
            <Lock className="h-12 w-12 text-slate-400 dark:text-zinc-500" strokeWidth={1.75} aria-hidden />
          ) : variant === 'current' ? (
            <Sparkles className="h-14 w-14 text-white" strokeWidth={2} aria-hidden />
          ) : (
            milestoneIconNode(m.icon, 'h-12 w-12 text-emerald-500')
          )}
        </div>
        <div className="mt-4 max-w-xs px-2 text-center">
          <h4 className="font-logo text-lg font-bold text-slate-900 dark:text-white">{mileTitle}</h4>
          <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">{desc}</p>
          {variant === 'done' && m.earned_at ? (
            <p className="mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {new Date(m.earned_at).toLocaleString(
                language === 'tr' ? 'tr-TR' : language === 'ge' ? 'de-DE' : 'en-US',
                { dateStyle: 'medium' },
              )}
            </p>
          ) : null}
        </div>
      </div>

      {/* Masaüstü: [sol metin] [orta ikon = çizgi] [sağ metin] — metin asla ortadaki şeride binmez */}
      <div className="group hidden items-center gap-4 md:grid md:grid-cols-[minmax(0,1fr)_7.5rem_minmax(0,1fr)] md:gap-5 lg:grid-cols-[minmax(0,1fr)_8.5rem_minmax(0,1fr)]">
        <div
          className={`min-w-0 max-w-md justify-self-end pr-1 text-right ${labelOnRight ? 'invisible pointer-events-none select-none' : ''}`}
          aria-hidden={labelOnRight}
        >
          {!labelOnRight ? desktopLabels : null}
        </div>
        <div className="flex justify-center justify-self-center">
          <div className={`flex items-center justify-center transition-transform duration-500 group-hover:rotate-0 ${tilt} ${iconBox}`}>
            {variant === 'locked' ? (
              <Lock className="h-12 w-12 text-slate-400 dark:text-zinc-500" strokeWidth={1.75} aria-hidden />
            ) : variant === 'current' ? (
              <Sparkles className="h-14 w-14 text-white" strokeWidth={2} aria-hidden />
            ) : (
              milestoneIconNode(m.icon, 'h-12 w-12 text-emerald-500')
            )}
          </div>
        </div>
        <div
          className={`min-w-0 max-w-md justify-self-start pl-1 text-left ${!labelOnRight ? 'invisible pointer-events-none select-none' : ''}`}
          aria-hidden={!labelOnRight}
        >
          {labelOnRight ? desktopLabels : null}
        </div>
      </div>
    </div>
  );
}

export default function KidsStudentRoadmapPage() {
  const router = useRouter();
  const { user, loading: authLoading, pathPrefix, refreshUser } = useKidsAuth();
  const { t, language } = useKidsI18n();
  const [data, setData] = useState<KidsBadgeRoadmap | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await kidsGetBadgeRoadmap();
      setData(d);
      await refreshUser();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('roadmap.loadError'));
    } finally {
      setLoading(false);
    }
  }, [refreshUser, t]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'student') {
      router.replace(kidsLoginPortalHref(pathPrefix, 'ogrenci'));
      return;
    }
    void load();
  }, [authLoading, user?.id, user?.role, router, pathPrefix, load]);

  const sorted = useMemo(() => {
    const list = data?.milestones ?? [];
    return [...list].sort((a, b) => a.order - b.order);
  }, [data]);

  const currentKey = useMemo(() => sorted.find((m) => !m.unlocked)?.key ?? null, [sorted]);

  const columnMilestones = useMemo(() => milestonesForColumn(sorted), [sorted]);

  const { pathRef, anchors } = useRoadmapPathAnchors(columnMilestones.length);

  const growthDisplay = data?.growth_points ?? user?.growth_points ?? 0;
  const rankTitle = localizedGrowthStageTitle(user?.growth_stage, t, 'roadmap.rankExplorer');
  const starsEarned = data?.teacher_picks.length ?? 0;
  const starProgress = Math.min(1, starsEarned / CHALLENGE_STARS_GOAL);
  const unlockedCount = sorted.filter((m) => m.unlocked).length;
  const starSlots = 8;
  const filledStars = Math.min(starSlots, Math.round(starProgress * starSlots));

  const gpFmt = new Intl.NumberFormat(language === 'tr' ? 'tr-TR' : language === 'ge' ? 'de-DE' : 'en-US').format(
    growthDisplay,
  );

  if (authLoading || !user || user.role !== 'student') {
    return <p className="text-center text-gray-600 dark:text-zinc-400">{t('common.loading')}</p>;
  }

  return (
    <KidsPanelMax className="max-w-7xl px-1 pb-12 sm:px-3 lg:px-6">
      <div className="space-y-12">
      <Link
        href={`${pathPrefix}/ogrenci/panel`}
        className="inline-block text-sm font-semibold text-violet-600 hover:underline dark:text-violet-400"
      >
        {t('roadmap.backToStudent')}
      </Link>

      {/* Hero */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="flex items-center justify-between rounded-xl border border-white/40 bg-white/70 p-8 shadow-xl shadow-slate-200/50 backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/60 dark:shadow-none">
          <div className="space-y-1">
            <p className="text-sm font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
              {t('roadmap.statGrowthLabel')}
            </p>
            <h2 className="font-logo text-5xl font-black tabular-nums text-slate-900 dark:text-white">
              {loading ? '…' : gpFmt}
            </h2>
          </div>
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300">
            <TrendingUp className="h-10 w-10" strokeWidth={2.25} aria-hidden />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-white/40 bg-white/70 p-8 shadow-xl shadow-slate-200/50 backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/60 dark:shadow-none">
          <div className="min-w-0 space-y-1 pr-3">
            <p className="text-sm font-bold uppercase tracking-wider text-rose-500 dark:text-rose-400">
              {t('roadmap.statRankLabel')}
            </p>
            <h2 className="font-logo truncate text-4xl font-black text-slate-900 dark:text-white sm:text-5xl">{rankTitle}</h2>
          </div>
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-rose-500 dark:bg-rose-500/20 dark:text-rose-400">
            <Rocket className="h-10 w-10" strokeWidth={2.25} aria-hidden />
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h1 className="font-logo text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">{t('roadmap.title')}</h1>
        <p className="text-lg text-slate-600 dark:text-zinc-400">{t('roadmap.heroSubtitle')}</p>
      </section>

      {/* Yol: masaüstünde eğri üzerinde mutlak konum; mobilde dikey liste */}
      <section className="relative mx-auto w-full max-w-5xl overflow-x-clip py-10 md:py-16">
        {loading ? (
          <div className="relative z-[1] mx-auto flex min-h-[min(400px,50vh)] w-full max-w-md items-center justify-center">
            <div className="h-48 w-full animate-pulse rounded-3xl bg-slate-200/80 dark:bg-zinc-800" />
          </div>
        ) : columnMilestones.length === 0 ? (
          <p className="relative z-[1] py-16 text-center text-slate-500 dark:text-zinc-400">{t('roadmap.emptyMilestones')}</p>
        ) : (
          <>
            <svg
              className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
              viewBox={`0 0 ${ROAD_VIEW_W} ${ROAD_VIEW_H}`}
              aria-hidden
            >
              <path ref={pathRef as Ref<SVGPathElement>} d={ROAD_PATH_D} fill="none" />
            </svg>

            <div className="relative z-[1] flex flex-col items-center gap-12 px-2 md:hidden">
              {columnMilestones.map((m, i) => {
                const variant: NodeVariant = m.unlocked ? 'done' : m.key === currentKey ? 'current' : 'locked';
                return (
                  <RoadmapMilestoneRow
                    key={m.key}
                    m={m}
                    variant={variant}
                    layoutIndex={i}
                    pathAnchor={null}
                    t={t}
                    language={language}
                  />
                );
              })}
            </div>

            <div className="relative z-0 mx-auto hidden min-h-[3200px] w-full md:block">
              <RoadmapPathBackground />
              <div className="relative z-[2] min-h-[3200px] w-full">
                {columnMilestones.map((m, i) => {
                  const variant: NodeVariant = m.unlocked ? 'done' : m.key === currentKey ? 'current' : 'locked';
                  const anchor = anchors[i];
                  return (
                    <div
                      key={m.key}
                      className="absolute w-[min(96vw,30rem)] -translate-x-1/2 -translate-y-1/2"
                      style={
                        anchor
                          ? { left: `${anchor.leftPct}%`, top: `${anchor.topPct}%` }
                          : { left: '50%', top: `${8 + (i * 82) / Math.max(1, columnMilestones.length - 1)}%` }
                      }
                    >
                      <RoadmapMilestoneRow
                        m={m}
                        variant={variant}
                        layoutIndex={i}
                        pathAnchor={anchor ?? null}
                        t={t}
                        language={language}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </section>

      {/* Challenge Stars */}
      <section className="pt-4 md:pt-12">
        <div className="relative overflow-hidden rounded-xl bg-slate-200/60 p-8 dark:bg-zinc-800/80 md:p-10">
          <div className="pointer-events-none absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="relative z-10 flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div className="space-y-3">
              <h3 className="font-logo text-3xl font-bold text-slate-900 dark:text-white">{t('roadmap.challengeStarsTitle')}</h3>
              <p className="max-w-md text-slate-600 dark:text-zinc-400">
                {interpolate(t('roadmap.challengeStarsBody'), { goal: CHALLENGE_STARS_GOAL })}
              </p>
              <p className="text-xs text-slate-500 dark:text-zinc-500">
                {t('roadmap.challengeStarsHint').replace('{limit}', String(data?.teacher_pick_limit ?? 5))}
              </p>
            </div>
            <div className="flex gap-4">
              <div className="w-32 space-y-2 rounded-lg border border-white/50 bg-white/90 p-6 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-900/90">
                <Star className="mx-auto h-10 w-10 text-amber-500" strokeWidth={2} fill="currentColor" aria-hidden />
                <p className="font-logo text-2xl font-black text-slate-900 dark:text-white">
                  {starsEarned}/{CHALLENGE_STARS_GOAL}
                </p>
                <p className="text-xs font-bold uppercase text-slate-400">{t('roadmap.progressCardLabel')}</p>
              </div>
              <div className="w-32 space-y-2 rounded-lg bg-linear-to-br from-amber-400 to-amber-600 p-6 text-center shadow-lg shadow-amber-500/25">
                <Medal className="mx-auto h-10 w-10 text-white" strokeWidth={2} aria-hidden />
                <p className="font-logo text-2xl font-black text-white">{unlockedCount}</p>
                <p className="text-xs font-bold uppercase text-white/80">{t('roadmap.milestonesCardLabel')}</p>
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {Array.from({ length: starSlots }, (_, i) => (
              <div
                key={i}
                className="flex h-16 items-center justify-center rounded-xl bg-white/40 dark:bg-zinc-900/50"
              >
                <Star
                  className={`h-8 w-8 ${i < filledStars ? 'text-amber-400' : 'text-slate-200 dark:text-zinc-600'}`}
                  strokeWidth={i < filledStars ? 0 : 1.5}
                  fill={i < filledStars ? 'currentColor' : 'none'}
                  aria-hidden
                />
              </div>
            ))}
          </div>

          {data && data.teacher_picks.length > 0 ? (
            <ul className="relative z-10 mt-8 space-y-2 border-t border-white/30 pt-6 dark:border-zinc-700">
              <li className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                {t('roadmap.recentStars')}
              </li>
              {data.teacher_picks.slice(0, 5).map((p) => (
                <li key={p.key} className="flex items-center gap-2 text-sm text-slate-700 dark:text-zinc-300">
                  <Star className="h-4 w-4 shrink-0 text-amber-500" fill="currentColor" aria-hidden />
                  <span className="min-w-0 truncate">{p.label}</span>
                </li>
              ))}
            </ul>
          ) : !loading && starsEarned === 0 ? (
            <p className="relative z-10 mt-8 text-center text-sm text-slate-500 dark:text-zinc-400">{t('roadmap.noStars')}</p>
          ) : null}
        </div>
      </section>
      </div>
    </KidsPanelMax>
  );
}
