'use client';

import { useState } from 'react';

export type SortOption = 'hot' | 'new' | 'top' | 'best';
export type ViewMode = 'card' | 'compact';

const SORT_LABELS: Record<SortOption, string> = {
  best: 'En İyi',
  hot: 'Popüler',
  new: 'Yeni',
  top: 'Yüksek Oylu',
};

export function PostFeedControls({
  sort,
  onSortChange,
  viewMode,
  onViewModeChange,
  totalCount,
}: {
  sort: SortOption;
  onSortChange: (s: SortOption) => void;
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
  totalCount?: number;
}) {
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4 p-3 border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <button
            onClick={() => setSortDropdownOpen((o) => !o)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            {SORT_LABELS[sort]}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {sortDropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setSortDropdownOpen(false)} aria-hidden="true" />
              <div className="absolute left-0 top-full mt-1 py-1 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20">
                {(['best', 'hot', 'new', 'top'] as SortOption[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => { onSortChange(s); setSortDropdownOpen(false); }}
                    className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${sort === s ? 'text-orange-500 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
                  >
                    {SORT_LABELS[s]}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <button
            onClick={() => onViewModeChange('card')}
            title="Kart görünümü"
            className={`p-1.5 ${viewMode === 'card' ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => onViewModeChange('compact')}
            title="Kompakt görünüm"
            className={`p-1.5 ${viewMode === 'compact' ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H3a1 1 0 01-1-1V6zM2 12a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H3a1 1 0 01-1-1v-2z" />
            </svg>
          </button>
        </div>
      </div>
      {totalCount != null && (
        <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0">{totalCount.toLocaleString('tr-TR')} soru</span>
      )}
    </div>
  );
}
