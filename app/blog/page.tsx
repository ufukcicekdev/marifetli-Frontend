'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import api, { type BlogPostListItem } from '@/src/lib/api';
import { OptimizedAvatar } from '@/src/components/optimized-avatar';
import { formatTimeAgo } from '@/src/lib/format-time';

function formatDate(s: string | null) {
  if (!s) return '';
  return new Date(s).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function BlogPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['blog-posts'],
    queryFn: async () => {
      const res = await api.getBlogPosts();
      const list = Array.isArray(res.data) ? res.data : (res.data as { results?: BlogPostListItem[] }).results ?? [];
      return { results: list };
    },
  });

  const posts = data?.results ?? [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-10 max-w-4xl">
        <header className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Blog</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Marifetli ekibinden makaleler ve güncellemeler.
          </p>
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
          <ul className="space-y-6">
            {posts.map((post) => {
              const author = post.author as { username?: string; profile_picture?: string };
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
    </div>
  );
}
