'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { KidsStudentProjectsPanel } from '@/src/components/kids/kids-student-projects-panel';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import { kidsStudentDashboard, type KidsAssignment } from '@/src/lib/kids-api';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';
import { useKidsI18n } from '@/src/providers/kids-language-provider';

export default function KidsStudentProjectsPage() {
  const router = useRouter();
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();
  const { t } = useKidsI18n();
  const [assignments, setAssignments] = useState<KidsAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await kidsStudentDashboard();
      setAssignments(data.assignments);
    } catch {
      toast.error(t('projects.loadError'));
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

  if (authLoading || !user) {
    return <p className="text-center text-gray-600 dark:text-gray-400">{t('common.loading')}</p>;
  }
  if (user.role !== 'student') {
    return <p className="text-center text-gray-600">{t('common.redirecting')}</p>;
  }

  return (
    <KidsStudentProjectsPanel
      pathPrefix={pathPrefix}
      assignments={assignments}
      loading={loading}
      showBackToPanel
    />
  );
}
