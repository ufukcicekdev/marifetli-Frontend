'use client';

import { useEffect, useRef } from 'react';
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
 * Böylece telefonda da sitede izin verdiyse token kayıt olur ve push gelir.
 */
export function FirebasePushHandler() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setupDone = useRef(false);
  const tokenRegisterAttempted = useRef(false);

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
