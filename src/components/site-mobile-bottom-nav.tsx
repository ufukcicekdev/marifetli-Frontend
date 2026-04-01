'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plus } from 'lucide-react';
import { NavIcon } from '@/src/components/nav-icon';
import { useAuthStore } from '@/src/stores/auth-store';
import { useAuthModalStore } from '@/src/stores/auth-modal-store';
import tr from '@/language/tr.json';

const T = tr as Record<string, string>;

function siteNavActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  const p = pathname.split('?')[0] || '';
  const h = href.split('?')[0] || href;
  if (h === '/') return p === '/';
  return p === h || p.startsWith(`${h}/`);
}

/**
 * Ana site (marifetli.com.tr): mobilde Instagram tarzı sabit alt menü.
 * md ve üzeri gizli.
 */
export function SiteMobileBottomNav() {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuthStore();
  const openAuth = useAuthModalStore((s) => s.open);

  const profileHref = user?.username ? `/profil/${user.username}` : '/ayarlar';
  const profileActive = isAuthenticated && siteNavActive(pathname, profileHref);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_24px_rgba(0,0,0,0.06)] backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/95 md:hidden"
      aria-label={T['site.bottomNav.aria'] ?? 'Alt menü'}
    >
      <ul className="mx-auto flex max-w-lg items-end justify-between gap-0 px-1 pt-1">
        <li className="flex min-w-0 flex-1 justify-center">
          <Link
            href="/"
            className={`flex min-h-[52px] min-w-0 flex-col items-center justify-end gap-0.5 px-1 pb-1.5 pt-0.5 ${
              siteNavActive(pathname, '/')
                ? 'text-violet-600 dark:text-violet-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
            aria-current={siteNavActive(pathname, '/') ? 'page' : undefined}
          >
            <NavIcon name="home" className="h-6 w-6" />
            <span className="max-w-[4.5rem] truncate text-[10px] font-semibold leading-tight">
              {T['site.bottomNav.home'] ?? 'Ana sayfa'}
            </span>
          </Link>
        </li>
        <li className="flex min-w-0 flex-1 justify-center">
          <Link
            href="/menu"
            className={`flex min-h-[52px] min-w-0 flex-col items-center justify-end gap-0.5 px-1 pb-1.5 pt-0.5 ${
              siteNavActive(pathname, '/menu')
                ? 'text-violet-600 dark:text-violet-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <NavIcon name="all" className="h-6 w-6" />
            <span className="max-w-[4.5rem] truncate text-[10px] font-semibold leading-tight">
              {T['site.bottomNav.menu'] ?? 'Menü'}
            </span>
          </Link>
        </li>
        <li className="flex min-w-0 flex-1 justify-center">
          <Link
            href="/soru-sor"
            className="-mt-4 flex min-h-[52px] min-w-0 flex-col items-center justify-end gap-0.5 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 px-3 py-2.5 text-white shadow-lg ring-4 ring-white dark:ring-gray-950"
            aria-label={T['site.bottomNav.ask'] ?? 'Soru sor'}
          >
            <Plus className="h-7 w-7 stroke-[2.5]" aria-hidden />
            <span className="max-w-[5rem] truncate text-center text-[10px] font-semibold leading-tight">
              {T['site.bottomNav.ask'] ?? 'Soru sor'}
            </span>
          </Link>
        </li>
        <li className="flex min-w-0 flex-1 justify-center">
          <Link
            href="/bildirimler"
            className={`flex min-h-[52px] min-w-0 flex-col items-center justify-end gap-0.5 px-1 pb-1.5 pt-0.5 ${
              siteNavActive(pathname, '/bildirimler')
                ? 'text-violet-600 dark:text-violet-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <NavIcon name="bell" className="h-6 w-6" />
            <span className="max-w-[4.5rem] truncate text-[10px] font-semibold leading-tight">
              {T['site.bottomNav.notifications'] ?? 'Bildirimler'}
            </span>
          </Link>
        </li>
        <li className="flex min-w-0 flex-1 justify-center">
          {isAuthenticated ? (
            <Link
              href={profileHref}
              className={`flex min-h-[52px] min-w-0 flex-col items-center justify-end gap-0.5 px-1 pb-1.5 pt-0.5 ${
                profileActive ? 'text-violet-600 dark:text-violet-400' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <NavIcon name="profile" className="h-6 w-6" />
              <span className="max-w-[4.5rem] truncate text-[10px] font-semibold leading-tight">
                {T['site.bottomNav.profile'] ?? 'Profil'}
              </span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => openAuth('login')}
              className="flex min-h-[52px] min-w-0 flex-col items-center justify-end gap-0.5 px-1 pb-1.5 pt-0.5 text-gray-500 dark:text-gray-400"
            >
              <NavIcon name="profile" className="h-6 w-6" />
              <span className="max-w-[4.5rem] truncate text-[10px] font-semibold leading-tight">
                {T['site.bottomNav.login'] ?? 'Giriş'}
              </span>
            </button>
          )}
        </li>
      </ul>
    </nav>
  );
}
