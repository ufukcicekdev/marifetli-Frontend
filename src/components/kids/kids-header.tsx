'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useSidebarStore } from '@/src/stores/sidebar-store';
import { ThemeToggle } from '@/src/components/theme-toggle';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import { KidsNotificationBell } from '@/src/components/kids/kids-notification-bell';
import { KIDS_USE_SIDEBAR, kidsLoginPortalHref } from '@/src/lib/kids-config';
import { kidsAvatarUrl } from '@/src/lib/kids-api';
import { useKidsI18n } from '@/src/providers/kids-language-provider';
import { KidsLanguageSelectField } from '@/src/components/kids/kids-language-select';

type KidsHeaderProps = {
  pathPrefix: string;
};

/** Kids header tek satır kullanır, bu yüzden daha kısa tutulur. */
export const KIDS_HEADER_HEIGHT_PX = 52;
export const KIDS_HEADER_BASE_PX = KIDS_HEADER_HEIGHT_PX;

export function KidsHeader({ pathPrefix }: KidsHeaderProps) {
  const sidebarToggle = useSidebarStore((s) => s.toggle);
  const router = useRouter();
  const pathname = usePathname();
  const homeHref = pathPrefix || '/';
  const { user, logout } = useKidsAuth();
  const { t } = useKidsI18n();
  const isKidsAdmin = user?.role === 'admin';
  const vividBrandLogo = user?.role === 'teacher' || user?.role === 'admin';
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex flex-col border-b border-gray-200 bg-white text-gray-900 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
      style={{ height: KIDS_HEADER_HEIGHT_PX }}
    >
      <div className="relative flex h-[52px] min-h-[52px] w-full shrink-0 items-center justify-between gap-1 px-2 sm:gap-2 sm:px-4">
        <div className="flex w-9 shrink-0 items-center sm:w-auto sm:min-w-0">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined' && !window.matchMedia('(min-width: 1024px)').matches) {
                const menuPath = `${pathPrefix || '/kids'}/menu`;
                const isOnMenuPage = pathname === menuPath || pathname?.startsWith(`${menuPath}/`);
                if (isOnMenuPage) {
                  if (window.history.length > 1) {
                    router.back();
                  } else {
                    router.push(homeHref);
                  }
                } else {
                  router.push(menuPath);
                }
                return;
              }
              sidebarToggle();
            }}
            className={`header-nav-btn px-2 text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-white/15 sm:px-2 ${
              KIDS_USE_SIDEBAR ? 'lg:hidden!' : ''
            }`}
            title={t('header.menu')}
            aria-label={t('header.menu')}
          >
            <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        <Link
          href={homeHref}
          className={`font-logo absolute left-1/2 z-10 flex -translate-x-1/2 items-center justify-center gap-0 whitespace-nowrap text-xl font-semibold tracking-tight hover:opacity-90 sm:text-2xl md:text-3xl ${
            vividBrandLogo ? 'text-violet-600 dark:text-violet-300' : 'text-gray-900 dark:text-white'
          }`}
        >
          <Image
            src="/logo.png"
            alt=""
            width={40}
            height={40}
            className="-mr-1.5 h-8 w-8 shrink-0 object-contain sm:h-9 sm:w-9 md:h-10 md:w-10"
            priority
          />
          <span lang="en" className="leading-none">
            arifetli
          </span>
          <span
            lang="en"
            className="ml-1.5 rounded-xl bg-linear-to-r from-amber-400 to-orange-400 px-2 py-0.5 text-xs font-extrabold tracking-wide text-white shadow-sm"
          >
            KIDS
          </span>
        </Link>

        <div className="header-top-right flex min-w-0 shrink-0 items-center justify-end gap-0.5 self-stretch sm:gap-2">
          <span className="hidden shrink-0 md:inline-flex">
            <ThemeToggle />
          </span>
          {user ? <KidsNotificationBell pathPrefix={pathPrefix} /> : null}
          {user ? (
            <div className="relative flex shrink-0 items-center" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="header-nav-btn gap-1.5 px-1 text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-white/15"
                aria-label={t('header.profileMenu')}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-gray-200 ring-1 ring-gray-200/90 dark:bg-white/20 dark:ring-white/25">
                  {user.avatar_key ? (
                    <Image
                      src={kidsAvatarUrl(user.avatar_key) ?? ''}
                      alt={user.avatar_key}
                      width={32}
                      height={32}
                      className="h-full w-full object-cover"
                    />
                  ) : user.profile_picture ? (
                    <Image
                      src={user.profile_picture}
                      alt=""
                      width={32}
                      height={32}
                      className="h-full w-full object-cover"
                      unoptimized={user.profile_picture.startsWith('http')}
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-sm font-bold text-gray-700 dark:text-white">
                      {(user.first_name || user.email || '?').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <svg
                  className="hidden h-4 w-4 shrink-0 text-gray-600 dark:text-white/90 sm:block"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 top-full z-100 mt-1 w-52 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
                  role="menu"
                >
                  <div className="border-b border-gray-200 px-4 py-2 dark:border-gray-700">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                      {[user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.email}
                    </p>
                    {[user.first_name, user.last_name].filter(Boolean).join(' ').trim() ? (
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">{user.student_login_name || user.email}</p>
                    ) : null}
                    {isKidsAdmin ? (
                      <p className="mt-1 text-xs font-medium text-brand dark:text-brand">{t('header.admin')}</p>
                    ) : null}
                  </div>
                  <div className="border-b border-gray-200 px-3 py-2 dark:border-gray-700">
                    <KidsLanguageSelectField id="kids-header-language" variant="header" />
                  </div>
                  <Link
                    href={`${pathPrefix}/bildirimler`}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                    onClick={() => setMenuOpen(false)}
                    role="menuitem"
                  >
                    {t('header.notifications')}
                  </Link>
                  <Link
                    href={`${pathPrefix}/profil`}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                    onClick={() => setMenuOpen(false)}
                    role="menuitem"
                  >
                    {t('header.profile')}
                  </Link>
                  <hr className="my-1 border-gray-200 dark:border-gray-700" />
                  <button
                    type="button"
                    className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100 dark:text-red-400 dark:hover:bg-gray-700"
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                    }}
                    role="menuitem"
                  >
                    {t('header.logout')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href={kidsLoginPortalHref(pathPrefix)}
              className="header-nav-btn hidden border border-gray-300 px-3 text-gray-900 hover:bg-gray-100 dark:border-white/60 dark:text-white dark:hover:bg-white/15 sm:inline-flex"
            >
              {t('header.login')}
            </Link>
          )}
        </div>
      </div>
      <div className="hidden min-h-0 flex-1 items-center justify-center px-3 pb-3 pt-1 sm:px-4">
        <div
          className="h-10 w-full max-w-2xl rounded-full border border-gray-200/80 bg-white dark:border-gray-700 dark:bg-gray-900"
          aria-hidden
        />
      </div>

    </header>
  );
}
