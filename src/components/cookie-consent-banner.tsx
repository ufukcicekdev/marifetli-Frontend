'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getCookieConsent, setCookieConsent } from '@/src/lib/cookie-consent';

export function CookieConsentBanner() {
  const [mounted, setMounted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [analytics, setAnalytics] = useState(true);

  useEffect(() => setMounted(true), []);

  const consent = mounted ? getCookieConsent() : null;
  const visible = mounted && consent === null;

  const acceptAll = () => {
    setCookieConsent('all');
    setShowSettings(false);
    window.dispatchEvent(new Event('cookie-consent-update'));
    if (typeof window !== 'undefined') window.location.reload();
  };

  const acceptNecessaryOnly = () => {
    setCookieConsent('necessary');
    setShowSettings(false);
    window.dispatchEvent(new Event('cookie-consent-update'));
    if (typeof window !== 'undefined') window.location.reload();
  };

  const savePreferences = () => {
    setCookieConsent({ analytics });
    setShowSettings(false);
    window.dispatchEvent(new Event('cookie-consent-update'));
    if (typeof window !== 'undefined') window.location.reload();
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Çerez tercihleri"
      className="fixed bottom-0 left-0 right-0 z-[100] p-4 sm:p-5 rounded-t-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.3)]"
    >
      <div className="max-w-3xl mx-auto relative">
        <button
          type="button"
          onClick={acceptNecessaryOnly}
          aria-label="Kapat (sadece zorunlu çerezler)"
          className="absolute top-0 right-0 w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
          </svg>
        </button>
        {!showSettings ? (
          <>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 pr-10">
              Deneyiminizi iyileştirmek ve siteyi nasıl kullandığınızı anlamak için çerezler kullanıyoruz.{' '}
              <Link
                href="/gizlilik-politikasi"
                className="text-brand hover:underline font-medium"
              >
                Gizlilik politikası
              </Link>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={acceptAll}
                className="px-4 py-2 rounded-xl bg-brand text-white text-sm font-medium hover:bg-brand-hover transition-colors"
              >
                Tümünü kabul et
              </button>
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Çerezleri ayarla
              </button>
              <button
                type="button"
                onClick={acceptNecessaryOnly}
                className="px-4 py-2 rounded-xl text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Analitik çerezler kullanılmaz, sadece sitenin çalışması için zorunlu olanlar kalır."
              >
                Reddet (sadece zorunlu)
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3 pr-8">
              Çerez tercihleri
            </h3>
            <div className="space-y-3 mb-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <span className="w-10 h-5 rounded-full bg-gray-200 dark:bg-gray-700 relative inline-block">
                  <span className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform pointer-events-none" style={{ transform: 'translateX(0)' }} />
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Gerekli çerezler</strong> — Site çalışması için zorunludur (her zaman açık).
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <button
                  type="button"
                  role="switch"
                  aria-checked={analytics}
                  onClick={() => setAnalytics((v) => !v)}
                  className={`w-10 h-5 rounded-full relative inline-block transition-colors ${
                    analytics ? 'bg-brand' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
                    style={{ transform: analytics ? 'translateX(20px)' : 'translateX(0)' }}
                  />
                </button>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Analitik çerezler</strong> — Ziyaret istatistikleri ve site kullanımı (anonim).
                </span>
              </label>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Tercihleriniz cihazınızda saklanır. Detay için{' '}
              <Link href="/gizlilik-politikasi" className="text-brand hover:underline">
                gizlilik politikamızı
              </Link>{' '}
              inceleyebilirsiniz.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={savePreferences}
                className="px-4 py-2 rounded-xl bg-brand text-white text-sm font-medium hover:bg-brand-hover transition-colors"
              >
                Tercihleri kaydet
              </button>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm"
              >
                Geri
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
