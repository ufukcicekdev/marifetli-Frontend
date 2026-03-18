'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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

type CategoryMain = { id: number; name: string; slug: string; subcategories?: { id: number; name: string; slug: string }[] };

/**
 * Alt kategoride breadcrumb "Ana kategori / Alt kategori" (örn. El işleri / Dantel, Dikiş & Moda / Dikiş teknikleri).
 * Slug ağaçta bir alt kategoriye aitse ana + alt bilgisini döner; ana kategori veya bulunamazsa null.
 */
function findParentFromTree(tree: CategoryMain[], childSlug: string): { parentName: string; parentSlug: string; currentName: string } | null {
  for (const main of tree) {
    if (main.slug === childSlug) return null;
    for (const sub of main.subcategories || []) {
      if (sub.slug === childSlug) return { parentName: main.name, parentSlug: main.slug, currentName: sub.name };
    }
  }
  return null;
}

export function TopicPageContent({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const searchQ = searchParams.get('q') ?? '';
  const isSpecial = slug === 'populer' || slug === 'tum';
  const [sort, setSort] = useState<SortOption>(slug === 'populer' ? 'hot' : 'new');
  const [viewMode, setViewMode] = useState<ViewMode>('compact');

  const { data: categoriesRaw } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories().then((r) => r.data),
    enabled: !isSpecial,
  });

  const categoriesTree = useMemo(() => {
    const raw = categoriesRaw;
    const list = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' && Array.isArray((raw as { results?: CategoryMain[] }).results) ? (raw as { results: CategoryMain[] }).results : []);
    return (list as CategoryMain[]).filter((c) => !(c as { parent?: number }).parent);
  }, [categoriesRaw]);

  const { data: category, isLoading: categoryLoading, isError: categoryError } = useQuery({
    queryKey: ['category', slug],
    queryFn: () => api.getCategoryBySlug(slug),
    enabled: !isSpecial,
  });

  const parentCategory = useMemo(() => findParentFromTree(categoriesTree, slug), [categoriesTree, slug]);

  /** Alt kategoriler: önce ağaçtan (liste API), yoksa detay API'deki category.subcategories kullan. */
  const subcategoriesToShow = useMemo(() => {
    const normalize = (arr: { id?: number; name?: string; slug?: string }[] | undefined) =>
      (arr ?? []).map((s) => ({ id: s.id!, name: s.name ?? '', slug: s.slug ?? '' }));

    const fromTree = (): { id: number; name: string; slug: string }[] => {
      const main = categoriesTree.find((c) => c.slug === slug);
      if (main?.subcategories?.length) return normalize(main.subcategories as { id?: number; name?: string; slug?: string }[]);
      if (parentCategory) {
        const parentMain = categoriesTree.find((c) => c.slug === parentCategory.parentSlug);
        return normalize(parentMain?.subcategories as { id?: number; name?: string; slug?: string }[] | undefined);
      }
      return [];
    };

    const fromTreeList = fromTree();
    if (fromTreeList.length > 0) return fromTreeList;

    const cat = category as { slug?: string; subcategories?: { id?: number; name?: string; slug?: string }[] } | undefined;
    if (cat?.slug === slug && cat?.subcategories?.length) return normalize(cat.subcategories);
    if (parentCategory && cat && (cat as { parent_slug?: string }).parent_slug === parentCategory.parentSlug) {
      const parentMain = categoriesTree.find((c) => c.slug === parentCategory.parentSlug);
      return normalize(parentMain?.subcategories as { id?: number; name?: string; slug?: string }[] | undefined);
    }
    return [];
  }, [categoriesTree, slug, parentCategory, category]);

  const listParams = useMemo(() => {
    const ord = SORT_TO_ORDER[sort];
    const base: Record<string, string> = { ordering: ord };
    if (searchQ.trim()) base.search = searchQ.trim();
    if (isSpecial) return base;
    if (category?.id != null) {
      base.category = String(category.id);
      return base;
    }
    return null;
  }, [isSpecial, category?.id, sort, searchQ]);

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
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 flex flex-col lg:flex-row lg:items-start gap-4 sm:gap-6 min-w-0 min-h-[calc(100vh-104px)]">
        <div className="flex-1 min-w-0 overflow-hidden">
          <nav className="mb-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-brand">Marifetli</Link>
            <span>/</span>
            <Link href="/sorular" className="hover:text-brand">Sorular</Link>
            <span>/</span>
            {!isSpecial && parentCategory ? (
              <>
                <Link href={`/t/${parentCategory.parentSlug}`} className="hover:text-brand">{parentCategory.parentName}</Link>
                <span>/</span>
                <span className="text-gray-900 dark:text-gray-100 font-medium" suppressHydrationWarning>{parentCategory.currentName}</span>
              </>
            ) : (
              <span className="text-gray-900 dark:text-gray-100 font-medium" suppressHydrationWarning>{label}</span>
            )}
          </nav>

          {!isSpecial && subcategoriesToShow.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {subcategoriesToShow.map((sub) => {
                const isCurrent = sub.slug === slug;
                return (
                  <Link
                    key={sub.id}
                    href={`/t/${sub.slug}`}
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      isCurrent
                        ? 'border-brand bg-brand-pink/80 dark:bg-brand/15 text-brand-hover font-medium'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-brand hover:bg-brand-pink/80 dark:hover:bg-brand/10 hover:text-brand dark:hover:text-brand'
                    }`}
                  >
                    {sub.name}
                  </Link>
                );
              })}
            </div>
          )}

          {!isSpecial && categoryLoading && (
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-8 text-center text-gray-500 dark:text-gray-400">
              Kategori yükleniyor…
            </div>
          )}
          {!isSpecial && categoryError && (
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-8 text-center">
              <p className="text-gray-700 dark:text-gray-300 mb-4">Bu kategori bulunamadı.</p>
              <Link href="/sorular" className="text-brand hover:text-brand-hover font-medium">
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

        <div className="w-80 shrink-0 hidden lg:block self-start pb-6">
          <RecentActivitySidebar />
          <SiteStatsSidebar />
          <PopularQuestionsSidebar />
        </div>
      </div>
    </>
  );
}
