'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { PostFeedControls, type SortOption, type ViewMode } from '@/src/components/post-feed-controls';
import { PostItem } from '@/src/components/post-item';
import { useQuestions } from '@/src/hooks/use-questions';
import { formatTimeAgo } from '@/src/lib/format-time';
import { RecentActivitySidebar } from '@/src/components/recent-activity-sidebar';
import { PopularQuestionsSidebar } from '@/src/components/popular-questions-sidebar';
import { SiteStatsSidebar } from '@/src/components/site-stats-sidebar';
import { QuestionsPagination } from '@/src/components/questions-pagination';
import { postItemAuthorFields } from '@/src/lib/post-item-author';
import {
  CategoryDropdown,
  buildCategoriesTree,
  findCategoryName,
  findCategoryTopicSlug,
} from '@/src/components/category-dropdown';
import api from '@/src/lib/api';

const SORT_TO_ORDER: Record<SortOption, string> = {
  hot: '-hot_score',
  new: '-created_at',
  top: '-like_count',
  best: '-hot_score',
};

/** Arama + topluluk + kategori query’sini tek yerden üretir (sayfa sıfırlanır). */
function buildSorularHref(parts: { q: string; community: string | null; category: string }) {
  const params = new URLSearchParams();
  if (parts.q.trim()) params.set('q', parts.q.trim());
  if (parts.community) params.set('community', parts.community);
  if (parts.category) params.set('category', parts.category);
  const s = params.toString();
  return s ? `/sorular?${s}` : '/sorular';
}

function QuestionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qFromUrl = searchParams.get('q') ?? '';
  const communitySlug = searchParams.get('community') ?? null;
  const categoryFromUrl = searchParams.get('category') ?? '';

  const [sort, setSort] = useState<SortOption>('new');
  const [viewMode, setViewMode] = useState<ViewMode>('compact');
  const [searchInput, setSearchInput] = useState(qFromUrl);

  const { data: categoriesRaw } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories().then((r) => r.data),
  });
  const categoriesTree = useMemo(() => buildCategoriesTree(categoriesRaw), [categoriesRaw]);

  const selectedCategoryId = useMemo(() => {
    if (!categoryFromUrl || !/^\d+$/.test(categoryFromUrl)) return null;
    const n = parseInt(categoryFromUrl, 10);
    return Number.isFinite(n) ? n : null;
  }, [categoryFromUrl]);

  const categoryTopicSlug = useMemo(
    () => findCategoryTopicSlug(categoriesTree, selectedCategoryId),
    [categoriesTree, selectedCategoryId]
  );

  const categoryScopeLabel = useMemo((): { text: string; href: string | null } | null => {
    if (selectedCategoryId == null) return null;
    if (categoryTopicSlug) return { text: `t/${categoryTopicSlug}`, href: `/t/${categoryTopicSlug}` };
    const name = findCategoryName(categoriesTree, selectedCategoryId);
    return { text: name ?? `Kategori #${selectedCategoryId}`, href: null };
  }, [categoriesTree, selectedCategoryId, categoryTopicSlug]);

  useEffect(() => {
    setSearchInput(qFromUrl);
  }, [qFromUrl]);

  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const params = useMemo(() => {
    const p: Record<string, string | number> = { ordering: SORT_TO_ORDER[sort], page };
    if (qFromUrl.trim()) p.search = qFromUrl.trim();
    if (communitySlug) p.community = communitySlug;
    if (categoryFromUrl) p.category = categoryFromUrl;
    return p;
  }, [sort, qFromUrl, communitySlug, categoryFromUrl, page]);
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
  if (categoryFromUrl) paginationQueryParams.category = categoryFromUrl;

  const go = (next: { q?: string; community?: string | null; category?: string }) =>
    router.push(
      buildSorularHref({
        q: next.q ?? qFromUrl,
        community: next.community !== undefined ? next.community : communitySlug,
        category: next.category !== undefined ? next.category : categoryFromUrl,
      })
    );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    go({ q: searchInput.trim() });
  };

  const clearSearch = () => {
    setSearchInput('');
    go({ q: '' });
  };

  const handleCategoryChange = (id: number | null) => {
    go({ category: id != null ? String(id) : '' });
  };

  const clearCommunityScope = () => {
    go({ community: null });
  };

  const clearCategoryScope = () => {
    go({ category: '' });
  };

  const scopePillClass =
    'flex items-center gap-1 shrink-0 py-1.5 pl-2.5 pr-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium border border-gray-200 dark:border-gray-600';

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 flex flex-col lg:flex-row lg:items-start gap-4 sm:gap-6 min-w-0 min-h-[calc(100vh-104px)]">
      <div className="flex-1 min-w-0 overflow-x-hidden overflow-y-visible">
        <header className="mb-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2 gap-y-1">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Sorular</h1>
            <Link href="/" className="text-sm font-medium text-brand hover:text-brand-hover">
              ← Ana sayfa
            </Link>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Gönderi akışı, sıralama ve arama burada.
          </p>
        </header>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-visible">
          <form onSubmit={handleSearchSubmit} className="relative z-20 p-3 border-b border-gray-200 dark:border-gray-800 space-y-3 overflow-visible">
            {/* Üst arama çubuğundaki gibi kapsam (scope) rozetleri */}
            {(communitySlug || categoryScopeLabel) && (
              <div className="flex flex-wrap items-center gap-2" aria-label="Liste kapsamı">
                {communitySlug && (
                  <div className={scopePillClass}>
                    <span>r/{communitySlug}</span>
                    <button
                      type="button"
                      onClick={clearCommunityScope}
                      className="flex items-center justify-center w-6 h-6 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                      title="Topluluk filtresini kaldır"
                      aria-label="Topluluk filtresini kaldır"
                    >
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
                {categoryScopeLabel && (
                  <div className={scopePillClass}>
                    {categoryScopeLabel.href ? (
                      <Link
                        href={categoryScopeLabel.href}
                        className="hover:text-brand dark:hover:text-brand transition-colors"
                      >
                        {categoryScopeLabel.text}
                      </Link>
                    ) : (
                      <span>{categoryScopeLabel.text}</span>
                    )}
                    <button
                      type="button"
                      onClick={clearCategoryScope}
                      className="flex items-center justify-center w-6 h-6 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                      title="Kategori filtresini kaldır"
                      aria-label="Kategori filtresini kaldır"
                    >
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="relative flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 focus-within:ring-1 focus-within:ring-brand">
              <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 ml-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={
                  communitySlug || categoryScopeLabel
                    ? `${communitySlug ? `r/${communitySlug}` : ''}${communitySlug && categoryScopeLabel ? ' · ' : ''}${categoryScopeLabel ? categoryScopeLabel.text : ''} içinde ara...`
                    : 'Soru veya içerik ara...'
                }
                className="flex-1 bg-transparent px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 outline-none min-w-0"
              />
              {searchInput && (
                <button type="button" onClick={clearSearch} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" aria-label="Temizle">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Kategori</label>
              <CategoryDropdown
                categoriesTree={categoriesTree}
                value={selectedCategoryId}
                onChange={handleCategoryChange}
                placeholder="Tüm kategoriler"
                allowClear
                clearLabel="Tüm kategoriler"
              />
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
            {!isLoading && !error && questions.map((q, index) => (
              <PostItem
                key={q.id}
                id={q.id}
                slug={q.slug}
                title={q.title}
                content={(q as { content?: string }).content}
                category={q.tags?.[0]?.name}
                {...postItemAuthorFields(q.author)}
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
