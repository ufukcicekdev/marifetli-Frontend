'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  ArrowRight,
  Clock,
  Grid3x3,
  History,
  Lock,
  Pause,
  Play,
  RefreshCw,
  Rocket,
  Search as SearchIcon,
  Signal,
  Sparkles,
  Star,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  kidsCompleteGameSession,
  kidsGetBadgeRoadmap,
  kidsGetReadingStory,
  kidsGetReadingWords,
  kidsMyGameSessions,
  kidsStartGameSession,
  kidsStudentGamesOverview,
  type KidsBadgeRoadmap,
  type KidsGame,
  type KidsGameSession,
  type KidsRoadmapMilestone,
  type ReadingStory as ReadingStoryData,
  type ReadingWord as ReadingWordData,
} from '@/src/lib/kids-api';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';
import { localizedKidsGameCopy } from '@/src/lib/kids-game-i18n';
import { localizedMilestoneCopy } from '@/src/lib/kids-roadmap-i18n';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import { useKidsI18n } from '@/src/providers/kids-language-provider';
import { KidsPanelMax, KidsPrimaryButton, KidsSecondaryButton } from '@/src/components/kids/kids-ui';

const MEMORY_ICONS = ['🍎', '🚗', '⭐', '🐶', '🎈', '⚽', '🌈', '🦋'];

const MEMORY_ICON_LABEL_KEY: Record<string, string> = {
  '🍎': 'gameCenter.memory.cards.apple',
  '🚗': 'gameCenter.memory.cards.car',
  '⭐': 'gameCenter.memory.cards.star',
  '🐶': 'gameCenter.memory.cards.dog',
  '🎈': 'gameCenter.memory.cards.balloon',
  '⚽': 'gameCenter.memory.cards.ball',
  '🌈': 'gameCenter.memory.cards.rainbow',
  '🦋': 'gameCenter.memory.cards.butterfly',
};

function memoryPairLabel(icon: string, t: (key: string) => string): string {
  const key = MEMORY_ICON_LABEL_KEY[icon];
  if (!key) return icon;
  const out = t(key);
  return out === key ? icon : out;
}

function formatMmSs(totalSeconds: number): string {
  const m = Math.floor(Math.max(0, totalSeconds) / 60);
  const s = Math.max(0, totalSeconds) % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
const WORD_LEVELS = ['KEDI', 'OKUL', 'SEKER', 'KALEM', 'OYUNCU'];
const SHAPES = ['🔺', '🔵', '🟩', '🟨'];

type MiniGameType = 'memory' | 'math' | 'word' | 'shape' | 'reading-word' | 'reading-story';
type SoundKind = 'tap' | 'success' | 'error' | 'levelup' | 'finish';
type MathOperation = 'add' | 'sub' | 'mul' | 'div';

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function gameTypeFor(game: KidsGame, idx: number): MiniGameType {
  const bySlug: Record<string, MiniGameType> = {
    'hafiza-kartlari': 'memory',
    'hizli-toplama': 'math',
    'hizli-cikarma': 'math',
    'hizli-carpma': 'math',
    'hizli-bolme': 'math',
    'kelime-avcisi': 'word',
    'sekil-eslestirme': 'shape',
    'kelime-okuma': 'reading-word',
    'hikaye-okuma': 'reading-story',
  };
  if (bySlug[game.slug]) return bySlug[game.slug];
  const fallback: MiniGameType[] = ['memory', 'math', 'word', 'shape', 'reading-word', 'reading-story'];
  return fallback[idx % fallback.length];
}

function mathOperationForGame(game: KidsGame | null): MathOperation {
  const slug = game?.slug || '';
  if (slug === 'hizli-cikarma') return 'sub';
  if (slug === 'hizli-carpma') return 'mul';
  if (slug === 'hizli-bolme') return 'div';
  return 'add';
}

/** Mockup / AIDA — matematik kahraman görseli (next.config remotePatterns) */
const MATH_HERO_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuB9N0DQzs1ArPrnKoZ1YVAN5m28WXbszvA4_CFhhQGMpEgDkZbX_m91FQIecc5oN90t9s9xA6TESU3mCUMRJqu49O5YZTbS2HI8FQorefCUHxHsYwjKb8-_7_5aF0azl29rVMyOOyXDbRXR3PxBJwHAdGRQna2B8VAebM5P9DLhwgPcirfsDpHzko8PWwl7JaNL-cj0GbMMZgEOBqRgodyYLHRtJIGnGlhXApQVCpCR0wPZtSt9qBbOqb_0fc7TDKq68yp1nc9YpJvs';

function sortGamesForHub(list: KidsGame[]): KidsGame[] {
  return [...list].sort((a, b) => {
    const idxa = list.findIndex((x) => x.id === a.id);
    const idxb = list.findIndex((x) => x.id === b.id);
    const ta = gameTypeFor(a, idxa >= 0 ? idxa : 0);
    const tb = gameTypeFor(b, idxb >= 0 ? idxb : 0);
    const order = (gt: MiniGameType) =>
      gt === 'math' ? 0 : gt === 'memory' ? 1 : gt === 'word' ? 2 : gt === 'reading-word' ? 4 : gt === 'reading-story' ? 5 : 3;
    const oa = order(ta);
    const ob = order(tb);
    if (oa !== ob) return oa - ob;
    return a.sort_order - b.sort_order;
  });
}

function formatSessionWhen(iso: string, language: string, t: (key: string) => string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffM = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  if (diffM < 1) return t('gameCenter.hub.timeJustNow');
  if (diffM < 60) return t('gameCenter.hub.timeMinutesAgo').replace('{n}', String(diffM));
  if (diffH < 24 && d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
    return t('gameCenter.hub.timeHoursAgo').replace('{n}', String(Math.max(1, diffH)));
  }
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  if (d.getDate() === y.getDate() && d.getMonth() === y.getMonth() && d.getFullYear() === y.getFullYear()) {
    const loc = language === 'en' ? 'en-US' : language === 'ge' ? 'de-DE' : 'tr-TR';
    const time = d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });
    return t('gameCenter.hub.timeYesterday').replace('{time}', time);
  }
  const loc = language === 'en' ? 'en-US' : language === 'ge' ? 'de-DE' : 'tr-TR';
  return d.toLocaleString(loc, { dateStyle: 'short', timeStyle: 'short' });
}

function galaxyLabelForType(gType: MiniGameType, t: (key: string) => string): string {
  if (gType === 'math') return t('gameCenter.hub.mathGalaxy');
  if (gType === 'memory') return t('gameCenter.hub.memoryGalaxy');
  if (gType === 'word') return t('gameCenter.hub.wordGalaxy');
  if (gType === 'reading-word') return t('gameCenter.hub.readingGalaxy');
  if (gType === 'reading-story') return t('gameCenter.hub.storyGalaxy');
  return t('gameCenter.hub.shapeGalaxy');
}

function difficultyPillClass(d: 'easy' | 'medium' | 'hard'): string {
  if (d === 'easy') return 'border-emerald-500/30 bg-emerald-500/20 text-emerald-300';
  if (d === 'medium') return 'border-amber-500/30 bg-amber-500/20 text-amber-200';
  return 'border-red-500/30 bg-red-500/20 text-red-300';
}

function DifficultyPicker({
  value,
  onChange,
  disabled,
  t,
}: {
  value: 'easy' | 'medium' | 'hard';
  onChange: (v: 'easy' | 'medium' | 'hard') => void;
  disabled?: boolean;
  t: (key: string) => string;
}) {
  const options: { v: 'easy' | 'medium' | 'hard'; emoji: string; active: string; idle: string }[] = [
    {
      v: 'easy',
      emoji: '🌱',
      active: 'bg-emerald-500/25 border-emerald-400/60 text-emerald-300 shadow-emerald-500/20',
      idle:   'border-white/10 bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70',
    },
    {
      v: 'medium',
      emoji: '⚡',
      active: 'bg-amber-500/25 border-amber-400/60 text-amber-300 shadow-amber-500/20',
      idle:   'border-white/10 bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70',
    },
    {
      v: 'hard',
      emoji: '🔥',
      active: 'bg-rose-500/25 border-rose-400/60 text-rose-300 shadow-rose-500/20',
      idle:   'border-white/10 bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70',
    },
  ];
  return (
    <div className="flex gap-1.5">
      {options.map(({ v, emoji, active, idle }) => (
        <button
          key={v}
          type="button"
          disabled={disabled}
          onClick={() => onChange(v)}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-xs font-black transition disabled:pointer-events-none disabled:opacity-40 ${
            value === v ? `${active} shadow-md` : idle
          }`}
        >
          <span className="text-sm leading-none">{emoji}</span>
          <span className="hidden sm:inline">{t(`gameCenter.difficulty.${v}`)}</span>
        </button>
      ))}
    </div>
  );
}

function BadgeShelfMilestone({
  milestone,
  palette,
  t,
}: {
  milestone: KidsRoadmapMilestone | undefined;
  palette: 'gold' | 'violet';
  t: (key: string) => string;
}) {
  if (!milestone) {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 text-3xl dark:bg-slate-800">🎯</div>
        <p className="mt-3 text-sm font-black text-slate-400 dark:text-slate-500">{t('gameCenter.hub.pathSoon')}</p>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('gameCenter.hub.pathSoonSub')}</p>
      </div>
    );
  }
  const copy = localizedMilestoneCopy(milestone, t);
  const unlocked = milestone.unlocked;
  const grad = palette === 'gold' ? 'from-amber-300 to-amber-600' : 'from-violet-400 to-purple-800';
  return (
    <div className="text-center">
      <div
        className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-linear-to-br ${grad} text-3xl shadow-lg transition group-hover:scale-105 ${
          unlocked ? '' : 'opacity-45 grayscale'
        }`}
      >
        {milestoneShelfEmoji(milestone.icon)}
      </div>
      <p className="mt-3 text-sm font-black text-slate-900 dark:text-white">{copy.title}</p>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{copy.subtitle}</p>
    </div>
  );
}

function milestoneShelfEmoji(icon: string): string {
  const map: Record<string, string> = {
    seed: '🌱',
    sprout: '🌿',
    tree: '🌳',
    star_tree: '✨',
    book: '📚',
    flag: '🚩',
    medal_pick: '🏅',
    gamepad: '🎮',
    flask: '🧪',
    gallery: '🖼️',
  };
  return map[icon] || '⭐';
}

function DailyGoalRing({
  pct,
  today,
  limit,
  t,
}: {
  pct: number;
  today: number;
  limit: number;
  t: (key: string) => string;
}) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, pct));
  const offset = c * (1 - clamped / 100);
  return (
    <div className="flex max-w-full flex-col items-stretch gap-6 rounded-[2rem] border border-violet-200/80 bg-white/70 p-6 shadow-lg backdrop-blur-md sm:flex-row sm:items-center sm:gap-8 dark:border-white/10 dark:bg-zinc-900/50">
      <div className="relative mx-auto h-32 w-32 shrink-0 sm:mx-0">
        <svg className="h-32 w-32 -rotate-90" viewBox="0 0 128 128" aria-hidden>
          <circle cx="64" cy="64" r="54" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-200 dark:text-slate-700" />
          <circle
            cx="64"
            cy="64"
            r="54"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            className="text-violet-600 dark:text-violet-400"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-slate-900 dark:text-white">{clamped}%</span>
        </div>
      </div>
      <div className="min-w-0 flex-1 text-center sm:text-left">
        <p className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('gameCenter.hub.dailyGoal')}</p>
        <p className="text-3xl font-black text-slate-900 dark:text-white">
          {today}{' '}
          <span className="text-lg font-bold text-slate-400 dark:text-slate-500">
            / {limit} {t('gameCenter.minute')}
          </span>
        </p>
        <div className="mt-2 flex items-center justify-center gap-2 sm:justify-start">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
            {clamped >= 100 ? t('gameCenter.hub.dailyGoalMet') : t('gameCenter.hub.dailyGoalInProgress')}
          </span>
        </div>
      </div>
    </div>
  );
}

function gameVisual(type: MiniGameType): { icon: string; chip: string; cardGlow: string } {
  if (type === 'memory') {
    return {
      icon: '🧠',
      chip: 'from-fuchsia-500 to-violet-500',
      cardGlow: 'shadow-fuchsia-500/25',
    };
  }
  if (type === 'math') {
    return {
      icon: '🔢',
      chip: 'from-sky-500 to-indigo-500',
      cardGlow: 'shadow-sky-500/25',
    };
  }
  if (type === 'word') {
    return {
      icon: '🔤',
      chip: 'from-amber-500 to-orange-500',
      cardGlow: 'shadow-amber-500/25',
    };
  }
  if (type === 'reading-word') {
    return {
      icon: '📖',
      chip: 'from-cyan-500 to-blue-500',
      cardGlow: 'shadow-cyan-500/25',
    };
  }
  if (type === 'reading-story') {
    return {
      icon: '📚',
      chip: 'from-rose-500 to-pink-500',
      cardGlow: 'shadow-rose-500/25',
    };
  }
  return {
    icon: '🧩',
    chip: 'from-emerald-500 to-teal-500',
    cardGlow: 'shadow-emerald-500/25',
  };
}

function playGameSound(kind: SoundKind, enabled: boolean) {
  if (!enabled || typeof window === 'undefined') return;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g);
  g.connect(ctx.destination);

  const now = ctx.currentTime;
  const setTone = (freq: number, dur: number, gain = 0.03) => {
    o.frequency.setValueAtTime(freq, now);
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  };

  if (kind === 'tap') setTone(520, 0.06, 0.02);
  if (kind === 'success') setTone(760, 0.12, 0.035);
  if (kind === 'error') setTone(220, 0.12, 0.03);
  if (kind === 'levelup') setTone(980, 0.18, 0.04);
  if (kind === 'finish') setTone(1240, 0.22, 0.045);

  o.start(now);
  o.stop(now + 0.24);
  window.setTimeout(() => {
    void ctx.close();
  }, 300);
}

function MemoryLevel({
  level,
  maxLevel,
  sessionScore,
  combo,
  gameTitle,
  profilePicture,
  userInitial,
  onLevelDone,
  soundOn,
  onCorrect,
  onWrong,
  t,
}: {
  level: number;
  maxLevel: number;
  sessionScore: number;
  combo: number;
  gameTitle: string;
  profilePicture: string | null;
  userInitial: string;
  onLevelDone: (scoreDelta: number) => void;
  soundOn: boolean;
  onCorrect: () => void;
  onWrong: () => void;
  t: (key: string) => string;
}) {
  const [roundKey, setRoundKey] = useState(0);
  const [paused, setPaused] = useState(false);
  const pairCount = Math.min(3 + level, 6);
  const icons = useMemo(() => shuffle(MEMORY_ICONS).slice(0, pairCount), [pairCount, level, roundKey]);
  const cards = useMemo(
    () => shuffle(icons.flatMap((icon, i) => [{ id: `${roundKey}-${i}-a`, icon }, { id: `${roundKey}-${i}-b`, icon }])),
    [icons, roundKey],
  );
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [lock, setLock] = useState(false);
  const [completed, setCompleted] = useState(false);
  const initialSeconds = Math.max(75, 195 - level * 15);
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    setSecondsLeft(Math.max(75, 195 - level * 15));
  }, [level, roundKey]);

  useEffect(() => {
    if (paused || completed) return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [paused, completed]);

  useEffect(() => {
    if (!completed && matched.length === cards.length && cards.length > 0) {
      setCompleted(true);
      onLevelDone(20 + level * 10);
    }
  }, [completed, matched.length, cards.length, level, onLevelDone]);

  function restartRound() {
    setRoundKey((k) => k + 1);
    setOpenIds([]);
    setMatched([]);
    setLock(false);
    setCompleted(false);
    setPaused(false);
    playGameSound('tap', soundOn);
  }

  function onPick(id: string, icon: string) {
    if (paused || lock || openIds.includes(id) || matched.includes(id)) return;
    playGameSound('tap', soundOn);
    const next = [...openIds, id];
    setOpenIds(next);
    if (next.length < 2) return;
    setLock(true);
    const firstId = next[0];
    const first = cards.find((c) => c.id === firstId);
    const same = first?.icon === icon;
    window.setTimeout(() => {
      if (same) {
        playGameSound('success', soundOn);
        onCorrect();
        setMatched((prev) => [...prev, firstId, id]);
      } else {
        playGameSound('error', soundOn);
        onWrong();
      }
      setOpenIds([]);
      setLock(false);
    }, 450);
  }

  const pairProgressPct =
    cards.length > 0 ? Math.round((matched.length / cards.length) * 100) : 0;
  const pairsRemaining = Math.max(0, (cards.length - matched.length) / 2);
  const showCoach = matched.length > 0 && !completed && pairsRemaining > 0;
  const displayTitle = gameTitle.trim() || t('gameCenter.type.memory');

  return (
    <div className="relative mx-auto max-w-5xl pb-4">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <h2 className="font-logo text-xl font-black tracking-tight text-violet-700 dark:text-violet-300 md:text-2xl">
          {displayTitle}
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-end">
          <div className="flex items-center gap-2 rounded-full bg-violet-100 px-4 py-2 text-sm font-bold text-violet-800 dark:bg-violet-900/50 dark:text-violet-100">
            <Clock className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
            <span className="text-xs font-black uppercase tracking-tight text-violet-600/80 dark:text-violet-300/90">
              {t('gameCenter.memory.remainingTime')}
            </span>
            <span className="font-mono text-base font-black tabular-nums">{formatMmSs(secondsLeft)}</span>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-amber-100 px-3 py-2 text-sm font-black text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
            <span aria-hidden>🪙</span>
            <span>{sessionScore.toLocaleString()}</span>
          </div>
          <div className="rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-500 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-white shadow-md shadow-fuchsia-500/30">
            {combo >= 2
              ? t('gameCenter.memory.comboLine').replace('{n}', String(combo))
              : t('gameCenter.memory.comboWarmup')}
          </div>
          <Trophy className="h-8 w-8 text-amber-500" strokeWidth={2} aria-hidden />
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-violet-200 bg-violet-50 text-sm font-black text-violet-700 dark:border-violet-600 dark:bg-violet-950 dark:text-violet-200"
            aria-hidden
          >
            {profilePicture ? (
              <Image src={profilePicture} alt="" width={40} height={40} className="h-full w-full object-cover" />
            ) : (
              userInitial.slice(0, 1).toUpperCase()
            )}
          </div>
        </div>
      </div>

      <div className="mb-8 max-w-4xl px-0 sm:px-2">
        <div className="mb-2 flex items-end justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-tight text-slate-400 dark:text-slate-500">
            {t('gameCenter.memory.levelProgress')
              .replace('{level}', String(level))
              .replace('{max}', String(maxLevel))}
          </span>
          <span className="text-xs font-black text-violet-600 dark:text-violet-400">{pairProgressPct}%</span>
        </div>
        <div className="h-3 w-full rounded-full bg-slate-200/90 p-0.5 dark:bg-slate-700/90">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-orange-400 transition-[width] duration-500 ease-out"
            style={{ width: `${pairProgressPct}%` }}
          />
        </div>
      </div>

      <div className="relative mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
        {cards.map((c, idx) => {
          const shown = openIds.includes(c.id) || matched.includes(c.id);
          const BackIcon = idx % 2 === 0 ? Star : Rocket;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onPick(c.id, c.icon)}
              disabled={paused}
              className="group relative aspect-[4/5] w-full min-h-0 cursor-pointer rounded-xl border-0 bg-transparent p-0 text-left shadow-none transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:pointer-events-none disabled:opacity-60"
            >
              {shown ? (
                <div className="flex h-full w-full flex-col rounded-xl border border-white/60 bg-gradient-to-br from-white to-violet-50 p-1 shadow-xl shadow-violet-500/10 dark:border-violet-500/30 dark:from-slate-900 dark:to-violet-950/80">
                  <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-violet-500 ring-4 ring-violet-500/15 dark:border-violet-400 dark:ring-violet-400/20">
                    <span className="text-5xl leading-none sm:text-6xl" aria-hidden>
                      {c.icon}
                    </span>
                    <span className="px-2 text-center text-[10px] font-black uppercase leading-tight text-violet-900 dark:text-violet-100 sm:text-xs">
                      {memoryPairLabel(c.icon, t)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="relative flex h-full w-full flex-col overflow-hidden rounded-xl border-4 border-white/25 bg-gradient-to-br from-violet-600 to-pink-500 p-4 shadow-lg transition-transform duration-300 group-hover:scale-[1.02] group-active:scale-[0.98] dark:border-white/15">
                  <div
                    className="pointer-events-none absolute inset-0 opacity-20"
                    style={{
                      backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                      backgroundSize: '20px 20px',
                    }}
                  />
                  <div className="relative flex flex-1 items-center justify-center">
                    <BackIcon className="h-12 w-12 text-white/90 sm:h-14 sm:w-14" strokeWidth={1.75} aria-hidden />
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {showCoach ? (
        <div className="pointer-events-none absolute right-2 bottom-36 z-10 max-w-[min(100%,18rem)] rounded-2xl border border-violet-100 bg-white/95 px-3 py-2 text-sm font-semibold text-violet-900 shadow-lg dark:border-violet-800 dark:bg-slate-900/95 dark:text-violet-100 sm:bottom-32 md:right-8">
          <span className="mr-1.5" aria-hidden>
            🐻
          </span>
          {t('gameCenter.memory.coachMore').replace('{n}', String(pairsRemaining))}
        </div>
      ) : null}

      <div className="flex flex-col items-stretch justify-center gap-4 px-2 sm:flex-row sm:gap-6">
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className="inline-flex items-center justify-center gap-3 rounded-xl bg-violet-100 px-8 py-4 text-base font-bold text-violet-800 shadow-sm transition hover:bg-violet-200/90 active:scale-[0.98] dark:bg-violet-900/40 dark:text-violet-100 dark:hover:bg-violet-900/60"
        >
          {paused ? <Play className="h-5 w-5 shrink-0" aria-hidden /> : <Pause className="h-5 w-5 shrink-0" aria-hidden />}
          {paused ? t('gameCenter.memory.resume') : t('gameCenter.memory.pause')}
        </button>
        <button
          type="button"
          onClick={restartRound}
          className="inline-flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-10 py-4 text-base font-bold text-white shadow-xl shadow-violet-400/40 transition hover:brightness-110 active:scale-[0.98] dark:shadow-violet-900/50"
        >
          <RefreshCw className="h-5 w-5 shrink-0" aria-hidden />
          {t('gameCenter.memory.restart')}
        </button>
      </div>
    </div>
  );
}

function MathLevel({
  level,
  onLevelDone,
  soundOn,
  operation,
  onCorrect,
  onWrong,
  t,
}: {
  level: number;
  onLevelDone: (scoreDelta: number) => void;
  soundOn: boolean;
  operation: MathOperation;
  onCorrect: () => void;
  onWrong: () => void;
  t: (key: string) => string;
}) {
  const total = 4 + level;
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const max = 8 + level * 4;
  const [a, setA] = useState(1);
  const [b, setB] = useState(1);
  const [choices, setChoices] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let nextA = 1;
    let nextB = 1;
    if (operation === 'sub') {
      const x = 1 + Math.floor(Math.random() * max);
      const y = 1 + Math.floor(Math.random() * max);
      nextA = Math.max(x, y);
      nextB = Math.min(x, y);
    } else if (operation === 'mul') {
      nextA = 1 + Math.floor(Math.random() * (5 + level * 2));
      nextB = 1 + Math.floor(Math.random() * (5 + level * 2));
    } else if (operation === 'div') {
      const divisor = 1 + Math.floor(Math.random() * (4 + level));
      const result = 1 + Math.floor(Math.random() * (5 + level * 2));
      nextA = divisor * result;
      nextB = divisor;
    } else {
      nextA = 1 + Math.floor(Math.random() * max);
      nextB = 1 + Math.floor(Math.random() * max);
    }
    setA(nextA);
    setB(nextB);
    const result =
      operation === 'sub'
        ? nextA - nextB
        : operation === 'mul'
          ? nextA * nextB
          : operation === 'div'
            ? nextA / nextB
            : nextA + nextB;
    const wrong = new Set<number>();
    const span = Math.max(3, Math.ceil(result * 0.25));
    while (wrong.size < 3) {
      const delta = 1 + Math.floor(Math.random() * span);
      const sign = Math.random() > 0.5 ? 1 : -1;
      const v = Math.max(0, result + sign * delta);
      if (v !== result) wrong.add(v);
    }
    setChoices(shuffle([result, ...Array.from(wrong)]));
    setFeedback(null);
    setSelected(null);
  }, [idx, max, operation, level]);

  const opSymbol = operation === 'sub' ? '-' : operation === 'mul' ? '×' : operation === 'div' ? '÷' : '+';
  const correctResult = operation === 'sub' ? a - b : operation === 'mul' ? a * b : operation === 'div' ? a / b : a + b;

  function submit(n: number) {
    setSelected(n);
    if (n === correctResult) {
      playGameSound('success', soundOn);
      onCorrect();
      setFeedback({ ok: true, text: t('gameCenter.feedback.correct') });
      setScore((s) => s + 1);
      if (idx + 1 >= total) {
        onLevelDone(score * 10 + 10 + level * 6);
        return;
      }
      window.setTimeout(() => {
        setIdx((v) => v + 1);
      }, 500);
    } else {
      playGameSound('error', soundOn);
      onWrong();
      setFeedback({ ok: false, text: t('gameCenter.feedback.retry') });
      return;
    }
  }

  const cheerLine =
    feedback === null
      ? t('gameCenter.math.cheerDefault')
      : feedback.ok
        ? t('gameCenter.math.cheerCorrect')
        : t('gameCenter.math.cheerRetry');

  const progressLine = t('gameCenter.math.questionProgress')
    .replace('{current}', String(idx + 1))
    .replace('{total}', String(total));

  return (
    <div className="relative -mx-2 -mt-2 overflow-hidden rounded-2xl border border-fuchsia-500/20 bg-linear-to-b from-slate-950 via-violet-950/95 to-slate-950 shadow-inner shadow-violet-950/50 md:-mx-4 md:rounded-3xl">
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-40"
        aria-hidden
        style={{
          backgroundImage:
            'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(192,38,211,0.25) 0%, transparent 55%), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(124,58,237,0.2) 0%, transparent 50%)',
        }}
      />
      <div className="relative z-10 flex flex-col items-center px-4 py-6 md:px-8 md:py-10">
        <p className="mb-1 text-center text-[11px] font-bold uppercase tracking-wider text-violet-300/90">{progressLine}</p>
        <div className="mb-3 max-w-lg rounded-full border border-white/10 bg-white/10 px-5 py-2.5 text-center text-sm font-semibold text-violet-100 shadow-lg backdrop-blur-md md:text-base">
          {cheerLine}
        </div>
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-2xl shadow-lg backdrop-blur-sm" aria-hidden>
          🐻
        </div>

        <div className="relative w-full max-w-2xl">
          <div className="absolute -bottom-1 left-1/2 h-8 w-3/5 max-w-md -translate-x-1/2 rounded-full bg-fuchsia-500/25 blur-2xl" aria-hidden />
          <div className="relative rounded-3xl border border-violet-400/25 bg-slate-900/55 p-6 shadow-2xl shadow-violet-950/80 backdrop-blur-xl md:p-10">
            <div className="mb-6 flex justify-center">
              <span className="rounded-full bg-linear-to-r from-rose-500 to-fuchsia-600 px-4 py-1.5 text-xs font-black uppercase tracking-wide text-white shadow-md">
                {t('gameCenter.answerQuick')}
              </span>
            </div>
            <p className="text-center text-4xl font-black tracking-tight text-white drop-shadow-sm md:text-5xl lg:text-6xl">
              {a} {opSymbol} {b} = ?
            </p>
          </div>
        </div>

        <div className="mt-8 grid w-full max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {choices.map((c, i) => {
            const isPicked = selected === c;
            const isCorrectPick = isPicked && c === correctResult;
            const isWrongPick = isPicked && c !== correctResult;
            return (
              <button
                key={`${idx}-${c}-${i}`}
                type="button"
                onClick={() => submit(c)}
                disabled={selected !== null}
                className={`min-h-14 rounded-2xl border-2 text-xl font-black tabular-nums transition md:min-h-20 md:text-3xl ${
                  isCorrectPick
                    ? 'border-fuchsia-400 bg-violet-950/70 text-white shadow-[0_0_20px_rgba(192,38,211,0.55)] ring-2 ring-fuchsia-400/40'
                    : isWrongPick
                      ? 'border-rose-400 bg-rose-950/40 text-rose-100 shadow-[0_0_16px_rgba(244,63,94,0.35)] ring-2 ring-rose-400/30'
                      : 'border-white/20 bg-violet-950/45 text-white backdrop-blur-sm hover:border-fuchsia-400/35 hover:bg-violet-900/55 active:scale-[0.98]'
                } disabled:pointer-events-none disabled:opacity-90`}
              >
                {Number.isInteger(c) ? c : Math.round(c)}
              </button>
            );
          })}
        </div>

        {feedback && !feedback.ok ? (
          <p className="mt-5 max-w-md text-center text-sm font-semibold text-rose-200/95">{feedback.text}</p>
        ) : null}
      </div>
    </div>
  );
}

function WordLevel({
  level,
  onLevelDone,
  soundOn,
  onCorrect,
  onWrong,
  t,
}: {
  level: number;
  onLevelDone: (scoreDelta: number) => void;
  soundOn: boolean;
  onCorrect: () => void;
  onWrong: () => void;
  t: (key: string) => string;
}) {
  const word = WORD_LEVELS[Math.min(level, WORD_LEVELS.length - 1)];
  const [picked, setPicked] = useState('');
  const [done, setDone] = useState(false);
  const letters = useMemo(() => shuffle(word.split('')), [word, level]);

  useEffect(() => {
    if (done || !picked) return;
    if (picked === word) {
      playGameSound('success', soundOn);
      onCorrect();
      setDone(true);
      onLevelDone(25 + level * 10);
      return;
    }
    if (picked.length === word.length) {
      playGameSound('error', soundOn);
      onWrong();
      setFeedbackWord(t('gameCenter.feedback.orderRetry'));
      window.setTimeout(() => {
        setPicked('');
        setFeedbackWord(null);
      }, 650);
    }
  }, [done, picked, word, level, onLevelDone, soundOn, onCorrect, onWrong]);
  const [feedbackWord, setFeedbackWord] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <p className="text-base font-semibold text-slate-700">{t('gameCenter.word.selectInOrder')}</p>
      <div className="rounded-xl bg-amber-100 px-3 py-2 text-2xl font-black text-amber-900 md:text-3xl">{picked || '____'}</div>
      <div className="flex flex-wrap gap-2">
        {letters.map((ch, i) => (
          <button
            key={`${ch}-${i}`}
            type="button"
            onClick={() => setPicked((p) => (p.length < word.length ? p + ch : p))}
            className="rounded-xl border-2 border-amber-300 bg-white px-4 py-2 text-2xl font-black text-amber-900 transition hover:scale-105"
          >
            {ch}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <KidsSecondaryButton type="button" onClick={() => setPicked('')}>{t('gameCenter.clear')}</KidsSecondaryButton>
      </div>
      {feedbackWord ? <p className="text-sm font-semibold text-rose-700">{feedbackWord}</p> : null}
    </div>
  );
}

function ShapeLevel({
  level,
  onLevelDone,
  soundOn,
  onCorrect,
  onWrong,
  t,
}: {
  level: number;
  onLevelDone: (scoreDelta: number) => void;
  soundOn: boolean;
  onCorrect: () => void;
  onWrong: () => void;
  t: (key: string) => string;
}) {
  const rounds = 3 + level;
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const target = useMemo(() => SHAPES[(idx + level) % SHAPES.length], [idx, level]);
  const options = useMemo(() => shuffle(SHAPES), [idx, level]);

  function pick(shape: string) {
    const ok = shape === target;
    if (ok) {
      playGameSound('success', soundOn);
      onCorrect();
      setScore((s) => s + 1);
    } else {
      playGameSound('error', soundOn);
      onWrong();
    }
    if (idx + 1 >= rounds) {
      onLevelDone(score * 8 + (ok ? 8 : 0) + level * 5);
      return;
    }
    setIdx((v) => v + 1);
  }

  return (
    <div className="space-y-3">
      <p className="text-base font-semibold text-slate-700">{t('gameCenter.shape.pickSame')} ({idx + 1}/{rounds})</p>
      <div className="text-6xl">{target}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((s) => (
          <button
            key={`${idx}-${s}`}
            type="button"
            onClick={() => pick(s)}
            className="h-16 w-16 rounded-xl border-2 border-emerald-300 bg-white text-3xl transition hover:scale-105"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Word Reading ─────────────────────────────────────────────────────────────

function speakTurkish(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'tr-TR';
  utt.rate = 0.8;
  window.speechSynthesis.speak(utt);
}

function ReadingWordLevel({
  level,
  difficulty,
  gradeLevel,
  onLevelDone,
  soundOn,
  onCorrect,
  onWrong,
  t,
}: {
  level: number;
  difficulty: 'easy' | 'medium' | 'hard';
  gradeLevel: number;
  onLevelDone: (scoreDelta: number) => void;
  soundOn: boolean;
  onCorrect: () => void;
  onWrong: () => void;
  t: (key: string) => string;
}) {
  const [words, setWords] = useState<string[]>([]);
  const [loadingWords, setLoadingWords] = useState(true);
  const [wordIdx, setWordIdx] = useState(0);
  const [phase, setPhase] = useState<'listen' | 'speak'>('listen');
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [listening, setListening] = useState(false);
  const [score, setScore] = useState(0);
  const [hasSpeechRec, setHasSpeechRec] = useState(false);
  const [noMicChoice, setNoMicChoice] = useState<string[] | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    setLoadingWords(true);
    setWordIdx(0);
    setPhase('listen');
    setFeedback(null);
    setScore(0);
    kidsGetReadingWords(difficulty, gradeLevel, 10)
      .then((data: ReadingWordData[]) => setWords(data.map((w) => w.word)))
      .catch(() => setWords(['EV', 'TOP', 'KUŞ', 'SU', 'EL']))
      .finally(() => setLoadingWords(false));
  }, [difficulty, gradeLevel, level]);

  const currentWord = words[wordIdx] ?? '';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function getSpeechRec(): any {
    if (typeof window === 'undefined') return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    return w.SpeechRecognition || w.webkitSpeechRecognition || null;
  }

  useEffect(() => {
    setHasSpeechRec(!!getSpeechRec());
  }, []);

  useEffect(() => {
    if (phase === 'listen') {
      const timer = window.setTimeout(() => speakTurkish(currentWord), 400);
      return () => window.clearTimeout(timer);
    }
  }, [phase, currentWord, wordIdx]);

  function handleListen() {
    speakTurkish(currentWord);
  }

  function handleSpeak() {
    if (!hasSpeechRec) {
      const others = words.filter((_, i) => i !== wordIdx);
      const distractors = shuffle(others).slice(0, 2);
      setNoMicChoice(shuffle([currentWord, ...distractors]));
      return;
    }
    const SpeechRec = getSpeechRec();
    if (!SpeechRec) return;
    const rec = new SpeechRec();
    rec.lang = 'tr-TR';
    rec.interimResults = false;
    rec.maxAlternatives = 3;
    recognitionRef.current = rec;
    setListening(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const results: string[] = [];
      for (let i = 0; i < e.results[0].length; i++) {
        results.push(e.results[0][i].transcript.trim().toUpperCase());
      }
      setListening(false);
      const matched = results.some((r) => r === currentWord || r.includes(currentWord) || currentWord.includes(r));
      handleWordResult(matched);
    };
    rec.onerror = () => {
      setListening(false);
      const others = words.filter((_, i) => i !== wordIdx);
      const distractors = shuffle(others).slice(0, 2);
      setNoMicChoice(shuffle([currentWord, ...distractors]));
    };
    rec.onend = () => setListening(false);
    rec.start();
  }

  function handleWordResult(correct: boolean) {
    setNoMicChoice(null);
    if (correct) {
      playGameSound('success', soundOn);
      onCorrect();
      setFeedback('correct');
      setScore((s) => s + 1);
      window.setTimeout(() => {
        setFeedback(null);
        if (wordIdx + 1 >= words.length) {
          onLevelDone((score + 1) * 10 + level * 5);
        } else {
          setWordIdx((i) => i + 1);
          setPhase('listen');
        }
      }, 900);
    } else {
      playGameSound('error', soundOn);
      onWrong();
      setFeedback('wrong');
      window.setTimeout(() => {
        setFeedback(null);
        setPhase('listen');
      }, 1200);
    }
  }

  const progressText = t('gameCenter.reading.wordProgress')
    .replace('{current}', String(wordIdx + 1))
    .replace('{total}', String(words.length));

  if (loadingWords) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
        <p className="text-sm font-bold text-cyan-600 dark:text-cyan-300">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">

      {/* ── Progress bar ── */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-500"
            style={{ width: `${Math.round(((wordIdx) / words.length) * 100)}%` }}
          />
        </div>
        <span className="shrink-0 text-xs font-black tabular-nums text-cyan-700 dark:text-cyan-300">{progressText}</span>
      </div>

      {/* ── Main card ── */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-cyan-50 via-white to-blue-50 shadow-2xl shadow-cyan-200/60 dark:from-cyan-950/40 dark:via-slate-900 dark:to-blue-950/40 dark:shadow-cyan-900/40">

        {/* decorative blobs */}
        <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-cyan-300/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-blue-300/20 blur-3xl" />

        <div className="relative p-6 sm:p-8">
          {phase === 'listen' ? (
            <div className="flex flex-col items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-2xl">👂</span>
                <p className="text-sm font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400">{t('gameCenter.reading.listenTitle')}</p>
              </div>

              {/* word display */}
              <div className="flex items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 px-12 py-8 shadow-xl shadow-cyan-400/40">
                <span className="font-logo text-6xl font-black tracking-[0.2em] text-white drop-shadow-lg md:text-7xl">
                  {currentWord}
                </span>
              </div>

              {/* speaker button */}
              <button
                type="button"
                onClick={handleListen}
                className="group flex items-center gap-3 rounded-2xl bg-white px-7 py-4 font-black text-cyan-700 shadow-lg ring-2 ring-cyan-200 transition hover:-translate-y-0.5 hover:shadow-cyan-300/60 active:scale-95 dark:bg-slate-800 dark:text-cyan-300 dark:ring-cyan-700"
              >
                <span className="text-3xl transition group-hover:scale-110">🔊</span>
                <span>{t('gameCenter.reading.listenHint')}</span>
              </button>

              <button
                type="button"
                onClick={() => setPhase('speak')}
                className="w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 py-4 font-black text-white shadow-lg shadow-cyan-400/40 transition hover:-translate-y-0.5 hover:shadow-cyan-500/60 active:scale-[0.98]"
              >
                {t('gameCenter.reading.speakTitle')} →
              </button>
            </div>

          ) : noMicChoice ? (
            <div className="flex flex-col items-center gap-5">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎯</span>
                <p className="text-sm font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400">{t('gameCenter.reading.noMicTitle')}</p>
              </div>
              <div className="flex w-full flex-col gap-3">
                {noMicChoice.map((w, i) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => handleWordResult(w === currentWord)}
                    className="group flex items-center gap-4 rounded-2xl border-2 border-cyan-200 bg-white px-5 py-4 font-black text-cyan-900 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-400 hover:shadow-md active:scale-[0.98] dark:border-cyan-700 dark:bg-slate-800 dark:text-cyan-100"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-sm font-black text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="text-xl tracking-wider">{w}</span>
                  </button>
                ))}
              </div>
            </div>

          ) : (
            <div className="flex flex-col items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎤</span>
                <p className="text-sm font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400">{t('gameCenter.reading.speakTitle')}</p>
              </div>

              <div className="flex items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 px-12 py-8 shadow-xl shadow-cyan-400/40">
                <span className="font-logo text-6xl font-black tracking-[0.2em] text-white drop-shadow-lg md:text-7xl">
                  {currentWord}
                </span>
              </div>

              <p className="text-center text-sm text-slate-500 dark:text-slate-400">{t('gameCenter.reading.speakHint')}</p>

              {/* mic button */}
              <button
                type="button"
                onClick={handleSpeak}
                disabled={listening}
                className={`relative flex h-24 w-24 items-center justify-center rounded-full text-4xl shadow-2xl transition active:scale-90 disabled:opacity-70 ${
                  listening
                    ? 'bg-red-500 shadow-red-400/50 animate-pulse'
                    : 'bg-gradient-to-br from-cyan-400 to-blue-600 shadow-cyan-400/50 hover:scale-105'
                }`}
              >
                {listening
                  ? <span className="absolute inset-0 rounded-full bg-red-400 opacity-40 animate-ping" />
                  : null}
                <span className="relative">{listening ? '🎙️' : '🎤'}</span>
              </button>
              <p className="text-sm font-bold text-cyan-700 dark:text-cyan-300">
                {listening ? t('gameCenter.reading.micListening') : t('gameCenter.reading.micStart')}
              </p>

              <button
                type="button"
                onClick={() => { setPhase('listen'); handleListen(); }}
                className="flex items-center gap-1.5 text-sm font-bold text-cyan-600 underline decoration-dotted underline-offset-2 hover:text-cyan-800 dark:text-cyan-400 dark:hover:text-cyan-200"
              >
                🔊 {t('gameCenter.reading.listenAgain')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Feedback banner ── */}
      {feedback === 'correct' ? (
        <div className="flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 py-4 shadow-lg shadow-emerald-300/50 dark:shadow-emerald-900/50">
          <span className="text-3xl">🌟</span>
          <span className="text-base font-black text-white">{t('gameCenter.reading.wellDone')}</span>
        </div>
      ) : feedback === 'wrong' ? (
        <div className="flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-rose-400 to-pink-500 py-4 shadow-lg shadow-rose-300/50 dark:shadow-rose-900/50">
          <span className="text-3xl">💪</span>
          <span className="text-base font-black text-white">{t('gameCenter.reading.tryAgain')}</span>
        </div>
      ) : null}
    </div>
  );
}

// ─── Story Reading Data ───────────────────────────────────────────────────────

function ReadingStoryLevel({
  level,
  difficulty,
  gradeLevel,
  onLevelDone,
  soundOn,
  onCorrect,
  onWrong,
  t,
}: {
  level: number;
  difficulty: 'easy' | 'medium' | 'hard';
  gradeLevel: number;
  onLevelDone: (scoreDelta: number) => void;
  soundOn: boolean;
  onCorrect: () => void;
  onWrong: () => void;
  t: (key: string) => string;
}) {
  const [story, setStory] = useState<ReadingStoryData | null>(null);
  const [loadingStory, setLoadingStory] = useState(true);
  const [phase, setPhase] = useState<'story' | 'questions'>('story');
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);

  useEffect(() => {
    setLoadingStory(true);
    setPhase('story');
    setQIdx(0);
    setSelected(null);
    setScore(0);
    setAnswered(false);
    kidsGetReadingStory(difficulty, gradeLevel)
      .then(setStory)
      .catch(() => setStory(null))
      .finally(() => setLoadingStory(false));
  }, [difficulty, gradeLevel, level]);

  function handleReadStory() {
    if (story) speakTurkish(story.text);
  }

  function handleStartQuestions() {
    window.speechSynthesis?.cancel();
    setPhase('questions');
  }

  function correctOptionText(q: ReadingStoryData['questions'][number]): string {
    const idx = q.correct === 'a' ? 0 : q.correct === 'b' ? 1 : 2;
    return q.options[idx] ?? '';
  }

  function handleAnswer(opt: string) {
    if (answered || !story) return;
    setSelected(opt);
    setAnswered(true);
    const q = story.questions[qIdx];
    const isCorrect = opt === correctOptionText(q);
    if (isCorrect) {
      playGameSound('success', soundOn);
      onCorrect();
      setScore((s) => s + 1);
    } else {
      playGameSound('error', soundOn);
      onWrong();
    }
  }

  function handleNext() {
    if (!story) return;
    if (qIdx + 1 >= story.questions.length) {
      onLevelDone(score * 15 + level * 10);
      return;
    }
    setQIdx((i) => i + 1);
    setSelected(null);
    setAnswered(false);
  }

  if (loadingStory || !story) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-rose-400 border-t-transparent" />
        <p className="text-sm font-bold text-rose-600 dark:text-rose-300">{t('common.loading')}</p>
      </div>
    );
  }

  const q = story.questions[qIdx];
  const qProgressText = t('gameCenter.reading.questionProgress')
    .replace('{current}', String(qIdx + 1))
    .replace('{total}', String(story.questions.length));

  if (phase === 'story') {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-6">
        {/* header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-400 to-pink-600 text-xl shadow-md shadow-rose-300/50">📖</div>
          <div>
            <p className="font-black text-slate-800 dark:text-white">{t('gameCenter.reading.storyTitle')}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('gameCenter.reading.storyListenHint')}</p>
          </div>
        </div>

        {/* story card */}
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-rose-50 via-white to-pink-50 shadow-2xl shadow-rose-200/50 dark:from-rose-950/40 dark:via-slate-900 dark:to-pink-950/40 dark:shadow-rose-900/30">
          <div className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full bg-rose-300/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-pink-300/20 blur-3xl" />
          <div className="relative p-6 sm:p-8">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-xl">📜</span>
              <span className="text-xs font-black uppercase tracking-widest text-rose-500">Hikaye</span>
            </div>
            <p className="text-lg font-semibold leading-[1.9] text-slate-700 dark:text-slate-200">
              {story.text}
            </p>
          </div>
        </div>

        {/* action buttons */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleReadStory}
            className="group flex flex-1 items-center justify-center gap-3 rounded-2xl bg-white px-6 py-4 font-black text-rose-700 shadow-md ring-2 ring-rose-200 transition hover:-translate-y-0.5 hover:shadow-rose-200/60 active:scale-[0.98] dark:bg-slate-800 dark:text-rose-300 dark:ring-rose-700"
          >
            <span className="text-2xl transition group-hover:scale-110">🔊</span>
            <span>{t('gameCenter.reading.readStory')}</span>
          </button>
          <button
            type="button"
            onClick={handleStartQuestions}
            className="flex flex-1 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 px-6 py-4 font-black text-white shadow-lg shadow-rose-400/40 transition hover:-translate-y-0.5 hover:shadow-rose-500/60 active:scale-[0.98]"
          >
            <span className="text-2xl">❓</span>
            <span>{t('gameCenter.reading.questionsTitle')} →</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">

      {/* ── Progress bar ── */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-rose-400 to-pink-500 transition-all duration-500"
            style={{ width: `${Math.round((qIdx / story.questions.length) * 100)}%` }}
          />
        </div>
        <span className="shrink-0 text-xs font-black tabular-nums text-rose-700 dark:text-rose-300">{qProgressText}</span>
      </div>

      {/* question card */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-rose-50 via-white to-pink-50 shadow-2xl shadow-rose-200/50 dark:from-rose-950/40 dark:via-slate-900 dark:to-pink-950/40 dark:shadow-rose-900/30">
        <div className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full bg-rose-300/20 blur-3xl" />
        <div className="relative p-6 sm:p-8">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xl">🤔</span>
            <span className="text-xs font-black uppercase tracking-widest text-rose-500">{t('gameCenter.reading.questionsTitle')}</span>
          </div>
          <p className="text-lg font-black leading-snug text-slate-800 dark:text-white">{q.question}</p>
        </div>
      </div>

      {/* options */}
      <div className="flex flex-col gap-3">
        {q.options.map((opt, i) => {
          const isPicked = selected === opt;
          const correctText = correctOptionText(q);
          const isCorrect = opt === correctText;
          let ring = 'ring-slate-200 dark:ring-slate-700';
          let bg = 'bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-slate-700';
          let text = 'text-slate-800 dark:text-slate-100';
          let icon = <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-600 dark:bg-slate-700 dark:text-slate-300">{String.fromCharCode(65 + i)}</span>;
          if (answered) {
            if (isCorrect) {
              ring = 'ring-emerald-400';
              bg = 'bg-emerald-50 dark:bg-emerald-900/40';
              text = 'text-emerald-800 dark:text-emerald-200';
              icon = <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-200 text-sm dark:bg-emerald-800">✅</span>;
            } else if (isPicked) {
              ring = 'ring-rose-400';
              bg = 'bg-rose-50 dark:bg-rose-900/40';
              text = 'text-rose-800 dark:text-rose-200';
              icon = <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-200 text-sm dark:bg-rose-800">❌</span>;
            }
          }
          return (
            <button
              key={opt}
              type="button"
              disabled={answered}
              onClick={() => handleAnswer(opt)}
              className={`flex items-center gap-4 rounded-2xl border-0 px-5 py-4 text-left font-semibold ring-2 transition active:scale-[0.98] disabled:pointer-events-none ${ring} ${bg} ${text}`}
            >
              {icon}
              <span className="text-base">{opt}</span>
            </button>
          );
        })}
      </div>
      {answered ? (
        <div className="flex flex-col gap-3">
          {selected === correctOptionText(q) ? (
            <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 px-5 py-3 shadow-lg shadow-emerald-300/40">
              <span className="text-2xl">🌟</span>
              <span className="font-black text-white">{t('gameCenter.reading.correctAnswer')}</span>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-rose-400 to-pink-500 px-5 py-3 shadow-lg shadow-rose-300/40">
              <span className="text-2xl">💡</span>
              <span className="font-black text-white">
                {t('gameCenter.reading.wrongAnswer').replace('{answer}', correctOptionText(q))}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={handleNext}
            className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 px-6 py-4 font-black text-white shadow-lg shadow-rose-400/40 transition hover:-translate-y-0.5 hover:shadow-rose-500/60 active:scale-[0.98]"
          >
            {qIdx + 1 >= story.questions.length ? <><span>🏆</span><span>{t('gameCenter.levelCompleted').replace('{level}', '').trim()}</span></> : <><span>{t('gameCenter.reading.nextQuestion')}</span><span>→</span></>}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function GameStage({
  activeType,
  level,
  maxLevel,
  sessionScore,
  onLevelDone,
  soundOn,
  activeGame,
  combo,
  fx,
  onCorrect,
  onWrong,
  t,
  profilePicture,
  userInitial,
  difficulty,
  gradeLevel,
}: {
  activeType: MiniGameType | null;
  level: number;
  maxLevel: number;
  sessionScore: number;
  onLevelDone: (scoreDelta: number) => void;
  soundOn: boolean;
  activeGame: KidsGame | null;
  combo: number;
  fx: { type: 'correct' | 'wrong' | null; text: string; id: number };
  onCorrect: () => void;
  onWrong: () => void;
  t: (key: string) => string;
  profilePicture: string | null;
  userInitial: string;
  difficulty: 'easy' | 'medium' | 'hard';
  gradeLevel: number;
}) {
  const isMemory = activeType === 'memory';
  return (
    <div
      className={
        isMemory
          ? 'space-y-3'
          : 'rounded-3xl border-4 border-violet-300/80 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-4 shadow-2xl dark:border-violet-700 dark:from-violet-950/40 dark:via-gray-900 dark:to-fuchsia-950/30 md:p-6'
      }
    >
      {!isMemory ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-black text-violet-900 dark:text-violet-100">
            {t('gameCenter.level')}: {level}/{maxLevel}
          </p>
          <p className="text-sm font-black text-fuchsia-700 dark:text-fuchsia-200">
            {t('gameCenter.score')}: {sessionScore}
          </p>
          <p className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
            🔥 {t('gameCenter.combo')}: {combo}
          </p>
        </div>
      ) : null}
      {fx.type ? (
        <div
          key={fx.id}
          className={`rounded-2xl px-3 py-2 text-sm font-black animate-pulse ${
            fx.type === 'correct' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
          }`}
        >
          {fx.type === 'correct' ? '✨ ' : '💥 '}
          {fx.text}
        </div>
      ) : null}
      {isMemory ? (
        <MemoryLevel
          key={`memory-${level}`}
          level={level}
          maxLevel={maxLevel}
          sessionScore={sessionScore}
          combo={combo}
          gameTitle={activeGame ? localizedKidsGameCopy(activeGame, 'title', t) : ''}
          profilePicture={profilePicture}
          userInitial={userInitial}
          onLevelDone={onLevelDone}
          soundOn={soundOn}
          onCorrect={onCorrect}
          onWrong={onWrong}
          t={t}
        />
      ) : (
        <div className="rounded-2xl border-2 border-violet-200 bg-white/90 p-4 dark:border-violet-800 dark:bg-gray-950/80 md:p-6">
          {activeType === 'math' ? (
            <MathLevel
              key={`math-${(activeGame?.slug || 'add')}-${level}`}
              level={level}
              onLevelDone={onLevelDone}
              soundOn={soundOn}
              operation={mathOperationForGame(activeGame)}
              onCorrect={onCorrect}
              onWrong={onWrong}
              t={t}
            />
          ) : null}
          {activeType === 'word' ? (
            <WordLevel key={`word-${level}`} level={level} onLevelDone={onLevelDone} soundOn={soundOn} onCorrect={onCorrect} onWrong={onWrong} t={t} />
          ) : null}
          {activeType === 'shape' ? (
            <ShapeLevel key={`shape-${level}`} level={level} onLevelDone={onLevelDone} soundOn={soundOn} onCorrect={onCorrect} onWrong={onWrong} t={t} />
          ) : null}
          {activeType === 'reading-word' ? (
            <ReadingWordLevel key={`reading-word-${level}`} level={level} difficulty={difficulty} gradeLevel={gradeLevel} onLevelDone={onLevelDone} soundOn={soundOn} onCorrect={onCorrect} onWrong={onWrong} t={t} />
          ) : null}
          {activeType === 'reading-story' ? (
            <ReadingStoryLevel key={`reading-story-${level}`} level={level} difficulty={difficulty} gradeLevel={gradeLevel} onLevelDone={onLevelDone} soundOn={soundOn} onCorrect={onCorrect} onWrong={onWrong} t={t} />
          ) : null}
        </div>
      )}
    </div>
  );
}

export default function KidsGameHubPage() {
  const router = useRouter();
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();
  const { t, language } = useKidsI18n();
  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState<KidsGame[]>([]);
  const [sessions, setSessions] = useState<KidsGameSession[]>([]);
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(30);
  const [gradeLevel, setGradeLevel] = useState(1);
  const [selectedDifficultyByGame, setSelectedDifficultyByGame] = useState<Record<number, 'easy' | 'medium' | 'hard'>>({});
  const [dailyQuests, setDailyQuests] = useState<Record<number, { score_target: number; completed_today: boolean; streak_count: number; difficulty: 'easy' | 'medium' | 'hard' }>>({});
  const [bestScoreByGame, setBestScoreByGame] = useState<Record<number, number>>({});
  const [blockedIds, setBlockedIds] = useState<number[]>([]);
  const [activeSession, setActiveSession] = useState<KidsGameSession | null>(null);
  const [activeGame, setActiveGame] = useState<KidsGame | null>(null);
  const [activeType, setActiveType] = useState<MiniGameType | null>(null);
  const [level, setLevel] = useState(1);
  const [maxLevel] = useState(3);
  const [sessionScore, setSessionScore] = useState(0);
  const [saving, setSaving] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [combo, setCombo] = useState(0);
  const comboRef = useRef(0);
  const [fx, setFx] = useState<{ type: 'correct' | 'wrong' | null; text: string; id: number }>({
    type: null,
    text: '',
    id: 0,
  });
  const [roadmap, setRoadmap] = useState<KidsBadgeRoadmap | null>(null);

  const load = useCallback(async () => {
    try {
      const [overview, history, roadmapRes] = await Promise.all([
        kidsStudentGamesOverview(),
        kidsMyGameSessions().catch(() => ({ sessions: [] })),
        kidsGetBadgeRoadmap().catch(() => null),
      ]);
      setGames(overview.games);
      setTodayMinutes(overview.today_minutes_played);
      setDailyLimit(overview.policy?.daily_minutes_limit ?? 30);
      setBlockedIds(overview.policy?.blocked_game_ids ?? []);
      setGradeLevel(overview.grade_level ?? 1);
      const diffs: Record<number, 'easy' | 'medium' | 'hard'> = {};
      const bests: Record<number, number> = {};
      for (const p of overview.progresses || []) {
        diffs[p.game] = p.current_difficulty;
        bests[p.game] = p.best_score || 0;
      }
      const quests: Record<number, { score_target: number; completed_today: boolean; streak_count: number; difficulty: 'easy' | 'medium' | 'hard' }> = {};
      for (const q of overview.daily_quests || []) {
        quests[q.game_id] = {
          score_target: q.score_target,
          completed_today: q.completed_today,
          streak_count: q.streak_count,
          difficulty: q.difficulty,
        };
      }
      setSelectedDifficultyByGame(diffs);
      setBestScoreByGame(bests);
      setDailyQuests(quests);
      setSessions(history.sessions);
      setRoadmap(roadmapRes);
      const running = history.sessions.find((s) => s.status === 'active') || null;
      setActiveSession(running);
      if (running) {
        setActiveGame(running.game);
        setActiveType(gameTypeFor(running.game, 0));
        setLevel(1);
        setSessionScore(0);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('gameCenter.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(kidsLoginPortalHref(pathPrefix, 'ogrenci'));
      return;
    }
    if (user.role !== 'student') {
      router.replace(kidsLoginPortalHref(pathPrefix));
      return;
    }
    void load();
  }, [authLoading, user?.id, user?.role, pathPrefix, router, load]);

  const remaining = useMemo(() => Math.max(0, dailyLimit - todayMinutes), [dailyLimit, todayMinutes]);
  const dailyPct = useMemo(
    () => (dailyLimit > 0 ? Math.min(100, Math.round((todayMinutes / dailyLimit) * 100)) : 0),
    [dailyLimit, todayMinutes],
  );
  const sortedHubGames = useMemo(() => sortGamesForHub(games), [games]);
  const featuredGame = sortedHubGames[0] ?? null;
  const sideGames = sortedHubGames.slice(1, 3);
  const moreGames = sortedHubGames.slice(3);
  const maxScoreInSessionsByGame = useMemo(() => {
    const m = new Map<number, number>();
    for (const s of sessions) {
      if (s.status !== 'completed') continue;
      const prev = m.get(s.game.id) ?? 0;
      if (s.score > prev) m.set(s.game.id, s.score);
    }
    return m;
  }, [sessions]);
  const badgeMilestones = useMemo(() => {
    const ms = [...(roadmap?.milestones ?? [])].sort((a, b) => a.order - b.order);
    return { first: ms[0], second: ms[1] };
  }, [roadmap]);
  const hubGrowthXp = roadmap?.growth_points ?? user?.growth_points ?? 0;
  const featuredMeta = useMemo(() => {
    if (!featuredGame) return null;
    const idx = games.findIndex((x) => x.id === featuredGame.id);
    const gType = gameTypeFor(featuredGame, idx >= 0 ? idx : 0);
    return {
      gType,
      quest: dailyQuests[featuredGame.id],
      blocked: blockedIds.includes(featuredGame.id),
      selectedDifficulty: selectedDifficultyByGame[featuredGame.id] || 'easy',
    };
  }, [featuredGame, games, dailyQuests, blockedIds, selectedDifficultyByGame]);

  async function onStart(game: KidsGame) {
    setSaving(true);
    try {
      const difficulty = selectedDifficultyByGame[game.id] || 'easy';
      const s = await kidsStartGameSession(game.id, { grade_level: gradeLevel, difficulty });
      setActiveSession(s);
      setActiveGame(game);
      setActiveType(gameTypeFor(game, games.findIndex((x) => x.id === game.id)));
      setLevel(1);
      setSessionScore(0);
      setCombo(0);
      comboRef.current = 0;
      if (s.difficulty !== difficulty) {
        // Keep local difficulty selector aligned with chosen session difficulty.
        setSelectedDifficultyByGame((prev) => ({ ...prev, [game.id]: s.difficulty }));
      }
      setSessions((prev) => [s, ...prev.filter((x) => x.id !== s.id)]);
      playGameSound('tap', soundOn);
      toast.success(t('gameCenter.started').replace('{title}', localizedKidsGameCopy(game, 'title', t)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('gameCenter.startFailed'));
    } finally {
      setSaving(false);
    }
  }

  function onCorrect() {
    setCombo((c) => {
      const n = c + 1;
      comboRef.current = n;
      return n;
    });
    setFx((p) => ({ type: 'correct', text: t('gameCenter.fx.correct'), id: p.id + 1 }));
  }

  function onWrong() {
    setCombo(0);
    comboRef.current = 0;
    setFx((p) => ({ type: 'wrong', text: t('gameCenter.fx.wrong'), id: p.id + 1 }));
  }

  useEffect(() => {
    if (!fx.type) return;
    const t = window.setTimeout(() => {
      setFx((p) => ({ ...p, type: null, text: '' }));
    }, 900);
    return () => window.clearTimeout(t);
  }, [fx.id, fx.type]);

  async function onFinish(status: 'completed' | 'aborted') {
    if (!activeSession) return;
    setSaving(true);
    try {
      const ended = await kidsCompleteGameSession(activeSession.id, {
        status,
        progress_percent: status === 'completed' ? 100 : 35,
        score: status === 'completed' ? Math.max(10, sessionScore) : Math.min(20, sessionScore),
      });
      setActiveSession(null);
      setActiveGame(null);
      setActiveType(null);
      setSessions((prev) => [ended, ...prev.filter((x) => x.id !== ended.id)]);
      if (status === 'completed') toast.success(t('gameCenter.completed'));
      else toast(t('gameCenter.closed'));
      playGameSound(status === 'completed' ? 'finish' : 'tap', soundOn);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('gameCenter.closeFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function onLevelDone(scoreDelta: number) {
    const comboBonus = comboRef.current >= 2 ? comboRef.current * 2 : 0;
    const nextScore = sessionScore + scoreDelta + comboBonus;
    setSessionScore(nextScore);
    if (level >= maxLevel) {
      await onFinish('completed');
      return;
    }
    const nextLevel = level + 1;
    toast(`🚀 ${t('gameCenter.levelStarting').replace('{level}', String(nextLevel))}`, { duration: 1400 });
    setLevel(nextLevel);
    setCombo(0);
    comboRef.current = 0;
    playGameSound('levelup', soundOn);
    toast.success(t('gameCenter.levelCompleted').replace('{level}', String(level)));
  }

  if (authLoading || !user || user.role !== 'student') {
    return <p className="text-center text-slate-600 dark:text-slate-400">{t('common.loading')}</p>;
  }

  return (
    <KidsPanelMax>
      {activeSession ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-logo text-xl font-black text-slate-900 dark:text-white">
                {localizedKidsGameCopy(activeSession.game, 'title', t)} {t('gameCenter.playing')}
              </h2>
              <KidsSecondaryButton type="button" onClick={() => setSoundOn((v) => !v)}>
                {soundOn ? (
                  <>
                    <Volume2 className="mr-1 inline h-4 w-4 align-middle" aria-hidden />
                    {t('gameCenter.soundOn')}
                  </>
                ) : (
                  <>
                    <VolumeX className="mr-1 inline h-4 w-4 align-middle" aria-hidden />
                    {t('gameCenter.soundOff')}
                  </>
                )}
              </KidsSecondaryButton>
            </div>
            <div className="flex flex-wrap gap-2">
              <KidsPrimaryButton type="button" disabled={saving} onClick={() => void onFinish('completed')}>
                ✅ {t('gameCenter.finish')}
              </KidsPrimaryButton>
              <KidsSecondaryButton type="button" disabled={saving} onClick={() => void onFinish('aborted')}>
                ❌ {t('gameCenter.exit')}
              </KidsSecondaryButton>
            </div>
          </div>
          <GameStage
            activeType={activeType}
            level={level}
            maxLevel={maxLevel}
            sessionScore={sessionScore}
            onLevelDone={onLevelDone}
            soundOn={soundOn}
            activeGame={activeGame}
            combo={combo}
            fx={fx}
            onCorrect={onCorrect}
            onWrong={onWrong}
            t={t}
            profilePicture={user.profile_picture ?? null}
            userInitial={(user.first_name || user.email || '?').trim().slice(0, 1)}
            difficulty={activeGame ? (selectedDifficultyByGame[activeGame.id] || 'easy') : 'easy'}
            gradeLevel={gradeLevel}
          />
        </section>
      ) : (
        <div className="space-y-12">
          <section className="flex flex-col gap-10 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-xl space-y-3">
              <h1 className="font-logo text-3xl font-black tracking-tight text-slate-900 dark:text-white md:text-4xl lg:text-5xl">
                {t('gameCenter.hub.greeting').replace(
                  '{name}',
                  user.first_name?.trim() ||
                    user.student_login_name?.trim() ||
                    t('gameCenter.hub.greetingDefaultName'),
                )}
              </h1>
              <p className="text-lg font-medium text-slate-600 dark:text-slate-300">{t('gameCenter.hub.greetingSub')}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('gameCenter.level')}: {gradeLevel}. {t('gameCenter.class')} · {t('gameCenter.remainingTime')}: {remaining}{' '}
                {t('gameCenter.minute')}
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <KidsSecondaryButton type="button" disabled={loading || saving} onClick={() => void load()}>
                  <RefreshCw className="mr-1 inline h-4 w-4 align-middle" aria-hidden />
                  {t('homework.refresh')}
                </KidsSecondaryButton>
                <KidsSecondaryButton type="button" onClick={() => setSoundOn((v) => !v)}>
                  {soundOn ? (
                    <>
                      <Volume2 className="mr-1 inline h-4 w-4 align-middle" aria-hidden />
                      {t('gameCenter.soundOn')}
                    </>
                  ) : (
                    <>
                      <VolumeX className="mr-1 inline h-4 w-4 align-middle" aria-hidden />
                      {t('gameCenter.soundOff')}
                    </>
                  )}
                </KidsSecondaryButton>
              </div>
            </div>
            <DailyGoalRing pct={dailyPct} today={todayMinutes} limit={dailyLimit} t={t} />
          </section>

          {loading && !featuredGame ? (
            <div className="h-[28rem] animate-pulse rounded-[2rem] bg-slate-200 dark:bg-slate-800" />
          ) : null}

          {!loading && !featuredGame ? (
            <p className="text-center text-slate-600 dark:text-slate-400">{t('gameCenter.loadError')}</p>
          ) : null}

          {featuredGame && featuredMeta ? (
            <section className="relative overflow-hidden rounded-[2rem] border border-violet-500/20 bg-linear-to-br from-slate-950 via-violet-950 to-indigo-950 p-6 shadow-2xl sm:p-10 md:rounded-[2.5rem]">
              <div
                className="pointer-events-none absolute inset-0 opacity-90"
                style={{
                  backgroundImage:
                    'radial-gradient(ellipse at 18% 18%, rgba(168,85,247,0.2) 0%, transparent 42%), radial-gradient(ellipse at 82% 58%, rgba(59,130,246,0.16) 0%, transparent 40%)',
                }}
              />
              <div className="relative z-10 mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="text-3xl font-black tracking-tight text-white md:text-4xl">{t('gameCenter.hub.universeTitle')}</h3>
                  <p className="mt-1 font-medium text-white/65">{t('gameCenter.hub.universeSub')}</p>
                </div>
                <a
                  href="#oyun-merkezi-tum-oyunlar"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/10 px-5 py-2.5 text-sm font-bold text-violet-200 transition hover:bg-white/15"
                >
                  {t('gameCenter.hub.seeAllGalaxy')}
                  <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
                </a>
              </div>

              <div className="relative z-10 grid gap-6 xl:grid-cols-12">
                <div className="xl:col-span-8">
                  <div className="group relative min-h-[420px] overflow-hidden rounded-[2rem] border border-white/10 bg-linear-to-br from-purple-900/40 to-black/70 md:min-h-[500px]">
                    <div className="pointer-events-none absolute inset-0">
                      {featuredMeta.gType === 'math' ? (
                        <Image
                          src={MATH_HERO_IMAGE}
                          alt={t('gameCenter.hub.featuredAlt')}
                          fill
                          className="object-contain object-bottom-right opacity-90 transition duration-700 group-hover:scale-[1.03]"
                          sizes="(max-width: 1280px) 100vw, 60vw"
                          priority
                        />
                      ) : (
                        <div
                          className="absolute right-2 bottom-2 text-[min(28vw,12rem)] leading-none opacity-25 select-none"
                          aria-hidden
                        >
                          {gameVisual(featuredMeta.gType).icon}
                        </div>
                      )}
                    </div>
                    <div className="absolute inset-0 bg-linear-to-r from-black/85 via-black/45 to-transparent" />
                    <div className="relative flex min-h-[420px] flex-col justify-end p-6 md:min-h-[500px] md:p-10">
                      <span className="mb-3 inline-block w-fit rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-violet-200 backdrop-blur-md">
                        {galaxyLabelForType(featuredMeta.gType, t)}
                      </span>
                      <h4 className="mb-4 max-w-[14ch] text-4xl font-black leading-[0.95] text-white md:text-5xl lg:text-6xl">
                        {localizedKidsGameCopy(featuredGame, 'title', t)}
                      </h4>
                      <div className="mb-4 flex flex-wrap gap-3">
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white/85">
                          <Signal className="h-4 w-4 text-amber-300" aria-hidden />
                          {
                            {
                              easy: t('gameCenter.difficulty.easy'),
                              medium: t('gameCenter.difficulty.medium'),
                              hard: t('gameCenter.difficulty.hard'),
                            }[featuredMeta.selectedDifficulty]
                          }
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white/85">
                          <Star className="h-4 w-4 text-violet-300" fill="currentColor" aria-hidden />
                          {t('gameCenter.hub.xpTarget').replace('{n}', String(featuredMeta.quest?.score_target ?? 100))}
                        </span>
                      </div>
                      <p className="mb-4 max-w-lg text-base font-medium text-white/70 md:text-lg">
                        {localizedKidsGameCopy(featuredGame, 'description', t)}
                      </p>
                      <div className="mb-4 max-w-xs">
                        <p className="mb-2 text-xs font-semibold text-white/50">{t('gameCenter.difficultyMode')}</p>
                        <DifficultyPicker
                          value={featuredMeta.selectedDifficulty}
                          disabled={saving || Boolean(activeSession)}
                          onChange={(v) =>
                            setSelectedDifficultyByGame((prev) => ({ ...prev, [featuredGame.id]: v }))
                          }
                          t={t}
                        />
                      </div>
                      <KidsPrimaryButton
                        type="button"
                        className="w-full uppercase tracking-wider sm:w-auto"
                        disabled={saving || featuredMeta.blocked || Boolean(activeSession)}
                        onClick={() => void onStart(featuredGame)}
                      >
                        {featuredMeta.blocked ? `🔒 ${t('gameCenter.blockedByParent')}` : t('gameCenter.hub.startNow')}
                      </KidsPrimaryButton>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-6 xl:col-span-4">
                  {sideGames.map((g) => {
                    const idx = games.findIndex((x) => x.id === g.id);
                    const gType = gameTypeFor(g, idx >= 0 ? idx : 0);
                    const quest = dailyQuests[g.id];
                    const blocked = blockedIds.includes(g.id);
                    const selectedDifficulty = selectedDifficultyByGame[g.id] || 'easy';
                    const rewardLabel = gType === 'word' ? t('gameCenter.hub.toEarn') : t('gameCenter.hub.reward');
                    const rewardValue =
                      gType === 'word'
                        ? t('gameCenter.hub.wordBadgeTeaser')
                        : t('gameCenter.hub.diamondReward').replace('{n}', String(quest?.score_target ?? 250));
                    return (
                      <div
                        key={g.id}
                        className="flex min-h-[240px] flex-1 flex-col justify-between rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur-md transition hover:-translate-y-1 hover:bg-white/10"
                      >
                        <div className="space-y-5">
                          <div
                            className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${
                              gType === 'memory'
                                ? 'border-fuchsia-400/30 bg-fuchsia-500/20'
                                : gType === 'word'
                                  ? 'border-amber-400/30 bg-amber-500/20'
                                  : 'border-emerald-400/30 bg-emerald-500/20'
                            }`}
                          >
                            {gType === 'memory' ? (
                              <Grid3x3 className="h-7 w-7 text-fuchsia-200" aria-hidden />
                            ) : gType === 'word' ? (
                              <SearchIcon className="h-7 w-7 text-amber-200" aria-hidden />
                            ) : (
                              <Sparkles className="h-7 w-7 text-emerald-200" aria-hidden />
                            )}
                          </div>
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <h4 className="text-xl font-black text-white">{localizedKidsGameCopy(g, 'title', t)}</h4>
                            <span
                              className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${difficultyPillClass(selectedDifficulty)}`}
                            >
                              {
                                {
                                  easy: t('gameCenter.difficulty.easy'),
                                  medium: t('gameCenter.difficulty.medium'),
                                  hard: t('gameCenter.difficulty.hard'),
                                }[selectedDifficulty]
                              }
                            </span>
                          </div>
                          <p className="text-sm font-medium text-white/60">{localizedKidsGameCopy(g, 'description', t)}</p>
                        </div>
                        <div className="mt-6 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <span className="font-bold uppercase text-white/40">{rewardLabel}</span>
                            <span
                              className={`font-black ${
                                gType === 'word' ? 'text-amber-200' : 'text-fuchsia-300'
                              }`}
                            >
                              {rewardValue}
                            </span>
                          </div>
                          <DifficultyPicker
                            value={selectedDifficulty}
                            disabled={saving || Boolean(activeSession)}
                            onChange={(v) =>
                              setSelectedDifficultyByGame((prev) => ({ ...prev, [g.id]: v }))
                            }
                            t={t}
                          />
                          <button
                            type="button"
                            disabled={saving || blocked || Boolean(activeSession)}
                            onClick={() => void onStart(g)}
                            className="w-full rounded-full border border-white/10 bg-white/10 py-3.5 text-sm font-black text-white transition hover:bg-white/20 disabled:pointer-events-none disabled:opacity-50"
                          >
                            {blocked ? `🔒 ${t('gameCenter.blockedByParent')}` : t('gameCenter.hub.explore')}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {moreGames.length > 0 ? (
                <div
                  id="oyun-merkezi-tum-oyunlar"
                  className="relative z-10 mt-10 border-t border-white/10 pt-10"
                >
                  <h3 className="mb-2 text-lg font-black text-white">{t('gameCenter.hub.allGamesTitle')}</h3>
                  <p className="mb-4 text-sm text-white/55">{t('gameCenter.hub.allGamesSub')}</p>
                  <div className="grid gap-4 md:grid-cols-2">
                    {moreGames.map((g) => {
                      const idx = games.findIndex((x) => x.id === g.id);
                      const gType = gameTypeFor(g, idx >= 0 ? idx : 0);
                      const quest = dailyQuests[g.id];
                      const blocked = blockedIds.includes(g.id);
                      const selectedDifficulty = selectedDifficultyByGame[g.id] || 'easy';
                      const vis = gameVisual(gType);
                      const typeLabel: Record<MiniGameType, string> = {
                        memory: t('gameCenter.type.memory'),
                        math: t('gameCenter.type.math'),
                        word: t('gameCenter.type.word'),
                        shape: t('gameCenter.type.shape'),
                        'reading-word': t('gameCenter.type.readingWord'),
                        'reading-story': t('gameCenter.type.readingStory'),
                      };
                      return (
                        <div
                          key={g.id}
                          className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-2xl" aria-hidden>
                              {vis.icon}
                            </span>
                            <h4 className="font-logo font-bold text-white">{localizedKidsGameCopy(g, 'title', t)}</h4>
                            <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-black uppercase text-violet-200">
                              {typeLabel[gType]}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-white/65">{localizedKidsGameCopy(g, 'description', t)}</p>
                          <p className="mt-2 text-xs text-white/45">
                            {t('gameCenter.dailyQuest')}: {quest?.completed_today ? t('gameCenter.done') : t('gameCenter.pending')} ·{' '}
                            {t('gameCenter.bestScore')}: {bestScoreByGame[g.id] ?? 0}
                          </p>
                          <div className="mt-3 flex flex-wrap items-end gap-2">
                            <div className="w-full">
                              <DifficultyPicker
                                value={selectedDifficulty}
                                disabled={saving || Boolean(activeSession)}
                                onChange={(v) =>
                                  setSelectedDifficultyByGame((prev) => ({ ...prev, [g.id]: v }))
                                }
                                t={t}
                              />
                            </div>
                            <KidsPrimaryButton
                              type="button"
                              className="min-h-10 px-5 text-xs"
                              disabled={saving || blocked || Boolean(activeSession)}
                              onClick={() => void onStart(g)}
                            >
                              {blocked ? '🔒' : t('gameCenter.startGame')}
                            </KidsPrimaryButton>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div id="oyun-merkezi-tum-oyunlar" className="relative z-10 mt-6 scroll-mt-24" aria-hidden />
              )}
            </section>
          ) : null}

          <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
            <section className="rounded-[2rem] border border-slate-100 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 xl:col-span-4">
              <h3 className="mb-6 flex items-center gap-2 text-xl font-black text-slate-900 dark:text-white">
                <History className="h-6 w-6 text-violet-600" aria-hidden />
                {t('gameCenter.historyTitle')}
              </h3>
              {sessions.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">{t('gameCenter.noSessions')}</p>
              ) : (
                <div className="space-y-3">
                  {sessions.slice(0, 6).map((s) => {
                    const idx = games.findIndex((x) => x.id === s.game.id);
                    const gType = gameTypeFor(s.game, idx >= 0 ? idx : 0);
                    const vis = gameVisual(gType);
                    const when = formatSessionWhen(s.ended_at || s.started_at, language, t);
                    const isRec =
                      s.status === 'completed' &&
                      s.score > 0 &&
                      (maxScoreInSessionsByGame.get(s.game.id) ?? 0) === s.score;
                    return (
                      <div
                        key={s.id}
                        className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-transparent bg-slate-50 p-4 transition hover:border-violet-200 hover:shadow-md dark:bg-slate-800/80 dark:hover:border-violet-700"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-lg dark:bg-violet-900/50">
                            {vis.icon}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                              {localizedKidsGameCopy(s.game, 'title', t)}
                            </p>
                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{when}</p>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          {s.status === 'completed' ? (
                            <p className="font-black text-violet-600 dark:text-violet-400">+{s.score} XP</p>
                          ) : (
                            <p className="text-xs font-bold text-slate-500">{s.status}</p>
                          )}
                          {isRec ? (
                            <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                              {t('gameCenter.hub.record')}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-[2rem] border border-slate-100 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 xl:col-span-5">
              <h3 className="mb-6 flex items-center gap-2 text-xl font-black text-slate-900 dark:text-white">
                <Trophy className="h-6 w-6 text-amber-500" aria-hidden />
                {t('gameCenter.hub.badgeShelf')}
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="group">
                  <BadgeShelfMilestone milestone={badgeMilestones.first} palette="gold" t={t} />
                </div>
                <div className="group">
                  <BadgeShelfMilestone milestone={badgeMilestones.second} palette="violet" t={t} />
                </div>
                <div className="text-center">
                  <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-linear-to-br from-slate-300 to-slate-500 text-white shadow-inner dark:from-slate-600 dark:to-slate-800">
                    <Lock className="h-10 w-10 opacity-80" aria-hidden />
                  </div>
                  <p className="mt-3 text-sm font-black text-slate-500 dark:text-slate-400">{t('gameCenter.hub.badgeLocked')}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('gameCenter.hub.badgeMystery')}</p>
                </div>
              </div>
              <Link
                href={`${pathPrefix}/ogrenci/yol`}
                className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-violet-600 hover:underline dark:text-violet-400"
              >
                {t('gameCenter.hub.moreBadges')}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </section>

            <section className="rounded-[2rem] border border-slate-100 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 xl:col-span-3">
              <h3 className="mb-6 flex items-center gap-2 text-xl font-black text-slate-900 dark:text-white">
                <Star className="h-6 w-6 text-violet-600" fill="currentColor" aria-hidden />
                {t('gameCenter.hub.topAliens')}
              </h3>
              <div className="mb-4 rounded-2xl border-l-4 border-violet-500 bg-violet-50 p-4 dark:bg-violet-950/40">
                <p className="text-xs font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">{t('gameCenter.hub.yourXp')}</p>
                <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{hubGrowthXp.toLocaleString()} XP</p>
              </div>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{t('gameCenter.hub.leaderboardHint')}</p>
            </section>
          </div>
        </div>
      )}
    </KidsPanelMax>
  );
}
