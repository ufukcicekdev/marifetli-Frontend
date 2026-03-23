'use client';

import { useEffect, useId, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import toast from 'react-hot-toast';
import { kidsApiUrl, KIDS_REFRESH_STORAGE_KEY, KIDS_TOKEN_STORAGE_KEY } from '@/src/lib/kids-config';
import { kidsInvitePreview as fetchInvitePreview, type KidsInvitePreview } from '@/src/lib/kids-api';

export default function KidsInviteAcceptPage() {
  const params = useParams();
  const pathname = usePathname();
  const token = typeof params.token === 'string' ? params.token : '';

  const [preview, setPreview] = useState<KidsInvitePreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [studentEmail, setStudentEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const emailId = useId();

  const prefix = pathname.startsWith('/kids') ? '/kids' : '';
  const panelHref = `${prefix}/ogrenci/panel`;

  useEffect(() => {
    if (!token) {
      setPreviewError('Geçersiz bağlantı');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const p = await fetchInvitePreview(token);
        if (!cancelled) {
          setPreview(p);
          setPreviewError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setPreviewError(e instanceof Error ? e.message : 'Davet bulunamadı');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      toast.error('Geçersiz davet');
      return;
    }
    if (preview?.requires_student_email && !studentEmail.trim()) {
      toast.error('Öğrenci için kullanılacak e-posta adresini girin.');
      return;
    }
    setLoading(true);
    try {
      const body: Record<string, string> = {
        token,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        password,
      };
      if (preview?.requires_student_email) {
        body.email = studentEmail.trim().toLowerCase();
      }
      const res = await fetch(kidsApiUrl('/auth/accept-invite/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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

  if (previewError && !preview) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border-2 border-rose-200 bg-white p-8 shadow-sm dark:border-rose-900 dark:bg-gray-900">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Davet kullanılamıyor</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-gray-400">{previewError}</p>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border-2 border-sky-200 bg-white p-8 text-center text-slate-600 dark:border-sky-900 dark:bg-gray-900 dark:text-gray-400">
        Yükleniyor…
      </div>
    );
  }

  const exp = new Date(preview.expires_at);
  const schoolLine = [preview.school_name, preview.class_name].filter(Boolean).join(' · ');

  return (
    <div className="mx-auto max-w-md rounded-3xl border-2 border-sky-200 bg-white p-8 shadow-sm dark:border-sky-800 dark:bg-gray-900">
      <p className="text-sm font-semibold text-sky-700 dark:text-sky-300">Sınıf daveti</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
        <span className="text-sky-600 dark:text-sky-400">{preview.teacher_display}</span> seni{' '}
        <strong>{preview.class_name}</strong> sınıfına katılmaya davet etti.
      </h1>
      {schoolLine ? (
        <p className="mt-2 text-sm text-slate-600 dark:text-gray-400">{schoolLine}</p>
      ) : null}
      {preview.class_description ? (
        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-gray-400">
          {preview.class_description}
        </p>
      ) : null}
      <p className="mt-3 text-xs text-slate-500 dark:text-gray-500">
        Bu davet yaklaşık <strong>{exp.toLocaleDateString('tr-TR')}</strong> tarihine kadar geçerlidir.
      </p>

      <form className="mt-8 space-y-4" onSubmit={onSubmit}>
        {preview.requires_student_email ? (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300" htmlFor={emailId}>
              Öğrenci e-postası
            </label>
            <input
              id={emailId}
              type="email"
              required
              autoComplete="email"
              value={studentEmail}
              onChange={(e) => setStudentEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none ring-sky-400 focus:ring-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              placeholder="ogrenci@aile.com"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-gray-500">
              Giriş ve bildirimler bu adresle yapılır. Aynı adresle daha önce kayıt olduysan aynı şifreyi
              kullan.
            </p>
          </div>
        ) : (
          <p className="rounded-xl bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:bg-sky-950/50 dark:text-sky-100">
            Kayıt, davet e-postasındaki adrese yapılacaktır. E-postayı değiştiremezsin.
          </p>
        )}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-gray-300" htmlFor="fn">
            Ad
          </label>
          <input
            id="fn"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none ring-sky-400 focus:ring-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-gray-300" htmlFor="ln">
            Soyad
          </label>
          <input
            id="ln"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none ring-sky-400 focus:ring-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-gray-300" htmlFor="pw">
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
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none ring-sky-400 focus:ring-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-sky-500 py-2.5 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-60"
        >
          {loading ? 'Kaydediliyor…' : 'Hesabı oluştur / sınıfa katıl'}
        </button>
      </form>
    </div>
  );
}
