'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  CalendarDays,
  CheckCheck,
  ClipboardList,
  FileText,
  Mail,
  Megaphone,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import {
  kidsListNotifications,
  kidsMarkAllNotificationsRead,
  kidsMarkNotificationRead,
  kidsRegisterFCMToken,
  type KidsNotificationRow,
} from '@/src/lib/kids-api';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';
import { canRequestPush, getFCMTokenAndRegister } from '@/src/lib/firebase-messaging';
import { useKidsI18n } from '@/src/providers/kids-language-provider';

const INITIAL_VISIBLE = 5;
const LOAD_MORE_STEP = 8;

function typeLabel(notificationType: string, t: (key: string) => string): string {
  const key = `notifications.type.${notificationType}`;
  const translated = t(key);
  if (translated !== key) return translated;
  return notificationType.replace(/^kids_/, '').replace(/_/g, ' ');
}

function notificationVisual(
  notificationType: string,
): { Icon: LucideIcon; iconBox: string } {
  const t = notificationType.toLowerCase();
  if (t.includes('message')) {
    return { Icon: Mail, iconBox: 'bg-violet-600 text-white shadow-md shadow-violet-500/25' };
  }
  if (t.includes('submission') || t.includes('graded') || t.includes('late_submitted')) {
    return { Icon: ClipboardList, iconBox: 'bg-rose-500 text-white shadow-md shadow-rose-500/20' };
  }
  if (t.includes('challenge')) {
    return { Icon: Trophy, iconBox: 'bg-amber-400 text-amber-950 shadow-md shadow-amber-400/30' };
  }
  if (t.includes('announcement')) {
    return { Icon: Megaphone, iconBox: 'bg-slate-500 text-white shadow-md shadow-slate-500/20' };
  }
  if (t.includes('due_soon')) {
    return { Icon: CalendarDays, iconBox: 'bg-slate-400 text-white shadow-md shadow-slate-400/25' };
  }
  if (t.includes('new_test') || t.includes('new_assignment')) {
    return { Icon: FileText, iconBox: 'bg-violet-600 text-white shadow-md shadow-violet-500/25' };
  }
  return { Icon: Bell, iconBox: 'bg-slate-400 text-white shadow-md shadow-slate-400/25' };
}

export default function KidsBildirimlerPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();
  const { t, language } = useKidsI18n();
  const pushTried = useRef(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);

  useEffect(() => {
    if (authLoading || !user || pushTried.current || !canRequestPush()) return;
    if (typeof Notification !== 'undefined' && Notification.permission === 'denied') return;
    pushTried.current = true;
    void getFCMTokenAndRegister((token, dn) => kidsRegisterFCMToken(token, dn)).then((r) => {
      if (!r.ok && r.reason !== t('notifications.pushDenied')) {
        pushTried.current = false;
      }
    });
  }, [authLoading, user, t]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(kidsLoginPortalHref(pathPrefix));
    }
  }, [authLoading, user, router, pathPrefix]);

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['kids-notifications'] });
    void queryClient.invalidateQueries({ queryKey: ['kids-notifications-unread'] });
  }, [queryClient]);

  const { data: list, isLoading, isError } = useQuery({
    queryKey: ['kids-notifications'],
    queryFn: kidsListNotifications,
    enabled: Boolean(user),
  });

  const markRead = useMutation({
    mutationFn: (id: number) => kidsMarkNotificationRead(id),
    onSuccess: invalidate,
  });

  const markAll = useMutation({
    mutationFn: kidsMarkAllNotificationsRead,
    onSuccess: () => {
      invalidate();
      toast.success(t('notifications.markAllSuccess'));
    },
    onError: () => toast.error(t('notifications.actionFailed')),
  });

  const notifications = list ?? [];

  const visibleList = useMemo(
    () => notifications.slice(0, Math.min(visibleCount, notifications.length)),
    [notifications, visibleCount],
  );
  const hasMoreLocal = visibleCount < notifications.length;
  const showLessVisible = !hasMoreLocal && visibleCount > INITIAL_VISIBLE && notifications.length > INITIAL_VISIBLE;

  if (authLoading || !user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
        {t('common.loading')}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          {t('notifications.title')}
        </h1>
        {notifications.length > 0 ? (
          <button
            type="button"
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200/90 bg-slate-100/90 px-4 py-2 text-xs font-bold text-violet-700 shadow-sm transition hover:bg-slate-200/80 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-violet-300 dark:hover:bg-zinc-700"
          >
            <CheckCheck className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden />
            {t('notifications.markAll')}
          </button>
        ) : null}
      </div>

      <p className="mb-8 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{t('notifications.subtitle')}</p>

      {isLoading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('notifications.loadingList')}</p>
      ) : isError ? (
        <p className="text-sm text-red-600 dark:text-red-400">{t('notifications.loadError')}</p>
      ) : notifications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-14 text-center text-sm text-slate-500 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-slate-400">
          {t('notifications.empty')}
        </div>
      ) : (
        <>
          <ul className="space-y-4">
            {visibleList.map((n) => {
              const unread = !n.is_read;
              const { Icon, iconBox } = notificationVisual(n.notification_type);
              const title = typeLabel(n.notification_type, t);
              return (
                <li key={n.id}>
                  <Link
                    href={`${pathPrefix}${n.action_path}`}
                    onClick={() => {
                      if (unread) markRead.mutate(n.id);
                    }}
                    className={`relative flex gap-4 rounded-2xl border bg-white p-4 pr-8 shadow-sm transition hover:shadow-md dark:bg-zinc-900/80 ${
                      unread
                        ? 'border-slate-200/90 border-l-[6px] border-l-violet-600 dark:border-zinc-700 dark:border-l-violet-500'
                        : 'border-slate-200/90 dark:border-zinc-700'
                    } `}
                  >
                    {unread ? (
                      <span
                        className="absolute right-3 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-violet-600 dark:bg-violet-400"
                        aria-hidden
                      />
                    ) : null}
                    <span
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconBox}`}
                      aria-hidden
                    >
                      <Icon className="h-6 w-6" strokeWidth={2} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <span className="font-bold text-slate-900 dark:text-white">{title}</span>
                        <time
                          className="shrink-0 text-[11px] font-medium text-slate-400 dark:text-slate-500"
                          dateTime={n.created_at}
                        >
                          {new Date(n.created_at).toLocaleString(
                            language === 'tr' ? 'tr-TR' : language === 'ge' ? 'de-DE' : 'en-US',
                            {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            },
                          )}
                        </time>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{n.message}</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>

          {(hasMoreLocal || showLessVisible) && (
            <div className="mt-8 flex justify-center">
              {hasMoreLocal ? (
                <button
                  type="button"
                  onClick={() => setVisibleCount((c) => c + LOAD_MORE_STEP)}
                  className="rounded-2xl border-2 border-dashed border-slate-300 bg-transparent px-6 py-3 text-sm font-semibold text-slate-500 transition hover:border-violet-300 hover:text-violet-700 dark:border-zinc-600 dark:text-slate-400 dark:hover:border-violet-600 dark:hover:text-violet-300"
                >
                  {t('notifications.loadOlder')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setVisibleCount(INITIAL_VISIBLE)}
                  className="rounded-2xl border-2 border-dashed border-slate-300 bg-transparent px-6 py-3 text-sm font-semibold text-slate-500 transition hover:border-violet-300 hover:text-violet-700 dark:border-zinc-600 dark:text-slate-400 dark:hover:border-violet-600 dark:hover:text-violet-300"
                >
                  {t('notifications.showLess')}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
