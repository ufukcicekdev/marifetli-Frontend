'use client';

import React from 'react';
import Link from 'next/link';
import { useQuestions } from '@/src/hooks/use-questions';

/** Render hatasında kırılmayı önler; alan her zaman bir blok gösterir. */
class PopularQuestionsErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 mt-4">
          <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3">Popüler sorular</h3>
          <div className="min-h-[120px] flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
            Bu alan şu an gösterilemiyor. <Link href="/sorular" className="text-orange-500 ml-1 hover:underline">Sorulara git →</Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function PopularQuestionsSidebarContent() {
  const { data, isLoading, isError, refetch } = useQuestions({
    ordering: '-hot_score',
    page_size: 5,
  });
  const raw = data?.results;
  const questions = Array.isArray(raw) ? raw.filter((q) => q != null && (q as { id?: unknown }).id != null) : [];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 mt-4">
      <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3">Popüler sorular</h3>
      <div className="min-h-[120px]" role="region" aria-label="Popüler sorular listesi">
        {isLoading ? (
          <ul className="space-y-2 text-sm list-none p-0 m-0">
            {[1, 2, 3].map((i) => (
              <li key={i} className="h-10 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
            ))}
          </ul>
        ) : isError ? (
          <div className="text-sm text-amber-700 dark:text-amber-400">
            <p className="mb-2">Sorular yüklenemedi.</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="text-orange-600 dark:text-orange-400 hover:underline font-medium"
            >
              Tekrar dene
            </button>
          </div>
        ) : questions.length === 0 ? (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p className="mb-2">Henüz popüler soru yok.</p>
            <Link
              href="/sorular"
              className="text-orange-600 dark:text-orange-400 hover:underline font-medium"
            >
              Tüm sorulara git →
            </Link>
          </div>
        ) : (
          <ul className="space-y-2 text-sm list-none p-0 m-0">
            {questions.map((q) => {
              const id = (q as { id?: number }).id;
              const slug = (q as { slug?: string }).slug ?? String(id);
              const title = (q as { title?: string }).title ?? 'Soru';
              return (
                <li key={id}>
                  <Link
                    href={`/soru/${slug}`}
                    className="text-gray-700 dark:text-gray-300 hover:text-orange-500 line-clamp-2 block"
                  >
                    {title}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/**
 * Anasayfa sağ sidebar: Popüler sorular (hot_score) — API'den canlı veri.
 * Hata sınırı ile sarılı; render hatası olsa bile başlık + fallback görünür.
 */
export function PopularQuestionsSidebar() {
  return (
    <PopularQuestionsErrorBoundary>
      <PopularQuestionsSidebarContent />
    </PopularQuestionsErrorBoundary>
  );
}
