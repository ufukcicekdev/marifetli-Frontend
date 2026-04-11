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
  setupNativeNotificationTapHandler,
  getFCMTokenIfGranted,
  getPendingNotificationUrl,
  clearPendingNotificationUrl,
  getAndClearLaunchNotificationUrl,
  notificationUrlToPath,
} from '@/src/lib/firebase-messaging';

function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Capacitor } = require('@capacitor/core') as typeof import('@capacitor/core');
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * Giriş yapmış kullanıcı için FCM kurulumu:
 * - Web: SW mesajını dinle + foreground toast + token kaydet
 * - Native (iOS/Android): bildirim tap yönlendirmesi + foreground toast + token kaydet
 */
export function FirebasePushHandler() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setupDone = useRef(false);
  const tokenRegisterAttempted = useRef(false);

  // --- Web: Service Worker'dan NAVIGATE mesajını dinle ---
  useEffect(() => {
    if (isNativePlatform()) return;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (data?.type === 'NAVIGATE' && typeof data.url === 'string' && data.url) {
        router.push(notificationUrlToPath(data.url));
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [router]);

  // --- Native: bildirime tıklanınca yönlendir ---
  useEffect(() => {
    if (!isNativePlatform()) return;
    const cleanup = setupNativeNotificationTapHandler((path) => {
      router.push(path || '/bildirimler');
    });
    return cleanup;
  }, [router]);

  // --- Native: uygulama kapalıyken bildirime tıklanıp açıldıysa yönlendir ---
  useEffect(() => {
    if (!isNativePlatform()) return;

    // 1. Handler kurulmadan önce yakalanan tap var mı?
    const pending = getPendingNotificationUrl();
    if (pending) {
      clearPendingNotificationUrl();
      router.push(pending);
      return;
    }

    // 2. Delivered notifications içinde bekleyen var mı? (uygulama soğuk başlatma)
    getAndClearLaunchNotificationUrl().then((path) => {
      if (path) router.push(path);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // sadece mount'ta çalışsın

  // --- Foreground mesaj handler (web + native) ---
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

  // --- Token kaydı: izin zaten verilmişse sessizce kaydet ---
  useEffect(() => {
    if (!isAuthenticated || !canRequestPush() || tokenRegisterAttempted.current) return;
    if (!isNativePlatform()) {
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    }
    tokenRegisterAttempted.current = true;
    getFCMTokenIfGranted((token, deviceName) => api.registerFCMToken(token, deviceName)).then(
      (result) => {
        if (!result.ok && result.reason !== 'İzin yok') {
          tokenRegisterAttempted.current = false;
        }
      },
    );
  }, [isAuthenticated]);

  return null;
}
