'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/src/lib/api';
import { useAuthStore } from '@/src/stores/auth-store';

export default function VerifyEmailPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Geçersiz doğrulama linki.');
      return;
    }
    api
      .verifyEmail(token)
      .then(async (res) => {
        setStatus('success');
        setMessage(res.data?.message || 'E-posta adresiniz doğrulandı.');
        try {
          const { data } = await api.getCurrentUser();
          setUser(data);
        } catch {
          // Kullanıcı giriş yapmamışsa getCurrentUser 401 döner, yine de başarı göster
        }
        setTimeout(() => router.push('/sorular'), 2500);
      })
      .catch((err) => {
        setStatus('error');
        const msg = err.response?.data?.error || err.message || 'Doğrulama başarısız. Link süresi dolmuş veya geçersiz olabilir.';
        setMessage(msg);
      });
  }, [token, router]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-900 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 text-center">
        {status === 'loading' && (
          <>
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">E-posta doğrulanıyor...</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Lütfen bekleyin.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">E-posta doğrulandı</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">{message}</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">Ana sayfaya yönlendiriliyorsunuz...</p>
            <Link href="/sorular" className="mt-6 inline-block text-orange-500 hover:text-orange-600 font-medium">
              Hemen git →
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Doğrulama başarısız</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">{message}</p>
            <Link href="/giris" className="mt-6 inline-block px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium">
              Giriş sayfasına dön
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
