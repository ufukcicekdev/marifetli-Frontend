'use client';

import Link from 'next/link';
import { useQuestions } from '@/src/hooks/use-questions';

/**
 * Anasayfa sağ sidebar: Popüler sorular (hot_score) — API'den canlı veri.
 */
export function PopularQuestionsSidebar() {
  const { data, isLoading } = useQuestions({
    ordering: '-hot_score',
    page_size: 5,
  });
  const questions = data?.results ?? [];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 mt-4">
      <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3">Popüler sorular</h3>
      {isLoading ? (
        <ul className="space-y-2 text-sm">
          {[1, 2, 3].map((i) => (
            <li key={i} className="h-10 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </ul>
      ) : questions.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Henüz soru yok.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {questions.map((q) => (
            <li key={q.id}>
              <Link
                href={`/soru/${q.slug ?? q.id}`}
                className="text-gray-700 dark:text-gray-300 hover:text-orange-500 line-clamp-2"
              >
                {q.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
