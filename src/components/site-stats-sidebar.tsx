'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/src/lib/api';

/**
 * Anasayfa sidebar: Hakkımızda + canlı site istatistikleri (soru, cevap, kullanıcı).
 */
export function SiteStatsSidebar() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['site-stats'],
    queryFn: () => api.getSiteStats(),
    staleTime: 5 * 60 * 1000,
  });

  const questionCount = stats?.question_count ?? 0;
  const answerCount = stats?.answer_count ?? 0;
  const userCount = stats?.user_count ?? 0;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
      <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3">Hakkımızda</h3>
      <p className="text-sm text-gray-700 dark:text-gray-300">
        Marifetli, el işi ve el sanatları tutkunlarının buluşma noktası. Örgü, dikiş, nakış, takı tasarımı ve daha fazlası hakkında sorular sor, deneyimlerini paylaş.
      </p>
      <div className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Toplam Soru</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {isLoading ? '…' : questionCount.toLocaleString('tr-TR')}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Toplam Cevap</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {isLoading ? '…' : answerCount.toLocaleString('tr-TR')}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Aktif Kullanıcı</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {isLoading ? '…' : userCount.toLocaleString('tr-TR')}
          </span>
        </div>
      </div>
    </div>
  );
}
