'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/src/lib/api';

const DEFAULT_ABOUT_SUMMARY =
  'Marifetli, ilgi alanlarının buluşma noktası. Örgü, dikiş, yemek, müzik, sanat, hobiler ve daha fazlası. Soru sor, paylaş.';

/**
 * Anasayfa sidebar: Hakkımızda (site ayarlarından) + canlı site istatistikleri.
 */
export function SiteStatsSidebar() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['site-stats'],
    queryFn: () => api.getSiteStats(),
    staleTime: 5 * 60 * 1000,
  });
  const { data: settings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const { data } = await api.getSiteSettings();
      return data;
    },
  });

  const questionCount = stats?.question_count ?? 0;
  const answerCount = stats?.answer_count ?? 0;
  const userCount = stats?.user_count ?? 0;
  const aboutSummary = (settings?.about_summary ?? '').trim() || DEFAULT_ABOUT_SUMMARY;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
      <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3">Hakkımızda</h3>
      <p className="text-sm text-gray-700 dark:text-gray-300">
        {aboutSummary}
      </p>
      <Link
        href="/hakkimizda"
        className="mt-2 inline-block text-sm font-medium text-brand hover:underline"
      >
        Devamını oku →
      </Link>
      <div className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Toplam Soru</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {statsLoading ? '…' : questionCount.toLocaleString('tr-TR')}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Toplam Cevap</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {statsLoading ? '…' : answerCount.toLocaleString('tr-TR')}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Aktif Kullanıcı</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {statsLoading ? '…' : userCount.toLocaleString('tr-TR')}
          </span>
        </div>
      </div>
    </div>
  );
}
