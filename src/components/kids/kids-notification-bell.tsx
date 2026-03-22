'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import { kidsNotificationUnreadCount } from '@/src/lib/kids-api';

type KidsNotificationBellProps = {
  pathPrefix: string;
  /** Üst çubukta sadece ikon; panellerde metin + ikon */
  showLabel?: boolean;
  className?: string;
};

export function KidsNotificationBell({
  pathPrefix,
  showLabel = false,
  className = '',
}: KidsNotificationBellProps) {
  const { user } = useKidsAuth();
  const { data: unread = 0 } = useQuery({
    queryKey: ['kids-notifications-unread'],
    queryFn: kidsNotificationUnreadCount,
    enabled: Boolean(user),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  if (!user) return null;

  const label = unread > 0 ? `Bildirimler (${unread} okunmamış)` : 'Bildirimler';

  const bellSvg = (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  );

  if (showLabel) {
    return (
      <Link
        href={`${pathPrefix}/bildirimler`}
        className={`inline-flex min-h-11 items-center gap-2 rounded-2xl border-2 border-violet-200/90 bg-white/90 px-3 py-2 text-sm font-bold text-violet-900 shadow-sm transition hover:border-violet-400 hover:bg-violet-50 dark:border-violet-800/70 dark:bg-gray-900/80 dark:text-violet-100 dark:hover:border-violet-600 dark:hover:bg-violet-950/50 ${className}`}
        title={label}
        aria-label={label}
      >
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center text-violet-800 dark:text-violet-200">
          {bellSvg}
        </span>
        <span>Bildirimler</span>
        {unread > 0 ? (
          <span className="rounded-full bg-fuchsia-500 px-2 py-0.5 text-xs font-bold text-white shadow-sm">
            {unread > 99 ? '99+' : unread}
          </span>
        ) : null}
      </Link>
    );
  }

  return (
    <Link
      href={`${pathPrefix}/bildirimler`}
      className={`header-nav-btn relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-violet-800 hover:bg-violet-100 dark:text-violet-200 dark:hover:bg-violet-900/40 ${className}`}
      title={label}
      aria-label={label}
    >
      {bellSvg}
      {unread > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-fuchsia-500 px-1 text-[10px] font-bold text-white shadow-sm">
          {unread > 99 ? '99+' : unread}
        </span>
      ) : null}
    </Link>
  );
}
