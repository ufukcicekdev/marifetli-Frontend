'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import { kidsRegisterFCMToken } from '@/src/lib/kids-api';
import {
  canRequestPush,
  ensureFirebaseApp,
  getFCMTokenIfGranted,
  setupForegroundMessageHandler,
} from '@/src/lib/firebase-messaging';

/**
 * Kids oturumu: FCM token'ı Kids API'ye kaydeder; ön planda gelen push için toast.
 * Bildirim tıklanınca service worker tam URL açar; açık sekmede yönlendirme ana layout’taki handler ile olur.
 */
export function KidsPushHandler() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useKidsAuth();
  const setupDone = useRef(false);
  const tokenRegisterAttempted = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (data?.type === 'NAVIGATE' && typeof data.url === 'string' && data.url) {
        const path = data.url.startsWith('http')
          ? new URL(data.url).pathname + (new URL(data.url).hash || '')
          : data.url;
        router.push(path || '/');
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [router]);

  useEffect(() => {
    if (!user || !canRequestPush() || setupDone.current) return;
    setupDone.current = true;
    void (async () => {
      const ok = await ensureFirebaseApp();
      if (!ok) return;
      setupForegroundMessageHandler((title, body) => {
        toast(`${title}${body ? `: ${body}` : ''}`, { duration: 5000 });
        void queryClient.invalidateQueries({ queryKey: ['kids-notifications'] });
        void queryClient.invalidateQueries({ queryKey: ['kids-notifications-unread'] });
      });
    })();
  }, [user, queryClient]);

  useEffect(() => {
    if (!user || !canRequestPush() || tokenRegisterAttempted.current) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    tokenRegisterAttempted.current = true;
    void getFCMTokenIfGranted((token, deviceName) => kidsRegisterFCMToken(token, deviceName)).then((result) => {
      if (!result.ok && result.reason !== 'İzin yok') {
        tokenRegisterAttempted.current = false;
      }
    });
  }, [user]);

  return null;
}
