'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api, { type BlogPostListItem } from '@/src/lib/api';
import { OptimizedAvatar } from '@/src/components/optimized-avatar';
import { formatTimeAgo } from '@/src/lib/format-time';

type ViewMode = 'card' | 'compact';

function formatDate(s: string | null) {
  if (!s) return '';
  return new Date(s).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function BlogPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  useEffect(() => {
    const stored = localStorage.getItem('blogViewMode') as ViewMode | null;
    if (stored === 'card' || stored === 'compact') setViewMode(stored);
  }, []);
  useEffect(() => {
    localStorage.setItem('blogViewMode', viewMode);
  }, [viewMode]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['blog-posts'],
    queryFn: async () => {
      const res = await api.getBlogPosts();
      const list = Array.isArray(res.data) ? res.data : (res.data as { results?: BlogPostListItem[] }).results ?? [];
      return { results: list };
    },
  });

  const { data: popularData } = useQuery({
    queryKey: ['blog-popular'],
    queryFn: async () => {
      const res = await api.getBlogPopularPosts();
      const list = Array.isArray(res.data) ? res.data : (res.data as { results?: BlogPostListItem[] })?.results ?? [];
      return list;
    },
  });

  const posts = data?.results ?? [];
  const popularPosts = popularData ?? [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-10 flex flex-col lg:flex-row gap-8 max-w-6xl">
        <main className="min-w-0 flex-1 max-w-4xl">
        <header className="mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Blog</h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Marifetli ekibinden makaleler ve güncellemeler.
              </p>
            </div>
            {!isLoading && posts.length > 0 && (
              <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shrink-0">
                <button
                  onClick={() => setViewMode('card')}
                  title="Kart görünümü"
                  className={`p-1.5 ${viewMode === 'card' ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('compact')}
                  title="Kompakt görünüm"
                  className={`p-1.5 ${viewMode === 'compact' ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 6a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H3a1 1 0 01-1-1V6zM2 12a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H3a1 1 0 01-1-1v-2z" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </header>

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
            Henüz blog yazısı yok.
          </div>
        )}

        {!isLoading && posts.length > 0 && (
          <ul className={viewMode === 'compact' ? 'space-y-1' : 'space-y-6'}>
            {posts.map((post) => {
              const author = post.author as { username?: string; profile_picture?: string };
              if (viewMode === 'compact') {
                return (
                  <li key={post.id}>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-orange-300 dark:hover:border-orange-700 transition-colors min-w-0"
                    >
                      {post.featured_image ? (
                        <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-gray-100 dark:bg-gray-800 shrink-0 overflow-hidden">
                          <Image
                            src={post.featured_image}
                            alt=""
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
                    className="block bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:border-orange-300 dark:hover:border-orange-700 transition-colors min-w-0"
                  >
                    {post.featured_image && (
                      <div className="relative w-full aspect-video bg-gray-100 dark:bg-gray-800 shrink-0">
                        <Image
                          src={post.featured_image}
                          alt=""
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
                          {post.excerpt}
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
                        <span className="shrink-0">{post.like_count} beğeni</span>
                        <span className="shrink-0">·</span>
                        <span className="shrink-0">{post.comment_count} yorum</span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        </main>

        {popularPosts.length > 0 && (
          <aside className="w-full lg:w-72 shrink-0">
            <div className="lg:sticky lg:top-24">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">En çok okunanlar</h2>
              <ul className="space-y-4">
                {popularPosts.map((post, index) => {
                  const author = post.author as { username?: string };
                  return (
                    <li key={post.id}>
                      <Link
                        href={`/blog/${post.slug}`}
                        className="flex gap-3 rounded-lg p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-orange-300 dark:hover:border-orange-700 transition-colors min-w-0"
                      >
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 text-sm font-bold shrink-0">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-gray-900 dark:text-gray-100 line-clamp-2 text-sm">
                            {post.title}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {post.view_count} görüntülenme
                            {author?.username && ` · ${author.username}`}
                          </p>
                        </div>
                        <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
