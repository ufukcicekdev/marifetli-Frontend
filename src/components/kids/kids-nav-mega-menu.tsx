'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useSidebarStore } from '@/src/stores/sidebar-store';
import { ThemeToggle } from '@/src/components/theme-toggle';
import { KIDS_HEADER_HEIGHT_PX } from '@/src/components/kids/kids-header';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import { useAuthStore } from '@/src/stores/auth-store';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';
import { isKidsNavActive, kidsNavLinks, type KidsNavItem } from '@/src/components/kids/kids-nav';
import { marifetliKidsLegalPathOnKidsPortal } from '@/src/lib/marifetli-kids-legal-paths';
import { NavIcon } from '@/src/components/nav-icon';
import { useKidsI18n } from '@/src/providers/kids-language-provider';
import { kidsPatchMe, type KidsLanguageCode } from '@/src/lib/kids-api';

function navDescription(item: KidsNavItem, t: (key: string) => string): string {
  const d: Record<string, string> = {
    'nav.home': t('nav.desc.home'),
    'nav.admin': t('nav.desc.admin'),
    'nav.teacherPanel': t('nav.desc.teacherPanel'),
    'nav.studentPanel': t('nav.desc.studentPanel'),
    'nav.challenges': t('nav.desc.challenges'),
    'nav.competitions': t('nav.desc.competitions'),
    'nav.gameCenter': t('nav.desc.gameCenter'),
    'nav.parentPanel': t('nav.desc.parentPanel'),
    'nav.parentControls': t('nav.desc.parentControls'),
    'nav.askExpert': t('nav.desc.askExpert'),
    'nav.notifications': t('nav.desc.notifications'),
    'nav.profile': t('nav.desc.profile'),
    'nav.login': t('nav.desc.login'),
  };
  const label = t(item.labelKey);
  return d[item.labelKey] ?? `${label}`;
}

type KidsNavMegaMenuProps = {
  pathPrefix: string;
};

/**
 * Ana sitede `NavMegaMenu` ile aynı desen: header altından açılan geniş panel,
 * blur arka plan, grid linkler + (md) yan sütun. `useSidebarStore.isOpen` ile kontrol.
 */
export function KidsNavMegaMenu({ pathPrefix }: KidsNavMegaMenuProps) {
  const pathname = usePathname();
  const isOpen = useSidebarStore((s) => s.isOpen);
  const close = useSidebarStore((s) => s.close);
  const { user, loading, refreshUser } = useKidsAuth();
  const siteAdmin = useAuthStore((s) => Boolean(s.user?.is_staff || s.user?.is_superuser));
  const { t, language, canChangeLanguage, setLanguageLocal } = useKidsI18n();
  const [savingLanguage, setSavingLanguage] = useState(false);

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

  const items = useMemo(
    () => kidsNavLinks(pathPrefix, loading ? null : user?.role ?? null, { siteAdmin }),
    [pathPrefix, user?.role, loading, siteAdmin],
  );

  useEffect(() => {
    close();
  }, [pathname, close]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const top = KIDS_HEADER_HEIGHT_PX;

  return (
    <>
      <div
        className="fixed bottom-0 left-0 right-0 z-40 bg-black/50 backdrop-blur-sm md:bg-black/30"
        style={{ top }}
        onClick={close}
        aria-hidden="true"
      />
      <div
        className="fixed left-0 z-50 flex w-full flex-col overflow-hidden border-t border-violet-200/90 bg-white shadow-2xl dark:border-violet-800/70 dark:bg-gray-900 md:left-4 md:w-[min(calc(100vw-2rem),900px)] md:min-w-[600px] md:rounded-b-2xl md:border md:border-t-0 md:border-violet-200/80 dark:md:border-violet-800/60"
        style={{ top, maxHeight: `calc(100vh - ${top}px)` }}
        role="dialog"
        aria-label={t('sidebar.menu')}
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="flex min-h-0 flex-col md:flex-row">
            <div className="shrink-0 border-b border-violet-100 p-4 dark:border-violet-900/50 md:min-w-0 md:flex-1 md:border-b-0 md:border-r md:p-6">
              <div className="mb-4 flex flex-col gap-2 border-b border-violet-100 pb-4 dark:border-violet-900/50 md:hidden">
                <div className="flex items-center justify-between px-1">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('sidebar.theme')}</span>
                  <ThemeToggle />
                </div>
                {canChangeLanguage ? (
                  <div className="rounded-2xl border border-violet-200/80 bg-violet-50/70 p-3 dark:border-violet-800 dark:bg-violet-950/30">
                    <label htmlFor="kids-mega-language-mobile" className="mb-1 block text-xs font-semibold text-violet-900 dark:text-violet-100">
                      {t('sidebar.language')}
                    </label>
                    <select
                      id="kids-mega-language-mobile"
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
                    onClick={close}
                    className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-linear-to-r from-violet-600 to-fuchsia-600 py-3 text-sm font-bold text-white shadow-md hover:from-violet-500 hover:to-fuchsia-500"
                  >
                  <span aria-hidden>
                    <NavIcon name="login" className="h-4 w-4 text-white" />
                  </span>
                    {t('landing.login')}
                  </Link>
                )}
              </div>

              {canChangeLanguage ? (
                <div className="mb-4 hidden rounded-2xl border border-violet-200/80 bg-violet-50/70 p-3 dark:border-violet-800 dark:bg-violet-950/30 md:block">
                  <label htmlFor="kids-mega-language-desktop" className="mb-1 block text-xs font-semibold text-violet-900 dark:text-violet-100">
                    {t('sidebar.language')}
                  </label>
                  <select
                    id="kids-mega-language-desktop"
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

              <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
                {items.map((item) => {
                  const active = isKidsNavActive(pathname, item.href, pathPrefix);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={close}
                      className={`flex gap-3 rounded-xl p-3 transition-colors ${
                        active
                          ? 'bg-fuchsia-100/90 text-violet-900 dark:bg-violet-950/50 dark:text-fuchsia-200'
                          : 'text-gray-800 hover:bg-violet-50 dark:text-gray-200 dark:hover:bg-gray-800'
                      }`}
                    >
                      <span className="shrink-0 text-2xl" aria-hidden>
                        <NavIcon name={item.icon} className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <span className="block font-medium">{t(item.labelKey)}</span>
                        <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
                          {navDescription(item, t)}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>

              <Link
                href="/"
                onClick={close}
                className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-violet-200/80 p-4 font-medium text-violet-800 dark:border-violet-800 dark:text-violet-200 md:hidden"
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden>
                    <NavIcon name="site" className="h-4 w-4" />
                  </span>
                  {t('sidebar.mainSite')}
                </span>
                <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            <div className="hidden w-[300px] min-w-[300px] shrink-0 flex-col border-l border-violet-100 bg-violet-50/40 p-4 dark:border-violet-900/50 dark:bg-gray-800/30 md:flex md:p-6">
              <h3 className="mb-3 shrink-0 text-sm font-semibold text-violet-900 dark:text-violet-200">
                {t('sidebar.legal.title')}
              </h3>
              <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain pr-1 text-sm [scrollbar-gutter:stable]">
                <li>
                  <Link
                    href={marifetliKidsLegalPathOnKidsPortal(pathPrefix, 'terms')}
                    onClick={close}
                    className="block rounded-lg px-3 py-2 text-gray-800 hover:bg-white/80 dark:text-gray-200 dark:hover:bg-gray-700/50"
                  >
                    {t('sidebar.legal.terms')}
                  </Link>
                </li>
                <li>
                  <Link
                    href={marifetliKidsLegalPathOnKidsPortal(pathPrefix, 'privacy')}
                    onClick={close}
                    className="block rounded-lg px-3 py-2 text-gray-800 hover:bg-white/80 dark:text-gray-200 dark:hover:bg-gray-700/50"
                  >
                    {t('sidebar.legal.privacy')}
                  </Link>
                </li>
                <li>
                  <Link
                    href={marifetliKidsLegalPathOnKidsPortal(pathPrefix, 'kvkk')}
                    onClick={close}
                    className="block rounded-lg px-3 py-2 text-gray-800 hover:bg-white/80 dark:text-gray-200 dark:hover:bg-gray-700/50"
                  >
                    {t('sidebar.legal.kvkk')}
                  </Link>
                </li>
                <li>
                  <Link
                    href={marifetliKidsLegalPathOnKidsPortal(pathPrefix, 'cookies')}
                    onClick={close}
                    className="block rounded-lg px-3 py-2 text-gray-800 hover:bg-white/80 dark:text-gray-200 dark:hover:bg-gray-700/50"
                  >
                    {t('sidebar.legal.cookies')}
                  </Link>
                </li>
              </ul>
              <Link
                href="/"
                onClick={close}
                className="mt-4 shrink-0 rounded-xl border border-violet-200/80 px-3 py-2.5 text-center text-sm font-medium text-violet-800 hover:bg-white/60 dark:border-violet-800 dark:text-violet-200 dark:hover:bg-gray-800/50"
              >
                {t('sidebar.goMainSite')}
              </Link>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-violet-100 bg-white px-4 py-3 dark:border-violet-900/50 dark:bg-gray-900 md:px-6">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            <Link
              href={marifetliKidsLegalPathOnKidsPortal(pathPrefix, 'terms')}
              onClick={close}
              className="hover:text-violet-600 dark:hover:text-fuchsia-400"
            >
              {t('sidebar.legal.terms')}
            </Link>
            <Link
              href={marifetliKidsLegalPathOnKidsPortal(pathPrefix, 'privacy')}
              onClick={close}
              className="hover:text-violet-600 dark:hover:text-fuchsia-400"
            >
              {t('sidebar.legal.privacyShort')}
            </Link>
            <span>© {new Date().getFullYear()} Marifetli Kids</span>
          </div>
        </div>
      </div>
    </>
  );
}
