'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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

function HomePageContent() {
  const searchParams = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const [sort, setSort] = useState<SortOption>('new');
  const [viewMode, setViewMode] = useState<ViewMode>('compact');
  const params = useMemo(() => ({ ordering: SORT_TO_ORDER[sort], page }), [sort, page]);
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
      : 0;

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 flex flex-col lg:flex-row lg:items-start gap-4 sm:gap-6 min-w-0 min-h-[calc(100vh-104px)]">
      <div className="flex-1 min-w-0 overflow-hidden">
          <HomeHero />
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
              {!isLoading && questions.map((q, index) => (
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
                  communitySlug={(q as { community_slug?: string })?.community_slug}
                  communityName={(q as { community_name?: string })?.community_name}
                  priorityImage={index < 4}
                />
              ))}
            </div>
            <QuestionsPagination
              currentPage={page}
              totalCount={totalCount}
              basePath="/"
              queryParams={{}}
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

export default function HomePage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8 text-center text-gray-500 dark:text-gray-400">Yükleniyor...</div>}>
      <HomePageContent />
    </Suspense>
  );
}
