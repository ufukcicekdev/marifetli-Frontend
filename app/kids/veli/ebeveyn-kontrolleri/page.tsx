'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { KidsCard, KidsPanelMax, KidsPrimaryButton, KidsSelect, kidsInputClass } from '@/src/components/kids/kids-ui';

export default function KidsParentControlsPage() {
  const router = useRouter();
  const { user, loading, pathPrefix } = useKidsAuth();
  const { t } = useKidsI18n();
  const [children, setChildren] = useState<KidsParentChildOverview[]>([]);
  const [games, setGames] = useState<KidsGame[]>([]);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [dailyMinutes, setDailyMinutes] = useState('30');
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('20:00');
  const [blocked, setBlocked] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [gamesByChild, setGamesByChild] = useState<Record<number, KidsGame[]>>({});

  async function loadGamesForChildren(childIds: number[]) {
    const pairs = await Promise.all(
      childIds.map(async (id) => {
        const g = await kidsParentGamesList(id).catch(() => ({ games: [] as KidsGame[] }));
        return [id, g.games || []] as const;
      }),
    );
    setGamesByChild(Object.fromEntries(pairs));
  }

  const load = useCallback(async () => {
    const ov = await kidsParentChildrenOverview();
    setChildren(ov.children);
    await loadGamesForChildren(ov.children.map((c) => c.id));
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

  const canSave = useMemo(() => {
    const n = Number(dailyMinutes);
    return Number.isFinite(n) && n >= 5 && n <= 240 && Boolean(studentId);
  }, [dailyMinutes, studentId]);

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
      setGamesByChild((prev) => ({ ...prev, [nextId]: g.games || [] }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('parentControls.policyLoadError'));
    }
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
      setGamesByChild((prev) => ({ ...prev, [studentId]: refreshed.games || [] }));
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
    <KidsPanelMax>
      <h1 className="font-logo text-2xl font-bold text-slate-900 dark:text-white">{t('parentControls.title')}</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        {t('parentControls.subtitle')}
      </p>

      <KidsCard className="mt-6">
        <label className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t('childrenStatus.selectChild')}</label>
        <KidsSelect
          value={studentId ? String(studentId) : ''}
          onChange={(v) => {
            const nextId = Number(v);
            if (Number.isFinite(nextId) && nextId > 0) {
              void onPickStudent(nextId);
            }
          }}
          options={children.map((c) => ({
            value: String(c.id),
            label: `${c.first_name} ${c.last_name}`,
          }))}
          className="mt-2"
        />

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">{t('parentControls.dailyLimit')}</label>
            <input
              type="number"
              min={5}
              max={240}
              value={dailyMinutes}
              onChange={(e) => setDailyMinutes(e.target.value)}
              className={`${kidsInputClass} mt-1`}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">{t('parentControls.startTime')}</label>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={`${kidsInputClass} mt-1`} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">{t('parentControls.endTime')}</label>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={`${kidsInputClass} mt-1`} />
          </div>
        </div>
      </KidsCard>

      <KidsCard className="mt-4" tone="sky">
        <h2 className="font-logo text-base font-bold text-slate-900 dark:text-white">{t('parentControls.gamePermissions')}</h2>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
          {t('parentControls.childSummaryHint')}
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {children.map((c) => {
            const childGames = gamesByChild[c.id] || [];
            const isActiveEditor = studentId === c.id;
            const blockedCount = isActiveEditor ? blocked.length : null;
            const totalGames = childGames.length;
            const openCount = blockedCount === null ? null : Math.max(0, totalGames - blockedCount);
            const completedQuestCount = childGames.filter((g) => g.progress?.daily_quest_completed_today).length;
            const bestScoreOverall = childGames.reduce((m, g) => Math.max(m, g.progress?.best_score ?? 0), 0);
            const maxStreak = childGames.reduce((m, g) => Math.max(m, g.progress?.streak_count ?? 0), 0);
            return (
              <div key={c.id} className={`rounded-xl border px-3 py-3 text-xs ${isActiveEditor ? 'border-violet-300 bg-violet-50/70 dark:border-violet-700 dark:bg-violet-950/30' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/60'}`}>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {c.first_name} {c.last_name}
                  </p>
                  <button
                    type="button"
                    onClick={() => void onPickStudent(c.id)}
                    className="rounded-full bg-violet-600 px-2.5 py-1 text-[11px] font-bold text-white"
                  >
                    {isActiveEditor ? t('parentControls.editing') : t('parentControls.edit')}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>{t('parentControls.totalGames')}: <strong>{totalGames}</strong></div>
                  <div>{t('parentControls.openGames')}: <strong>{openCount ?? '-'}</strong></div>
                  <div>{t('parentControls.closedGames')}: <strong>{blockedCount ?? '-'}</strong></div>
                  <div>{t('parentControls.dailyQuest')}: <strong>{completedQuestCount}</strong></div>
                  <div>{t('parentControls.bestScore')}: <strong>{bestScoreOverall}</strong></div>
                  <div className="col-span-2">{t('parentControls.maxStreak')}: <strong>{maxStreak} {t('gameCenter.day')}</strong></div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setBlocked([])}
            className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white"
          >
            {t('parentControls.openAllForSelected')}
          </button>
          <button
            type="button"
            onClick={() => setBlocked(games.map((g) => g.id))}
            className="rounded-full bg-rose-600 px-3 py-1 text-xs font-bold text-white"
          >
            {t('parentControls.closeAllForSelected')}
          </button>
        </div>
      </KidsCard>

      <div className="mt-5">
        <KidsPrimaryButton type="button" disabled={!canSave || saving} onClick={() => void onSave()}>
          {saving ? t('profile.saving') : t('parentControls.saveRules')}
        </KidsPrimaryButton>
      </div>
    </KidsPanelMax>
  );
}
