'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PostFeedControls, type SortOption, type ViewMode } from '@/src/components/post-feed-controls';
import { PostItem } from '@/src/components/post-item';
import { useQuestions } from '@/src/hooks/use-questions';
import { formatTimeAgo } from '@/src/lib/format-time';
import { HomeHero } from '@/src/components/home-hero';
import { RecentActivitySidebar } from '@/src/components/recent-activity-sidebar';
import { PopularQuestionsSidebar } from '@/src/components/popular-questions-sidebar';
import { SiteStatsSidebar } from '@/src/components/site-stats-sidebar';
import { QuestionsPagination } from '@/src/components/questions-pagination';

const SORT_TO_ORDER: Record<SortOption, string> = {
  hot: '-hot_score',
  new: '-created_at',
  top: '-like_count',
  best: '-hot_score',
};

function QuestionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qFromUrl = searchParams.get('q') ?? '';
  const communitySlug = searchParams.get('community') ?? null;
  // Liste açıldığında en son gelenler yukarıda olsun
  const [sort, setSort] = useState<SortOption>('new');
  const [viewMode, setViewMode] = useState<ViewMode>('compact');
  const [searchInput, setSearchInput] = useState(qFromUrl);

  useEffect(() => {
    setSearchInput(qFromUrl);
  }, [qFromUrl]);

  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const params = useMemo(() => {
    const p: Record<string, string | number> = { ordering: SORT_TO_ORDER[sort], page };
    if (qFromUrl.trim()) p.search = qFromUrl.trim();
    if (communitySlug) p.community = communitySlug;
    return p;
  }, [sort, qFromUrl, communitySlug, page]);
  const { data, isLoading, error } = useQuestions(params);

  useEffect(() => {
    const stored = localStorage.getItem('feedViewMode') as ViewMode | null;
    if (stored === 'card' || stored === 'compact') setViewMode(stored);
  }, []);
  useEffect(() => {
    localStorage.setItem('feedViewMode', viewMode);
  }, [viewMode]);

  const questions = data?.results ?? [];
  const totalCount = typeof data?.count === 'number' ? data.count : 0;
  const paginationQueryParams: Record<string, string> = {};
  if (qFromUrl.trim()) paginationQueryParams.q = qFromUrl.trim();
  if (communitySlug) paginationQueryParams.community = communitySlug;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = searchInput.trim();
    const params = new URLSearchParams();
    if (val) params.set('q', val);
    if (communitySlug) params.set('community', communitySlug);
    const query = params.toString();
    router.push(query ? `/sorular?${query}` : '/sorular');
  };

  const clearSearch = () => {
    setSearchInput('');
    router.push(communitySlug ? `/sorular?community=${encodeURIComponent(communitySlug)}` : '/sorular');
  };

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 flex flex-col lg:flex-row lg:items-start gap-4 sm:gap-6 min-w-0 min-h-[calc(100vh-104px)]">
      <div className="flex-1 min-w-0 overflow-hidden">
          <HomeHero />
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
            {communitySlug && (
              <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2 flex-wrap">
                <span className="text-sm text-gray-600 dark:text-gray-400">r/{communitySlug} topluluğundaki gönderilerde arama</span>
                <Link href="/sorular" className="text-sm text-orange-500 hover:text-orange-600">Tümüne dön</Link>
              </div>
            )}
            {/* Sayfa içi arama (navbar artık sadece "Ara" linki; arama burada) */}
            <form onSubmit={handleSearchSubmit} className="p-3 border-b border-gray-200 dark:border-gray-800">
              <div className="relative flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 focus-within:ring-1 focus-within:ring-orange-500">
                <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 ml-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Soru veya içerik ara..."
                  className="flex-1 bg-transparent px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 outline-none min-w-0"
                />
                {searchInput && (
                  <button type="button" onClick={clearSearch} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" aria-label="Temizle">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            </form>
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
              {!isLoading && questions.map((q, index) => (
                <PostItem
                  key={q.id}
                  id={q.id}
                  slug={q.slug}
                  title={q.title}
                  content={(q as { content?: string }).content}
                  category={q.tags?.[0]?.name}
                  author={typeof q.author === 'object' ? q.author?.username ?? '' : ''}
                  authorAvatar={typeof q.author === 'object' ? (q.author as { profile_picture?: string })?.profile_picture : undefined}
                  timeAgo={formatTimeAgo(q.created_at)}
                  commentCount={q.answer_count ?? 0}
                  voteCount={q.like_count ?? 0}
                  viewCount={q.view_count ?? 0}
                  viewMode={viewMode}
                  communitySlug={(q as { community_slug?: string })?.community_slug}
                  communityName={(q as { community_name?: string })?.community_name}
                  priorityImage={index < 4}
                />
              ))}
            </div>
            <QuestionsPagination
              currentPage={page}
              totalCount={totalCount}
              basePath="/sorular"
              queryParams={paginationQueryParams}
            />
          </div>
      </div>

      <div className="w-80 shrink-0 hidden lg:block self-start pb-6">
        <RecentActivitySidebar />
        <SiteStatsSidebar />
        <PopularQuestionsSidebar />
      </div>
    </div>
  );
}

export default function QuestionsPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8 text-center text-gray-500 dark:text-gray-400">Yükleniyor...</div>}>
      <QuestionsContent />
    </Suspense>
  );
}
