'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '@/src/lib/api';

export default function AchievementsPage() {
  const params = useParams();
  const username = params?.username as string;

  const { data: categories, isLoading, error } = useQuery({
    queryKey: ['achievements', username],
    queryFn: () => api.getAchievementsByUsername(username).then((r) => r.data),
    enabled: !!username,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-4xl min-w-0 overflow-x-hidden">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !categories) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-4xl min-w-0 overflow-x-hidden">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">Başarılar yüklenemedi</p>
            <Link href={`/profil/${username}`} className="mt-4 inline-block text-orange-500 hover:text-orange-600">
              Profile dön
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const totalUnlocked = categories.reduce((s, c) => s + c.unlocked_count, 0);
  const totalCount = categories.reduce((s, c) => s + c.total_count, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-4xl min-w-0 overflow-x-hidden">
        <div className="mb-6">
          <Link
            href={`/profil/${username}`}
            className="text-sm text-orange-500 hover:text-orange-600"
          >
            ← @{username} profiline dön
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">
            Başarılar
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {totalUnlocked} / {totalCount} açıldı
          </p>
        </div>

        <div className="space-y-8">
          {categories.map((category) => (
            <section
              key={category.id}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
            >
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                  {category.name}
                </h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {category.unlocked_count} / {category.total_count} açıldı
                </span>
              </div>
              <div className="p-4 sm:p-6">
                <div className="flex flex-wrap gap-4 sm:gap-6">
                  {category.achievements.map((a) => (
                    <div
                      key={a.id}
                      className="flex flex-col items-center text-center group"
                      title={a.unlocked ? `${a.name} - ${a.description}` : a.name}
                    >
                      <div
                        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-2xl sm:text-3xl transition-all ${
                          a.unlocked
                            ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                        }`}
                      >
                        {a.icon || '🏆'}
                      </div>
                      <span
                        className={`mt-2 text-xs sm:text-sm font-medium max-w-[80px] sm:max-w-[100px] truncate block ${
                          a.unlocked
                            ? 'text-gray-900 dark:text-gray-100'
                            : 'text-gray-400 dark:text-gray-500'
                        }`}
                      >
                        {a.name}
                      </span>
                      {a.unlocked && a.unlocked_at && (
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                          {new Date(a.unlocked_at).toLocaleDateString('tr-TR')}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
