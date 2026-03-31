'use client';

import { useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

function typeLabel(notificationType: string, t: (key: string) => string): string {
  const key = `notifications.type.${notificationType}`;
  const translated = t(key);
  if (translated !== key) return translated;
  return notificationType.replace(/^kids_/, '').replace(/_/g, ' ');
}

export default function KidsBildirimlerPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();
  const { t, language } = useKidsI18n();
  const pushTried = useRef(false);

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

  if (authLoading || !user) {
    return (
      <div className="relative mx-auto max-w-lg rounded-2xl border border-violet-200/80 bg-white/90 p-8 text-center text-violet-900 shadow-lg dark:border-violet-900/50 dark:bg-gray-900/80 dark:text-violet-100">
        {t('common.loading')}
      </div>
    );
  }

  const notifications = list ?? [];

  return (
    <div className="relative mx-auto max-w-lg space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-violet-950 dark:text-white sm:text-2xl">{t('notifications.title')}</h1>
        {notifications.length > 0 ? (
          <button
            type="button"
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
            className="rounded-full border-2 border-violet-300 bg-white px-4 py-1.5 text-xs font-semibold text-violet-800 shadow-sm hover:bg-violet-50 disabled:opacity-50 dark:border-violet-700 dark:bg-violet-950/40 dark:text-violet-100 dark:hover:bg-violet-900/50"
          >
            {t('notifications.markAll')}
          </button>
        ) : null}
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-400">
        {t('notifications.subtitle')}
      </p>

      {isLoading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('notifications.loadingList')}</p>
      ) : isError ? (
        <p className="text-sm text-red-600 dark:text-red-400">{t('notifications.loadError')}</p>
      ) : notifications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/50 p-8 text-center text-sm text-slate-600 dark:border-violet-800 dark:bg-violet-950/20 dark:text-slate-400">
          {t('notifications.empty')}
        </div>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => (
            <li key={n.id}>
              <Link
                href={`${pathPrefix}${n.action_path}`}
                onClick={() => {
                  if (!n.is_read) markRead.mutate(n.id);
                }}
                className={`block rounded-2xl border-2 px-4 py-3 transition hover:shadow-md ${
                  n.is_read
                    ? 'border-violet-100/80 bg-white/80 dark:border-violet-900/40 dark:bg-gray-900/60'
                    : 'border-violet-300/90 bg-gradient-to-r from-violet-50 to-fuchsia-50/80 dark:border-fuchsia-800/50 dark:from-violet-950/50 dark:to-fuchsia-950/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="shrink-0 rounded-full bg-violet-200/80 px-2 py-0.5 text-[10px] font-bold tracking-wide text-violet-900 dark:bg-violet-800 dark:text-violet-100">
                    {typeLabel(n.notification_type, t)}
                  </span>
                  <time className="text-[11px] text-slate-500 dark:text-slate-400" dateTime={n.created_at}>
                    {new Date(n.created_at).toLocaleString(language === 'tr' ? 'tr-TR' : language === 'ge' ? 'de-DE' : 'en-US', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </time>
                </div>
                <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-100">{n.message}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
