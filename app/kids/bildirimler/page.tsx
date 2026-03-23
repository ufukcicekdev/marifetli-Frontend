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

function typeLabel(t: KidsNotificationRow['notification_type']): string {
  if (t === 'kids_new_assignment') return 'Yeni proje';
  if (t === 'kids_submission_received') return 'Teslim';
  return t;
}

export default function KidsBildirimlerPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();
  const pushTried = useRef(false);

  useEffect(() => {
    if (authLoading || !user || pushTried.current || !canRequestPush()) return;
    if (typeof Notification !== 'undefined' && Notification.permission === 'denied') return;
    pushTried.current = true;
    void getFCMTokenAndRegister((token, dn) => kidsRegisterFCMToken(token, dn)).then((r) => {
      if (!r.ok && r.reason !== 'Bildirim izni verilmedi') {
        pushTried.current = false;
      }
    });
  }, [authLoading, user]);

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
      toast.success('Tümü okundu olarak işaretlendi');
    },
    onError: () => toast.error('İşlem başarısız'),
  });

  if (authLoading || !user) {
    return (
      <div className="relative mx-auto max-w-lg rounded-2xl border border-violet-200/80 bg-white/90 p-8 text-center text-violet-900 shadow-lg dark:border-violet-900/50 dark:bg-gray-900/80 dark:text-violet-100">
        Yükleniyor…
      </div>
    );
  }

  const notifications = list ?? [];

  return (
    <div className="relative mx-auto max-w-lg space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-violet-950 dark:text-white sm:text-2xl">Bildirimler</h1>
        {notifications.length > 0 ? (
          <button
            type="button"
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
            className="rounded-full border-2 border-violet-300 bg-white px-4 py-1.5 text-xs font-semibold text-violet-800 shadow-sm hover:bg-violet-50 disabled:opacity-50 dark:border-violet-700 dark:bg-violet-950/40 dark:text-violet-100 dark:hover:bg-violet-900/50"
          >
            Tümünü okundu işaretle
          </button>
        ) : null}
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-400">
        Yeni projeler ve öğrenci teslimleri burada listelenir. Tarayıcı bildirimleri için izin vermen yeterli.
      </p>

      {isLoading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Liste yükleniyor…</p>
      ) : isError ? (
        <p className="text-sm text-red-600 dark:text-red-400">Bildirimler yüklenemedi.</p>
      ) : notifications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/50 p-8 text-center text-sm text-slate-600 dark:border-violet-800 dark:bg-violet-950/20 dark:text-slate-400">
          Henüz bildirimin yok.
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
                  <span className="shrink-0 rounded-full bg-violet-200/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-900 dark:bg-violet-800 dark:text-violet-100">
                    {typeLabel(n.notification_type)}
                  </span>
                  <time className="text-[11px] text-slate-500 dark:text-slate-400" dateTime={n.created_at}>
                    {new Date(n.created_at).toLocaleString('tr-TR', {
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
