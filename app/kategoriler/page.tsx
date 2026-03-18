'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/src/lib/api';

type CategoryItem = { id: number; name: string; slug: string; question_count?: number; subcategories?: { id: number; name: string; slug: string }[] };

const CATEGORY_STYLES: Record<string, { icon: string; accent: string }> = {
  'el-isleri': { icon: '🧵', accent: 'from-rose-500 to-brand' },
  'dikis-moda': { icon: '👗', accent: 'from-violet-500 to-purple-600' },
  'ev-dekorasyonu': { icon: '🏠', accent: 'from-amber-500 to-orange-500' },
  'yemek-marifetleri': { icon: '🍳', accent: 'from-orange-500 to-red-500' },
  'muzik': { icon: '🎵', accent: 'from-blue-500 to-cyan-500' },
  'sanat': { icon: '🎨', accent: 'from-pink-500 to-rose-500' },
  'fotograf-video': { icon: '📷', accent: 'from-slate-600 to-slate-800' },
  'hobiler': { icon: '🌱', accent: 'from-emerald-500 to-teal-500' },
  'dijital-beceriler': { icon: '💻', accent: 'from-cyan-500 to-blue-500' },
};

const defaultStyle = { icon: '📁', accent: 'from-gray-500 to-gray-600' };

function getCategoryStyle(slug: string) {
  return CATEGORY_STYLES[slug] ?? defaultStyle;
}

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
    <div className="container mx-auto px-3 sm:px-4 py-6 max-w-5xl">
      <div className="mb-8 text-center sm:text-left">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Kategoriler</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xl">
          Konuya göre sorulara göz atın, toplulukları keşfedin — ilgi alanına göre hemen başla.
        </p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-40 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 text-sm text-amber-800 dark:text-amber-200">
          Kategoriler yüklenemedi. Lütfen sayfayı yenileyin.
        </div>
      )}

      {!isLoading && !error && categoriesTree.length > 0 && (
        <div
          className="kategoriler-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
          style={{
            gridAutoRows: 'minmax(200px, auto)',
            gridAutoFlow: 'dense',
          }}
        >
          {categoriesTree.map((main, index) => {
            const subs = main.subcategories ?? [];
            const style = getCategoryStyle(main.slug);
            const count = (main as { question_count?: number }).question_count;
            const spanTwo = index % 3 === 0 || subs.length >= 4;
            return (
              <section
                key={main.id}
                data-puzzle-tall={spanTwo ? 'true' : undefined}
                className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 flex flex-col min-h-0"
                style={
                  spanTwo
                    ? { gridRow: 'span 2', minHeight: '420px' }
                    : { minHeight: '200px' }
                }
              >
                <div className={`h-1.5 w-full bg-gradient-to-r ${style.accent}`} aria-hidden />
                <Link
                  href={`/t/${main.slug}`}
                  className="flex items-center gap-3 px-4 sm:px-5 py-4 font-semibold text-lg text-gray-900 dark:text-white hover:bg-white/60 dark:hover:bg-gray-800/60 transition-colors border-b border-gray-100 dark:border-gray-800"
                >
                  <span className="text-2xl shrink-0" aria-hidden>{style.icon}</span>
                  <span className="min-w-0 flex-1">{main.name}</span>
                  {typeof count === 'number' && count > 0 && (
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0">
                      {count} soru
                    </span>
                  )}
                  <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                {subs.length > 0 ? (
                  <ul className="p-3 sm:p-4 space-y-0.5 flex-1 min-h-0">
                    {subs.map((sub) => (
                      <li key={sub.id}>
                        <Link
                          href={`/t/${sub.slug}`}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-white/80 dark:hover:bg-gray-800/80 hover:text-brand dark:hover:text-brand transition-colors group"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 group-hover:bg-brand shrink-0" aria-hidden />
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

      <div className="mt-10 pt-8 border-t border-gray-200 dark:border-gray-700">
        <Link
          href="/topluluklar"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium bg-brand/10 dark:bg-brand/20 text-brand hover:bg-brand/20 dark:hover:bg-brand/30 transition-colors"
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
