'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/src/stores/auth-store';
import api from '@/src/lib/api';
import {
  canRequestPush,
  ensureFirebaseApp,
  setupForegroundMessageHandler,
  getFCMTokenIfGranted,
} from '@/src/lib/firebase-messaging';

/**
 * Giriş yapmış kullanıcı için: FCM foreground toast + izin zaten verildiyse bu cihazın token'ını sessizce kaydeder.
 * Bildirim tıklanınca SW'dan gelen NAVIGATE mesajına göre sayfaya yönlendirir.
 */
export function FirebasePushHandler() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setupDone = useRef(false);
  const tokenRegisterAttempted = useRef(false);

  // Bildirim tıklanınca (uygulama açıkken) SW'dan gelen NAVIGATE ile ilgili sayfaya git
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (data?.type === 'NAVIGATE' && typeof data.url === 'string' && data.url) {
        const path = data.url.startsWith('http') ? new URL(data.url).pathname + (new URL(data.url).hash || '') : data.url;
        router.push(path || '/bildirimler');
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [router]);

  useEffect(() => {
    if (!isAuthenticated || !canRequestPush() || setupDone.current) return;
    setupDone.current = true;
    (async () => {
      const ok = await ensureFirebaseApp();
      if (!ok) return;
      setupForegroundMessageHandler((title, body) => {
        toast(`${title}${body ? `: ${body}` : ''}`, { duration: 5000 });
      });
    })();
  }, [isAuthenticated]);

  // İzin zaten verildiyse bu cihazın token'ını kaydet (telefon/PC fark etmez, her cihazda token olsun)
  useEffect(() => {
    if (!isAuthenticated || !canRequestPush() || tokenRegisterAttempted.current) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    tokenRegisterAttempted.current = true;
    getFCMTokenIfGranted((token, deviceName) => api.registerFCMToken(token, deviceName)).then((result) => {
      if (!result.ok && result.reason !== 'İzin yok') {
        tokenRegisterAttempted.current = false;
      }
    });
  }, [isAuthenticated]);

  return null;
}
