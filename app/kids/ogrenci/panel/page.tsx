'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { KidsStudentDashboardPlayful } from '@/src/components/kids/kids-student-dashboard-playful';
import {
  detectNewPraiseTitles,
  detectNewTeacherPicks,
} from '@/src/components/kids/kids-student-panel-celebrations';
import { KidsStudentStarOverlay } from '@/src/components/kids/kids-student-star-overlay';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import {
  type KidsAchievementCertificate,
  kidsGetBadgeRoadmap,
  kidsStudentDashboard,
  type KidsAssignment,
  type KidsBadgeRoadmap,
  type KidsClass,
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

  return (
    <>
      <KidsStudentStarOverlay
        open={pickLabels !== null && pickLabels.length > 0}
        labels={pickLabels ?? []}
        onClose={() => setPickLabels(null)}
      />
      <KidsStudentDashboardPlayful
        pathPrefix={pathPrefix}
        user={user}
        classes={classes}
        certificates={certificates}
        roadmap={roadmap}
        loading={loading}
      />
    </>
  );
}
