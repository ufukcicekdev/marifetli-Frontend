'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSidebarStore } from '@/src/stores/sidebar-store';
import { ThemeToggle } from '@/src/components/theme-toggle';
import { KIDS_HEADER_HEIGHT_PX } from '@/src/components/kids/kids-header';
import { isKidsNavActive, kidsNavLinks } from '@/src/components/kids/kids-nav';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import { useAuthStore } from '@/src/stores/auth-store';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';
import { marifetliKidsLegalPathOnKidsPortal } from '@/src/lib/marifetli-kids-legal-paths';
import { NavIcon } from '@/src/components/nav-icon';
import { useKidsI18n } from '@/src/providers/kids-language-provider';
import { kidsPatchMe, type KidsLanguageCode } from '@/src/lib/kids-api';

const SIDEBAR_PLACEHOLDER = (
  <aside
    className="fixed bottom-0 left-0 z-30 w-16 shrink-0 border-r border-zinc-200/90 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950"
    style={{ top: KIDS_HEADER_HEIGHT_PX }}
    aria-label="Navigasyon"
    aria-hidden="true"
  />
);

type KidsSidebarProps = {
  pathPrefix: string;
};

export function KidsSidebar({ pathPrefix }: KidsSidebarProps) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const isOpen = useSidebarStore((s) => s.isOpen);
  const toggle = useSidebarStore((s) => s.toggle);
  const { user, loading, refreshUser } = useKidsAuth();
  const siteAdmin = useAuthStore((s) => Boolean(s.user?.is_staff || s.user?.is_superuser));
  const { t, language, canChangeLanguage, setLanguageLocal } = useKidsI18n();
  const [savingLanguage, setSavingLanguage] = useState(false);

  const items = useMemo(
    () =>
      kidsNavLinks(pathPrefix, loading ? null : user?.role ?? null, {
        siteAdmin,
      }),
    [pathPrefix, user?.role, loading, siteAdmin],
  );

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const closeOnMobile = () => {
      if (typeof window !== 'undefined' && !matchMedia('(min-width: 1024px)').matches) {
        useSidebarStore.setState({ isOpen: false });
      }
    };
    closeOnMobile();
  }, [pathname]);

  async function onLanguageChange(nextRaw: string) {
    if (!canChangeLanguage) return;
    const next = (nextRaw === 'en' || nextRaw === 'ge' ? nextRaw : 'tr') as KidsLanguageCode;
    if (next === language) return;
    setLanguageLocal(next);
    setSavingLanguage(true);
    try {
      await kidsPatchMe({ preferred_language: next });
      await refreshUser();
      toast.success(t('profile.saved'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.saveFailed'));
    } finally {
      setSavingLanguage(false);
    }
  }

  if (!mounted) return SIDEBAR_PLACEHOLDER;

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 lg:hidden ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={toggle}
        aria-hidden="true"
      />
      <aside
        className={`
          fixed bottom-0 left-0 z-50 flex flex-col border-r border-zinc-200/90 bg-zinc-50 shadow-xl transition-all duration-200
          dark:border-zinc-800 dark:bg-zinc-950 lg:z-30 lg:shadow-none
          ${isOpen ? 'w-64 translate-x-0' : 'w-16 -translate-x-full lg:translate-x-0'}
        `}
        style={{ top: KIDS_HEADER_HEIGHT_PX }}
        aria-label={t('sidebar.menu')}
      >
        <button
          type="button"
          onClick={toggle}
          className={`hidden w-full border-b border-zinc-200/90 bg-zinc-50/80 transition-colors hover:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900/80 lg:flex ${
            isOpen ? 'gap-3 p-4' : 'justify-center p-3'
          }`}
          title={isOpen ? t('sidebar.close') : t('sidebar.open')}
        >
          <svg className="h-5 w-5 shrink-0 text-zinc-500 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <nav className={`flex min-h-0 flex-1 flex-col overflow-y-auto ${isOpen ? 'p-3' : 'px-2 py-3'}`}>
          {isOpen && (
            <div className="mb-4 space-y-3 border-b border-gray-200 pb-4 dark:border-gray-800 lg:hidden">
              <div className="flex items-center justify-between px-1">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('sidebar.theme')}</span>
                <ThemeToggle />
              </div>
              {canChangeLanguage ? (
                <div className="rounded-2xl border border-violet-200/80 bg-violet-50/70 p-3 dark:border-violet-800 dark:bg-violet-950/30">
                  <label htmlFor="kids-sidebar-language-mobile" className="mb-1 block text-xs font-semibold text-violet-900 dark:text-violet-100">
                    {t('sidebar.language')}
                  </label>
                  <select
                    id="kids-sidebar-language-mobile"
                    className="h-10 w-full rounded-xl border border-violet-300 bg-white px-3 text-sm text-violet-900 dark:border-violet-700 dark:bg-gray-900 dark:text-violet-100"
                    value={language}
                    disabled={savingLanguage}
                    onChange={(e) => void onLanguageChange(e.target.value)}
                  >
                    <option value="tr">{t('profile.language.tr')}</option>
                    <option value="en">{t('profile.language.en')}</option>
                    <option value="ge">{t('profile.language.ge')}</option>
                  </select>
                  {savingLanguage ? (
                    <p className="mt-1 text-[11px] text-violet-700 dark:text-violet-300">{t('sidebar.languageSaving')}</p>
                  ) : null}
                </div>
              ) : null}
              {!user && (
                <Link
                  href={kidsLoginPortalHref(pathPrefix)}
                  onClick={() => toggle()}
                  className="flex min-h-[44px] items-center justify-center rounded-2xl bg-linear-to-r from-violet-600 to-fuchsia-600 px-3 text-sm font-bold text-white shadow-md hover:from-violet-500 hover:to-fuchsia-500"
                >
                  {t('header.login')}
                </Link>
              )}
            </div>
          )}

          <div className="space-y-1">
            {canChangeLanguage ? (
              <div className="mb-3 hidden lg:block">
                {isOpen ? (
                  <div className="rounded-2xl border border-violet-200/80 bg-violet-50/70 p-3 dark:border-violet-800 dark:bg-violet-950/30">
                    <label htmlFor="kids-sidebar-language-desktop" className="mb-1 block text-xs font-semibold text-violet-900 dark:text-violet-100">
                      {t('sidebar.language')}
                    </label>
                    <select
                      id="kids-sidebar-language-desktop"
                      className="h-10 w-full rounded-xl border border-violet-300 bg-white px-3 text-sm text-violet-900 dark:border-violet-700 dark:bg-gray-900 dark:text-violet-100"
                      value={language}
                      disabled={savingLanguage}
                      onChange={(e) => void onLanguageChange(e.target.value)}
                    >
                      <option value="tr">{t('profile.language.tr')}</option>
                      <option value="en">{t('profile.language.en')}</option>
                      <option value="ge">{t('profile.language.ge')}</option>
                    </select>
                    {savingLanguage ? (
                      <p className="mt-1 text-[11px] text-violet-700 dark:text-violet-300">{t('sidebar.languageSaving')}</p>
                    ) : null}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggle()}
                    className="flex w-full flex-col items-center gap-1 rounded-xl border border-violet-200/80 bg-violet-50/70 py-2.5 text-violet-700 transition hover:bg-violet-100/80 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-200 dark:hover:bg-violet-900/40"
                    title={`${t('sidebar.language')} — ${t('sidebar.open')}`}
                  >
                    <Globe className="h-5 w-5 shrink-0" strokeWidth={2.25} aria-hidden />
                    <span className="max-w-full truncate px-0.5 text-center text-[9px] font-bold leading-tight">
                      {language === 'tr' ? 'TR' : language === 'en' ? 'EN' : 'GE'}
                    </span>
                  </button>
                )}
              </div>
            ) : null}
            {items.map((item) => {
              const active = isKidsNavActive(pathname, item.href, pathPrefix);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    if (typeof window !== 'undefined' && !window.matchMedia('(min-width: 1024px)').matches) {
                      toggle();
                    }
                  }}
                  className={`flex items-center rounded-xl text-sm font-semibold transition-all ${
                    isOpen ? 'gap-3 px-3 py-2.5' : 'justify-center p-2'
                  } ${
                    active
                      ? 'bg-violet-500 text-white shadow-sm shadow-violet-500/25 dark:bg-violet-600'
                      : 'text-zinc-700 hover:bg-white hover:shadow-sm dark:text-zinc-200 dark:hover:bg-zinc-900/80'
                  }`}
                  title={!isOpen ? t(item.labelKey) : undefined}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${
                      active
                        ? 'bg-white/25 shadow-inner dark:bg-white/20'
                        : 'bg-linear-to-br from-white to-violet-50/90 shadow-sm ring-1 ring-violet-100/90 dark:from-zinc-800 dark:to-zinc-800/95 dark:ring-zinc-600/70'
                    }`}
                  >
                    <NavIcon name={item.icon} className={`h-5 w-5 ${active ? 'text-white' : ''}`} />
                  </span>
                  {isOpen && <span>{t(item.labelKey)}</span>}
                </Link>
              );
            })}

            <Link
              href="/"
              className={`mt-2 flex w-full items-center rounded-xl border border-zinc-200/90 text-sm font-medium text-zinc-600 transition-colors hover:bg-white dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900/80 ${
                isOpen ? 'gap-3 px-3 py-2.5' : 'justify-center p-2.5'
              }`}
            >
              <span className="shrink-0 text-base">
                <NavIcon name="site" />
              </span>
              {isOpen && <span>{t('sidebar.mainSite')}</span>}
            </Link>
          </div>

          {isOpen && (
            <div className="mt-4 border-t border-zinc-200/90 px-3 pb-3 pt-3 text-center dark:border-zinc-800">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-violet-600/90 dark:text-violet-400/90">
                {t('sidebar.legal.title')}
              </p>
              <div className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
                <Link
                  href={marifetliKidsLegalPathOnKidsPortal(pathPrefix, 'terms')}
                  className="hover:text-brand hover:underline dark:hover:text-brand"
                >
                  {t('sidebar.legal.terms')}
                </Link>
                <Link
                  href={marifetliKidsLegalPathOnKidsPortal(pathPrefix, 'privacy')}
                  className="hover:text-brand hover:underline dark:hover:text-brand"
                >
                  {t('sidebar.legal.privacy')}
                </Link>
                <Link
                  href={marifetliKidsLegalPathOnKidsPortal(pathPrefix, 'kvkk')}
                  className="hover:text-brand hover:underline dark:hover:text-brand"
                >
                  {t('sidebar.legal.kvkk')}
                </Link>
                <Link
                  href={marifetliKidsLegalPathOnKidsPortal(pathPrefix, 'cookies')}
                  className="hover:text-brand hover:underline dark:hover:text-brand"
                >
                  {t('sidebar.legal.cookies')}
                </Link>
                <span className="my-1 block text-[10px] text-gray-400 dark:text-gray-500">{t('sidebar.mainSite')}</span>
                <Link
                  href="/gizlilik-politikasi"
                  className="hover:text-brand hover:underline dark:hover:text-brand"
                >
                  {t('sidebar.legal.privacyGeneral')}
                </Link>
                <Link
                  href="/kullanim-sartlari"
                  className="hover:text-brand hover:underline dark:hover:text-brand"
                >
                  {t('sidebar.legal.termsGeneral')}
                </Link>
              </div>
            </div>
          )}
        </nav>
      </aside>
    </>
  );
}
