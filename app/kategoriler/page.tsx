'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/src/lib/api';

type CategoryItem = { id: number; name: string; slug: string; subcategories?: { id: number; name: string; slug: string }[] };

function KategorilerContent() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories().then((r) => r.data),
  });

  const categoriesTree = useMemo(() => {
    const raw = data as { results?: CategoryItem[] } | CategoryItem[] | undefined;
    const list = Array.isArray(raw)
      ? raw
      : (raw && typeof raw === 'object' && Array.isArray((raw as { results?: CategoryItem[] }).results)
          ? (raw as { results: CategoryItem[] }).results
          : []);
    return (list as CategoryItem[]).filter((c) => !(c as { parent?: number }).parent);
  }, [data]);

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 max-w-3xl">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Kategoriler</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Konuya göre sorulara göz atın veya toplulukları keşfedin.
      </p>

      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 text-sm text-amber-800 dark:text-amber-200">
          Kategoriler yüklenemedi. Lütfen sayfayı yenileyin.
        </div>
      )}

      {!isLoading && !error && categoriesTree.length > 0 && (
        <div className="space-y-6">
          {categoriesTree.map((main) => {
            const subs = main.subcategories ?? [];
            return (
              <section key={main.id} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
                <Link
                  href={`/t/${main.slug}`}
                  className="block px-4 py-3 font-semibold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-100 dark:border-gray-800"
                >
                  {main.name}
                </Link>
                {subs.length > 0 ? (
                  <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                    {subs.map((sub) => (
                      <li key={sub.id}>
                        <Link
                          href={`/t/${sub.slug}`}
                          className="block px-4 py-3 pl-8 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                        >
                          {sub.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            );
          })}
        </div>
      )}

      {!isLoading && !error && categoriesTree.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">Henüz kategori yok.</p>
      )}

      <div className="mt-8">
        <Link
          href="/topluluklar"
          className="inline-flex items-center gap-2 text-sm font-medium text-orange-600 dark:text-orange-400 hover:underline"
        >
          Toplulukları keşfet
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

export default function KategorilerPage() {
  return <KategorilerContent />;
}
