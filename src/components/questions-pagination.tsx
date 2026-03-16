'use client';

import Link from 'next/link';

const PAGE_SIZE = 20;
const MAX_VISIBLE_PAGES = 5;

export interface QuestionsPaginationProps {
  currentPage: number;
  totalCount: number;
  basePath: string;
  /** Mevcut query params (q, community vb.) — sayfa linklerine eklenir */
  queryParams?: Record<string, string>;
}

export function QuestionsPagination({
  currentPage,
  totalCount,
  basePath,
  queryParams = {},
}: QuestionsPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  const buildHref = (page: number) => {
    const params = new URLSearchParams(queryParams);
    if (page > 1) params.set('page', String(page));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const pages: number[] = [];
  let start = Math.max(1, currentPage - Math.floor(MAX_VISIBLE_PAGES / 2));
  let end = Math.min(totalPages, start + MAX_VISIBLE_PAGES - 1);
  if (end - start + 1 < MAX_VISIBLE_PAGES) start = Math.max(1, end - MAX_VISIBLE_PAGES + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (totalPages <= 1) return null;

  return (
    <nav
      className="flex flex-wrap items-center justify-center gap-1 py-4 border-t border-gray-200 dark:border-gray-800"
      aria-label="Sayfa navigasyonu"
    >
      {hasPrev ? (
        <Link
          href={buildHref(currentPage - 1)}
          className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-label="Önceki sayfa"
        >
          Önceki
        </Link>
      ) : (
        <span
          className="px-3 py-2 rounded-lg text-sm text-gray-400 dark:text-gray-500 cursor-not-allowed"
          aria-disabled
        >
          Önceki
        </span>
      )}

      <div className="flex items-center gap-1 mx-2">
        {start > 1 && (
          <>
            <Link
              href={buildHref(1)}
              className="min-w-9 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-center transition-colors"
            >
              1
            </Link>
            {start > 2 && <span className="px-1 text-gray-400 dark:text-gray-500">…</span>}
          </>
        )}
        {pages.map((p) => (
          <Link
            key={p}
            href={buildHref(p)}
            className={`min-w-9 px-3 py-2 rounded-lg text-sm font-medium text-center transition-colors ${
              p === currentPage
                ? 'bg-orange-500 text-white'
                : 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            aria-label={p === currentPage ? `Sayfa ${p} (mevcut)` : `Sayfa ${p}`}
            aria-current={p === currentPage ? 'page' : undefined}
          >
            {p}
          </Link>
        ))}
        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="px-1 text-gray-400 dark:text-gray-500">…</span>}
            <Link
              href={buildHref(totalPages)}
              className="min-w-9 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-center transition-colors"
            >
              {totalPages}
            </Link>
          </>
        )}
      </div>

      {hasNext ? (
        <Link
          href={buildHref(currentPage + 1)}
          className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-label="Sonraki sayfa"
        >
          Sonraki
        </Link>
      ) : (
        <span
          className="px-3 py-2 rounded-lg text-sm text-gray-400 dark:text-gray-500 cursor-not-allowed"
          aria-disabled
        >
          Sonraki
        </span>
      )}
    </nav>
  );
}
