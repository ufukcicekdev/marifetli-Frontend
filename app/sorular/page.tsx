'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { PostFeedControls, type SortOption, type ViewMode } from '@/src/components/post-feed-controls';
import { PostItem } from '@/src/components/post-item';

const MOCK_POSTS = [
  { id: 1, title: "Bebek yeleği örmek için hangi ip kalınlığını kullanmalıyım?", category: 'örgü', author: 'ayse_', timeAgo: '1 saat önce', comments: 3, votes: 21, views: 120 },
  { id: 2, title: "Amigurumi oyuncak yapımında hangi tığ numarası uygun?", category: 'el sanatları', author: 'zehrak', timeAgo: '2 saat önce', comments: 6, votes: 22, views: 240 },
  { id: 3, title: "Dantel masa örtüsü deseni önerebilir misiniz?", category: 'dantel', author: 'fatma_h', timeAgo: '3 saat önce', comments: 9, votes: 23, views: 360 },
  { id: 4, title: "Keçeden çanta yaparken hangi yapıştırıcıyı kullanmalıyım?", category: 'keçe', author: 'elifm', timeAgo: '4 saat önce', comments: 12, votes: 24, views: 480 },
  { id: 5, title: "Makrome duvar süsü yapımında ip uzunluğu nasıl hesaplanır?", category: 'makrome', author: 'zeynep_k', timeAgo: '5 saat önce', comments: 15, votes: 25, views: 600 },
  { id: 6, title: "Pul boncuk işi bileklik yapımına başlamak için ne gerekir?", category: 'takı tasarımı', author: 'seda_n', timeAgo: '6 saat önce', comments: 18, votes: 26, views: 720 },
  { id: 7, title: "Kanaviçe işleme başlangıç seti önerir misiniz?", category: 'nakış', author: 'melek_y', timeAgo: '7 saat önce', comments: 21, votes: 27, views: 840 },
  { id: 8, title: "Tığ işi battaniye için hangi motif güzel durur?", category: 'tığ işi', author: 'derya_k', timeAgo: '8 saat önce', comments: 24, votes: 28, views: 960 },
  { id: 9, title: "Ev dekorasyonu için makrome bitki askısı nasıl yapılır?", category: 'dekorasyon', author: 'cansu_a', timeAgo: '9 saat önce', comments: 27, votes: 29, views: 1080 },
  { id: 10, title: "Örgü haraşo ve düz örgü arasındaki fark nedir?", category: 'örgü', author: 'buse_t', timeAgo: '10 saat önce', comments: 30, votes: 30, views: 1200 },
];

export default function QuestionsPage() {
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
              totalCount={2847}
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

          <div className="mt-4 flex justify-center">
            <nav className="flex items-center space-x-1">
              <button className="px-3 py-1 rounded text-sm text-gray-500 hover:bg-gray-200">Önceki</button>
              <button className="px-3 py-1 rounded bg-orange-500 text-white text-sm">1</button>
              <button className="px-3 py-1 rounded text-sm text-gray-500 hover:bg-gray-200">2</button>
              <button className="px-3 py-1 rounded text-sm text-gray-500 hover:bg-gray-200">3</button>
              <span className="px-2 text-gray-400">...</span>
              <button className="px-3 py-1 rounded text-sm text-gray-500 hover:bg-gray-200">10</button>
              <button className="px-3 py-1 rounded text-sm text-gray-500 hover:bg-gray-200">Sonraki</button>
            </nav>
          </div>
      </div>

      <div className="w-80 flex-shrink-0 hidden lg:block">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3">İstatistikler</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Bugünkü Sorular</span><span className="font-medium">128</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Bugünkü Cevaplar</span><span className="font-medium">847</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Aktif Kullanıcı</span><span className="font-medium">1,234</span></div>
            </div>
          </div>
      </div>
    </div>
  );
}
