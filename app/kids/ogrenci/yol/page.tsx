'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import {
  kidsGetBadgeRoadmap,
  type KidsBadgeRoadmap,
  type KidsRoadmapMilestone,
} from '@/src/lib/kids-api';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';
import { useKidsI18n } from '@/src/providers/kids-language-provider';

function milestoneEmoji(icon: string): string {
  const m: Record<string, string> = {
    seed: '🌱',
    sprout: '🌿',
    tree: '🌳',
    star_tree: '✨',
  };
  return m[icon] ?? '⭐';
}

function MilestoneNode({ m, t, language }: { m: KidsRoadmapMilestone; t: (key: string) => string; language: 'tr' | 'en' | 'ge' }) {
  const locked = !m.unlocked;
  return (
    <li className="relative pl-2">
      <span
        className={`absolute -left-1 top-0 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-2xl border-2 text-xl shadow ${
          locked
            ? 'border-gray-200 bg-gray-100 dark:border-gray-600 dark:bg-gray-800'
            : 'border-amber-400 bg-gradient-to-br from-amber-50 to-emerald-50 dark:border-amber-500 dark:from-amber-950/90 dark:to-emerald-950/70'
        }`}
      >
        {milestoneEmoji(m.icon)}
      </span>
      <div className={`ml-8 pb-8 ${locked ? 'opacity-75' : ''}`}>
        <p className="font-semibold text-slate-900 dark:text-white">{m.title}</p>
        <p className="mt-0.5 text-sm text-slate-600 dark:text-gray-400">{m.subtitle}</p>
        {m.unlocked && m.earned_at ? (
          <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
            {new Date(m.earned_at).toLocaleString(language === 'tr' ? 'tr-TR' : language === 'ge' ? 'de-DE' : 'en-US', {
              dateStyle: 'medium',
            })}
          </p>
        ) : (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">{t('roadmap.locked')}</p>
        )}
      </div>
    </li>
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

  if (authLoading || !user || user.role !== 'student') {
    return <p className="text-center text-gray-600">{t('common.loading')}</p>;
  }

  const milestones = data?.milestones ?? [];

  return (
    <div className="mx-auto max-w-lg space-y-8 px-2">
      <div>
        <Link href={`${pathPrefix}/ogrenci/panel`} className="text-sm text-brand hover:underline">
          {t('roadmap.backToStudent')}
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">{t('roadmap.title')}</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-gray-400">
          {t('roadmap.subtitle')}
        </p>
        {data ? (
          <p className="mt-2 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
            {t('roadmap.growthPoints')}: {data.growth_points}
          </p>
        ) : null}
      </div>

      {loading ? (
        <p className="text-gray-500">{t('common.loading')}</p>
      ) : data ? (
        <>
          <section className="rounded-2xl border border-amber-200/80 bg-gradient-to-b from-amber-50/90 to-white p-6 dark:border-amber-900/50 dark:from-amber-950/40 dark:to-gray-900/80">
            <h2 className="text-sm font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">
              {t('roadmap.yourRoadmap')}
            </h2>
            <ul className="relative mt-8 ml-4 border-l-4 border-amber-200 dark:border-amber-800">
              {milestones.map((m) => (
                <MilestoneNode key={m.key} m={m} t={t} language={language} />
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-violet-200 bg-violet-50/80 p-6 dark:border-violet-900 dark:bg-violet-950/35">
            <h2 className="text-sm font-bold uppercase tracking-wide text-violet-800 dark:text-violet-200">
              {t('roadmap.challengeStars')}
            </h2>
            <p className="mt-1 text-xs text-violet-900/80 dark:text-violet-200/80">
              {t('roadmap.challengeStarsHint').replace('{limit}', String(data.teacher_pick_limit))}
            </p>
            {data.teacher_picks.length === 0 ? (
              <p className="mt-4 text-sm text-violet-900/70 dark:text-violet-200/70">
                {t('roadmap.noStars')}
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {data.teacher_picks.map((p) => (
                  <li
                    key={p.key}
                    className="flex items-start gap-3 rounded-xl border border-violet-200/60 bg-white/90 px-3 py-2.5 dark:border-violet-800 dark:bg-gray-900/60"
                  >
                    <span className="text-xl" aria-hidden>
                      ⭐
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 dark:text-white">{p.label}</p>
                      <p className="text-xs text-slate-500 dark:text-gray-400">
                        {new Date(p.earned_at).toLocaleString(language === 'tr' ? 'tr-TR' : language === 'ge' ? 'de-DE' : 'en-US', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
