'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import { type KidsUserRole } from '@/src/lib/kids-api';
import { kidsRequestPasswordReset } from '@/src/lib/kids-student-auth';
import { kidsHomeHref, kidsLoginPortalHref } from '@/src/lib/kids-config';
import api from '@/src/lib/api';

type Props = {
  title: string;
  subtitle: string;
  /** Bu sayfadan girişe izin verilen roller */
  allowedRoles: KidsUserRole[];
  redirectTo: string;
  /** Giriş kimliği alanı etiketi (öğrenci: kullanıcı adı + e-posta). */
  identifierLabel?: string;
  identifierPlaceholder?: string;
  /** `text`: kullanıcı adı; `email`: yalnızca e-posta */
  identifierInputType?: 'email' | 'text';
  /** Mod içi: çerçevesiz, küçük başlık */
  embedded?: boolean;
  /** Aynı ekranda iki form için benzersiz input id */
  fieldIdSuffix?: string;
  /** Şifremi unuttum (Kids e-posta ile sıfırlama). Belirtilmezse yalnızca embedded iken açılır. */
  forgotPasswordEnabled?: boolean;
  /** Modal: üst bilgi kutusunu şifre akışında gizlemek için */
  onEmbeddedForgotPhaseChange?: (phase: 'login' | 'forgot' | 'sent') => void;
};

export function KidsRoleLoginForm({
  title,
  subtitle,
  allowedRoles,
  redirectTo,
  identifierLabel = 'E-posta',
  identifierPlaceholder = 'ornek@email.com',
  identifierInputType = 'email',
  embedded = false,
  fieldIdSuffix = 'default',
  forgotPasswordEnabled,
  onEmbeddedForgotPhaseChange,
}: Props) {
  const router = useRouter();
  const { pathPrefix, login, logout } = useKidsAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  /** Gömülü modalda toast üst katmanda kalır; hatalar burada gösterilir. */
  const [loginInlineError, setLoginInlineError] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotInlineError, setForgotInlineError] = useState<string | null>(null);

  const homeHref = kidsHomeHref(pathPrefix);
  const idE = `kids-role-email-${fieldIdSuffix}`;
  const idP = `kids-role-password-${fieldIdSuffix}`;
  const showForgot = forgotPasswordEnabled !== undefined ? forgotPasswordEnabled : embedded;
  /** Yalnızca öğrenci: Kids `/auth/login/`; veli/öğretmen: ana site `/auth/login/` (aynı JWT). */
  const studentOnly = allowedRoles.length === 1 && allowedRoles[0] === 'student';

  useEffect(() => {
    if (!embedded || !showForgot || !onEmbeddedForgotPhaseChange) return;
    if (!forgotOpen) onEmbeddedForgotPhaseChange('login');
    else if (forgotSent) onEmbeddedForgotPhaseChange('sent');
    else onEmbeddedForgotPhaseChange('forgot');
  }, [embedded, showForgot, forgotOpen, forgotSent, onEmbeddedForgotPhaseChange]);

  function closeForgotFlow() {
    setForgotOpen(false);
    setForgotSent(false);
    setForgotInlineError(null);
  }

  function notifyLoginError(message: string) {
    setLoginInlineError(message);
    if (!embedded) toast.error(message);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoginInlineError(null);
    setLoading(true);
    try {
      const u = await login(email, password, { useMainSitePortal: !studentOnly });
      if (!allowedRoles.includes(u.role)) {
        logout();
        notifyLoginError('Bu sayfa seçtiğiniz hesap türü için değil.');
        return;
      }
      toast.success('Giriş yapıldı');
      router.push(`${pathPrefix}${redirectTo}`);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Giriş başarısız';
      notifyLoginError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function onForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    const em = email.trim();
    if (!em) {
      const msg = 'E-posta adresini yaz.';
      setForgotInlineError(msg);
      if (!embedded) toast.error(msg);
      return;
    }
    setForgotInlineError(null);
    setForgotLoading(true);
    try {
      if (studentOnly) {
        await kidsRequestPasswordReset(em);
      } else {
        await api.requestPasswordReset(em);
      }
      setForgotSent(true);
      toast.success('İstek alındı — e-postanı kontrol et.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gönderilemedi';
      setForgotInlineError(msg);
      if (!embedded) toast.error(msg);
    } finally {
      setForgotLoading(false);
    }
  }

  const forgotPanelClass =
    'rounded-2xl border-2 border-violet-200/90 bg-gradient-to-br from-violet-50/95 to-fuchsia-50/40 p-4 shadow-sm dark:border-violet-800/60 dark:from-violet-950/50 dark:to-fuchsia-950/25';

  const inputClass =
    'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none ring-violet-400/30 focus:border-violet-500 focus:ring-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white';

  /** Mod içi: şifre sıfırlama tam ekran kart — giriş alanları gizli, tek e-posta, modal kısa kalır */
  if (embedded && showForgot && forgotOpen) {
    return (
      <div className="space-y-3">
        {forgotSent ? (
          <div className={forgotPanelClass}>
            <p className="text-center text-2xl" aria-hidden>
              📬
            </p>
            <h3 className="mt-2 text-center font-logo text-base font-bold text-violet-950 dark:text-violet-100">
              E-postanı kontrol et
            </h3>
            <p className="mt-2 text-center text-xs leading-relaxed text-slate-600 dark:text-gray-300">
              Gelen kutunda veya spam klasöründe şifre sıfırlama bağlantısını ara. Link yaklaşık{' '}
              <strong className="font-semibold">1 saat</strong> geçerlidir.
            </p>
            <button
              type="button"
              onClick={closeForgotFlow}
              className="mt-4 w-full rounded-full bg-violet-600 py-2.5 text-sm font-bold text-white hover:bg-violet-500"
            >
              Girişe dön
            </button>
          </div>
        ) : (
          <div className={forgotPanelClass}>
            <button
              type="button"
              onClick={closeForgotFlow}
              className="mb-1 flex items-center gap-1 text-xs font-bold text-violet-700 hover:text-fuchsia-600 dark:text-violet-300"
            >
              <span aria-hidden>←</span> Girişe dön
            </button>
            <h3 className="font-logo text-lg font-bold text-violet-950 dark:text-white">Şifre sıfırlama</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-gray-300">
              {studentOnly
                ? 'Kids öğrenci hesabına kayıtlı e-postana tek kullanımlık bağlantı göndeririz.'
                : 'Marifetli hesabına kayıtlı e-postana (ana site ile aynı) şifre sıfırlama bağlantısı göndeririz.'}
            </p>
            <form className="mt-4 space-y-3" onSubmit={onForgotSubmit}>
              {forgotInlineError ? (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-100"
                >
                  {forgotInlineError}
                </div>
              ) : null}
              <div>
                <label htmlFor={idE} className="text-xs font-bold text-slate-700 dark:text-gray-200">
                  {identifierLabel}
                </label>
                <input
                  id={idE}
                  type={identifierInputType === 'email' ? 'email' : 'text'}
                  autoComplete={identifierInputType === 'email' ? 'email' : 'username'}
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setForgotInlineError(null);
                  }}
                  className={inputClass}
                  placeholder={identifierPlaceholder}
                />
              </div>
              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 py-2.5 text-sm font-bold text-white shadow-md disabled:opacity-50"
              >
                {forgotLoading ? 'Gönderiliyor…' : 'Bağlantıyı gönder'}
              </button>
            </form>
          </div>
        )}
      </div>
    );
  }

  const inner = (
    <>
      {embedded ? (
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
      ) : (
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
      )}
      <p className={embedded ? 'mt-1 text-xs text-slate-600 dark:text-gray-300' : 'mt-1 text-sm text-slate-600 dark:text-gray-300'}>
        {subtitle}
      </p>
      <form className={embedded ? 'mt-4 space-y-3' : 'mt-6 space-y-4'} onSubmit={onSubmit}>
        {loginInlineError ? (
          <div
            role="alert"
            className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-100"
          >
            {loginInlineError}
          </div>
        ) : null}
        <div>
          <label htmlFor={idE} className="block text-sm font-medium text-slate-700 dark:text-gray-200">
            {identifierLabel}
          </label>
          <input
            id={idE}
            type={identifierInputType === 'email' ? 'email' : 'text'}
            autoComplete={identifierInputType === 'email' ? 'email' : 'username'}
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setLoginInlineError(null);
            }}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none ring-amber-400 focus:ring-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            placeholder={identifierPlaceholder}
          />
        </div>
        <div>
          <label htmlFor={idP} className="block text-sm font-medium text-slate-700 dark:text-gray-200">
            Şifre
          </label>
          <input
            id={idP}
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setLoginInlineError(null);
            }}
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

      {showForgot ? (
        <div className={embedded ? 'mt-3 text-center' : 'mt-6 border-t border-amber-200/60 pt-4 text-center dark:border-amber-900/30'}>
          <button
            type="button"
            onClick={() => {
              setForgotOpen(true);
              setForgotSent(false);
              setForgotInlineError(null);
            }}
            className="text-sm font-bold text-violet-700 underline underline-offset-2 hover:text-fuchsia-600 dark:text-violet-300"
          >
            Şifremi unuttum
          </button>
        </div>
      ) : null}

      {!embedded ? (
        <p className="mt-6 text-center text-sm text-slate-500 dark:text-gray-400">
          <a href={homeHref} className="text-amber-700 underline dark:text-amber-400">
            Ana sayfa
          </a>
          {' · '}
          <a href={kidsLoginPortalHref(pathPrefix)} className="text-amber-700 underline dark:text-amber-400">
            Giriş modali
          </a>
        </p>
      ) : null}
    </>
  );

  /** Tam sayfa (embedded değil): şifre akışı aynı mantık, tek sütun */
  if (!embedded && showForgot && forgotOpen) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border-2 border-amber-200 bg-white p-8 shadow-sm dark:border-amber-800/50 dark:bg-gray-900/80">
        {forgotSent ? (
          <div className="text-center">
            <p className="text-4xl" aria-hidden>
              📬
            </p>
            <h2 className="mt-3 text-xl font-bold text-slate-900 dark:text-white">E-postanı kontrol et</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-gray-400">
              Bağlantı gelmezse spam klasörüne bak. Link yaklaşık 1 saat geçerlidir.
            </p>
            <button
              type="button"
              onClick={closeForgotFlow}
              className="mt-6 w-full rounded-full bg-amber-500 py-2.5 text-sm font-semibold text-white"
            >
              Girişe dön
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={closeForgotFlow}
              className="text-sm font-bold text-amber-800 underline dark:text-amber-200"
            >
              ← Girişe dön
            </button>
            <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">Şifre sıfırlama</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-gray-400">
              {studentOnly
                ? 'Kids öğrenci e-postana sıfırlama bağlantısı gönderilir.'
                : 'Marifetli hesap e-postana sıfırlama bağlantısı gönderilir (ana site ile ortak).'}
            </p>
            <form className="mt-6 space-y-4" onSubmit={onForgotSubmit}>
              {forgotInlineError ? (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-100"
                >
                  {forgotInlineError}
                </div>
              ) : null}
              <div>
                <label htmlFor={`${idE}-full-forgot`} className="block text-sm font-medium text-slate-700 dark:text-gray-200">
                  E-posta
                </label>
                <input
                  id={`${idE}-full-forgot`}
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setForgotInlineError(null);
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full rounded-full bg-amber-500 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {forgotLoading ? 'Gönderiliyor…' : 'Bağlantıyı gönder'}
              </button>
            </form>
          </>
        )}
      </div>
    );
  }

  if (embedded) {
    return <div className="space-y-1">{inner}</div>;
  }

  return (
    <div className="mx-auto max-w-md rounded-3xl border-2 border-amber-200 bg-white p-8 shadow-sm dark:border-amber-800/50 dark:bg-gray-900/80">
      {inner}
    </div>
  );
}
