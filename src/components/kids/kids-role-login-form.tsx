'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowRight, Eye, EyeOff, Lock, MailCheck, User } from 'lucide-react';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import { type KidsUserRole } from '@/src/lib/kids-api';
import { kidsRequestPasswordReset } from '@/src/lib/kids-student-auth';
import { kidsHomeHref, kidsLoginPortalHref } from '@/src/lib/kids-config';
import api from '@/src/lib/api';
import { useKidsI18n } from '@/src/providers/kids-language-provider';

const STORAGE_IDENTIFIER = 'marifetli_kids_login_identifier';
const STORAGE_REMEMBER = 'marifetli_kids_remember';

type Props = {
  title: string;
  subtitle: string;
  allowedRoles: KidsUserRole[];
  redirectTo: string;
  identifierLabel?: string;
  identifierPlaceholder?: string;
  identifierInputType?: 'email' | 'text';
  embedded?: boolean;
  fieldIdSuffix?: string;
  forgotPasswordEnabled?: boolean;
  onEmbeddedForgotPhaseChange?: (phase: 'login' | 'forgot' | 'sent') => void;
  /** landing giriş kartı — mockup: beyaz alanlar, mor etiket, pembe “şifremi unuttum”, ok ikonlu gönder */
  surfaceVariant?: 'default' | 'card';
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
  surfaceVariant = 'default',
}: Props) {
  const router = useRouter();
  const { t } = useKidsI18n();
  const { pathPrefix, login, logout } = useKidsAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginInlineError, setLoginInlineError] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotInlineError, setForgotInlineError] = useState<string | null>(null);

  const homeHref = kidsHomeHref(pathPrefix);
  const idE = `kids-role-email-${fieldIdSuffix}`;
  const idP = `kids-role-password-${fieldIdSuffix}`;
  const showForgot = forgotPasswordEnabled !== undefined ? forgotPasswordEnabled : embedded;
  const studentOnly = allowedRoles.length === 1 && allowedRoles[0] === 'student';

  const cardFields = surfaceVariant === 'card';
  const fieldShell = cardFields
    ? 'relative flex w-full items-center rounded-2xl border-2 border-violet-100/90 bg-gradient-to-b from-white to-violet-50/50 shadow-[0_2px_14px_-4px_rgba(139,92,246,0.18)] transition focus-within:border-fuchsia-400 focus-within:shadow-[0_4px_20px_-4px_rgba(192,38,211,0.25)] focus-within:ring-2 focus-within:ring-violet-200/70 dark:border-violet-700/60 dark:from-zinc-800 dark:to-violet-950/40 dark:focus-within:border-fuchsia-500 dark:focus-within:ring-fuchsia-900/40'
    : 'relative flex w-full items-center rounded-2xl border-0 bg-zinc-100 ring-1 ring-zinc-200/80 transition focus-within:ring-2 focus-within:ring-violet-400/50 dark:bg-zinc-800/80 dark:ring-zinc-700';
  const fieldInput =
    'w-full border-0 bg-transparent py-3.5 text-sm text-slate-900 outline-none ring-0 placeholder:text-zinc-400 dark:text-white dark:placeholder:text-zinc-500';
  const labelClass = cardFields
    ? 'text-[10px] font-bold uppercase tracking-wider text-violet-500 dark:text-violet-300'
    : 'text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400';
  const forgotClass = cardFields
    ? 'text-sm font-bold text-[#E91E63] hover:text-[#C2185B] dark:text-pink-400 dark:hover:text-pink-300'
    : 'text-sm font-bold text-violet-600 hover:text-violet-500 dark:text-violet-400';
  const submitClass = cardFields
    ? 'flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#9D4EDD] via-fuchsia-600 to-[#D0316E] py-3.5 text-sm font-black text-white shadow-[0_14px_32px_-6px_rgba(157,78,221,0.5),0_6px_20px_-4px_rgba(208,49,110,0.25)] transition hover:brightness-[1.05] disabled:opacity-50'
    : 'w-full rounded-full bg-gradient-to-r from-violet-600 via-violet-600 to-fuchsia-500 py-3.5 text-sm font-black text-white shadow-lg shadow-violet-500/30 transition hover:from-violet-500 hover:via-violet-500 hover:to-fuchsia-400 disabled:opacity-50';
  const fieldIconClass = cardFields
    ? 'h-5 w-5 shrink-0 text-violet-300 dark:text-violet-500'
    : 'h-5 w-5 shrink-0 text-zinc-400';

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && localStorage.getItem(STORAGE_REMEMBER) === '1') {
        const id = localStorage.getItem(STORAGE_IDENTIFIER);
        if (id) setEmail(id);
        setRememberMe(true);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!embedded || !showForgot || !onEmbeddedForgotPhaseChange) return;
    if (!forgotOpen) onEmbeddedForgotPhaseChange('login');
    else if (forgotSent) onEmbeddedForgotPhaseChange('sent');
    else onEmbeddedForgotPhaseChange('forgot');
  }, [embedded, showForgot, forgotOpen, forgotSent, onEmbeddedForgotPhaseChange]);

  function persistRemember() {
    try {
      if (rememberMe) {
        localStorage.setItem(STORAGE_IDENTIFIER, email.trim());
        localStorage.setItem(STORAGE_REMEMBER, '1');
      } else {
        localStorage.removeItem(STORAGE_IDENTIFIER);
        localStorage.removeItem(STORAGE_REMEMBER);
      }
    } catch {
      // ignore
    }
  }

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
        notifyLoginError(t('kidsLogin.wrongRole'));
        return;
      }
      persistRemember();
      toast.success(t('kidsLogin.loggedIn'));
      router.push(`${pathPrefix}${redirectTo}`);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('kidsLogin.loginFailed');
      notifyLoginError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function onForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    const em = email.trim();
    if (!em) {
      const msg = t('kidsLogin.enterEmail');
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
      toast.success(t('kidsLogin.requestReceived'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('kidsLogin.sendFailed');
      setForgotInlineError(msg);
      if (!embedded) toast.error(msg);
    } finally {
      setForgotLoading(false);
    }
  }

  const forgotPanelClass =
    'rounded-[1.25rem] border border-sky-200/90 bg-sky-50/90 p-4 shadow-sm dark:border-sky-800/60 dark:bg-sky-950/35';

  if (embedded && showForgot && forgotOpen) {
    return (
      <div className="space-y-3">
        {forgotSent ? (
          <div className={forgotPanelClass}>
            <p className="text-center text-2xl" aria-hidden>
              <MailCheck className="mx-auto h-8 w-8 text-sky-600 dark:text-sky-400" />
            </p>
            <h3 className="mt-2 text-center font-logo text-base font-bold text-slate-900 dark:text-white">
              {t('kidsLogin.checkEmailTitle')}
            </h3>
            <p className="mt-2 text-center text-xs leading-relaxed text-slate-600 dark:text-zinc-300">
              {t('kidsLogin.checkEmailBody')}
            </p>
            <button
              type="button"
              onClick={closeForgotFlow}
              className={
                cardFields
                  ? `mt-4 ${submitClass} py-3 text-sm font-bold`
                  : 'mt-4 w-full rounded-full bg-gradient-to-r from-violet-600 to-violet-500 py-3 text-sm font-bold text-white shadow-md shadow-violet-500/25 hover:from-violet-500 hover:to-violet-400'
              }
            >
              {t('kidsLogin.backToLogin')}
            </button>
          </div>
        ) : (
          <div className={forgotPanelClass}>
            <button
              type="button"
              onClick={closeForgotFlow}
              className="mb-2 flex items-center gap-1 text-xs font-bold text-sky-800 hover:text-violet-600 dark:text-sky-200"
            >
              <span aria-hidden>←</span> {t('kidsLogin.backToLogin')}
            </button>
            <h3 className="font-logo text-lg font-bold text-slate-900 dark:text-white">{t('kidsLogin.resetTitle')}</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-zinc-300">
              {studentOnly ? t('kidsLogin.resetHintStudent') : t('kidsLogin.resetHintStaff')}
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
                <label htmlFor={idE} className={labelClass}>
                  {identifierLabel}
                </label>
                <div className={`${fieldShell} mt-1.5 pl-3`}>
                  <User className={fieldIconClass} aria-hidden />
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
                    className={`${fieldInput} pl-2 pr-3`}
                    placeholder={identifierPlaceholder}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={forgotLoading}
                className={
                  cardFields
                    ? `${submitClass} py-3 text-sm font-bold`
                    : 'w-full rounded-full bg-gradient-to-r from-violet-600 via-violet-600 to-fuchsia-500 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/25 disabled:opacity-50'
                }
              >
                {forgotLoading ? t('kidsLogin.sending') : t('kidsLogin.sendLink')}
              </button>
            </form>
          </div>
        )}
      </div>
    );
  }

  const inner = (
    <>
      {!embedded ? (
        <>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{subtitle}</p>
        </>
      ) : null}
      <form className={embedded ? 'mt-1 space-y-4' : 'mt-6 space-y-4'} onSubmit={onSubmit}>
        {loginInlineError ? (
          <div
            role="alert"
            className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-100"
          >
            {loginInlineError}
          </div>
        ) : null}
        <div>
          <label htmlFor={idE} className={labelClass}>
            {identifierLabel}
          </label>
          <div className={`${fieldShell} mt-1.5 pl-3`}>
            <User className={fieldIconClass} aria-hidden />
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
              className={`${fieldInput} pl-2 pr-3`}
              placeholder={identifierPlaceholder}
            />
          </div>
        </div>
        <div>
          <label htmlFor={idP} className={labelClass}>
            {t('kidsLogin.passwordUpper')}
          </label>
          <div className={`${fieldShell} mt-1.5 pl-3 pr-1`}>
            <Lock className={fieldIconClass} aria-hidden />
            <input
              id={idP}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setLoginInlineError(null);
              }}
              className={`${fieldInput} pl-2 pr-2`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className={
                cardFields
                  ? 'shrink-0 rounded-xl p-2 text-violet-400 transition hover:bg-violet-100/80 hover:text-violet-600 dark:text-violet-500 dark:hover:bg-violet-950/60 dark:hover:text-violet-300'
                  : 'shrink-0 rounded-xl p-2 text-zinc-500 transition hover:bg-zinc-200/80 dark:hover:bg-zinc-700'
              }
              aria-label={showPassword ? t('kidsLogin.hidePassword') : t('kidsLogin.showPassword')}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label
            className={`flex cursor-pointer select-none items-center gap-2.5 text-sm ${
              cardFields ? 'font-medium text-violet-800 dark:text-violet-200' : 'text-zinc-600 dark:text-zinc-300'
            }`}
          >
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className={
                cardFields
                  ? 'h-4 w-4 rounded border-2 border-violet-300 text-fuchsia-600 focus:ring-fuchsia-400 dark:border-violet-600 dark:text-fuchsia-400'
                  : 'h-4 w-4 rounded border-2 border-zinc-300 text-violet-600 focus:ring-violet-500 dark:border-zinc-600'
              }
            />
            {t('kidsLogin.rememberMe')}
          </label>
          {showForgot ? (
            <button type="button" onClick={() => {
                setForgotOpen(true);
                setForgotSent(false);
                setForgotInlineError(null);
              }} className={forgotClass}>
              {t('kidsLogin.forgot')}
            </button>
          ) : null}
        </div>
        <button type="submit" disabled={loading} className={submitClass}>
          {loading ? (
            t('kidsLogin.submitting')
          ) : (
            <>
              {t('kidsLogin.submit')}
              {cardFields ? <ArrowRight className="h-5 w-5 shrink-0" strokeWidth={2.5} aria-hidden /> : null}
            </>
          )}
        </button>
      </form>

      {!embedded ? (
        <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          <a href={homeHref} className="font-semibold text-violet-600 underline underline-offset-2 dark:text-violet-400">
            Ana sayfa
          </a>
          {' · '}
          <a
            href={kidsLoginPortalHref(pathPrefix)}
            className="font-semibold text-violet-600 underline underline-offset-2 dark:text-violet-400"
          >
            Giriş modali
          </a>
        </p>
      ) : null}
    </>
  );

  if (!embedded && showForgot && forgotOpen) {
    return (
      <div className="mx-auto max-w-md rounded-[1.75rem] border border-zinc-200/90 bg-white p-8 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        {forgotSent ? (
          <div className="text-center">
            <p className="text-4xl" aria-hidden>
              <MailCheck className="mx-auto h-10 w-10 text-violet-600" />
            </p>
            <h2 className="mt-3 text-xl font-bold text-slate-900 dark:text-white">{t('kidsLogin.checkEmailTitle')}</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{t('kidsLogin.checkEmailBody')}</p>
            <button
              type="button"
              onClick={closeForgotFlow}
              className="mt-6 w-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 py-3 text-sm font-bold text-white"
            >
              {t('kidsLogin.backToLogin')}
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={closeForgotFlow}
              className="text-sm font-bold text-violet-700 underline dark:text-violet-300"
            >
              ← {t('kidsLogin.backToLogin')}
            </button>
            <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">{t('kidsLogin.resetTitle')}</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {studentOnly ? t('kidsLogin.resetHintStudent') : t('kidsLogin.resetHintStaff')}
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
                <label htmlFor={`${idE}-full-forgot`} className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
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
                  className="mt-1 w-full rounded-2xl border-0 bg-zinc-100 px-4 py-3 text-slate-900 ring-1 ring-zinc-200 outline-none focus:ring-2 focus:ring-violet-400 dark:bg-zinc-800 dark:text-white dark:ring-zinc-700"
                />
              </div>
              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {forgotLoading ? t('kidsLogin.sending') : t('kidsLogin.sendLink')}
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
    <div className="mx-auto max-w-md rounded-[1.75rem] border border-zinc-200/90 bg-white p-8 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
      {inner}
    </div>
  );
}
