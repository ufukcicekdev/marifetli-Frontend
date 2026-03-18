'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import api, { type BlogPostListItem } from '@/src/lib/api';
import { OptimizedAvatar } from '@/src/components/optimized-avatar';
import { useAuthStore } from '@/src/stores/auth-store';
import { formatTimeAgo } from '@/src/lib/format-time';
import { BlogHero } from '@/src/components/blog-hero';
import { BlogSidebar } from '@/src/components/blog-sidebar';
import { stripHtml } from '@/src/lib/extract-media';

const SaveModal = dynamic(() => import('@/src/components/save-modal').then((m) => ({ default: m.SaveModal })), { ssr: false });

type ViewMode = 'card' | 'compact';

function formatDate(s: string | null) {
  if (!s) return '';
  return new Date(s).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function BlogPageContent() {
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [saveModalPostId, setSaveModalPostId] = useState<number | null>(null);
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    const stored = localStorage.getItem('blogViewMode') as ViewMode | null;
    if (stored === 'card' || stored === 'compact') setViewMode(stored);
  }, []);
  useEffect(() => {
    localStorage.setItem('blogViewMode', viewMode);
  }, [viewMode]);

  const searchParams = useSearchParams();
  const searchQ = searchParams.get('q')?.trim() ?? '';

  const { data, isLoading, error } = useQuery({
    queryKey: ['blog-posts'],
    queryFn: async () => {
      const res = await api.getBlogPosts();
      const list = Array.isArray(res.data) ? res.data : (res.data as { results?: BlogPostListItem[] }).results ?? [];
      return { results: list };
    },
  });

  const allPosts = data?.results ?? [];
  const posts = useMemo(() => {
    if (!searchQ) return allPosts;
    const lower = searchQ.toLowerCase();
    return allPosts.filter(
      (p) =>
        p.title.toLowerCase().includes(lower) ||
        (p.excerpt && stripHtml(p.excerpt).toLowerCase().includes(lower))
    );
  }, [allPosts, searchQ]);
  const featuredPost = posts.length > 0 ? posts[0] : null;
  const restPosts = featuredPost ? posts.slice(1) : posts;

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-10 flex flex-col lg:flex-row gap-8 max-w-6xl">
        <main className="min-w-0 flex-1 max-w-4xl">
          <BlogHero />

        {isLoading && (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-amber-800 dark:text-amber-200">
            Yazılar yüklenemedi. Lütfen daha sonra tekrar deneyin.
          </div>
        )}

        {!isLoading && !error && posts.length === 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center text-gray-500 dark:text-gray-400">
            {searchQ ? `"${searchQ}" aramasına uygun yazı bulunamadı.` : 'Henüz blog yazısı yok.'}
          </div>
        )}

        {/* Öne çıkan — anasayfadaki gibi kart, Son yazıların üstünde */}
        {!isLoading && featuredPost && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Öne çıkan
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <Link
                href={`/blog/${featuredPost.slug}`}
                className="group rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden hover:border-brand/40 hover:shadow-md transition-all sm:col-span-2 lg:col-span-3"
              >
                {featuredPost.featured_image ? (
                  <div className="relative w-full aspect-[21/9] sm:aspect-video bg-gray-100 dark:bg-gray-800">
                    <Image
                      src={featuredPost.featured_image}
                      alt={featuredPost.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 896px"
                      priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <span className="absolute bottom-3 left-4 text-xs font-medium uppercase tracking-wider text-white/90">
                      Öne çıkan
                    </span>
                  </div>
                ) : (
                  <div className="bg-gradient-to-r from-brand-pink to-brand-sky/10 dark:from-gray-800 dark:to-gray-800/80 px-5 py-3 border-b border-gray-200/80 dark:border-gray-700">
                    <span className="text-xs font-medium uppercase tracking-wider text-brand">Öne çıkan</span>
                  </div>
                )}
                <div className="p-4 sm:p-5">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2 group-hover:text-brand transition-colors">
                    {featuredPost.title}
                  </h3>
                  {featuredPost.excerpt && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                      {stripHtml(featuredPost.excerpt)}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    {(featuredPost.author as { username?: string; profile_picture?: string })?.profile_picture ? (
                      <OptimizedAvatar src={(featuredPost.author as { profile_picture?: string }).profile_picture} size={24} alt="" className="w-5 h-5 shrink-0" />
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-brand-pink dark:bg-brand/20 flex items-center justify-center text-[10px] font-medium text-brand shrink-0">
                        {(featuredPost.author as { username?: string })?.username?.charAt(0)?.toUpperCase() ?? '?'}
                      </span>
                    )}
                    <span>{(featuredPost.author as { username?: string })?.username ?? 'Marifetli'}</span>
                    <span>·</span>
                    <time dateTime={featuredPost.published_at ?? featuredPost.created_at}>
                      {featuredPost.published_at ? formatDate(featuredPost.published_at) : formatTimeAgo(featuredPost.created_at)}
                    </time>
                    <span>·</span>
                    <span>{featuredPost.like_count} beğeni · {featuredPost.comment_count} yorum</span>
                  </div>
                  <span className="inline-flex items-center gap-1 mt-3 text-brand font-medium text-sm">
                    Yazıyı oku
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </span>
                </div>
              </Link>
            </div>
          </div>
        )}

        {!isLoading && restPosts.length > 0 && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Son yazılar
              </h2>
              <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode('card')}
                  title="Kart görünümü"
                  className={`p-1.5 ${viewMode === 'card' ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('compact')}
                  title="Kompakt görünüm"
                  className={`p-1.5 ${viewMode === 'compact' ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 6a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H3a1 1 0 01-1-1V6zM2 12a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H3a1 1 0 01-1-1v-2z" />
                  </svg>
                </button>
              </div>
            </div>
            <ul className={viewMode === 'compact' ? 'space-y-1' : 'space-y-6'} key={viewMode}>
            {restPosts.map((post) => {
              const author = post.author as { username?: string; profile_picture?: string };
              if (viewMode === 'compact') {
                return (
                  <li key={post.id}>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-brand/40 transition-colors min-w-0"
                    >
                      {post.featured_image ? (
                        <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-gray-100 dark:bg-gray-800 shrink-0 overflow-hidden">
                          <Image
                            src={post.featured_image}
                            alt={post.title}
                            fill
                            className="object-cover"
                            sizes="80px"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-gray-100 dark:bg-gray-800 shrink-0 flex items-center justify-center text-2xl text-gray-400 dark:text-gray-500">
                          📝
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h2 className="font-semibold text-gray-900 dark:text-gray-100 truncate sm:line-clamp-1">
                          {post.title}
                        </h2>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0 text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                          <span className="truncate max-w-[100px] sm:max-w-none">{author?.username ?? 'Marifetli'}</span>
                          <span className="shrink-0">·</span>
                          <time dateTime={post.published_at ?? post.created_at} className="shrink-0 whitespace-nowrap">
                            {post.published_at ? formatDate(post.published_at) : formatTimeAgo(post.created_at)}
                          </time>
                          <span className="shrink-0">·</span>
                          <span className="shrink-0">{post.like_count} beğeni</span>
                        <span className="shrink-0">·</span>
                        <span className="shrink-0">{post.comment_count} yorum</span>
                        {isAuthenticated && (
                          <>
                            <span className="shrink-0">·</span>
                            <button
                              type="button"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSaveModalPostId(post.id); }}
                              className="shrink-0 flex items-center gap-1 text-brand hover:text-brand-hover text-sm"
                              title="Koleksiyona kaydet"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                              </svg>
                              Kaydet
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </li>
              );
            }
            return (
                <li key={post.id}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="block bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:border-brand/40 transition-colors min-w-0"
                  >
                    {post.featured_image && (
                      <div className="relative w-full aspect-video bg-gray-100 dark:bg-gray-800 shrink-0">
                        <Image
                          src={post.featured_image}
                          alt={post.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 896px"
                        />
                      </div>
                    )}
                    <div className="p-5 sm:p-6">
                      <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
                        {post.title}
                      </h2>
                      {post.excerpt && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                          {stripHtml(post.excerpt)}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500 dark:text-gray-400 min-w-0">
                        <span className="flex items-center gap-2 shrink-0">
                          {author?.profile_picture ? (
                            <OptimizedAvatar src={author.profile_picture} size={24} alt="" className="w-6 h-6 shrink-0" />
                          ) : (
                            <span className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium shrink-0">
                              {author?.username?.charAt(0)?.toUpperCase() ?? '?'}
                            </span>
                          )}
                          <span className="truncate max-w-[120px] sm:max-w-none" title={author?.username ?? 'Marifetli'}>
                            {author?.username ?? 'Marifetli'}
                          </span>
                        </span>
                        <span className="shrink-0">·</span>
                        <time dateTime={post.published_at ?? post.created_at} className="shrink-0 whitespace-nowrap">
                          {post.published_at ? formatDate(post.published_at) : formatTimeAgo(post.created_at)}
                        </time>
                        <span className="shrink-0">·</span>
                        <span className="shrink-0">{post.comment_count} yorum</span>
                        {isAuthenticated && (
                          <>
                            <span className="shrink-0">·</span>
                            <button
                              type="button"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSaveModalPostId(post.id); }}
                              className="shrink-0 flex items-center gap-1 text-brand hover:text-brand-hover text-sm"
                              title="Koleksiyona kaydet"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                              </svg>
                              Kaydet
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
          </>
        )}

        </main>

        <BlogSidebar />
      </div>
      {saveModalPostId != null && (
        <SaveModal
          blogPostId={saveModalPostId}
          isOpen={saveModalPostId != null}
          onClose={() => setSaveModalPostId(null)}
        />
      )}
    </div>
  );
}

function BlogPageFallback() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-10 flex flex-col lg:flex-row gap-8 max-w-6xl">
        <main className="min-w-0 flex-1 max-w-4xl space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse" />
          <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
        </main>
      </div>
    </div>
  );
}

export default function BlogPage() {
  return (
    <Suspense fallback={<BlogPageFallback />}>
      <BlogPageContent />
    </Suspense>
  );
}
