'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import type { KidsUserRole } from '@/src/lib/kids-api';

type Props = {
  title: string;
  subtitle: string;
  /** Bu sayfadan girişe izin verilen roller */
  allowedRoles: KidsUserRole[];
  redirectTo: string;
};

export function KidsRoleLoginForm({ title, subtitle, allowedRoles, redirectTo }: Props) {
  const router = useRouter();
  const { pathPrefix, login, logout } = useKidsAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const homeHref = pathPrefix || '/';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(email, password);
      if (!allowedRoles.includes(u.role)) {
        logout();
        toast.error('Bu sayfa seçtiğiniz hesap türü için değil.');
        return;
      }
      toast.success('Giriş yapıldı');
      router.push(`${pathPrefix}${redirectTo}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Giriş başarısız');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-3xl border-2 border-amber-200 bg-white p-8 shadow-sm dark:border-amber-800/50 dark:bg-gray-900/80">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-gray-300">{subtitle}</p>
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div>
          <label htmlFor="kids-role-email" className="block text-sm font-medium text-slate-700 dark:text-gray-200">
            E-posta
          </label>
          <input
            id="kids-role-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none ring-amber-400 focus:ring-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <div>
          <label htmlFor="kids-role-password" className="block text-sm font-medium text-slate-700 dark:text-gray-200">
            Şifre
          </label>
          <input
            id="kids-role-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none ring-amber-400 focus:ring-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-amber-500 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
        >
          {loading ? 'Giriş…' : 'Giriş yap'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500 dark:text-gray-400">
        <a href={homeHref} className="text-amber-700 underline dark:text-amber-400">
          Ana sayfa
        </a>
        {' · '}
        <a href={`${pathPrefix}/giris`} className="text-amber-700 underline dark:text-amber-400">
          Tüm giriş seçenekleri
        </a>
      </p>
    </div>
  );
}
