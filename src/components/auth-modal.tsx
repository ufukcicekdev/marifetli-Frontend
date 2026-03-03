'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useAuthModalStore } from '../stores/auth-modal-store';
import { useAuthStore } from '../stores/auth-store';
import api from '../lib/api';

export function AuthModal() {
  const router = useRouter();
  const { isOpen, tab, close, setTab } = useAuthModalStore();
  const { setAuth } = useAuthStore();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Login form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register form
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  // Forgot password form
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
      else if (e.message?.includes('Network') || e.message?.includes('fetch')) setError('Backend bağlantı hatası. Backend çalışıyor mu? (port 8000)');
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
      toast.success('Hesabınız oluşturuldu! E-posta adresinize doğrulama linki gönderdik.');
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
      toast.success('E-posta adresinize şifre sıfırlama linki gönderdik.');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 sm:text-sm';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={close}
      />
      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-x-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => { setTab('login'); setError(''); setForgotSent(false); }}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              tab === 'login'
                ? 'text-orange-500 border-b-2 border-orange-500 bg-orange-50/50 dark:bg-orange-900/20'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Giriş Yap
          </button>
          <button
            onClick={() => { setTab('register'); setError(''); setForgotSent(false); }}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              tab === 'register'
                ? 'text-orange-500 border-b-2 border-orange-500 bg-orange-50/50 dark:bg-orange-900/20'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Üye Ol
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-md bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm">
              {Array.isArray(error) ? error.join(', ') : error}
            </div>
          )}

          {tab === 'forgot' ? (
            <div className="space-y-4">
              {forgotSent ? (
                <>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    E-posta adresinize şifre sıfırlama linki gönderdik. Gelen kutusu ve spam klasörünü kontrol edin.
                  </p>
                  <button
                    type="button"
                    onClick={() => { setTab('login'); setForgotSent(false); setForgotEmail(''); }}
                    className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-md transition-colors"
                  >
                    Girişe dön
                  </button>
                </>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Kayıtlı e-posta adresinizi girin, size şifre sıfırlama linki gönderelim.
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-posta</label>
                    <input type="email" required value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} className={inputClass} />
                  </div>
                  <button className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-md transition-colors disabled:opacity-50" disabled={loading}>
                    {loading ? 'Gönderiliyor...' : 'Sıfırlama linki gönder'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTab('login'); setError(''); }}
                    className="w-full py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-orange-500"
                  >
                    ← Girişe dön
                  </button>
                </form>
              )}
            </div>
          ) : tab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-posta</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Şifre</label>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
              </div>
              <button
                type="button"
                onClick={() => { setTab('forgot'); setError(''); }}
                className="text-sm text-orange-500 hover:text-orange-600"
              >
                Şifrenizi mi unuttunuz?
              </button>
              <button className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-md transition-colors disabled:opacity-50" disabled={loading}>
                {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-posta</label>
                <input type="email" required value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kullanıcı Adı</label>
                <input type="text" required value={regUsername} onChange={(e) => setRegUsername(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Şifre</label>
                <input type="password" required value={regPassword} onChange={(e) => setRegPassword(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Şifre Tekrar</label>
                <input type="password" required value={regConfirmPassword} onChange={(e) => setRegConfirmPassword(e.target.value)} className={inputClass} />
              </div>
              <button className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-md transition-colors disabled:opacity-50" disabled={loading}>
                {loading ? 'Kayıt yapılıyor...' : 'Üye Ol'}
              </button>
            </form>
          )}

          {tab !== 'forgot' && (
            <>
              <div className="mt-4 flex items-center gap-2">
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                <span className="text-xs text-gray-500">veya</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              </div>
              <button className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google ile devam et
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
