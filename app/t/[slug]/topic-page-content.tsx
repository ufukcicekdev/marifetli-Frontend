'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';
import api from '@/src/lib/api';
import { questionKeys } from '@/src/hooks/use-questions';
import { PostFeedControls, type SortOption, type ViewMode } from '@/src/components/post-feed-controls';
import { PostItem } from '@/src/components/post-item';
import { formatTimeAgo } from '@/src/lib/format-time';
import { RecordCommunityVisit } from '@/src/components/record-community-visit';
import { RecentActivitySidebar } from '@/src/components/recent-activity-sidebar';
import { PopularQuestionsSidebar } from '@/src/components/popular-questions-sidebar';
import { SiteStatsSidebar } from '@/src/components/site-stats-sidebar';

const SORT_TO_ORDER: Record<SortOption, string> = {
  hot: '-hot_score',
  new: '-created_at',
  top: '-like_count',
  best: '-hot_score',
};

/** Sadece özel sayfa slug'ları (backend'de kategori yok). Geri kalanı backend category.name ile gelir. */
const SPECIAL_LABELS: Record<string, string> = {
  populer: 'Popüler',
  tum: 'Tümü',
};

export function TopicPageContent({ slug }: { slug: string }) {
  const isSpecial = slug === 'populer' || slug === 'tum';
  const [sort, setSort] = useState<SortOption>(slug === 'populer' ? 'hot' : 'new');
  const [viewMode, setViewMode] = useState<ViewMode>('compact');


  const { data: category, isLoading: categoryLoading, isError: categoryError } = useQuery({
    queryKey: ['category', slug],
    queryFn: () => api.getCategoryBySlug(slug),
    enabled: !isSpecial,
  });

  const listParams = useMemo(() => {
    const ord = SORT_TO_ORDER[sort];
    if (isSpecial) return { ordering: ord };
    if (category?.id != null) return { category: String(category.id), ordering: ord };
    return null;
  }, [isSpecial, category?.id, sort]);

  const { data, isLoading: questionsLoading, error: questionsError } = useQuery({
    queryKey: questionKeys.list(listParams ?? {}),
    queryFn: () => api.getQuestions(listParams ?? {}).then((r) => r.data),
    enabled: listParams != null,
  });

  useEffect(() => {
    const stored = localStorage.getItem('feedViewMode') as ViewMode | null;
    if (stored === 'card' || stored === 'compact') setViewMode(stored);
  }, []);
  useEffect(() => {
    localStorage.setItem('feedViewMode', viewMode);
  }, [viewMode]);

  const questions = data?.results ?? [];
  const totalCount = typeof data?.count === 'number' ? data.count : questions.length;
  const label = isSpecial ? (SPECIAL_LABELS[slug] ?? slug) : (category?.name ?? slug);
  const showFeed = isSpecial || (category != null && !categoryError);

  return (
    <>
      <RecordCommunityVisit slug={slug} label={label} />
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 flex flex-col lg:flex-row lg:items-start gap-4 sm:gap-6 min-w-0">
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="mb-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Link href="/" className="hover:text-orange-500">Marifetli</Link>
            <span>/</span>
            <Link href="/sorular" className="hover:text-orange-500">Sorular</Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-gray-100 font-medium" suppressHydrationWarning>{label}</span>
          </div>

          {!isSpecial && categoryLoading && (
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-8 text-center text-gray-500 dark:text-gray-400">
              Kategori yükleniyor…
            </div>
          )}
          {!isSpecial && categoryError && (
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-8 text-center">
              <p className="text-gray-700 dark:text-gray-300 mb-4">Bu kategori bulunamadı.</p>
              <Link href="/sorular" className="text-orange-500 hover:text-orange-600 font-medium">
                Tüm sorulara git
              </Link>
            </div>
          )}

          {showFeed && (
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {label} – Sorular
                </h1>
                {!isSpecial && category?.description && (
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {category.description}
                  </p>
                )}
              </div>
              <PostFeedControls
                sort={sort}
                onSortChange={setSort}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                totalCount={totalCount}
              />
              <div>
                {questionsLoading && (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400">Yükleniyor…</div>
                )}
                {questionsError && (
                  <div className="p-8 text-center text-amber-600 dark:text-amber-400">Gönderiler yüklenemedi.</div>
                )}
                {!questionsLoading && !questionsError && questions.length === 0 && (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                    Bu kategoride henüz soru yok.
                  </div>
                )}
                {!questionsLoading &&
                  questions.map((q, index) => (
                    <PostItem
                      key={q.id}
                      id={q.id}
                      slug={q.slug}
                      title={q.title}
                      content={(q as { content?: string }).content}
                      author={typeof q.author === 'object' ? q.author?.username ?? '' : ''}
                      authorAvatar={
                        typeof q.author === 'object'
                          ? (q.author as { profile_picture?: string })?.profile_picture
                          : undefined
                      }
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
            </div>
          )}
        </div>

        <div className="w-80 shrink-0 hidden lg:block self-start sticky top-[52px] max-h-[calc(100vh-52px)] overflow-y-auto">
          <RecentActivitySidebar />
          <SiteStatsSidebar />
          <PopularQuestionsSidebar />
        </div>
      </div>
    </>
  );
}
