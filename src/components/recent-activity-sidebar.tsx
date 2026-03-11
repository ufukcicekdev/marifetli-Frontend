'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  getRecentActivityList,
  clearRecentActivity,
  type RecentItem,
} from '@/src/lib/recent-activity';
import { formatTimeAgo } from '@/src/lib/format-time';

function CommunityIcon({ className }: { className?: string }) {
  return (
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white ${className ?? ''}`}
      aria-hidden
    >
      <span className="text-sm font-bold">r</span>
    </div>
  );
}

function QuestionIcon({ className }: { className?: string }) {
  return (
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 ${className ?? ''}`}
      aria-hidden
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
  );
}

function ProfileIcon({ className }: { className?: string }) {
  return (
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white ${className ?? ''}`}
      aria-hidden
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    </div>
  );
}

function BlogIcon({ className }: { className?: string }) {
  return (
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white ${className ?? ''}`}
      aria-hidden
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
      </svg>
    </div>
  );
}

function Thumbnail({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <div className={`relative h-10 w-10 shrink-0 overflow-hidden rounded bg-gray-200 dark:bg-gray-700 ${className ?? ''}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="h-full w-full object-cover" />
    </div>
  );
}

export function RecentActivitySidebar() {
  const pathname = usePathname();
  const [items, setItems] = useState<RecentItem[]>([]);

  const refresh = useCallback(() => {
    setItems(getRecentActivityList());
  }, []);

  useEffect(() => {
    refresh();
  }, [pathname, refresh]);

  const handleClear = () => {
    clearRecentActivity();
    setItems([]);
  };

  if (items.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden mb-4">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200 dark:border-gray-800">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">Son gezilenler</h3>
        <button
          type="button"
          onClick={handleClear}
          className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
        >
          Temizle
        </button>
      </div>
      <ul className="divide-y divide-gray-200 dark:divide-gray-800">
        {items.map((entry) => {
          const key = entry.type === 'question' ? `q-${entry.id}` : entry.type === 'profile' ? `p-${entry.username}` : entry.type === 'blog' ? `b-${entry.slug}` : `c-${entry.slug}`;
          const href = entry.type === 'question' ? `/soru/${entry.slug}` : entry.type === 'profile' ? `/profil/${entry.username}` : entry.type === 'blog' ? `/blog/${entry.slug}` : `/t/${entry.slug}`;
          const hasRightThumb = (entry.type === 'question' && entry.imageUrl) || (entry.type === 'blog' && entry.imageUrl);
          const leftContent =
            entry.type === 'profile' && entry.profilePicture ? (
              <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700 ring-2 ring-white dark:ring-gray-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={entry.profilePicture} alt="" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="shrink-0 pt-0.5">
                {entry.type === 'question' && <QuestionIcon />}
                {entry.type === 'community' && <CommunityIcon />}
                {entry.type === 'profile' && <ProfileIcon />}
                {entry.type === 'blog' && <BlogIcon />}
              </div>
            );
          return (
            <li key={key}>
              <Link
                href={href}
                className="flex gap-2.5 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors items-start"
              >
                {leftContent}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                    <span className="font-medium text-gray-700 dark:text-gray-300 truncate">
                      {entry.type === 'question'
                        ? entry.categoryLabel ? `r/${entry.categorySlug ?? entry.categoryLabel}` : 'Soru'
                        : entry.type === 'profile'
                          ? 'Profil'
                          : entry.type === 'blog'
                            ? 'Blog'
                            : `r/${entry.slug}`}
                    </span>
                    <span>·</span>
                    <span>{formatTimeAgo(entry.visitedAt)}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2 leading-snug">
                    {entry.type === 'question'
                      ? entry.title
                      : entry.type === 'profile'
                        ? (entry.displayName || entry.username)
                        : entry.type === 'blog'
                          ? entry.title
                          : entry.label}
                  </p>
                  {entry.type === 'question' && (entry.likeCount != null || entry.commentCount != null) && (
                    <div className="flex gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {entry.likeCount != null && <span>{entry.likeCount} beğeni</span>}
                      {entry.commentCount != null && <span>{entry.commentCount} yorum</span>}
                    </div>
                  )}
                </div>
                {hasRightThumb && entry.type === 'question' && entry.imageUrl && (
                  <Thumbnail src={entry.imageUrl} alt={entry.title || 'Gönderi görseli'} className="mt-0.5" />
                )}
                {hasRightThumb && entry.type === 'blog' && entry.imageUrl && (
                  <Thumbnail src={entry.imageUrl} alt={entry.title || 'Blog görseli'} className="mt-0.5" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
