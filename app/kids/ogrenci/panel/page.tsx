'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { KidsStudentDashboardPlayful } from '@/src/components/kids/kids-student-dashboard-playful';
import { KidsAvatarPicker } from '@/src/components/kids/kids-avatar-picker';
import { kidsAvatarUrl } from '@/src/lib/kids-api';
import {
  detectNewPraiseTitles,
  detectNewTeacherPicks,
} from '@/src/components/kids/kids-student-panel-celebrations';
import { KidsStudentStarOverlay } from '@/src/components/kids/kids-student-star-overlay';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import {
  type KidsAchievementCertificate,
  kidsGetBadgeRoadmap,
  kidsGetDailyQuests,
  kidsStudentDashboard,
  type KidsAssignment,
  type KidsBadgeRoadmap,
  type KidsClass,
  type KidsDailyQuestStatus,
} from '@/src/lib/kids-api';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';
import { useKidsI18n } from '@/src/providers/kids-language-provider';

export default function KidsStudentPanelPage() {
  const router = useRouter();
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();
  const { t } = useKidsI18n();
  const [classes, setClasses] = useState<KidsClass[]>([]);
  const [assignments, setAssignments] = useState<KidsAssignment[]>([]);
  const [certificates, setCertificates] = useState<KidsAchievementCertificate[]>([]);
  const [roadmap, setRoadmap] = useState<KidsBadgeRoadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [pickLabels, setPickLabels] = useState<string[] | null>(null);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [dailyQuests, setDailyQuests] = useState<KidsDailyQuestStatus | null>(null);

  const load = useCallback(async () => {
    try {
      const [data, road] = await Promise.all([
        kidsStudentDashboard(),
        kidsGetBadgeRoadmap().catch(() => null),
      ]);
      setClasses(data.classes);
      setAssignments(data.assignments);
      setCertificates(Array.isArray(data.achievement_certificates) ? data.achievement_certificates : []);
      setRoadmap(road);
    } catch {
      toast.error(t('student.panel.loadError'));
    } finally {
      setLoading(false);
    }
    // Günlük görevleri arka planda yükle
    kidsGetDailyQuests().then(setDailyQuests).catch(() => {});
  }, [t]);

  // Sekme/pencere tekrar aktif olunca görevleri yenile (oyundan/ödevden dönüş)
  useEffect(() => {
    const refresh = () => {
      if (!document.hidden) {
        kidsGetDailyQuests().then(setDailyQuests).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', refresh);
    return () => document.removeEventListener('visibilitychange', refresh);
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
  }, [authLoading, user?.id, user?.role, router, pathPrefix, load]);

  useEffect(() => {
    if (!roadmap) return;
    const ev = detectNewTeacherPicks(roadmap, (id) =>
      t('student.pick.fallbackChallenge').replace('{id}', String(id)),
    );
    if (ev && ev.labels.length) setPickLabels(ev.labels);
  }, [roadmap, t]);

  useEffect(() => {
    if (loading) return;
    const titles = detectNewPraiseTitles(assignments);
    if (titles.length === 0) return;
    toast.custom(
      () => (
        <div className="pointer-events-auto flex max-w-sm items-start gap-3 rounded-2xl border-2 border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3 shadow-xl dark:border-emerald-700 dark:from-emerald-950 dark:to-teal-950">
          <span className="text-2xl" aria-hidden>
            🌟
          </span>
          <div>
            <p className="font-logo text-sm font-black text-emerald-900 dark:text-emerald-100">
              {t('student.panel.toast.title')}
            </p>
            <p className="mt-1 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
              {titles.length === 1
                ? t('student.panel.toast.single').replace('{title}', titles[0] || '')
                : t('student.panel.toast.multi').replace('{count}', String(titles.length))}
            </p>
          </div>
        </div>
      ),
      { duration: 6500, position: 'top-center' },
    );
  }, [loading, assignments, t]);

  if (authLoading || !user) {
    return <p className="text-center text-gray-600 dark:text-gray-400">{t('common.loading')}</p>;
  }
  if (user.role !== 'student') {
    return <p className="text-center text-gray-600">{t('common.redirecting')}</p>;
  }

  const questLabel: Record<string, string> = {
    game_play: t('dailyQuests.gamePlay'),
    homework_submit: t('dailyQuests.homeworkSubmit'),
    test_complete: t('dailyQuests.testComplete'),
    read_story: t('dailyQuests.readStory'),
  };

  return (
    <>
      <KidsStudentStarOverlay
        open={pickLabels !== null && pickLabels.length > 0}
        labels={pickLabels ?? []}
        onClose={() => setPickLabels(null)}
      />
      {avatarPickerOpen && (
        <KidsAvatarPicker currentKey={user.avatar_key} onClose={() => setAvatarPickerOpen(false)} />
      )}
      <div className="mx-auto max-w-2xl px-3 pt-4 sm:px-4">
        <button
          onClick={() => setAvatarPickerOpen(true)}
          className="flex items-center gap-2 rounded-2xl border border-violet-200/70 bg-white px-3 py-2 shadow-sm transition hover:shadow-md dark:border-violet-800/40 dark:bg-zinc-900"
          title="Avatar seç"
        >
          <div className="h-10 w-10 overflow-hidden rounded-full bg-violet-100 dark:bg-violet-900">
            {user.avatar_key ? (
              <Image
                src={kidsAvatarUrl(user.avatar_key) ?? ''}
                alt={user.avatar_key}
                width={40}
                height={40}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-xl">🎨</span>
            )}
          </div>
          <div className="text-left">
            <p className="text-sm font-black text-violet-700 dark:text-violet-300">
              {user.first_name || 'Merhaba!'}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {user.avatar_key ? 'Avatarını değiştir' : 'Avatar seç →'}
            </p>
          </div>
        </button>
      </div>
      {dailyQuests ? (
        <div className="mx-auto max-w-2xl px-3 pt-4 sm:px-4">
          <div className="rounded-3xl border border-violet-200/70 bg-white px-4 py-3 shadow-sm dark:border-violet-800/40 dark:bg-zinc-900">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-black text-violet-700 dark:text-violet-300">{t('dailyQuests.title')}</p>
              <span className="flex items-center gap-1 text-sm font-black text-orange-500">
                🔥 {dailyQuests.streak}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {dailyQuests.quests.map((q) => (
                <span
                  key={q.type}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition ${
                    q.done
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}
                >
                  {q.done ? '✅' : '⬜'} {questLabel[q.type] ?? q.type}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      <KidsStudentDashboardPlayful
        pathPrefix={pathPrefix}
        user={user}
        classes={classes}
        assignments={assignments}
        certificates={certificates}
        roadmap={roadmap}
        loading={loading}
      />
    </>
  );
}
