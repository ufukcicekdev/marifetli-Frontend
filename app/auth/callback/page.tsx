'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore, type User } from '@/src/stores/auth-store';
import api from '@/src/lib/api';
import toast from 'react-hot-toast';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  useEffect(() => {
    // Hata query string'de gelebilir (?error=...)
    const errorFromQuery = searchParams.get('error');
    if (errorFromQuery) {
      setStatus('error');
      setErrorDetail(errorFromQuery);
      const msg = errorFromQuery === 'not_authenticated'
        ? 'Google ile giriş tamamlanamadı. (Oturum alınamadı – backend’de kullanıcı session’da yok.)'
        : `Giriş başarısız: ${errorFromQuery}`;
      toast.error(msg);
      return;
    }
    // Token'lar backend'den #access=...&refresh=... ile gelir (uzun JWT için)
    const hash = typeof window !== 'undefined' ? window.location.hash.slice(1) : '';
    const params = new URLSearchParams(hash || searchParams.toString());
    const access = params.get('access');
    const refresh = params.get('refresh');
    if (!access) {
      setStatus('error');
      setErrorDetail('access_token_yok');
      toast.error('Oturum bilgisi alınamadı. (URL’de access token gelmedi.)');
      return;
    }
    if (refresh) localStorage.setItem('refresh_token', refresh);
    localStorage.setItem('access_token', access);
    (async () => {
      try {
        const { data: user } = await api.getCurrentUser();
        setAuth(user, access);
        toast.success('Google ile giriş başarılı');
      } catch {
        setAuth({ id: 0, email: '', username: '' } as User, access);
      }
      setStatus('ok');
      router.replace('/');
    })();
  }, [searchParams, setAuth, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="text-center">
        {status === 'loading' && <p className="text-gray-600 dark:text-gray-400">Giriş tamamlanıyor...</p>}
        {status === 'ok' && <p className="text-gray-600 dark:text-gray-400">Yönlendiriliyorsunuz...</p>}
        {status === 'error' && (
          <div className="space-y-3">
            <p className="text-red-600 dark:text-red-400 font-medium">Giriş tamamlanamadı.</p>
            {errorDetail && (
              <p className="text-sm text-gray-500 dark:text-gray-400 font-mono break-all">
                Hata kodu: <strong>{errorDetail}</strong>
              </p>
            )}
            <button
              type="button"
              onClick={() => router.replace('/')}
              className="mt-4 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Ana sayfaya dön
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <p className="text-gray-600 dark:text-gray-400">Giriş tamamlanıyor...</p>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
