'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  Ban,
  Check,
  ChevronDown,
  Clock,
  Gamepad2,
  Moon,
  Save,
  Sun,
  Timer,
  TrendingUp,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  kidsParentGamesList,
  kidsParentChildrenOverview,
  kidsGetParentGamePolicy,
  kidsUpdateParentGamePolicy,
  type KidsGame,
  type KidsParentChildOverview,
} from '@/src/lib/kids-api';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import { useKidsI18n } from '@/src/providers/kids-language-provider';
import { KidsPanelMax } from '@/src/components/kids/kids-ui';

const DAILY_CAP = 240;

function childInitials(first: string, last: string): string {
  const a = (first[0] || '?').toUpperCase();
  const b = (last[0] || first[1] || '?').toUpperCase();
  return `${a}${b}`;
}

function formatTimeDisplay(hhmm: string, language: string): string {
  const parts = hhmm.split(':');
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  const d = new Date(2000, 0, 1, h, m, 0, 0);
  const locale = language === 'en' ? 'en-US' : language === 'ge' ? 'de-DE' : 'tr-TR';
  return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

export default function KidsParentControlsPage() {
  const router = useRouter();
  const { user, loading, pathPrefix } = useKidsAuth();
  const { t, language } = useKidsI18n();
  const [children, setChildren] = useState<KidsParentChildOverview[]>([]);
  const [games, setGames] = useState<KidsGame[]>([]);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [dailyMinutes, setDailyMinutes] = useState('30');
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('20:00');
  const [blocked, setBlocked] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const load = useCallback(async () => {
    const ov = await kidsParentChildrenOverview();
    setChildren(ov.children);
    const first = ov.children[0]?.id ?? null;
    setStudentId(first);
    if (first) {
      const [p, g] = await Promise.all([
        kidsGetParentGamePolicy(first),
        kidsParentGamesList(first),
      ]);
      setDailyMinutes(String(p.daily_minutes_limit || 30));
      setStartTime((p.allowed_start_time || '18:00').slice(0, 5));
      setEndTime((p.allowed_end_time || '20:00').slice(0, 5));
      setBlocked(p.blocked_game_ids || []);
      setGames(g.games || []);
    } else {
      setGames([]);
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(kidsLoginPortalHref(pathPrefix, 'veli'));
      return;
    }
    if (user.role !== 'parent') {
      router.replace(kidsLoginPortalHref(pathPrefix));
      return;
    }
    void load().catch((e) => {
      toast.error(e instanceof Error ? e.message : t('parentControls.loadError'));
    });
  }, [loading, user?.id, user?.role, pathPrefix, router, load, t]);

  useEffect(() => {
    if (!profileMenuOpen) return;
    function onPointerDown(e: MouseEvent | PointerEvent) {
      const el = profileMenuRef.current;
      if (el && !el.contains(e.target as Node)) setProfileMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setProfileMenuOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [profileMenuOpen]);

  const canSave = useMemo(() => {
    const n = Number(dailyMinutes);
    return Number.isFinite(n) && n >= 5 && n <= DAILY_CAP && Boolean(studentId);
  }, [dailyMinutes, studentId]);

  const selectedChild = useMemo(
    () => children.find((c) => c.id === studentId) ?? null,
    [children, studentId],
  );

  const allowedCount = useMemo(
    () => games.filter((g) => !blocked.includes(g.id)).length,
    [games, blocked],
  );
  const restrictedCount = useMemo(
    () => games.filter((g) => blocked.includes(g.id)).length,
    [games, blocked],
  );

  const limitBarPct = useMemo(() => {
    const n = Number(dailyMinutes);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.min(100, Math.round((n / DAILY_CAP) * 100));
  }, [dailyMinutes]);

  async function onPickStudent(nextId: number) {
    setStudentId(nextId);
    try {
      const [p, g] = await Promise.all([
        kidsGetParentGamePolicy(nextId),
        kidsParentGamesList(nextId),
      ]);
      setDailyMinutes(String(p.daily_minutes_limit || 30));
      setStartTime((p.allowed_start_time || '18:00').slice(0, 5));
      setEndTime((p.allowed_end_time || '20:00').slice(0, 5));
      setBlocked(p.blocked_game_ids || []);
      setGames(g.games || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('parentControls.policyLoadError'));
    }
  }

  function toggleGame(gameId: number) {
    setBlocked((prev) => (prev.includes(gameId) ? prev.filter((x) => x !== gameId) : [...prev, gameId]));
  }

  async function onSave() {
    if (!studentId || !canSave) return;
    setSaving(true);
    try {
      await kidsUpdateParentGamePolicy(studentId, {
        daily_minutes_limit: Number(dailyMinutes),
        allowed_start_time: `${startTime}:00`,
        allowed_end_time: `${endTime}:00`,
        blocked_game_ids: blocked,
      });
      const refreshed = await kidsParentGamesList(studentId).catch(() => ({ games: [] as KidsGame[] }));
      setGames(refreshed.games || []);
      toast.success(t('parentControls.saved'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user || user.role !== 'parent') {
    return <p className="text-center text-slate-600 dark:text-slate-400">{t('common.loading')}</p>;
  }

  return (
    <KidsPanelMax className="relative max-w-6xl space-y-8 pb-12">
      {/* Başlık + profil seçici */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-xl">
          <h1 className="font-logo text-3xl font-black tracking-tight text-slate-900 dark:text-white md:text-4xl">
            {t('parentControls.title')}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-slate-500 dark:text-zinc-400">
            {t('parentControls.heroSubtitle')}
          </p>
        </div>

        <div className="w-full shrink-0 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-md ring-1 ring-slate-900/5 dark:border-zinc-700 dark:bg-zinc-900/90 dark:ring-white/5 lg:max-w-sm">
          {children.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-zinc-400">{t('parentControls.noChildren')}</p>
          ) : (
            <div ref={profileMenuRef} className="relative">
              <button
                type="button"
                id={`${listboxId}-trigger`}
                aria-haspopup="listbox"
                aria-expanded={profileMenuOpen}
                aria-controls={listboxId}
                onClick={() => setProfileMenuOpen((o) => !o)}
                className="flex w-full items-center gap-3 rounded-xl p-1 text-left outline-none transition hover:bg-slate-50/80 focus-visible:ring-2 focus-visible:ring-violet-500/40 dark:hover:bg-zinc-800/60"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-black text-white shadow-md">
                  {selectedChild
                    ? childInitials(selectedChild.first_name, selectedChild.last_name)
                    : '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-slate-900 dark:text-white">
                    {selectedChild ? `${selectedChild.first_name} ${selectedChild.last_name}` : '—'}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                    {t('parentControls.activeProfile')}
                  </p>
                </div>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 dark:text-zinc-500 ${profileMenuOpen ? 'rotate-180' : ''}`}
                  aria-hidden
                />
              </button>

              {profileMenuOpen ? (
                <ul
                  id={listboxId}
                  role="listbox"
                  aria-labelledby={`${listboxId}-trigger`}
                  className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-72 overflow-auto rounded-2xl border border-slate-200/90 bg-white py-1.5 shadow-xl shadow-slate-900/10 dark:border-zinc-600 dark:bg-zinc-900 dark:shadow-black/40"
                >
                  {children.map((c) => {
                    const selected = c.id === studentId;
                    return (
                      <li key={c.id} role="presentation" className="px-1.5">
                        <button
                          type="button"
                          role="option"
                          aria-selected={selected}
                          onClick={() => {
                            setProfileMenuOpen(false);
                            void onPickStudent(c.id);
                          }}
                          className={`flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition ${
                            selected
                              ? 'bg-violet-50 dark:bg-violet-950/50'
                              : 'hover:bg-slate-50 dark:hover:bg-zinc-800/80'
                          }`}
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xs font-black text-white shadow-sm">
                            {childInitials(c.first_name, c.last_name)}
                          </div>
                          <span className="min-w-0 flex-1 truncate font-semibold text-slate-900 dark:text-white">
                            {c.first_name} {c.last_name}
                          </span>
                          {selected ? (
                            <Check
                              className="h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400"
                              strokeWidth={2.5}
                              aria-hidden
                            />
                          ) : (
                            <span className="h-4 w-4 shrink-0" aria-hidden />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Süre kartları */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-md dark:border-zinc-700 dark:bg-zinc-900/90">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300">
              <Timer className="h-6 w-6" strokeWidth={2} />
            </div>
            <div>
              <h2 className="font-logo text-lg font-bold text-slate-900 dark:text-white">
                {t('parentControls.dailyLimitCardTitle')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">{t('parentControls.dailyLimitCardHint')}</p>
            </div>
          </div>
          <div className="mt-5 rounded-xl bg-slate-100 px-4 py-3 dark:bg-zinc-800">
            <div className="flex items-baseline gap-1">
              <input
                type="number"
                min={5}
                max={DAILY_CAP}
                value={dailyMinutes}
                onChange={(e) => setDailyMinutes(e.target.value)}
                disabled={!studentId}
                className="w-full min-w-0 border-0 bg-transparent font-black text-2xl text-violet-600 outline-none dark:text-violet-400"
              />
              <span className="text-sm font-bold text-slate-500 dark:text-zinc-400">{t('parentControls.minutesSuffix')}</span>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-zinc-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-300"
              style={{ width: `${limitBarPct}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-md dark:border-zinc-700 dark:bg-zinc-900/90">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pink-100 text-pink-600 dark:bg-pink-950/50 dark:text-pink-300">
              <Sun className="h-6 w-6" strokeWidth={2} />
            </div>
            <div>
              <h2 className="font-logo text-lg font-bold text-slate-900 dark:text-white">
                {t('parentControls.startCardTitle')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">{t('parentControls.startCardHint')}</p>
            </div>
          </div>
          <div className="mt-5 rounded-xl bg-slate-100 px-4 py-3 dark:bg-zinc-800">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 shrink-0 text-pink-500" strokeWidth={2} />
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={!studentId}
                className="w-full border-0 bg-transparent font-black text-lg text-pink-600 outline-none dark:text-pink-400"
              />
            </div>
            <p className="mt-1 text-xs font-medium text-slate-400 dark:text-zinc-500">
              {formatTimeDisplay(startTime, language)}
            </p>
          </div>
        </div>

        <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-md dark:border-zinc-700 dark:bg-zinc-900/90">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              <Moon className="h-6 w-6" strokeWidth={2} />
            </div>
            <div>
              <h2 className="font-logo text-lg font-bold text-slate-900 dark:text-white">
                {t('parentControls.endCardTitle')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">{t('parentControls.endCardHint')}</p>
            </div>
          </div>
          <div className="mt-5 rounded-xl bg-slate-100 px-4 py-3 dark:bg-zinc-800">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" strokeWidth={2} />
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={!studentId}
                className="w-full border-0 bg-transparent font-black text-lg text-amber-700 outline-none dark:text-amber-300"
              />
            </div>
            <p className="mt-1 text-xs font-medium text-slate-400 dark:text-zinc-500">
              {formatTimeDisplay(endTime, language)}
            </p>
          </div>
        </div>
      </div>

      {/* Oyun izinleri */}
      <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-md dark:border-zinc-700 dark:bg-zinc-900/90 md:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-logo text-xl font-bold text-slate-900 dark:text-white">
              {t('parentControls.gamePermissions')}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
              {t('parentControls.gamePermSectionSubtitle')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!studentId || games.length === 0}
              onClick={() => setBlocked([])}
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-40 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-950/60"
            >
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              {t('parentControls.turnAllOnShort')}
            </button>
            <button
              type="button"
              disabled={!studentId || games.length === 0}
              onClick={() => setBlocked(games.map((g) => g.id))}
              className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-800 transition hover:bg-rose-100 disabled:opacity-40 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-950/60"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.5} />
              {t('parentControls.turnAllOffShort')}
            </button>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl border border-violet-100 bg-violet-50/80 p-4 dark:border-violet-900/50 dark:bg-violet-950/30">
            <Gamepad2 className="h-6 w-6 text-violet-600 dark:text-violet-400" strokeWidth={2} />
            <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              {t('parentControls.statLabelTotal')}
            </p>
            <p className="mt-1 font-logo text-2xl font-black text-slate-900 dark:text-white">{games.length}</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
            <Check className="h-6 w-6 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
            <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              {t('parentControls.statLabelAllowed')}
            </p>
            <p className="mt-1 font-logo text-2xl font-black text-slate-900 dark:text-white">{allowedCount}</p>
          </div>
          <div className="rounded-2xl border border-rose-100 bg-rose-50/80 p-4 dark:border-rose-900/50 dark:bg-rose-950/30">
            <Ban className="h-6 w-6 text-rose-600 dark:text-rose-400" strokeWidth={2} />
            <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              {t('parentControls.statLabelRestricted')}
            </p>
            <p className="mt-1 font-logo text-2xl font-black text-slate-900 dark:text-white">{restrictedCount}</p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50/80 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
            <TrendingUp className="h-6 w-6 text-amber-600 dark:text-amber-400" strokeWidth={2} />
            <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              {t('parentControls.statLabelGrowth')}
            </p>
            <p className="mt-1 font-logo text-2xl font-black text-slate-900 dark:text-white">
              {selectedChild ? `+${selectedChild.growth_points}` : '—'}
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-2">
          {games.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500 dark:border-zinc-600 dark:text-zinc-400">
              {studentId ? t('parentControls.noGames') : t('parentControls.noChildren')}
            </p>
          ) : (
            games.map((g) => {
              const isBlocked = blocked.includes(g.id);
              return (
                <div
                  key={g.id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-900 dark:text-white">{g.title}</p>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">{g.description?.slice(0, 80) || g.slug}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={!isBlocked}
                    onClick={() => toggleGame(g.id)}
                    className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${
                      isBlocked ? 'bg-slate-300 dark:bg-zinc-600' : 'bg-emerald-500'
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                        isBlocked ? 'left-1' : 'left-7'
                      }`}
                    />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </section>

      <div className="flex justify-center pt-2">
        <button
          type="button"
          disabled={!canSave || saving}
          onClick={() => void onSave()}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-10 py-4 text-base font-black text-white shadow-lg shadow-violet-500/30 transition hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-45"
        >
          <Save className="h-5 w-5" strokeWidth={2} />
          {saving ? t('profile.saving') : t('parentControls.saveRules')}
        </button>
      </div>
    </KidsPanelMax>
  );
}
