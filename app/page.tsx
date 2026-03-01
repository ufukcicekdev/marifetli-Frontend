'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { PostFeedControls, type SortOption, type ViewMode } from '@/src/components/post-feed-controls';
import { PostItem } from '@/src/components/post-item';

const MOCK_POSTS = [
  { id: 1, title: "Bebek yeleği örmek için hangi ip kalınlığını kullanmalıyım?", category: 'örgü', author: 'ayse_', timeAgo: '2 saat önce', comments: 12, votes: 24, views: 1200 },
  { id: 2, title: "Amigurumi oyuncak yapımında hangi tığ numarası uygun?", category: 'el sanatları', author: 'zehrak', timeAgo: '3 saat önce', comments: 8, votes: 18, views: 980 },
  { id: 3, title: "Dantel masa örtüsü deseni önerebilir misiniz?", category: 'dantel', author: 'fatma_h', timeAgo: '5 saat önce', comments: 15, votes: 32, views: 2100 },
  { id: 4, title: "Keçeden çanta yaparken hangi yapıştırıcıyı kullanmalıyım?", category: 'keçe', author: 'elifm', timeAgo: '1 gün önce', comments: 22, votes: 45, views: 3400 },
  { id: 5, title: "Makrome duvar süsü yapımında ip uzunluğu nasıl hesaplanır?", category: 'makrome', author: 'zeynep_k', timeAgo: '1 gün önce', comments: 9, votes: 21, views: 1560 },
];

export default function HomePage() {
  const [sort, setSort] = useState<SortOption>('hot');
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return 'compact';
    return (localStorage.getItem('feedViewMode') as ViewMode) || 'compact';
  });

  useEffect(() => {
    localStorage.setItem('feedViewMode', viewMode);
  }, [viewMode]);

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 flex flex-col lg:flex-row gap-4 sm:gap-6 min-w-0">
      <div className="flex-1 min-w-0 overflow-hidden">
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
            <PostFeedControls
              sort={sort}
              onSortChange={setSort}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              totalCount={12458}
            />

            <div>
              {MOCK_POSTS.map((p) => (
                <PostItem
                  key={p.id}
                  id={p.id}
                  title={p.title}
                  category={p.category}
                  author={p.author}
                  timeAgo={p.timeAgo}
                  commentCount={p.comments}
                  voteCount={p.votes}
                  viewCount={p.views}
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
