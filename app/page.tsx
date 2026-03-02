'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { PostFeedControls, type SortOption, type ViewMode } from '@/src/components/post-feed-controls';
import { PostItem } from '@/src/components/post-item';
import { useQuestions } from '@/src/hooks/use-questions';
import { formatTimeAgo } from '@/src/lib/format-time';

const SORT_TO_ORDER: Record<SortOption, string> = {
  hot: '-hot_score',
  new: '-created_at',
  top: '-like_count',
  best: '-hot_score',
};

export default function HomePage() {
  const [sort, setSort] = useState<SortOption>('hot');
  const [viewMode, setViewMode] = useState<ViewMode>('compact');
  const params = useMemo(() => ({ ordering: SORT_TO_ORDER[sort] }), [sort]);
  const { data, isLoading, error } = useQuestions(params);

  useEffect(() => {
    const stored = localStorage.getItem('feedViewMode') as ViewMode | null;
    if (stored === 'card' || stored === 'compact') setViewMode(stored);
  }, []);
  useEffect(() => {
    localStorage.setItem('feedViewMode', viewMode);
  }, [viewMode]);

  const questions = data?.results ?? [];
  const totalCount =
    typeof (data as { count?: number })?.count === 'number'
      ? (data as { count: number }).count
      : questions.length;

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 flex flex-col lg:flex-row gap-4 sm:gap-6 min-w-0">
      <div className="flex-1 min-w-0 overflow-hidden">
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
            <PostFeedControls
              sort={sort}
              onSortChange={setSort}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              totalCount={totalCount}
            />

            <div>
              {isLoading && (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">Yükleniyor...</div>
              )}
              {error && (
                <div className="p-8 text-center text-amber-600 dark:text-amber-400">Gönderiler yüklenemedi.</div>
              )}
              {!isLoading && !error && questions.length === 0 && (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">Henüz gönderi yok.</div>
              )}
              {!isLoading && questions.map((q) => (
                <PostItem
                  key={q.id}
                  id={q.id}
                  slug={q.slug}
                  title={q.title}
                  content={(q as { content?: string }).content}
                  author={typeof q.author === 'object' ? q.author?.username ?? '' : ''}
                  authorAvatar={typeof q.author === 'object' ? (q.author as { profile_picture?: string })?.profile_picture : undefined}
                  timeAgo={formatTimeAgo(q.created_at)}
                  commentCount={q.answer_count ?? 0}
                  voteCount={q.like_count ?? 0}
                  viewCount={q.view_count ?? 0}
                  viewMode={viewMode}
                />
              ))}
            </div>
          </div>
      </div>

      <div className="w-80 flex-shrink-0 hidden lg:block">
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3">Hakkımızda</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Marifetli, el işi ve el sanatları tutkunlarının buluşma noktası. Örgü, dikiş, nakış, takı tasarımı ve daha fazlası hakkında sorular sor, deneyimlerini paylaş.
            </p>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Toplam Soru</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">12,458</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Toplam Cevap</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">89,234</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Aktif Kullanıcı</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">3,241</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 mt-4">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3">Popüler Bu Hafta</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/soru/123" className="text-gray-700 dark:text-gray-300 hover:text-orange-500 line-clamp-2">Bebek yeleği örmek için hangi ip kalınlığını kullanmalıyım?</Link></li>
              <li><Link href="/soru/124" className="text-gray-700 dark:text-gray-300 hover:text-orange-500 line-clamp-2">Dantel masa örtüsü deseni önerebilir misiniz?</Link></li>
              <li><Link href="/soru/125" className="text-gray-700 dark:text-gray-300 hover:text-orange-500 line-clamp-2">Makrome duvar süsü yapımında ip uzunluğu nasıl hesaplanır?</Link></li>
            </ul>
          </div>
        </div>
    </div>
  );
}
