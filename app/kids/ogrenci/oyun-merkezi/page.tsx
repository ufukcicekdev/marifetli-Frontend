'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  kidsCompleteGameSession,
  kidsMyGameSessions,
  kidsStartGameSession,
  kidsStudentGamesOverview,
  type KidsGame,
  type KidsGameSession,
} from '@/src/lib/kids-api';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import { KidsCard, KidsPanelMax, KidsPrimaryButton, KidsSecondaryButton } from '@/src/components/kids/kids-ui';

const MEMORY_ICONS = ['🍎', '🚗', '⭐', '🐶', '🎈', '⚽', '🌈', '🦋'];
const WORD_LEVELS = ['KEDI', 'OKUL', 'SEKER', 'KALEM', 'OYUNCU'];
const SHAPES = ['🔺', '🔵', '🟩', '🟨'];

type MiniGameType = 'memory' | 'math' | 'word' | 'shape';
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
  };
  if (bySlug[game.slug]) return bySlug[game.slug];
  const fallback: MiniGameType[] = ['memory', 'math', 'word', 'shape'];
  return fallback[idx % fallback.length];
}

function mathOperationForGame(game: KidsGame | null): MathOperation {
  const slug = game?.slug || '';
  if (slug === 'hizli-cikarma') return 'sub';
  if (slug === 'hizli-carpma') return 'mul';
  if (slug === 'hizli-bolme') return 'div';
  return 'add';
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
  onLevelDone,
  soundOn,
  onCorrect,
  onWrong,
}: {
  level: number;
  onLevelDone: (scoreDelta: number) => void;
  soundOn: boolean;
  onCorrect: () => void;
  onWrong: () => void;
}) {
  const pairCount = Math.min(3 + level, 6);
  const icons = useMemo(() => shuffle(MEMORY_ICONS).slice(0, pairCount), [pairCount, level]);
  const cards = useMemo(
    () => shuffle(icons.flatMap((icon, i) => [{ id: `${i}-a`, icon }, { id: `${i}-b`, icon }])),
    [icons],
  );
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [lock, setLock] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!completed && matched.length === cards.length && cards.length > 0) {
      setCompleted(true);
      onLevelDone(20 + level * 10);
    }
  }, [completed, matched.length, cards.length, level, onLevelDone]);

  function onPick(id: string, icon: string) {
    if (lock || openIds.includes(id) || matched.includes(id)) return;
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

  return (
    <div className="grid grid-cols-3 gap-3 md:grid-cols-4 md:gap-4">
      {cards.map((c) => {
        const shown = openIds.includes(c.id) || matched.includes(c.id);
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onPick(c.id, c.icon)}
            className="h-20 rounded-2xl border-2 border-violet-300 bg-white text-3xl shadow-sm transition hover:scale-105 md:h-24 md:text-4xl"
          >
            {shown ? c.icon : '❓'}
          </button>
        );
      })}
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
}: {
  level: number;
  onLevelDone: (scoreDelta: number) => void;
  soundOn: boolean;
  operation: MathOperation;
  onCorrect: () => void;
  onWrong: () => void;
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
      setFeedback({ ok: true, text: 'Harika! Dogru cevap ✅' });
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
      setFeedback({ ok: false, text: 'Olmadi, tekrar dene ❌' });
      return;
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-base font-semibold text-slate-800">Soru {idx + 1} / {total}</p>
        <p className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-800">Hizli cevapla!</p>
      </div>
      <div className="rounded-2xl border-2 border-violet-200 bg-violet-50 px-4 py-4 text-center">
        <p className="text-4xl font-black text-violet-800 md:text-5xl">{a} {opSymbol} {b} = ?</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {choices.map((c, i) => {
          const isPicked = selected === c;
          return (
            <button
              key={`${idx}-${c}-${i}`}
              type="button"
              onClick={() => submit(c)}
              disabled={selected !== null}
              className={`h-16 rounded-2xl border-2 text-2xl font-black transition md:h-20 md:text-3xl ${
                isPicked
                  ? c === correctResult
                    ? 'border-emerald-500 bg-emerald-100 text-emerald-800'
                    : 'border-rose-500 bg-rose-100 text-rose-800'
                  : 'border-violet-300 bg-white text-violet-800 hover:scale-105 hover:bg-violet-50'
              }`}
            >
              {c}
            </button>
          );
        })}
      </div>
      {feedback ? (
        <p
          className={`text-sm font-semibold ${
            feedback.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
          }`}
        >
          {feedback.text}
        </p>
      ) : null}
    </div>
  );
}

function WordLevel({
  level,
  onLevelDone,
  soundOn,
  onCorrect,
  onWrong,
}: {
  level: number;
  onLevelDone: (scoreDelta: number) => void;
  soundOn: boolean;
  onCorrect: () => void;
  onWrong: () => void;
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
      setFeedbackWord('Sira karisti, tekrar dene ❌');
      window.setTimeout(() => {
        setPicked('');
        setFeedbackWord(null);
      }, 650);
    }
  }, [done, picked, word, level, onLevelDone, soundOn, onCorrect, onWrong]);
  const [feedbackWord, setFeedbackWord] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <p className="text-base font-semibold text-slate-700">Harfleri dogru sirayla sec</p>
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
        <KidsSecondaryButton type="button" onClick={() => setPicked('')}>Temizle</KidsSecondaryButton>
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
}: {
  level: number;
  onLevelDone: (scoreDelta: number) => void;
  soundOn: boolean;
  onCorrect: () => void;
  onWrong: () => void;
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
      <p className="text-base font-semibold text-slate-700">Ayni sekli sec ({idx + 1}/{rounds})</p>
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
}) {
  return (
    <div className="rounded-3xl border-4 border-violet-300/80 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-4 shadow-2xl dark:border-violet-700 dark:from-violet-950/40 dark:via-gray-900 dark:to-fuchsia-950/30 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-black text-violet-900 dark:text-violet-100">Seviye {level}/{maxLevel}</p>
        <p className="text-sm font-black text-fuchsia-700 dark:text-fuchsia-200">Skor: {sessionScore}</p>
        <p className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">🔥 Combo: {combo}</p>
      </div>
      {fx.type ? (
        <div
          key={fx.id}
          className={`mb-3 rounded-2xl px-3 py-2 text-sm font-black animate-pulse ${
            fx.type === 'correct' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
          }`}
        >
          {fx.type === 'correct' ? '✨ ' : '💥 '}
          {fx.text}
        </div>
      ) : null}
      <div className="rounded-2xl border-2 border-violet-200 bg-white/90 p-4 dark:border-violet-800 dark:bg-gray-950/80 md:p-6">
        {activeType === 'memory' ? (
          <MemoryLevel key={`memory-${level}`} level={level} onLevelDone={onLevelDone} soundOn={soundOn} onCorrect={onCorrect} onWrong={onWrong} />
        ) : null}
        {activeType === 'math' ? (
          <MathLevel
            key={`math-${(activeGame?.slug || 'add')}-${level}`}
            level={level}
            onLevelDone={onLevelDone}
            soundOn={soundOn}
            operation={mathOperationForGame(activeGame)}
            onCorrect={onCorrect}
            onWrong={onWrong}
          />
        ) : null}
        {activeType === 'word' ? (
          <WordLevel key={`word-${level}`} level={level} onLevelDone={onLevelDone} soundOn={soundOn} onCorrect={onCorrect} onWrong={onWrong} />
        ) : null}
        {activeType === 'shape' ? (
          <ShapeLevel key={`shape-${level}`} level={level} onLevelDone={onLevelDone} soundOn={soundOn} onCorrect={onCorrect} onWrong={onWrong} />
        ) : null}
      </div>
    </div>
  );
}

export default function KidsGameHubPage() {
  const router = useRouter();
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();
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

  const load = useCallback(async () => {
    try {
      const [overview, history] = await Promise.all([
        kidsStudentGamesOverview(),
        kidsMyGameSessions().catch(() => ({ sessions: [] })),
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
      const running = history.sessions.find((s) => s.status === 'active') || null;
      setActiveSession(running);
      if (running) {
        setActiveGame(running.game);
        setActiveType(gameTypeFor(running.game, 0));
        setLevel(1);
        setSessionScore(0);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Oyunlar yuklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

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
      toast.success(`${game.title} basladi`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Baslatilamadi');
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
    setFx((p) => ({ type: 'correct', text: 'Dogru cevap!', id: p.id + 1 }));
  }

  function onWrong() {
    setCombo(0);
    comboRef.current = 0;
    setFx((p) => ({ type: 'wrong', text: 'Yanlis, tekrar dene!', id: p.id + 1 }));
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
      if (status === 'completed') toast.success('Oyun tamamlandi, puan/rozet kontrol edildi');
      else toast('Oyun oturumu kapatildi');
      playGameSound(status === 'completed' ? 'finish' : 'tap', soundOn);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Oturum kapatilamadi');
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
    toast(`🚀 Seviye ${nextLevel} basliyor...`, { duration: 1400 });
    setLevel(nextLevel);
    setCombo(0);
    comboRef.current = 0;
    playGameSound('levelup', soundOn);
    toast.success(`Seviye ${level} tamamlandi!`);
  }

  if (authLoading || !user || user.role !== 'student') {
    return <p className="text-center text-slate-600 dark:text-slate-400">Yukleniyor...</p>;
  }

  return (
    <KidsPanelMax>
      <div className="pointer-events-none relative mb-3 h-8 overflow-hidden rounded-full bg-gradient-to-r from-pink-200 via-violet-200 to-sky-200">
        <span className="absolute left-4 top-1 text-lg">✨</span>
        <span className="absolute left-1/3 top-1 text-lg">🎉</span>
        <span className="absolute left-2/3 top-1 text-lg">🌈</span>
        <span className="absolute right-4 top-1 text-lg">⭐</span>
      </div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-logo flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
            <span className="inline-block animate-bounce" aria-hidden>🎮</span>
            Oyun merkezi
            <span className="inline-block animate-pulse" aria-hidden>🪄</span>
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Sinif seviyene uygun egitici oyunlarla ilerle, puan ve rozet kazan. Bugun hangi oyunda parlayacaksin?
          </p>
        </div>
        <KidsSecondaryButton type="button" disabled={loading || saving} onClick={() => void load()}>
          🔄 Yenile
        </KidsSecondaryButton>
        <KidsSecondaryButton type="button" onClick={() => setSoundOn((v) => !v)}>
          {soundOn ? '🔊 Ses acik' : '🔇 Ses kapali'}
        </KidsSecondaryButton>
      </div>

      <KidsCard tone="sky" className="relative overflow-hidden">
        <p className="text-sm font-semibold text-sky-900 dark:text-sky-100">
          <span className="mr-2 inline-flex items-center rounded-full bg-sky-200 px-2 py-0.5 text-[11px] font-black text-sky-900 dark:bg-sky-800 dark:text-sky-100">
            SURE
          </span>
          Bugun oyun suresi: {todayMinutes} dk / {dailyLimit} dk
        </p>
        <p className="mt-1 text-xs text-sky-800 dark:text-sky-200">
          Kalan sure: {remaining} dk · Seviye: {gradeLevel}. sinif · Hedef: eglenerek ogrenmek!
        </p>
      </KidsCard>

      {activeSession ? (
        <section className="mt-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-logo text-xl font-black text-slate-900 dark:text-white">
              {activeSession.game.title} oynaniyor
            </h2>
            <div className="flex gap-2">
              <KidsPrimaryButton type="button" disabled={saving} onClick={() => void onFinish('completed')}>
                ✅ Bitir
              </KidsPrimaryButton>
              <KidsSecondaryButton type="button" disabled={saving} onClick={() => void onFinish('aborted')}>
                ❌ Cik
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
          />
        </section>
      ) : (
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {games.map((g) => {
          const blocked = blockedIds.includes(g.id);
          const gType = gameTypeFor(g, games.findIndex((x) => x.id === g.id));
          const selectedDifficulty = selectedDifficultyByGame[g.id] || 'easy';
          const quest = dailyQuests[g.id];
          const vis = gameVisual(gType);
          const typeLabel: Record<MiniGameType, string> = {
            memory: 'Hafiza',
            math: 'Matematik',
            word: 'Kelime',
            shape: 'Sekil',
          };
          const difficultyLabel: Record<'easy' | 'medium' | 'hard', string> = {
            easy: 'Kolay',
            medium: 'Orta',
            hard: 'Zor',
          };
          return (
            <KidsCard
              key={g.id}
              className={`group relative overflow-hidden shadow-xl transition duration-200 hover:-translate-y-1 hover:scale-[1.01] ${vis.cardGlow}`}
            >
              <div className="pointer-events-none absolute -right-4 -top-4 text-6xl opacity-15" aria-hidden>
                {vis.icon}
              </div>
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-0 transition group-hover:opacity-100"
                aria-hidden
              />
              <div className="mb-2 flex items-center gap-2">
                <span className="text-3xl transition group-hover:scale-110" aria-hidden>{vis.icon}</span>
                <h2 className="font-logo text-lg font-bold text-slate-900 dark:text-white">{g.title}</h2>
                <span className={`ml-auto rounded-full bg-gradient-to-r px-2.5 py-1 text-[11px] font-black text-white ${vis.chip}`}>
                  {typeLabel[gType]}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{g.description}</p>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Seviye: {g.min_grade}-{g.max_grade}. sinif · Zorluk: {g.difficulty}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-800 dark:bg-violet-900/50 dark:text-violet-100">
                  Oyun tipi: {typeLabel[gType]}
                </span>
                <span className="rounded-full bg-pink-100 px-2 py-0.5 text-[11px] font-semibold text-pink-800 dark:bg-pink-900/40 dark:text-pink-100">
                  Rozet kazanimi aktif
                </span>
              </div>
              <div className="mt-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Zorluk modu</label>
                <select
                  value={selectedDifficulty}
                  disabled={saving || Boolean(activeSession)}
                  onChange={(e) =>
                    setSelectedDifficultyByGame((prev) => ({
                      ...prev,
                      [g.id]: e.target.value as 'easy' | 'medium' | 'hard',
                    }))
                  }
                  className="mt-1 h-9 rounded-lg border border-violet-300 px-2 text-sm"
                >
                  <option value="easy">Kolay</option>
                  <option value="medium">Orta</option>
                  <option value="hard">Zor</option>
                </select>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  Aktif mod: {difficultyLabel[selectedDifficulty]}
                </p>
              </div>
              <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-xs text-emerald-900">
                <div>
                  Gunluk gorev: {quest?.completed_today ? 'Tamamlandi ✅' : 'Bekliyor ⏳'} · Hedef skor: {quest?.score_target ?? 50}
                </div>
                <div>Haftalik seri: {quest?.streak_count ?? 0} gun · En iyi skor: {bestScoreByGame[g.id] ?? 0}</div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-emerald-200/70">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                    style={{
                      width: `${Math.min(
                        100,
                        ((bestScoreByGame[g.id] ?? 0) / Math.max(1, quest?.score_target ?? 50)) * 100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{g.instructions}</p>
              <div className="mt-4">
                <KidsPrimaryButton
                  type="button"
                  disabled={saving || blocked || Boolean(activeSession)}
                  onClick={() => void onStart(g)}
                >
                  {blocked ? '🔒 Veli tarafindan kapali' : '🚀 Oyuna basla'}
                </KidsPrimaryButton>
              </div>
            </KidsCard>
          );
        })}
      </div>
      )}

      {!activeSession ? (
      <KidsCard className="mt-6">
        <h3 className="font-logo text-base font-bold text-slate-900 dark:text-white">📜 Son oyun gecmisi</h3>
        {sessions.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Henuz oyun oturumu yok.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {sessions.slice(0, 8).map((s) => (
              <li key={s.id} className="rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700">
                <span className="font-medium text-slate-900 dark:text-white">{s.game.title}</span>
                <span className="text-slate-600 dark:text-slate-300">
                  {' '}
                  · {s.status} · skor {s.score} · {Math.round((s.duration_seconds || 0) / 60)} dk
                </span>
              </li>
            ))}
          </ul>
        )}
      </KidsCard>
      ) : null}
    </KidsPanelMax>
  );
}
