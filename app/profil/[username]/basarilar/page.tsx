'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api, { type AchievementItem } from '@/src/lib/api';

function ProgressRing({ percent, size = 56, stroke = 4, unlocked }: { percent: number; size?: number; stroke?: number; unlocked?: boolean }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  const color = unlocked ? '#f97316' : '#e5e7eb';
  return (
    <svg width={size} height={size} className="rotate-[-90deg]" aria-hidden>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        className="text-gray-200 dark:text-gray-700"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-500"
      />
    </svg>
  );
}

export default function AchievementsPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);

  const { data: categories, isLoading, error } = useQuery({
    queryKey: ['achievements', username],
    queryFn: () => api.getAchievementsByUsername(username).then((r) => r.data),
    enabled: !!username,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-4xl min-w-0 overflow-x-hidden">
          <div className="animate-pulse space-y-6">
            <div className="h-32 rounded-2xl bg-gray-200 dark:bg-gray-800" />
            <div className="h-64 rounded-2xl bg-gray-200 dark:bg-gray-800" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !categories) {
    return (
      <div className="min-h-screen">
        <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-4xl min-w-0 overflow-x-hidden">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-center shadow-sm">
            <p className="text-gray-500 dark:text-gray-400">Başarılar yüklenemedi</p>
            <Link href={`/profil/${username}`} className="mt-4 inline-block text-brand hover:text-brand-hover font-medium">
              Profile dön
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const totalUnlocked = categories.reduce((s, c) => s + c.unlocked_count, 0);
  const totalCount = categories.reduce((s, c) => s + c.total_count, 0);
  const globalPct = totalCount > 0 ? Math.round((totalUnlocked / totalCount) * 100) : 0;

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-4xl min-w-0 overflow-x-hidden">
        <Link
          href={`/profil/${username}`}
          className="inline-flex items-center gap-1 text-sm text-brand hover:underline font-medium"
        >
          ← @{username} profiline dön
        </Link>

        {/* Hero: Challenge özeti */}
        <div className="mt-6 rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="flex items-center justify-center sm:justify-start">
              <div className="relative">
                <ProgressRing percent={globalPct} size={100} stroke={8} unlocked={totalUnlocked > 0} />
                <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-gray-900 dark:text-white">
                  {totalUnlocked}
                </span>
              </div>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                Başarılar
              </h1>
              <p className="mt-1 text-gray-600 dark:text-gray-400">
                <span className="font-semibold text-brand">{totalUnlocked}</span>
                {' / '}
                <span>{totalCount}</span> başarı tamamlandı
              </p>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
                Soru sor, cevap yaz, serini koru — yeni rozetler aç!
              </p>
            </div>
          </div>
        </div>

        {/* Kategoriler: Challenge setleri */}
        <div className="mt-8 space-y-6">
          {categories.map((category) => {
            const catPct = category.total_count > 0
              ? Math.round((category.unlocked_count / category.total_count) * 100)
              : 0;
            return (
              <section
                key={category.id}
                className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-sm"
              >
                <div className="px-4 sm:px-6 py-4 bg-gray-50/80 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      {category.name}
                    </h2>
                    {category.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 max-w-2xl">
                        {category.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-brand-pink dark:bg-brand/15 px-3 py-1 text-sm font-medium text-brand-hover">
                      {category.unlocked_count} / {category.total_count}
                    </span>
                    <div className="h-2 w-16 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-brand dark:bg-brand transition-all"
                        style={{ width: `${catPct}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {category.achievements.map((a: AchievementItem) => {
                      const hasProgress = typeof a.current_progress === 'number' && typeof a.target_progress === 'number' && (a.target_progress ?? 0) > 0;
                      const progressPct = hasProgress
                        ? Math.min(100, ((a.current_progress ?? 0) / (a.target_progress ?? 1)) * 100)
                        : (a.unlocked ? 100 : 0);
                      const suffix = a.code?.startsWith('streak_') ? ' gün' : '';
                      return (
                        <div
                          key={a.id}
                          className={`rounded-xl border-2 p-4 flex flex-col items-center text-center transition-all ${
                            a.unlocked
                              ? 'border-amber-300/60 dark:border-amber-500/50 bg-amber-50/50 dark:bg-amber-900/20'
                              : 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                          title={a.description || a.name}
                        >
                          <div className="relative flex items-center justify-center">
                            <ProgressRing
                              percent={progressPct}
                              size={56}
                              stroke={4}
                              unlocked={a.unlocked}
                            />
                            <span className="absolute inset-0 flex items-center justify-center text-2xl">
                              {a.icon || '🏆'}
                            </span>
                          </div>
                          <span
                            className={`mt-3 text-sm font-semibold px-0.5 break-words ${
                              a.unlocked
                                ? 'text-gray-900 dark:text-white'
                                : 'text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            {a.name}
                          </span>
                          {a.unlocked && a.unlocked_at && (
                            <span className="text-xs text-amber-700 dark:text-amber-400 mt-1 font-medium">
                              {new Date(a.unlocked_at).toLocaleDateString('tr-TR')} tarihinde açıldı
                            </span>
                          )}
                          {!a.unlocked && hasProgress && (
                            <div className="mt-2 w-full">
                              <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-brand dark:bg-brand transition-all"
                                  style={{ width: `${progressPct}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 block">
                                {a.current_progress} / {a.target_progress}{suffix}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}
