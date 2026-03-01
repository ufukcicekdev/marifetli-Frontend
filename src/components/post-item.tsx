'use client';

import Link from 'next/link';
import type { ViewMode } from './post-feed-controls';

interface PostItemProps {
  id: number;
  title: string;
  category?: string;
  author: string;
  timeAgo: string;
  commentCount: number;
  voteCount: number;
  viewCount?: number;
  viewMode: ViewMode;
}

export function PostItem({ id, title, category, author, timeAgo, commentCount, voteCount, viewCount, viewMode }: PostItemProps) {
  const VoteButtons = () => (
    <div className="flex flex-col items-center shrink-0">
      <button className="text-gray-400 hover:text-orange-500 transition-colors">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
        </svg>
      </button>
      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 my-0.5">{voteCount}</span>
      <button className="text-gray-400 hover:text-orange-500 transition-colors">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );

  const Meta = () => (
    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1 flex-wrap gap-x-1 gap-y-0.5">
      {category && <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded shrink-0">{category}</span>}
      <span className="min-w-0 truncate" title={`u/${author}`}>u/{author}</span>
      <span className="shrink-0">•</span>
      <span className="shrink-0">{timeAgo}</span>
      <span className="shrink-0">•</span>
      <span className="shrink-0">{commentCount} yorum</span>
    </div>
  );

  if (viewMode === 'card') {
    return (
      <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-800 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
        <div className="flex gap-2 sm:gap-4 min-w-0">
          <VoteButtons />
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 hover:text-orange-600 line-clamp-2 min-w-0">
                <Link href={`/soru/${id}`} className="block break-words">{title}</Link>
              </h3>
              {viewCount != null && (
                <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                  {viewCount >= 1000 ? `${(viewCount / 1000).toFixed(1)}k` : viewCount} görüntüleme
                </span>
              )}
            </div>
            <Meta />
            <div className="mt-3 h-32 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
              <span className="text-xs text-gray-400 dark:text-gray-500">İçerik önizlemesi</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-200 dark:border-gray-800 last:border-b-0">
      <div className="flex gap-2 sm:gap-3 min-w-0">
        <VoteButtons />
        <div className="flex-1 min-w-0 overflow-hidden">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-orange-600 line-clamp-1">
            <Link href={`/soru/${id}`} className="block truncate">{title}</Link>
          </h3>
          <Meta />
        </div>
        {viewCount != null && (
          <div className="hidden sm:flex items-center text-xs text-gray-500 dark:text-gray-400 shrink-0">
            {viewCount >= 1000 ? `${(viewCount / 1000).toFixed(1)}k` : viewCount} görüntüleme
          </div>
        )}
      </div>
    </div>
  );
}
