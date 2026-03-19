'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api, { type BlogPostListItem } from '@/src/lib/api';

/**
 * Blog anasayfa ve detay sayfalarında kullanılan sidebar: "Blog'da neler var?" + En çok okunanlar.
 */
export function BlogSidebar() {
  const { data: popularData } = useQuery({
    queryKey: ['blog-popular'],
    queryFn: async () => {
      const res = await api.getBlogPopularPosts();
      const list = Array.isArray(res.data) ? res.data : (res.data as { results?: BlogPostListItem[] })?.results ?? [];
      return list;
    },
  });
  const popularPosts = popularData ?? [];

  return (
    <aside className="w-full lg:w-72 shrink-0 space-y-6">
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Blog&apos;da neler var?</h3>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
            İpuçları ve rehberler
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
            Projeler ve rehberler
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
            Topluluk yazıları
          </li>
        </ul>
      </div>
      {popularPosts.length > 0 && (
        <div className="lg:sticky lg:top-24">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">En çok okunanlar</h2>
          <ul className="space-y-4">
            {popularPosts.map((post, index) => {
              const author = post.author as { username?: string };
              return (
                <li key={post.id}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="flex gap-3 rounded-lg p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-brand/40 transition-colors min-w-0"
                  >
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-pink dark:bg-brand/20 text-brand text-sm font-bold shrink-0">
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
      )}
    </aside>
  );
}
