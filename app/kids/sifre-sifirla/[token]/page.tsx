'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { KidsCard, KidsPanelMax } from '@/src/components/kids/kids-ui';
import { kidsConfirmPasswordReset } from '@/src/lib/kids-api';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';

const inputClass =
  'mt-1 w-full rounded-2xl border-2 border-violet-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-400/25 dark:border-violet-800 dark:bg-gray-800 dark:text-white';

export default function KidsSifreSifirlaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const { pathPrefix } = useKidsAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const homeLogin = kidsLoginPortalHref(pathPrefix);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!token?.trim()) {
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
      await kidsConfirmPasswordReset(token.trim(), password);
      setSuccess(true);
      toast.success('Şifren güncellendi');
      setTimeout(() => {
        router.replace(homeLogin);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bağlantı geçersiz veya süresi dolmuş.');
    } finally {
      setLoading(false);
    }
  }

  if (!token?.trim()) {
    return (
      <KidsPanelMax className="max-w-md">
        <KidsCard>
          <h1 className="font-logo text-xl font-bold text-slate-900 dark:text-white">Geçersiz bağlantı</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-gray-400">Şifre sıfırlama linki eksik veya hatalı.</p>
          <Link
            href={homeLogin}
            className="mt-6 inline-block text-sm font-bold text-violet-700 underline hover:text-fuchsia-600 dark:text-violet-300"
          >
            Girişe dön
          </Link>
        </KidsCard>
      </KidsPanelMax>
    );
  }

  return (
    <KidsPanelMax className="max-w-md">
      <KidsCard>
        {success ? (
          <div className="text-center">
            <p className="text-4xl" aria-hidden>
              ✅
            </p>
            <h1 className="font-logo mt-3 text-xl font-bold text-slate-900 dark:text-white">Şifren güncellendi</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-gray-400">
              Giriş modali açılacak sayfaya yönlendiriliyorsun…
            </p>
            <Link
              href={homeLogin}
              className="mt-6 inline-block text-sm font-bold text-violet-700 underline dark:text-violet-300"
            >
              Hemen giriş yap
            </Link>
          </div>
        ) : (
          <>
            <h1 className="font-logo text-xl font-bold text-slate-900 dark:text-white">Yeni şifre — Kids</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-gray-400">
              Marifetli Kids hesabın için yeni şifre belirle (öğrenci veya öğretmen).
            </p>

            {error ? (
              <div className="mt-4 rounded-xl border-2 border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
                {error}
              </div>
            ) : null}

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="kids-new-pw" className="text-sm font-bold text-slate-800 dark:text-gray-100">
                  Yeni şifre
                </label>
                <input
                  id="kids-new-pw"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  placeholder="En az 8 karakter"
                />
              </div>
              <div>
                <label htmlFor="kids-new-pw2" className="text-sm font-bold text-slate-800 dark:text-gray-100">
                  Şifre tekrar
                </label>
                <input
                  id="kids-new-pw2"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClass}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3 text-sm font-bold text-white shadow-lg disabled:opacity-50"
              >
                {loading ? 'Kaydediliyor…' : 'Şifreyi kaydet'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm">
              <Link href={homeLogin} className="font-semibold text-violet-700 underline dark:text-violet-300">
                Girişe dön
              </Link>
            </p>
          </>
        )}
      </KidsCard>
    </KidsPanelMax>
  );
}
