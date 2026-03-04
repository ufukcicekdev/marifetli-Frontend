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

  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      setStatus('error');
      if (error === 'not_authenticated') toast.error('Google ile giriş tamamlanamadı.');
      else toast.error('Giriş başarısız. Lütfen tekrar deneyin.');
      router.replace('/');
      return;
    }
    const access = searchParams.get('access');
    const refresh = searchParams.get('refresh');
    if (!access) {
      setStatus('error');
      toast.error('Oturum bilgisi alınamadı.');
      router.replace('/');
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
        {status === 'error' && <p className="text-red-600 dark:text-red-400">Bir hata oluştu.</p>}
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
