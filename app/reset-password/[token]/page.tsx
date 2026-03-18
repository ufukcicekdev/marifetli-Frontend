'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/src/lib/api';
import { useAuthModalStore } from '@/src/stores/auth-modal-store';

const inputClass =
  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 sm:text-sm';

export default function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const openAuth = useAuthModalStore((s) => s.open);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!token) {
      setError('Geçersiz bağlantı.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor.');
      return;
    }
    if (password.length < 8) {
      setError('Şifre en az 8 karakter olmalıdır.');
      return;
    }
    setLoading(true);
    try {
      await api.confirmPasswordReset(token, password);
      setSuccess(true);
      setTimeout(() => {
        openAuth('login');
        router.push('/');
      }, 2000);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Link süresi dolmuş veya geçersiz. Şifre sıfırlama isteği tekrar gönderebilirsiniz.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 text-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Geçersiz bağlantı</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Şifre sıfırlama linki eksik veya hatalı.</p>
          <Link href="/" className="mt-6 inline-block text-orange-500 hover:text-orange-600 font-medium">
            Ana sayfaya dön
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-900 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800">
        {success ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Şifreniz güncellendi</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Yeni şifrenizle giriş yapabilirsiniz. Yönlendiriliyorsunuz...</p>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Yeni şifre belirleyin</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Hesabınız için yeni bir şifre girin.</p>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Yeni şifre</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  placeholder="En az 8 karakter"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Şifre tekrar</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClass}
                  placeholder="Şifrenizi tekrar girin"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Kaydediliyor...' : 'Şifreyi güncelle'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
              <Link href="/" className="text-orange-500 hover:text-orange-600">
                Ana sayfaya dön
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
