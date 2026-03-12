'use client';

import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '@/src/lib/api';
import type { Notification as NotificationType } from '@/src/types';
import { useAuthStore } from '@/src/stores/auth-store';
import { OptimizedAvatar } from '@/src/components/optimized-avatar';
import { formatTimeAgo } from '@/src/lib/format-time';
import { getFCMTokenAndRegister, canRequestPush } from '@/src/lib/firebase-messaging';

// Normal bildirimler (beğeni, takip, cevap vb.) backend'de create_notification ile kaydedilir ve
// push_notifications açıksa Firebase (FCM) ile cihaza push gönderilir.

export default function BildirimlerPage() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const pushRegisterAttempted = useRef(false);

  // Sayfa açıldığında izin verilmişse token kaydını sessizce dene; toast gösterme (her girişte tekrarlanmasın).
  useEffect(() => {
    if (!isAuthenticated || pushRegisterAttempted.current || !canRequestPush()) return;
    if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') return;
    pushRegisterAttempted.current = true;
    getFCMTokenAndRegister((token, deviceName) => api.registerFCMToken(token, deviceName)).then((result) => {
      if (!result.ok && result.reason !== 'Bildirim izni verilmedi') toast.error(`Bildirim kaydı: ${result.reason}`);
    });
  }, [isAuthenticated]);

  const { data: list, isLoading, error } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.getNotifications();
      const d = res.data;
      return Array.isArray(d) ? d : (d as unknown as { results?: NotificationType[] })?.results ?? [];
    },
    enabled: isAuthenticated,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => api.markNotificationAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-unread-count'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api.markAllNotificationsAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-unread-count'] });
    },
  });

  const handleMarkRead = (n: NotificationType) => {
    if (!n.is_read) markReadMutation.mutate(n.id);
  };

  const notifications: NotificationType[] = list ?? [];
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Bildirimler</h1>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">Bildirimleri görmek için giriş yapın.</p>
            <Link href="/" className="mt-4 inline-block text-orange-500 hover:text-orange-600">
              Ana sayfaya dön
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Bildirimler</h1>
          <div className="flex flex-wrap items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="text-sm text-orange-500 hover:text-orange-600 disabled:opacity-70"
              >
                Tümünü okundu işaretle
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">Bildirimler yüklenemedi.</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-4">Henüz bildiriminiz yok.</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">Etkinlikler olduğunda burada görünecek.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {notifications.map((n) => {
              const href = n.notification_type === 'community_join_request' && (n as { community_slug?: string }).community_slug
                ? `/topluluk/${(n as { community_slug: string }).community_slug}/yonet`
                : n.question_slug
                  ? `/soru/${n.question_slug}${n.answer ? `#comment-${n.answer}` : ''}`
                  : n.sender?.username
                    ? `/profil/${n.sender.username}`
                    : '#';
              return (
                <li key={n.id}>
                  <Link
                    href={href}
                    onClick={() => handleMarkRead(n)}
                    className={`block rounded-xl border p-4 transition-colors ${
                      n.is_read
                        ? 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        : 'bg-orange-50/50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800/50 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-lg shrink-0">
                        {n.sender?.profile_picture ? (
                          <OptimizedAvatar src={n.sender.profile_picture} size={40} alt="" className="w-full h-full" />
                        ) : (
                          (n.sender?.username?.charAt(0) || '?').toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-900 dark:text-gray-100">{n.message}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {formatTimeAgo(n.created_at)}
                        </p>
                      </div>
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0 mt-2" title="Okunmadı" />
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
