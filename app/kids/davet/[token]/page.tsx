'use client';

import { useEffect, useId, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import toast from 'react-hot-toast';
import { kidsApiUrl } from '@/src/lib/kids-config';
import {
  fetchKidsInvitePreview,
  type KidsInvitePreview,
} from '@/src/lib/kids-invite-public';
import { applyKidsSessionFromAuthResponse } from '@/src/lib/kids-session-storage';
import { reconcileAuthStoreWithAccessToken } from '@/src/stores/auth-store';
import { trPhoneDigitsFromInput, trPhoneInputChange } from '@/src/lib/tr-phone-input';

function needsParentEmailInForm(p: KidsInvitePreview): boolean {
  return Boolean(p.requires_parent_email ?? p.requires_student_email);
}

export default function KidsInviteAcceptPage() {
  const params = useParams();
  const pathname = usePathname();
  const token = typeof params.token === 'string' ? params.token : '';

  const [preview, setPreview] = useState<KidsInvitePreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [parentEmail, setParentEmail] = useState('');
  const [parentFirstName, setParentFirstName] = useState('');
  const [parentLastName, setParentLastName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentPassword, setParentPassword] = useState('');
  const [children, setChildren] = useState([{ first_name: '', last_name: '', password: '' }]);
  const [loading, setLoading] = useState(false);

  const parentEmailId = useId();

  const prefix = pathname.startsWith('/kids') ? '/kids' : '';
  const panelHref = `${prefix}/veli/panel`;

  useEffect(() => {
    if (!token) {
      setPreviewError('Geçersiz bağlantı');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const p = await fetchKidsInvitePreview(token);
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
    if (!preview) return;
    const askEmail = needsParentEmailInForm(preview);
    if (askEmail && !parentEmail.trim()) {
      toast.error('Veli e-posta adresini girin.');
      return;
    }
    setLoading(true);
    try {
      const normalizedChildren = children
        .map((c) => ({
          first_name: c.first_name.trim(),
          last_name: c.last_name.trim(),
          password: c.password,
        }))
        .filter((c) => c.first_name && c.last_name && c.password);
      if (normalizedChildren.length === 0) {
        toast.error('En az bir çocuk bilgisi girin.');
        return;
      }
      const body: Record<string, unknown> = {
        token,
        parent_first_name: parentFirstName.trim(),
        parent_last_name: parentLastName.trim(),
        parent_phone: trPhoneDigitsFromInput(parentPhone),
        parent_password: parentPassword,
        children: normalizedChildren.map((c) => ({
          first_name: c.first_name,
          last_name: c.last_name,
          password: c.password,
        })),
      };
      if (askEmail) {
        body.email = parentEmail.trim().toLowerCase();
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
      const createdChildren = (data as { created_children?: Array<{ student_login_name?: string }> })
        .created_children;
      const firstLogin =
        createdChildren?.[0]?.student_login_name ||
        (data as { student_login_name?: string }).student_login_name;
      const tokenKind = (data as { token_kind?: string }).token_kind;
      applyKidsSessionFromAuthResponse({
        access: (data as { access?: string }).access,
        refresh: (data as { refresh?: string }).refresh,
        token_kind: tokenKind,
      });
      if (tokenKind === 'main_site') {
        await reconcileAuthStoreWithAccessToken();
      }
      if (firstLogin) {
        const count = Array.isArray(createdChildren) ? createdChildren.length : 1;
        toast.success(
          `Hoş geldin! ${count} çocuk eklendi. İlk giriş kullanıcı adı: ${firstLogin}`,
          { duration: 8000 },
        );
      } else {
        toast.success('Hoş geldin!');
      }
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
  const askEmail = needsParentEmailInForm(preview);

  return (
    <div className="mx-auto max-w-lg rounded-3xl border-2 border-sky-200 bg-white p-8 shadow-sm dark:border-sky-800 dark:bg-gray-900">
      <p className="text-sm font-semibold text-sky-700 dark:text-sky-300">Sınıf daveti</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
        <span className="text-sky-600 dark:text-sky-400">{preview.teacher_display}</span> sınıfına katılım
      </h1>
      <p className="mt-2 text-lg font-bold text-violet-800 dark:text-violet-200">{preview.class_name}</p>
      {schoolLine ? (
        <p className="mt-1 text-sm text-slate-600 dark:text-gray-400">{schoolLine}</p>
      ) : null}
      {preview.class_description ? (
        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-gray-400">
          {preview.class_description}
        </p>
      ) : null}
      <p className="mt-3 text-xs text-slate-500 dark:text-gray-500">
        Bu davet yaklaşık <strong>{exp.toLocaleDateString('tr-TR')}</strong> tarihine kadar geçerlidir.
      </p>
      <p className="mt-3 rounded-xl bg-violet-50 px-3 py-2 text-xs leading-relaxed text-violet-900 dark:bg-violet-950/40 dark:text-violet-100">
        Önce <strong>veli hesabı</strong> (e-posta + şifre) oluşturulur; çocuğun kendi e-postası gerekmez. Çocuk paneline
        en kolay yol: veli girişi → <strong>çocuk paneline geç</strong>. İstersen çocuk, kullanıcı adı + çocuk şifresiyle de
        girebilir. İleride içerik onayları için veli oturumu kullanılacaktır.
      </p>

      <form className="mt-8 space-y-4" onSubmit={onSubmit}>
        {askEmail ? (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300" htmlFor={parentEmailId}>
              Veli e-postası <span className="text-rose-500">*</span>
            </label>
            <input
              id={parentEmailId}
              type="email"
              required
              autoComplete="email"
              value={parentEmail}
              onChange={(e) => setParentEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none ring-sky-400 focus:ring-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              placeholder="veli@email.com"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-gray-500">
              Veli girişi ve bildirimler bu adrese gider. Çocuğun girişi için ayrı bir kullanıcı adı oluşturulur.
            </p>
          </div>
        ) : (
          <p className="rounded-xl bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:bg-sky-950/50 dark:text-sky-100">
            Kayıt, davet e-postasındaki veli adresine yapılacaktır; e-postayı burada değiştiremezsin.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300" htmlFor="pfn">
              Veli adı <span className="text-rose-500">*</span>
            </label>
            <input
              id="pfn"
              required
              autoComplete="given-name"
              value={parentFirstName}
              onChange={(e) => setParentFirstName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none ring-sky-400 focus:ring-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300" htmlFor="pln">
              Veli soyadı <span className="text-rose-500">*</span>
            </label>
            <input
              id="pln"
              required
              autoComplete="family-name"
              value={parentLastName}
              onChange={(e) => setParentLastName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none ring-sky-400 focus:ring-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-gray-300" htmlFor="pph">
            Veli telefonu
          </label>
          <input
            id="pph"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            maxLength={14}
            value={parentPhone}
            onChange={(e) => setParentPhone(trPhoneInputChange(e.target.value))}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono tabular-nums outline-none ring-sky-400 focus:ring-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            placeholder="0 5XX XXX XX XX"
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-gray-500">
            Yalnızca rakam; +90 ile başlarsan otomatik düzenlenir. İsteğe bağlı.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-gray-300" htmlFor="ppw">
            Veli şifresi <span className="text-rose-500">*</span> <span className="text-xs font-normal">(en az 8 karakter)</span>
          </label>
          <input
            id="ppw"
            type="password"
            minLength={8}
            autoComplete="new-password"
            required
            value={parentPassword}
            onChange={(e) => setParentPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none ring-sky-400 focus:ring-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>

        <hr className="border-slate-200 dark:border-gray-700" />

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-wide text-fuchsia-700 dark:text-fuchsia-300">
            Çocuk hesapları
          </p>
          <button
            type="button"
            onClick={() =>
              setChildren((prev) =>
                prev.length >= 10 ? prev : [...prev, { first_name: '', last_name: '', password: '' }],
              )
            }
            className="rounded-full border border-fuchsia-300 px-3 py-1 text-xs font-bold text-fuchsia-700 hover:bg-fuchsia-50 dark:border-fuchsia-700 dark:text-fuchsia-300 dark:hover:bg-fuchsia-950/40"
          >
            + Çocuk ekle
          </button>
        </div>

        {children.map((child, idx) => (
          <div key={idx} className="rounded-2xl border border-slate-200 p-3 dark:border-gray-700">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-800 dark:text-gray-100">Çocuk {idx + 1}</p>
              {children.length > 1 ? (
                <button
                  type="button"
                  onClick={() => setChildren((prev) => prev.filter((_, i) => i !== idx))}
                  className="text-xs font-semibold text-rose-600 hover:underline dark:text-rose-300"
                >
                  Kaldır
                </button>
              ) : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300">
                  Çocuğun adı <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  autoComplete="off"
                  value={child.first_name}
                  onChange={(e) =>
                    setChildren((prev) =>
                      prev.map((c, i) => (i === idx ? { ...c, first_name: e.target.value } : c)),
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none ring-sky-400 focus:ring-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300">
                  Çocuğun soyadı <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  autoComplete="off"
                  value={child.last_name}
                  onChange={(e) =>
                    setChildren((prev) =>
                      prev.map((c, i) => (i === idx ? { ...c, last_name: e.target.value } : c)),
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none ring-sky-400 focus:ring-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-sm font-medium text-slate-700 dark:text-gray-300">
                Çocuk şifresi <span className="text-rose-500">*</span>{' '}
                <span className="text-xs font-normal">(en az 8 karakter)</span>
              </label>
              <input
                type="password"
                minLength={8}
                autoComplete="new-password"
                required
                value={child.password}
                onChange={(e) =>
                  setChildren((prev) =>
                    prev.map((c, i) => (i === idx ? { ...c, password: e.target.value } : c)),
                  )
                }
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none ring-sky-400 focus:ring-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>
        ))}
        <p className="text-xs text-slate-500 dark:text-gray-500">
          Aynı sınıf için birden fazla çocuk ekleyebilirsin (en fazla 10).
        </p>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-sky-500 py-2.5 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-60"
        >
          {loading ? 'Kaydediliyor…' : 'Veli ve çocuk hesaplarını oluştur / sınıfa katıl'}
        </button>
      </form>
    </div>
  );
}
