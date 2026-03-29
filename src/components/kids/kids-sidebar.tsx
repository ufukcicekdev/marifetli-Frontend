'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useSidebarStore } from '@/src/stores/sidebar-store';
import { ThemeToggle } from '@/src/components/theme-toggle';
import { HEADER_HEIGHT_PX } from '@/src/components/header';
import { isKidsNavActive, kidsNavLinks } from '@/src/components/kids/kids-nav';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import { useAuthStore } from '@/src/stores/auth-store';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';
import { marifetliKidsLegalPathOnKidsPortal } from '@/src/lib/marifetli-kids-legal-paths';
import { NavIcon } from '@/src/components/nav-icon';

const SIDEBAR_PLACEHOLDER = (
  <aside
    className="fixed bottom-0 left-0 top-[104px] z-30 w-16 shrink-0 border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
    style={{ top: HEADER_HEIGHT_PX }}
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
  const { user, loading } = useKidsAuth();
  const siteAdmin = useAuthStore((s) => Boolean(s.user?.is_staff || s.user?.is_superuser));

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
          fixed bottom-0 left-0 z-50 flex flex-col border-r border-violet-200/90 bg-white shadow-xl transition-all duration-200
          dark:border-violet-800/70 dark:bg-gray-900 lg:z-30 lg:shadow-none
          ${isOpen ? 'w-64 translate-x-0' : 'w-16 -translate-x-full lg:translate-x-0'}
        `}
        style={{ top: HEADER_HEIGHT_PX }}
        aria-label="Kids menü"
      >
        <button
          type="button"
          onClick={toggle}
          className={`hidden w-full border-b border-gray-200 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50 lg:flex ${
            isOpen ? 'gap-3 p-4' : 'justify-center p-3'
          }`}
          title={isOpen ? "Sidebar'ı kapat" : "Sidebar'ı aç"}
        >
          <svg className="h-5 w-5 shrink-0 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <nav className={`flex-1 overflow-y-auto ${isOpen ? 'p-3' : 'px-2 py-3'}`}>
          {isOpen && (
            <div className="mb-4 space-y-3 border-b border-gray-200 pb-4 dark:border-gray-800 lg:hidden">
              <div className="flex items-center justify-between px-1">
                <span className="text-sm text-gray-600 dark:text-gray-400">Tema</span>
                <ThemeToggle />
              </div>
              {!user && (
                <Link
                  href={kidsLoginPortalHref(pathPrefix)}
                  onClick={() => toggle()}
                  className="flex min-h-[44px] items-center justify-center rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 text-sm font-bold text-white shadow-md hover:from-violet-500 hover:to-fuchsia-500"
                >
                  Giriş
                </Link>
              )}
            </div>
          )}

          <div className="space-y-1">
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
                  className={`flex items-center rounded-2xl text-sm font-semibold transition-all ${
                    isOpen ? 'gap-3 px-3 py-2.5' : 'justify-center p-2'
                  } ${
                    active
                      ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-md shadow-fuchsia-500/20'
                      : 'text-violet-900 hover:bg-white/80 dark:text-violet-100 dark:hover:bg-gray-800/80'
                  }`}
                  title={!isOpen ? item.label : undefined}
                >
                  <span className="shrink-0 text-base">
                    <NavIcon name={item.icon} />
                  </span>
                  {isOpen && <span>{item.label}</span>}
                </Link>
              );
            })}

            <Link
              href="/"
              className={`mt-2 flex w-full items-center rounded-lg border border-gray-200 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800 ${
                isOpen ? 'gap-3 px-3 py-2.5' : 'justify-center p-2.5'
              }`}
            >
              <span className="shrink-0 text-base">
                <NavIcon name="site" />
              </span>
              {isOpen && <span>Marifetli ana site</span>}
            </Link>
          </div>

          {isOpen && (
            <div className="mt-8 border-t border-gray-200 px-3 pt-3 text-center dark:border-gray-800">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-violet-600/90 dark:text-violet-400/90">
                Marifetli Kids yasal
              </p>
              <div className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
                <Link
                  href={marifetliKidsLegalPathOnKidsPortal(pathPrefix, 'terms')}
                  className="hover:text-brand hover:underline dark:hover:text-brand"
                >
                  Kullanım Şartları
                </Link>
                <Link
                  href={marifetliKidsLegalPathOnKidsPortal(pathPrefix, 'privacy')}
                  className="hover:text-brand hover:underline dark:hover:text-brand"
                >
                  Gizlilik Politikası
                </Link>
                <Link
                  href={marifetliKidsLegalPathOnKidsPortal(pathPrefix, 'kvkk')}
                  className="hover:text-brand hover:underline dark:hover:text-brand"
                >
                  Aydınlatma Metni
                </Link>
                <Link
                  href={marifetliKidsLegalPathOnKidsPortal(pathPrefix, 'cookies')}
                  className="hover:text-brand hover:underline dark:hover:text-brand"
                >
                  Çerez Politikası
                </Link>
                <span className="my-1 block text-[10px] text-gray-400 dark:text-gray-500">Marifetli ana site</span>
                <Link
                  href="/gizlilik-politikasi"
                  className="hover:text-brand hover:underline dark:hover:text-brand"
                >
                  Gizlilik (genel)
                </Link>
                <Link
                  href="/kullanim-sartlari"
                  className="hover:text-brand hover:underline dark:hover:text-brand"
                >
                  Kullanım Şartları (genel)
                </Link>
              </div>
            </div>
          )}
        </nav>
      </aside>
    </>
  );
}
