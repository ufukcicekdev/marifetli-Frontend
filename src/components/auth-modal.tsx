'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useAuthModalStore } from '../stores/auth-modal-store';
import { useAuthStore } from '../stores/auth-store';
import api from '../lib/api';

const DEFAULT_AUTH_HEADLINE = 'Sevdiğin el işlerini keşfet.';
const DEFAULT_AUTH_DESCRIPTION = 'İlgi alanları topluluğunda soru sor, deneyimlerini paylaş. Örgü, dikiş, yemek, müzik, sanat, hobiler.';

/** Giriş/kayıt modalı görselleri (Facebook tarzı sol panel) — public/login-register/ altında */
const LOGIN_REGISTER_IMAGES = {
  heroMain: '/login-register/hero-main.png',
  heroPeople1: '/login-register/hero-people-1.png',
  heroPeople2: '/login-register/hero-people-2.png',
} as const;

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';
const GOOGLE_LOGIN_URL = `${API_BASE}/auth/start-google-login/`;



const inputClass =
  'w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-colors text-sm';

export function AuthModal() {
  const router = useRouter();
  const { isOpen, tab, close, setTab } = useAuthModalStore();
  const { setAuth } = useAuthStore();
  const { data: siteSettings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => (await api.getSiteSettings()).data,
    staleTime: 5 * 60 * 1000,
  });
  const authHeadline = (siteSettings?.auth_modal_headline ?? '').trim() || DEFAULT_AUTH_HEADLINE;
  const authDescription = (siteSettings?.auth_modal_description ?? '').trim() || DEFAULT_AUTH_DESCRIPTION;
  const logoUrl = siteSettings?.logo_url?.trim() || null;
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.login({ email, password });
      const { access, refresh, user } = res.data;
      setAuth(user, access);
      if (refresh) localStorage.setItem('refresh_token', refresh);
      toast.success('Giriş başarılı');
      close();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string }; status?: number }; message?: string };
      if (e.response?.data?.error) setError(e.response.data.error);
      else if (e.response?.status === 401) setError('E-posta veya şifre hatalı');
      else if (e.message?.includes('Network') || e.message?.includes('fetch')) setError('Bağlantı hatası. Lütfen tekrar deneyin.');
      else setError('Giriş başarısız');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (regPassword !== regConfirmPassword) {
      setError('Şifreler eşleşmiyor');
      return;
    }
    setLoading(true);
    try {
      const res = await api.register({ email: regEmail, username: regUsername, password: regPassword });
      const { access, refresh, user } = res.data;
      setAuth(user, access);
      if (refresh) localStorage.setItem('refresh_token', refresh);
      toast.success('Hesabınız oluşturuldu! E-posta doğrulama linki gönderildi.');
      close();
      router.push('/onboarding');
    } catch (err: unknown) {
      const data = (err as { response?: { data?: unknown } })?.response?.data;
      if (typeof data === 'object' && data !== null) {
        if ('detail' in data) setError(String((data as { detail: unknown }).detail));
        else if ('email' in data || 'username' in data) {
          const msgs = Object.entries(data as Record<string, string[]>).flatMap(([, v]) => (Array.isArray(v) ? v : [v]));
          setError(msgs.join(' '));
        } else setError('Kayıt başarısız');
      } else setError('Kayıt başarısız');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.requestPasswordReset(forgotEmail);
      setForgotSent(true);
      toast.success('Şifre sıfırlama linki e-posta adresinize gönderildi.');
    } catch (err: unknown) {
      const e = err as {
        response?: { status?: number; data?: { error?: string; detail?: string } };
      };
      const msg = e?.response?.data?.error || e?.response?.data?.detail;
      const fallback =
        e?.response?.status === 404
          ? 'Kayıtlı e-posta bulunamadı. Lütfen e-posta adresinizi kontrol edin.'
          : 'Bir hata oluştu. Lütfen tekrar deneyin.';
      const finalMsg = msg || fallback;
      setError(finalMsg);
      toast.error(finalMsg);
    } finally {
      setLoading(false);
    }
  };

  const resetAndSwitch = (newTab: 'login' | 'register') => {
    setError('');
    setForgotSent(false);
    setTab(newTab);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={close} aria-hidden />
      <div
        className="relative w-full max-w-[900px] max-h-[90vh] overflow-hidden rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col md:flex-row"
        role="dialog"
        aria-labelledby="auth-modal-title"
      >
        {/* Sol: Marka + görsel collage (masaüstü, Facebook tarzı) */}
        <div className="hidden md:flex md:flex-1 flex-col bg-gradient-to-br from-brand via-brand to-brand-hover p-8 min-h-[440px] overflow-hidden">
          <Link href="/" className="font-logo flex items-center gap-0 text-white/95 hover:text-white shrink-0">
            {logoUrl ? (
              <Image src={logoUrl} alt="" width={56} height={56} className="shrink-0 w-12 h-12 md:w-14 md:h-14 object-contain brightness-0 invert -mr-1" />
            ) : (
              <Image src="/logo.png" alt="" width={56} height={56} className="shrink-0 w-12 h-12 md:w-14 md:h-14 object-contain brightness-0 invert -mr-1" />
            )}
            <span className="text-2xl md:text-3xl font-semibold tracking-tight">arifetli</span>
          </Link>
          <div className="flex-1 flex flex-col justify-center min-h-0 relative mt-4">
            <h2 className="text-3xl font-bold text-white leading-tight max-w-[260px] shrink-0">
              {authHeadline}
            </h2>
            <p className="mt-3 text-white/80 text-sm max-w-[240px] shrink-0">
              {authDescription}
            </p>
            {/* Collage alanı: birden fazla görsel + üstte uçuşan ikonlar (Facebook tarzı) */}
            <div className="relative mt-6 flex-1 min-h-[200px] max-h-[230px]">
              {/* Ana büyük kart */}
              <div className="absolute inset-y-4 left-6 right-10 flex items-center justify-center">
                <div className="relative w-[260px] h-[190px] rounded-2xl overflow-hidden shadow-2xl ring-2 ring-white/20 bg-white/10">
                  <Image
                    src={LOGIN_REGISTER_IMAGES.heroMain}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="260px"
                  />
                </div>
              </div>
              {/* Üstte küçük kart (insanlar 1) */}
              <div className="absolute -top-2 right-4 w-32 h-24 rounded-2xl overflow-hidden shadow-xl ring-2 ring-white/60 bg-white">
                <Image
                  src={LOGIN_REGISTER_IMAGES.heroPeople1}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="150px"
                />
              </div>
              {/* Altta küçük kart (insanlar 2) */}
              <div className="absolute bottom-0 left-0 w-32 h-24 rounded-2xl overflow-hidden shadow-xl ring-2 ring-white/60 bg-white">
                <Image
                  src={LOGIN_REGISTER_IMAGES.heroPeople2}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="150px"
                />
              </div>
              {/* Üstte uçuşan ikonlar */}
              <span className="absolute top-4 left-40 w-10 h-10 rounded-xl bg-white/90 shadow-lg flex items-center justify-center text-xl" aria-hidden>🧵</span>
              <span className="absolute top-16 right-1 w-9 h-9 rounded-lg bg-white/90 shadow-lg flex items-center justify-center text-lg" aria-hidden>✂️</span>
              <span className="absolute bottom-6 left-28 w-9 h-9 rounded-lg bg-white/90 shadow-lg flex items-center justify-center text-lg" aria-hidden>🪡</span>
              <span className="absolute bottom-2 right-10 w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center text-sm" aria-hidden>❤️</span>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            className="hidden text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors"
            aria-label="Kapat"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 flex flex-col min-w-0 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-100 dark:border-gray-800 shrink-0 md:justify-end">
            <Link href="/" className="font-logo flex items-center gap-1 text-gray-900 dark:text-white md:hidden">
              {logoUrl ? (
                <Image src={logoUrl} alt="" width={24} height={24} className="shrink-0 w-6 h-6 object-contain" />
              ) : (
                <Image src="/logo.png" alt="" width={24} height={24} className="shrink-0 w-6 h-6 object-contain" />
              )}
              <span className="text-lg font-semibold">arifetli</span>
            </Link>
            <button type="button" onClick={close} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-300" aria-label="Kapat">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        <div className="px-6 md:px-10 py-6 md:py-8 flex-1">
          {tab === 'forgot' ? (
            <div className="space-y-5">
              <h2 id="auth-modal-title" className="text-lg font-bold text-gray-900 dark:text-white text-center">
                Şifremi unuttum
              </h2>
              {forgotSent ? (
                <>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    E-posta adresinize şifre sıfırlama linki gönderdik. Gelen kutusu ve spam klasörünü kontrol edin.
                  </p>
                  <button
                    type="button"
                    onClick={() => resetAndSwitch('login')}
                    className="w-full py-3 rounded-xl bg-brand hover:bg-brand-hover text-white font-medium text-sm transition-colors"
                  >
                    Girişe dön
                  </button>
                </>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  {error && (
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                      {error}
                    </div>
                  )}
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Kayıtlı e-posta adresinizi girin, size şifre sıfırlama linki gönderelim.
                  </p>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="E-posta adresi"
                    className={inputClass}
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-brand hover:bg-brand-hover text-white font-medium text-sm transition-colors disabled:opacity-60"
                  >
                    {loading ? 'Gönderiliyor...' : 'Sıfırlama linki gönder'}
                  </button>
                  <button
                    type="button"
                    onClick={() => resetAndSwitch('login')}
                    className="w-full py-2 text-sm text-gray-500 hover:text-brand dark:text-gray-400 dark:hover:text-brand"
                  >
                    ← Girişe dön
                  </button>
                </form>
              )}
            </div>
          ) : tab === 'login' ? (
            <>
              <h2 id="auth-modal-title" className="text-xl font-bold text-gray-900 dark:text-white mb-6 text-center">
                Marifetli&apos;ye Giriş Yap
              </h2>
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}
              <form onSubmit={handleLogin} className="space-y-4">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="E-posta adresi"
                  className={inputClass}
                />
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Şifre"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                    aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="rounded border-gray-300 dark:border-gray-600 text-brand focus:ring-brand" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Beni hatırla</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => { setTab('forgot'); setError(''); }}
                    className="text-sm font-medium text-brand hover:text-brand-hover dark:text-brand"
                  >
                    Şifremi unuttum
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-full bg-brand hover:bg-brand-hover text-white font-semibold text-sm transition-colors disabled:opacity-60"
                >
                  {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                </button>
              </form>

              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500">VEYA</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              </div>
              <button
                type="button"
                onClick={() => {
                  useAuthStore.getState().logout();
                  window.location.href = GOOGLE_LOGIN_URL;
                }}
                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/80 transition-colors text-sm font-medium text-gray-700 dark:text-gray-200"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google ile giriş yap
              </button>
              <p className="mt-5 text-center text-sm text-gray-500 dark:text-gray-400">
                Hesabın yok mu?{' '}
                <button type="button" onClick={() => resetAndSwitch('register')} className="w-full py-3 rounded-full border-2 border-brand text-brand hover:bg-brand-pink/50 dark:hover:bg-brand/10 font-semibold text-sm transition-colors">
                  Yeni hesap oluştur
                </button>
              </p>
            </>
          ) : (
            <>
              <h2 id="auth-modal-title" className="text-lg font-bold text-gray-900 dark:text-white mb-5 text-center">
                Üye Ol
              </h2>
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}
              <form onSubmit={handleRegister} className="space-y-4">
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="E-posta adresi"
                  className={inputClass}
                />
                <input
                  type="text"
                  required
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="Kullanıcı adı"
                  className={inputClass}
                />
                <div className="relative">
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Şifre"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                    aria-label={showRegPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  >
                    {showRegPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                <input
                  type="password"
                  required
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="Şifre tekrar"
                  className={inputClass}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-brand hover:bg-brand-hover text-white font-medium text-sm transition-colors disabled:opacity-60"
                >
                  {loading ? 'Kayıt yapılıyor...' : 'Üye Ol'}
                </button>
              </form>

              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500">VEYA</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              </div>
              <button
                type="button"
                onClick={() => {
                  useAuthStore.getState().logout();
                  window.location.href = GOOGLE_LOGIN_URL;
                }}
                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/80 transition-colors text-sm font-medium text-gray-700 dark:text-gray-200"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google ile üye ol
              </button>
              <p className="mt-5 text-center text-sm text-gray-500 dark:text-gray-400">
                Zaten hesabın var mı?{' '}
                <button type="button" onClick={() => resetAndSwitch('login')} className="font-medium text-brand hover:text-brand-hover dark:text-brand">
                  Giriş yap
                </button>
              </p>
            </>
          )}

          {/* Alt bilgi metni */}
          <p className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
            Devam ederek{' '}
            <Link href="/gizlilik-politikasi" onClick={close} className="underline hover:text-brand">
              Gizlilik Politikası
            </Link>
            ,{' '}
            <Link href="/kullanim-sartlari" onClick={close} className="underline hover:text-brand">
              Kullanım Şartları
            </Link>
            {' '}ve çerez kullanımını kabul etmiş olursunuz.
          </p>
        </div>
        </div>
      </div>
    </div>
  );
}
