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
  kidsGetBadgeRoadmap,
  kidsStudentDashboard,
  type KidsAssignment,
  type KidsBadgeRoadmap,
  type KidsClass,
} from '@/src/lib/kids-api';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';

export default function KidsStudentPanelPage() {
  const router = useRouter();
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();
  const [classes, setClasses] = useState<KidsClass[]>([]);
  const [assignments, setAssignments] = useState<KidsAssignment[]>([]);
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
      setRoadmap(road);
    } catch {
      toast.error('Panel yüklenemedi');
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
  }, [authLoading, user?.id, user?.role, router, pathPrefix, load]);

  useEffect(() => {
    if (!roadmap) return;
    const ev = detectNewTeacherPicks(roadmap);
    if (ev && ev.labels.length) setPickLabels(ev.labels);
  }, [roadmap]);

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
              Öğretmeninden süper haber!
            </p>
            <p className="mt-1 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
              {titles.length === 1
                ? `“${titles[0]}” için çok güzel demiş.`
                : `${titles.length} projende harika geri bildirim var.`}
            </p>
          </div>
        </div>
      ),
      { duration: 6500, position: 'top-center' },
    );
  }, [loading, assignments]);

  if (authLoading || !user) {
    return <p className="text-center text-gray-600 dark:text-gray-400">Yükleniyor…</p>;
  }
  if (user.role !== 'student') {
    return <p className="text-center text-gray-600">Yönlendiriliyorsun…</p>;
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
        assignments={assignments}
        roadmap={roadmap}
        loading={loading}
      />
    </>
  );
}
