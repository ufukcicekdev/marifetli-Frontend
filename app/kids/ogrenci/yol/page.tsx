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

function milestoneEmoji(icon: string): string {
  const m: Record<string, string> = {
    seed: '🌱',
    sprout: '🌿',
    tree: '🌳',
    star_tree: '✨',
  };
  return m[icon] ?? '⭐';
}

function MilestoneNode({ m }: { m: KidsRoadmapMilestone }) {
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
            {new Date(m.earned_at).toLocaleString('tr-TR', { dateStyle: 'medium' })}
          </p>
        ) : (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">Kilitli — ilerledikçe açılır</p>
        )}
      </div>
    </li>
  );
}

export default function KidsStudentRoadmapPage() {
  const router = useRouter();
  const { user, loading: authLoading, pathPrefix, refreshUser } = useKidsAuth();
  const [data, setData] = useState<KidsBadgeRoadmap | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await kidsGetBadgeRoadmap();
      setData(d);
      await refreshUser();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [refreshUser]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'student') {
      router.replace(kidsLoginPortalHref(pathPrefix, 'ogrenci'));
      return;
    }
    void load();
  }, [authLoading, user?.id, user?.role, router, pathPrefix, load]);

  if (authLoading || !user || user.role !== 'student') {
    return <p className="text-center text-gray-600">Yükleniyor…</p>;
  }

  const milestones = data?.milestones ?? [];

  return (
    <div className="mx-auto max-w-lg space-y-8 px-2">
      <div>
        <Link href={`${pathPrefix}/ogrenci/panel`} className="text-sm text-brand hover:underline">
          ← Öğrenci paneli
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">Rozet yolu</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-gray-400">
          Her düğüm bir rozet. Puanların düşmez; challenge yıldızları ayrıca birikir.
        </p>
        {data ? (
          <p className="mt-2 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
            Büyüme puanı: {data.growth_points}
          </p>
        ) : null}
      </div>

      {loading ? (
        <p className="text-gray-500">Yükleniyor…</p>
      ) : data ? (
        <>
          <section className="rounded-2xl border border-amber-200/80 bg-gradient-to-b from-amber-50/90 to-white p-6 dark:border-amber-900/50 dark:from-amber-950/40 dark:to-gray-900/80">
            <h2 className="text-sm font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">
              Yol haritan
            </h2>
            <ul className="relative mt-8 ml-4 border-l-4 border-amber-200 dark:border-amber-800">
              {milestones.map((m) => (
                <MilestoneNode key={m.key} m={m} />
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-violet-200 bg-violet-50/80 p-6 dark:border-violet-900 dark:bg-violet-950/35">
            <h2 className="text-sm font-bold uppercase tracking-wide text-violet-800 dark:text-violet-200">
              Challenge yıldızları
            </h2>
            <p className="mt-1 text-xs text-violet-900/80 dark:text-violet-200/80">
              Öğretmenin işaretlediği öne çıkan teslimler. Challenge başına en fazla {data.teacher_pick_limit} yıldız.
            </p>
            {data.teacher_picks.length === 0 ? (
              <p className="mt-4 text-sm text-violet-900/70 dark:text-violet-200/70">
                Henüz yıldız yok — denemeye devam!
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
                        {new Date(p.earned_at).toLocaleString('tr-TR', {
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
