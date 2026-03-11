'use client';

import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/src/stores/auth-store';
import {
  canRequestPush,
  ensureFirebaseApp,
  setupForegroundMessageHandler,
} from '@/src/lib/firebase-messaging';

/**
 * Giriş yapmış kullanıcı için FCM foreground mesajlarını her sayfada toast ile gösterir.
 * Terminalden send_test_push çalıştırıldığında toast'ın görünmesi için bu bileşen layout'ta mount edilir.
 */
export function FirebasePushHandler() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setupDone = useRef(false);

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

  return null;
}
