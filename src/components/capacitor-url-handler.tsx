'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, type User } from '@/src/stores/auth-store';
import api from '@/src/lib/api';
import toast from 'react-hot-toast';

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
 * Native uygulamada deep link ve OAuth callback'lerini yakalar.
 * com.marifetli.app://auth/callback#access=...&refresh=... → token işle, browser kapat
 */
export function CapacitorUrlHandler() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  // Google Auth'u uygulama açılırken bir kez initialize et
  useEffect(() => {
    if (!isNativePlatform()) return;
    (async () => {
      try {
        const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
        await GoogleAuth.initialize({
          clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
          scopes: ['profile', 'email'],
          grantOfflineAccess: true,
        });
      } catch {
        // sessizce geç
      }
    })();
  }, []);

  useEffect(() => {
    if (!isNativePlatform()) return;

    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        const { App } = await import('@capacitor/app');
        const { Browser } = await import('@capacitor/browser');

        const listener = await App.addListener('appUrlOpen', async (event) => {
          const url = event.url;
          if (!url) return;

          // OAuth callback: com.marifetli.app://auth/callback#access=...&refresh=...
          if (url.startsWith('com.marifetli.app://auth/callback')) {
            await Browser.close().catch(() => {});
            const hash = url.includes('#') ? url.split('#')[1] : '';
            const params = new URLSearchParams(hash);
            const access = params.get('access');
            const refresh = params.get('refresh');
            const error = new URLSearchParams(url.split('?')[1] || '').get('error');

            if (error) {
              toast.error('Google ile giriş tamamlanamadı.');
              return;
            }
            if (!access) return;

            if (refresh) localStorage.setItem('refresh_token', refresh);
            localStorage.setItem('access_token', access);
            try {
              const { data: user } = await api.getCurrentUser();
              setAuth(user, access);
              toast.success('Google ile giriş başarılı');
            } catch {
              setAuth({ id: 0, email: '', username: '' } as User, access);
            }
            router.replace('/');
            return;
          }

          // Diğer deep linkler → normal navigasyon
          try {
            const parsed = new URL(url);
            router.push(parsed.pathname + parsed.search + parsed.hash);
          } catch {
            // geçersiz URL
          }
        });

        cleanup = () => listener.remove();
      } catch {
        // Plugin yok veya web ortamı
      }
    })();

    return () => cleanup?.();
  }, [router, setAuth]);

  return null;
}
