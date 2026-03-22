'use client';

import { useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  kidsApiUrl,
  KIDS_REFRESH_STORAGE_KEY,
  KIDS_TOKEN_STORAGE_KEY,
} from '@/src/lib/kids-config';

export default function KidsInviteAcceptPage() {
  const params = useParams();
  const pathname = usePathname();
  const token = typeof params.token === 'string' ? params.token : '';

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const prefix = pathname.startsWith('/kids') ? '/kids' : '';
  const panelHref = `${prefix}/ogrenci/panel`;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      toast.error('Geçersiz davet');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(kidsApiUrl('/auth/accept-invite/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error((data as { detail?: string }).detail || 'Kayıt tamamlanamadı');
        return;
      }
      const access = (data as { access?: string }).access;
      const refresh = (data as { refresh?: string }).refresh;
      if (access) localStorage.setItem(KIDS_TOKEN_STORAGE_KEY, access);
      if (refresh) localStorage.setItem(KIDS_REFRESH_STORAGE_KEY, refresh);
      toast.success('Hoş geldin!');
      window.location.assign(panelHref);
    } catch {
      toast.error('Bağlantı hatası');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-3xl border-2 border-sky-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900">Davetle kayıt</h1>
      <p className="mt-1 text-sm text-slate-600">
        Veli e-postasına gelen davetle adınızı ve şifrenizi belirleyin. Zaten hesabınız varsa aynı
        şifreyle sınıfa eklenirsiniz.
      </p>
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="fn">
            Ad
          </label>
          <input
            id="fn"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none ring-sky-400 focus:ring-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="ln">
            Soyad
          </label>
          <input
            id="ln"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none ring-sky-400 focus:ring-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="pw">
            Şifre (en az 8 karakter)
          </label>
          <input
            id="pw"
            type="password"
            minLength={8}
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none ring-sky-400 focus:ring-2"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-sky-500 py-2.5 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-60"
        >
          {loading ? 'Kaydediliyor…' : 'Hesabı oluştur'}
        </button>
      </form>
    </div>
  );
}
