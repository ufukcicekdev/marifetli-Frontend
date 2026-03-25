'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useSidebarStore } from '@/src/stores/sidebar-store';
import { ThemeToggle } from '@/src/components/theme-toggle';
import { HEADER_HEIGHT_PX } from '@/src/components/header';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import { KidsNotificationBell } from '@/src/components/kids/kids-notification-bell';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';
type KidsHeaderProps = {
  pathPrefix: string;
};

export function KidsHeader({ pathPrefix }: KidsHeaderProps) {
  const sidebarToggle = useSidebarStore((s) => s.toggle);
  const homeHref = pathPrefix || '/';
  const { user, logout } = useKidsAuth();
  const isKidsAdmin = user?.role === 'admin';
  const brandHref = homeHref;
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
      className="fixed top-0 left-0 right-0 z-50 flex flex-col bg-white/95 text-gray-900 shadow-lg shadow-violet-200/30 backdrop-blur-md dark:bg-gray-900/95 dark:text-white dark:shadow-black/30"
      style={{ height: HEADER_HEIGHT_PX }}
    >
      <div
        className="h-1 w-full shrink-0 bg-gradient-to-r from-violet-500 via-amber-400 to-sky-500"
        aria-hidden
      />

      <div className="relative flex h-[51px] min-h-[51px] w-full shrink-0 items-stretch justify-between gap-1 border-b border-violet-100/90 px-2 sm:gap-2 sm:px-4 dark:border-violet-900/40">
        <div className="flex w-9 shrink-0 items-center sm:w-auto sm:min-w-0">
          <button
            type="button"
            onClick={sidebarToggle}
            className="header-nav-btn rounded-xl px-2 text-violet-800 hover:bg-violet-100 dark:text-violet-200 dark:hover:bg-violet-900/40 sm:px-2"
            title="Menü"
            aria-label="Menüyü aç"
          >
            <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        <Link
          href={homeHref}
          className="font-logo absolute left-1/2 flex -translate-x-1/2 items-center justify-center gap-0 whitespace-nowrap text-xl font-semibold tracking-tight text-violet-950 hover:opacity-90 dark:text-white sm:text-2xl md:text-3xl"
        >
          <Image
            src="/logo.png"
            alt=""
            width={40}
            height={40}
            className="-mr-1.5 h-8 w-8 shrink-0 object-contain sm:h-9 sm:w-9 md:h-10 md:w-10"
            priority
          />
          <span lang="en" className="leading-none">arifetli</span>
          <span lang="en" className="ml-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 px-2 py-0.5 text-xs font-extrabold tracking-wide text-white shadow-sm">
            KIDS
          </span>
        </Link>

        <div className="header-top-right flex min-w-0 shrink-0 items-center justify-end gap-0.5 self-stretch sm:gap-2">
          <span className="hidden md:inline-flex">
            <ThemeToggle />
          </span>
          {user ? <KidsNotificationBell pathPrefix={pathPrefix} /> : null}
          {user ? (
            <div className="relative flex shrink-0 items-center" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="header-nav-btn gap-1.5 px-1 text-violet-900 hover:bg-violet-100 dark:text-violet-100 dark:hover:bg-violet-900/40"
                aria-label="Profil menüsünü aç"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-violet-200 ring-1 ring-violet-300/90 dark:bg-violet-800 dark:ring-violet-600/50">
                  {user.profile_picture ? (
                    <Image
                      src={user.profile_picture}
                      alt=""
                      width={32}
                      height={32}
                      className="h-full w-full object-cover"
                      unoptimized={user.profile_picture.startsWith('http')}
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-sm font-bold text-violet-800 dark:text-violet-100">
                      {(user.first_name || user.email || '?').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <svg
                  className="hidden h-4 w-4 shrink-0 text-violet-700 dark:text-violet-200 sm:block"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 top-full z-[100] mt-1 w-52 rounded-lg border border-violet-200 bg-white py-1 shadow-lg dark:border-violet-800 dark:bg-gray-900"
                  role="menu"
                >
                  <div className="border-b border-violet-100 px-4 py-2 dark:border-violet-800">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                      {[user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.email}
                    </p>
                    {[user.first_name, user.last_name].filter(Boolean).join(' ').trim() ? (
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                    ) : null}
                    {isKidsAdmin ? (
                      <p className="mt-1 text-xs font-medium text-violet-600 dark:text-violet-300">Yönetici</p>
                    ) : null}
                  </div>
                  <Link
                    href={`${pathPrefix}/bildirimler`}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-violet-50 dark:text-gray-300 dark:hover:bg-violet-950/50"
                    onClick={() => setMenuOpen(false)}
                    role="menuitem"
                  >
                    Bildirimler
                  </Link>
                  <Link
                    href={`${pathPrefix}/profil`}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-violet-50 dark:text-gray-300 dark:hover:bg-violet-950/50"
                    onClick={() => setMenuOpen(false)}
                    role="menuitem"
                  >
                    Profilim
                  </Link>
                  <hr className="my-1 border-violet-100 dark:border-violet-800" />
                  <button
                    type="button"
                    className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-violet-50 dark:text-red-400 dark:hover:bg-violet-950/50"
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                    }}
                    role="menuitem"
                  >
                    Çıkış
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href={kidsLoginPortalHref(pathPrefix)}
              className="header-nav-btn hidden rounded-xl border-2 border-transparent bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 font-semibold text-white shadow-md hover:from-violet-600 hover:to-fuchsia-600 sm:inline-flex"
            >
              Giriş
            </Link>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center px-3 pb-2 pt-1 sm:px-4">
        <div className="w-full max-w-2xl">
          <div className="flex items-center justify-center gap-2 rounded-full border-2 border-amber-300/70 bg-gradient-to-r from-amber-100/95 via-white to-sky-100/95 px-4 py-2 text-center text-sm font-semibold text-amber-950 shadow-sm dark:border-amber-600/40 dark:from-amber-950/60 dark:via-gray-900/90 dark:to-sky-950/60 dark:text-amber-50">
            <span aria-hidden>✨</span>
            <span>Çocuklar için renkli, güvenli challenge dünyası</span>
            <span aria-hidden>🎨</span>
          </div>
        </div>
      </div>
    </header>
  );
}
