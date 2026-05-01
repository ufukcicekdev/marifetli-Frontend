'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  Award,
  BookOpen,
  ChevronLeft,
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

const ROAD_PATH_D =
  'M500 810 C265 745 235 685 520 615 S785 535 475 465 S210 385 515 315 S795 235 465 165 S220 95 340 45 S460 12 500 8';

const ROAD_VIEW_W = 1000;
const ROAD_VIEW_H = 820;

type RoadmapPathAnchor = {
  leftPct: number;
  topPct: number;
  labelOnRight: boolean;
};

// Cubic bezier noktası: P0,P1,P2,P3 kontrol noktaları, t∈[0,1]
function cubicBezier(p0: number, p1: number, p2: number, p3: number, t: number) {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

// ROAD_PATH_D'yi parse edip t∈[0,1] için x,y döndürür.
// Path: M500 810 C265 745 235 685 520 615 S785 535 475 465 S210 385 515 315 S795 235 465 165 S220 95 340 45 S460 12 500 8
// Bunu elle segment listesine çevirdik (başlangıç → bitiş arası bezier segmentleri).
const PATH_SEGMENTS: Array<{ x0:number;y0:number;x1:number;y1:number;x2:number;y2:number;x3:number;y3:number }> = [
  // C265 745 235 685 520 615
  { x0:500,y0:810, x1:265,y1:745, x2:235,y2:685, x3:520,y3:615 },
  // S785 535 475 465  → x1 = reflect of prev x2 from prev x3
  { x0:520,y0:615, x1:805,y1:545, x2:785,y2:535, x3:475,y3:465 },
  // S210 385 515 315
  { x0:475,y0:465, x1:165,y1:395, x2:210,y2:385, x3:515,y3:315 },
  // S795 235 465 165
  { x0:515,y0:315, x1:820,y1:245, x2:795,y2:235, x3:465,y3:165 },
  // S220 95 340 45
  { x0:465,y0:165, x1:135,y1:95,  x2:220,y2:95,  x3:340,y3:45  },
  // S460 12 500 8
  { x0:340,y0:45,  x1:460,y1:-5,  x2:460,y2:12,  x3:500,y3:8   },
];

// Arc-length tablosunu önceden hesapla (500 örnek nokta)
const ARC_SAMPLES = 500;
type ArcEntry = { t: number; x: number; y: number; dist: number };

function buildArcTable(): ArcEntry[] {
  const table: ArcEntry[] = [];
  let totalDist = 0;
  let prevX = 0, prevY = 0;
  for (let i = 0; i <= ARC_SAMPLES; i++) {
    const t = i / ARC_SAMPLES;
    const segCount = PATH_SEGMENTS.length;
    const segT = t * segCount;
    const segIdx = Math.min(Math.floor(segT), segCount - 1);
    const localT = segT - segIdx;
    const s = PATH_SEGMENTS[segIdx];
    const x = cubicBezier(s.x0, s.x1, s.x2, s.x3, localT);
    const y = cubicBezier(s.y0, s.y1, s.y2, s.y3, localT);
    if (i > 0) {
      const dx = x - prevX, dy = y - prevY;
      totalDist += Math.sqrt(dx * dx + dy * dy);
    }
    table.push({ t, x, y, dist: totalDist });
    prevX = x; prevY = y;
  }
  return table;
}

const ARC_TABLE = buildArcTable();
const TOTAL_ARC = ARC_TABLE[ARC_TABLE.length - 1].dist;

// Arc-length t değerine göre x,y döndür
function sampleByArc(arcT: number): { x: number; y: number } {
  const targetDist = arcT * TOTAL_ARC;
  let lo = 0, hi = ARC_TABLE.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (ARC_TABLE[mid].dist < targetDist) lo = mid; else hi = mid;
  }
  const a = ARC_TABLE[lo], b = ARC_TABLE[hi];
  const span = b.dist - a.dist;
  const alpha = span < 0.0001 ? 0 : (targetDist - a.dist) / span;
  return { x: a.x + (b.x - a.x) * alpha, y: a.y + (b.y - a.y) * alpha };
}

function computeAnchors(count: number): RoadmapPathAnchor[] {
  if (count < 1) return [];
  return Array.from({ length: count }, (_, i) => {
    // i=0 en üst (son milestone), i=count-1 en alt (ilk milestone)
    // arcT=0 → path başı (alt, 500,810), arcT=1 → path sonu (üst, 500,8)
    const arcT = count <= 1 ? 0.5 : 1 - i / (count - 1);
    const { x, y } = sampleByArc(arcT);
    return {
      leftPct: (x / ROAD_VIEW_W) * 100,
      topPct: (y / ROAD_VIEW_H) * 100,
      labelOnRight: x < 500,
    };
  });
}

function useRoadmapPathAnchors(count: number): { anchors: RoadmapPathAnchor[] } {
  const anchors = useMemo(() => computeAnchors(count), [count]);
  return { anchors };
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
        <linearGradient id="kidsRoadGrad" x1="0%" x2="0%" y1="100%" y2="0%">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="33%" stopColor="#a855f7" />
          <stop offset="66%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
        <filter id="kidsRoadGlow">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* Glow gölgesi */}
      <path d={ROAD_PATH_D} fill="none" stroke="url(#kidsRoadGrad)" strokeWidth={50} strokeLinecap="round" className="opacity-20" filter="url(#kidsRoadGlow)" />
      {/* Ana renkli yol */}
      <path d={ROAD_PATH_D} fill="none" stroke="url(#kidsRoadGrad)" strokeWidth={28} strokeLinecap="round" className="opacity-60" />
      {/* Orta beyaz kesik çizgi */}
      <path d={ROAD_PATH_D} fill="none" stroke="white" strokeWidth={3} strokeDasharray="16 24" strokeLinecap="round" className="opacity-50" />
    </svg>
  );
}

// Masaüstü: node doğrudan path üzerinde, etiket yana absolute offset
function DesktopMilestoneNode({
  m, variant, layoutIndex, anchor, t, language,
}: {
  m: KidsRoadmapMilestone;
  variant: NodeVariant;
  layoutIndex: number;
  anchor: RoadmapPathAnchor;
  t: (key: string) => string;
  language: 'tr' | 'en' | 'ge';
}) {
  const { title: mileTitle, subtitle: mileSubtitle } = localizedMilestoneCopy(m, t);
  const labelOnRight = anchor.labelOnRight;
  const tilt = variant === 'current' ? 'rotate-6' : layoutIndex % 2 === 0 ? 'rotate-3' : '-rotate-12';

  const doneColors = [
    'from-emerald-400 to-teal-500 shadow-emerald-400/50',
    'from-sky-400 to-blue-500 shadow-sky-400/50',
    'from-violet-400 to-purple-600 shadow-violet-400/50',
    'from-pink-400 to-rose-500 shadow-pink-400/50',
    'from-amber-400 to-orange-500 shadow-amber-400/50',
  ];
  const doneColor = doneColors[layoutIndex % doneColors.length];

  const nodeSize = variant === 'current' ? 'h-[7.5rem] w-[7.5rem]' : 'h-28 w-28';
  const nodeStyle =
    variant === 'locked'
      ? 'flex items-center justify-center rounded-3xl bg-slate-100/90 dark:bg-zinc-800 ring-4 ring-slate-300/60 dark:ring-zinc-700 shadow-lg backdrop-blur-sm'
      : variant === 'current'
        ? 'flex items-center justify-center rounded-3xl bg-linear-to-br from-yellow-400 via-orange-500 to-pink-500 shadow-2xl shadow-orange-400/60 ring-4 ring-white/60 kids-roadmap-node-pulse'
        : `flex items-center justify-center rounded-3xl bg-linear-to-br ${doneColor} shadow-xl ring-4 ring-white/50`;

  const desc =
    variant === 'locked'
      ? t('roadmap.lockedBadgeShort')
      : variant === 'current'
        ? `${t('roadmap.currentTargetPrefix')} ${mileSubtitle}`
        : mileSubtitle;

  const labelCard = (
    <div className={`w-44 rounded-2xl px-3 py-2.5 shadow-md backdrop-blur-sm ${
      variant === 'locked'
        ? 'bg-white/60 dark:bg-zinc-900/60 opacity-60'
        : variant === 'current'
          ? 'bg-linear-to-br from-orange-50 to-pink-50 dark:from-orange-950/50 dark:to-pink-950/50 ring-1 ring-orange-200/70 dark:ring-orange-800/40'
          : 'bg-white/85 dark:bg-zinc-900/80 ring-1 ring-white/60 dark:ring-zinc-700/60'
    }`}>
      <h4 className={`font-logo text-sm font-bold leading-snug ${
        variant === 'current' ? 'text-orange-600 dark:text-orange-400'
        : variant === 'locked' ? 'text-slate-400 dark:text-zinc-500'
        : 'text-slate-900 dark:text-white'
      }`}>{mileTitle}</h4>
      <p className={`mt-0.5 text-xs leading-snug ${variant === 'locked' ? 'text-slate-300 dark:text-zinc-600' : 'text-slate-500 dark:text-zinc-400'}`}>{desc}</p>
      {variant === 'done' && m.earned_at ? (
        <p className="mt-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
          ✓ {new Date(m.earned_at).toLocaleString(language === 'tr' ? 'tr-TR' : language === 'ge' ? 'de-DE' : 'en-US', { dateStyle: 'medium' })}
        </p>
      ) : null}
    </div>
  );

  return (
    // Node merkezi path anchor noktasına gelecek şekilde -translate-x/y-1/2
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${anchor.leftPct}%`, top: `${anchor.topPct}%` }}
    >
      {/* Node ikonu */}
      <div className={`relative z-10 transition-transform duration-500 hover:rotate-0 ${tilt} ${nodeSize} ${nodeStyle}`}>
        {variant === 'locked'
          ? <Lock className="h-11 w-11 text-slate-300 dark:text-zinc-600" strokeWidth={1.75} aria-hidden />
          : variant === 'current'
            ? <Sparkles className="h-14 w-14 text-white drop-shadow-lg" strokeWidth={2} aria-hidden />
            : milestoneIconNode(m.icon, 'h-12 w-12 text-white drop-shadow-lg')}
      </div>

      {/* Etiket: node'un sağına veya soluna, ortalı */}
      <div
        className="absolute top-1/2 -translate-y-1/2"
        style={labelOnRight ? { left: 'calc(100% + 14px)' } : { right: 'calc(100% + 14px)' }}
      >
        {labelCard}
      </div>
    </div>
  );
}

function RoadmapMilestoneRow({
  m, variant, layoutIndex, t, language,
}: {
  m: KidsRoadmapMilestone;
  variant: NodeVariant;
  layoutIndex: number;
  t: (key: string) => string;
  language: 'tr' | 'en' | 'ge';
}) {
  const { title: mileTitle, subtitle: mileSubtitle } = localizedMilestoneCopy(m, t);
  const tilt = variant === 'current' ? 'rotate-6' : layoutIndex % 2 === 0 ? 'rotate-3' : '-rotate-12';

  const doneColors = [
    'from-emerald-400 to-teal-500 shadow-emerald-400/50',
    'from-sky-400 to-blue-500 shadow-sky-400/50',
    'from-violet-400 to-purple-600 shadow-violet-400/50',
    'from-pink-400 to-rose-500 shadow-pink-400/50',
    'from-amber-400 to-orange-500 shadow-amber-400/50',
  ];
  const doneColor = doneColors[layoutIndex % doneColors.length];

  const iconBox =
    variant === 'locked'
      ? 'flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-100 dark:bg-zinc-800 ring-4 ring-slate-300/60 dark:ring-zinc-700 shadow-lg'
      : variant === 'current'
        ? 'kids-roadmap-node-pulse flex h-28 w-28 items-center justify-center rounded-3xl bg-linear-to-br from-yellow-400 via-orange-500 to-pink-500 shadow-2xl shadow-orange-400/60 ring-4 ring-white/60'
        : `flex h-24 w-24 items-center justify-center rounded-3xl bg-linear-to-br ${doneColor} shadow-xl ring-4 ring-white/50`;

  const desc =
    variant === 'locked'
      ? t('roadmap.lockedBadgeShort')
      : variant === 'current'
        ? `${t('roadmap.currentTargetPrefix')} ${mileSubtitle}`
        : mileSubtitle;

  // Sadece mobil için kullanılır
  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`transition-transform duration-500 hover:rotate-0 ${tilt} ${iconBox}`}>
        {variant === 'locked'
          ? <Lock className="h-10 w-10 text-slate-300 dark:text-zinc-600" strokeWidth={1.75} aria-hidden />
          : variant === 'current'
            ? <Sparkles className="h-12 w-12 text-white drop-shadow" strokeWidth={2} aria-hidden />
            : milestoneIconNode(m.icon, 'h-10 w-10 text-white drop-shadow')}
      </div>
      <div className={`max-w-xs rounded-2xl px-4 py-3 text-center shadow-sm backdrop-blur-sm ${
        variant === 'locked' ? 'bg-white/50 dark:bg-zinc-900/50 opacity-60'
        : variant === 'current' ? 'bg-linear-to-r from-orange-50 to-pink-50 dark:from-orange-950/40 dark:to-pink-950/40 ring-1 ring-orange-200/60'
        : 'bg-white/80 dark:bg-zinc-900/70 ring-1 ring-white/60 dark:ring-zinc-700/60'
      }`}>
        <h4 className={`font-logo text-base font-bold ${
          variant === 'current' ? 'text-orange-600 dark:text-orange-400'
          : variant === 'locked' ? 'text-slate-400 dark:text-zinc-500'
          : 'text-slate-900 dark:text-white'
        }`}>{mileTitle}</h4>
        <p className={`mt-1 text-sm ${variant === 'locked' ? 'text-slate-300 dark:text-zinc-600' : 'text-slate-500 dark:text-zinc-400'}`}>{desc}</p>
        {variant === 'done' && m.earned_at ? (
          <p className="mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            ✓ {new Date(m.earned_at).toLocaleString(language === 'tr' ? 'tr-TR' : language === 'ge' ? 'de-DE' : 'en-US', { dateStyle: 'medium' })}
          </p>
        ) : null}
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

  const sorted = useMemo(() => [...(data?.milestones ?? [])].sort((a, b) => a.order - b.order), [data]);
  const currentKey = useMemo(() => sorted.find((m) => !m.unlocked)?.key ?? null, [sorted]);
  const columnMilestones = useMemo(() => milestonesForColumn(sorted), [sorted]);
  const { anchors } = useRoadmapPathAnchors(columnMilestones.length);

  const growthDisplay = data?.growth_points ?? user?.growth_points ?? 0;
  const rankTitle = localizedGrowthStageTitle(user?.growth_stage, t, 'roadmap.rankExplorer');
  const starsEarned = data?.teacher_picks.length ?? 0;
  const starProgress = Math.min(1, starsEarned / CHALLENGE_STARS_GOAL);
  const unlockedCount = sorted.filter((m) => m.unlocked).length;
  const starSlots = 8;
  const filledStars = Math.min(starSlots, Math.round(starProgress * starSlots));
  const gpFmt = new Intl.NumberFormat(language === 'tr' ? 'tr-TR' : language === 'ge' ? 'de-DE' : 'en-US').format(growthDisplay);

  if (authLoading || !user || user.role !== 'student') {
    return <p className="text-center text-gray-600 dark:text-zinc-400">{t('common.loading')}</p>;
  }

  return (
    <KidsPanelMax className="max-w-7xl px-1 pb-16 sm:px-3 lg:px-6">
      {/* Dekoratif arka plan blob'ları */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-orange-400/15 blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 h-72 w-72 rounded-full bg-sky-400/15 blur-3xl" />
        <div className="absolute -bottom-20 right-1/3 h-64 w-64 rounded-full bg-emerald-400/15 blur-3xl" />
      </div>

      <div className="space-y-10">
        {/* Geri butonu */}
        <Link
          href={`${pathPrefix}/ogrenci/panel`}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-4 py-2 text-sm font-bold text-violet-600 shadow-sm ring-1 ring-violet-200/60 backdrop-blur-sm transition hover:bg-violet-50 hover:shadow-md dark:bg-zinc-900/70 dark:text-violet-400 dark:ring-violet-800/40"
        >
          <ChevronLeft className="h-4 w-4" />
          {t('roadmap.backToStudent')}
        </Link>

        {/* Başlık */}
        <section>
          <h1 className="font-logo text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            {t('roadmap.title')} <span className="text-transparent bg-clip-text bg-linear-to-r from-violet-600 to-pink-500">✨</span>
          </h1>
          <p className="mt-2 text-lg text-slate-600 dark:text-zinc-400">{t('roadmap.heroSubtitle')}</p>
        </section>

        {/* Hero kartlar */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Büyüme puanı */}
          <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-violet-500 to-purple-700 p-6 shadow-xl shadow-violet-500/30">
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/10" />
            <p className="relative text-sm font-bold uppercase tracking-wider text-violet-200">
              {t('roadmap.statGrowthLabel')}
            </p>
            <div className="relative mt-2 flex items-end justify-between">
              <h2 className="font-logo text-5xl font-black tabular-nums text-white">
                {loading ? '…' : gpFmt}
              </h2>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                <TrendingUp className="h-7 w-7 text-white" strokeWidth={2.5} aria-hidden />
              </div>
            </div>
          </div>

          {/* Rütbe */}
          <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-orange-400 to-pink-600 p-6 shadow-xl shadow-pink-500/30">
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/10" />
            <p className="relative text-sm font-bold uppercase tracking-wider text-orange-100">
              {t('roadmap.statRankLabel')}
            </p>
            <div className="relative mt-2 flex items-end justify-between gap-2">
              <h2 className="font-logo truncate text-4xl font-black text-white sm:text-5xl">{rankTitle}</h2>
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                <Rocket className="h-7 w-7 text-white" strokeWidth={2.5} aria-hidden />
              </div>
            </div>
          </div>
        </section>

        {/* Yol */}
        <section className="relative mx-auto w-full max-w-5xl overflow-x-clip py-8 md:py-14">
          {loading ? (
            <div className="flex min-h-64 items-center justify-center">
              <div className="h-48 w-full max-w-md animate-pulse rounded-3xl bg-slate-200/80 dark:bg-zinc-800" />
            </div>
          ) : columnMilestones.length === 0 ? (
            <p className="py-16 text-center text-slate-500 dark:text-zinc-400">{t('roadmap.emptyMilestones')}</p>
          ) : (
            <>
              {/* Mobil: dikey liste */}
              <div className="relative z-1 flex flex-col items-center gap-10 px-2 md:hidden">
                {columnMilestones.map((m, i) => {
                  const variant: NodeVariant = m.unlocked ? 'done' : m.key === currentKey ? 'current' : 'locked';
                  return (
                    <RoadmapMilestoneRow key={m.key} m={m} variant={variant} layoutIndex={i} t={t} language={language} />
                  );
                })}
              </div>

              {/* Masaüstü: her node doğrudan path anchor üzerinde */}
              <div className="relative z-0 mx-auto hidden min-h-800 w-full md:block">
                <RoadmapPathBackground />
                <div className="relative z-2 min-h-800 w-full">
                  {columnMilestones.map((m, i) => {
                    const variant: NodeVariant = m.unlocked ? 'done' : m.key === currentKey ? 'current' : 'locked';
                    const anchor = anchors[i];
                    if (!anchor) return null;
                    return (
                      <DesktopMilestoneNode
                        key={m.key}
                        m={m}
                        variant={variant}
                        layoutIndex={i}
                        anchor={anchor}
                        t={t}
                        language={language}
                      />
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </section>

        {/* Challenge Stars */}
        <section>
          <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-slate-900 via-violet-950 to-slate-900 p-8 shadow-2xl dark:from-zinc-950 dark:via-violet-950/80 dark:to-zinc-950 md:p-10">
            {/* Dekor */}
            <div className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-amber-500/15 blur-2xl" />

            <div className="relative z-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div className="space-y-2">
                <h3 className="font-logo text-3xl font-bold text-white">{t('roadmap.challengeStarsTitle')}</h3>
                <p className="max-w-md text-violet-300">
                  {interpolate(t('roadmap.challengeStarsBody'), { goal: CHALLENGE_STARS_GOAL })}
                </p>
                <p className="text-xs text-violet-400/70">
                  {t('roadmap.challengeStarsHint').replace('{limit}', String(data?.teacher_pick_limit ?? 5))}
                </p>
              </div>
              <div className="flex gap-3">
                <div className="w-32 space-y-2 rounded-2xl bg-white/10 p-5 text-center ring-1 ring-white/20 backdrop-blur-sm">
                  <Star className="mx-auto h-9 w-9 text-amber-400" strokeWidth={0} fill="currentColor" aria-hidden />
                  <p className="font-logo text-2xl font-black text-white">{starsEarned}/{CHALLENGE_STARS_GOAL}</p>
                  <p className="text-xs font-bold uppercase text-white/50">{t('roadmap.progressCardLabel')}</p>
                </div>
                <div className="w-32 space-y-2 rounded-2xl bg-linear-to-br from-amber-400 to-orange-600 p-5 text-center shadow-lg shadow-amber-500/30">
                  <Medal className="mx-auto h-9 w-9 text-white" strokeWidth={2} aria-hidden />
                  <p className="font-logo text-2xl font-black text-white">{unlockedCount}</p>
                  <p className="text-xs font-bold uppercase text-white/80">{t('roadmap.milestonesCardLabel')}</p>
                </div>
              </div>
            </div>

            {/* Yıldız slotları */}
            <div className="relative z-10 mt-8 grid grid-cols-4 gap-3 sm:grid-cols-8">
              {Array.from({ length: starSlots }, (_, i) => (
                <div
                  key={i}
                  className={`flex h-16 items-center justify-center rounded-2xl transition-all duration-300 ${
                    i < filledStars
                      ? 'bg-linear-to-br from-amber-400 to-yellow-500 shadow-lg shadow-amber-500/40 scale-105'
                      : 'bg-white/5 ring-1 ring-white/10'
                  }`}
                >
                  <Star
                    className={`h-8 w-8 ${i < filledStars ? 'text-white drop-shadow' : 'text-white/20'}`}
                    strokeWidth={0}
                    fill="currentColor"
                    aria-hidden
                  />
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div className="relative z-10 mt-4">
              <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-linear-to-r from-amber-400 to-orange-500 transition-all duration-700"
                  style={{ width: `${starProgress * 100}%` }}
                />
              </div>
              <p className="mt-1.5 text-right text-xs font-semibold text-white/40">
                {Math.round(starProgress * 100)}%
              </p>
            </div>

            {data && data.teacher_picks.length > 0 ? (
              <ul className="relative z-10 mt-6 space-y-2 border-t border-white/10 pt-5">
                <li className="text-xs font-bold uppercase tracking-wide text-white/40">{t('roadmap.recentStars')}</li>
                {data.teacher_picks.slice(0, 5).map((p) => (
                  <li key={p.key} className="flex items-center gap-2 text-sm text-white/70">
                    <Star className="h-4 w-4 shrink-0 text-amber-400" fill="currentColor" aria-hidden />
                    <span className="min-w-0 truncate">{p.label}</span>
                  </li>
                ))}
              </ul>
            ) : !loading && starsEarned === 0 ? (
              <p className="relative z-10 mt-6 text-center text-sm text-white/40">{t('roadmap.noStars')}</p>
            ) : null}
          </div>
        </section>
      </div>
    </KidsPanelMax>
  );
}
