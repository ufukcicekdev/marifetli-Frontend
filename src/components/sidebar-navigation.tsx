'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useSidebarStore } from '../stores/sidebar-store';
import { useAuthStore } from '../stores/auth-store';
import { useAuthModalStore } from '../stores/auth-modal-store';
import { ThemeToggle } from './theme-toggle';
import { UzmanFullPageLink } from './uzman-full-page-link';
import { NavIcon, type NavIconName } from './nav-icon';
import { SITE_KIDS_HREF } from '../lib/site-kids';

function normalizePath(p: string) {
  if (p.length > 1 && p.endsWith('/')) return p.slice(0, -1);
  return p;
}

function isSidebarNavActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  const p = normalizePath(pathname);
  const h = normalizePath(href);
  if (h === '/' || h === '') return p === '/' || p === '';
  if (h === '/admin') {
    return p === '/admin' || p.startsWith('/kids/admin');
  }
  return p === h || p.startsWith(`${h}/`) || p.startsWith(`${h}?`);
}

type SidebarNavItem = { href: string; label: string; icon: NavIconName };

const SIDEBAR_NAV_BASE: SidebarNavItem[] = [
  { href: '/', label: 'Anasayfa', icon: 'home' },
  { href: '/kids', label: 'Marifetli Kids', icon: 'student' },
  { href: '/sorular', label: 'Sorular', icon: 'questions' },
  { href: '/kategoriler', label: 'Kategoriler', icon: 'categories' },
  { href: '/blog', label: 'Blog', icon: 'blog' },
  { href: '/tasarimlar', label: 'Tasarımlar', icon: 'designs' },
  { href: '/topluluklar', label: 'Toplulukları Keşfet', icon: 'discover' },
  { href: '/t/populer', label: 'Popüler', icon: 'popular' },
  { href: '/t/tum', label: 'Tümü', icon: 'all' },
  { href: '/iletisim', label: 'İletişim', icon: 'contact' },
];

const SIDEBAR_PLACEHOLDER = (
  <aside
    className="fixed left-0 z-30 top-[104px] bottom-0 w-16 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
    aria-label="Navigasyon"
    aria-hidden="true"
  />
);

export function AppSidebar() {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const isOpen = useSidebarStore((s) => s.isOpen);
  const toggle = useSidebarStore((s) => s.toggle);
  const { isAuthenticated, user } = useAuthStore();
  const openAuth = useAuthModalStore((s) => s.open);

  const sidebarNavItems = useMemo(() => {
    const base = [...SIDEBAR_NAV_BASE];
    const siteAdmin = Boolean(user?.is_staff || user?.is_superuser);
    if (siteAdmin) {
      base.splice(1, 0, { href: '/admin', label: 'Yönetim', icon: 'admin' });
    }
    return base;
  }, [user]);

  const closeSidebarOnMobile = () => {
    if (typeof window !== 'undefined' && !window.matchMedia('(min-width: 1024px)').matches) {
      toggle();
    }
  };

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
        className={`lg:hidden fixed inset-0 bg-black/40 z-40 transition-opacity duration-200 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={toggle}
        aria-hidden="true"
      />
      <aside
        className={`
          fixed left-0 z-40 lg:z-30
          top-[104px] bottom-0
          pt-0
          ${isOpen ? 'w-64 translate-x-0' : 'w-16 -translate-x-full lg:translate-x-0'}
          shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900
          transition-all duration-200 flex flex-col
          shadow-xl lg:shadow-none
        `}
      >
        <button
          onClick={toggle}
          className={`hidden lg:flex items-center border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors w-full ${isOpen ? 'gap-3 p-4' : 'justify-center p-3'}`}
          title={isOpen ? 'Sidebar\'ı kapat' : 'Sidebar\'ı aç'}
        >
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <nav className={`flex-1 overflow-y-auto ${isOpen ? 'p-3' : 'px-2 py-3'}`}>
          {isOpen && (
            <div className="lg:hidden space-y-3 mb-4 pb-4 border-b border-gray-200 dark:border-gray-800">
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Tema</span>
                  <ThemeToggle />
                </div>
                {!isAuthenticated ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        openAuth('login');
                        toggle();
                      }}
                      className="flex-1 min-h-[40px] px-3 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 bg-transparent text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      Giriş Yap
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        openAuth('register');
                        toggle();
                      }}
                      className="flex-1 min-h-[40px] px-3 rounded-lg text-sm font-medium bg-brand hover:bg-brand-hover text-white"
                    >
                      Üye Ol
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/soru-sor"
                    onClick={() => toggle()}
                    className="flex items-center justify-center gap-2 min-h-[40px] px-3 rounded-lg text-sm font-medium bg-brand hover:bg-brand-hover text-white"
                  >
                    <span className="text-lg leading-none">+</span>
                    Gönderi Oluştur
                  </Link>
                )}
              </div>
            </div>
          )}
          <div className="space-y-1">
            {sidebarNavItems.map((item) => {
              const active = isSidebarNavActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    if (typeof window !== 'undefined' && !window.matchMedia('(min-width: 1024px)').matches) {
                      toggle();
                    }
                  }}
                  className={`flex items-center rounded-lg text-sm transition-colors ${
                    isOpen ? 'gap-3 px-3 py-2' : 'justify-center p-2'
                  } ${
                    active
                      ? 'bg-brand-pink/80 dark:bg-brand/10 text-brand'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  title={!isOpen ? item.label : undefined}
                >
                  <span className="text-base shrink-0">
                    <NavIcon name={item.icon} />
                  </span>
                  {isOpen && <span>{item.label}</span>}
                </Link>
              );
            })}
            <UzmanFullPageLink
              title="Uzmana sor — tam sayfa"
              onNavigate={closeSidebarOnMobile}
              className={`w-full flex items-center rounded-lg text-sm font-medium transition-colors bg-gradient-to-r from-violet-600/90 to-brand hover:opacity-95 text-white shadow-sm ${
                isOpen ? 'gap-3 px-3 py-2.5 mt-2' : 'justify-center p-2.5 mt-2'
              }`}
            >
              <span className="text-base shrink-0">
                <NavIcon name="expert" />
              </span>
              {isOpen && <span>Uzmana sor</span>}
            </UzmanFullPageLink>
          </div>

          {isOpen && (
            <div className="mt-8 border-t border-gray-200 dark:border-gray-800 pt-3 px-3 flex flex-col items-center gap-2 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Marifetli Kids
              </p>
              <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-[11px]">
                <Link
                  href="/marifetli-kids/kullanim-sartlari"
                  className="text-gray-500 dark:text-gray-400 hover:text-brand dark:hover:text-brand hover:underline"
                >
                  Kullanım Şartları
                </Link>
                <span className="text-gray-300 dark:text-gray-600" aria-hidden>
                  ·
                </span>
                <Link
                  href="/marifetli-kids/gizlilik-politikasi"
                  className="text-gray-500 dark:text-gray-400 hover:text-brand dark:hover:text-brand hover:underline"
                >
                  Gizlilik
                </Link>
                <span className="text-gray-300 dark:text-gray-600" aria-hidden>
                  ·
                </span>
                <Link
                  href="/marifetli-kids/kvkk-aydinlatma-metni"
                  className="text-gray-500 dark:text-gray-400 hover:text-brand dark:hover:text-brand hover:underline"
                >
                  Aydınlatma
                </Link>
                <span className="text-gray-300 dark:text-gray-600" aria-hidden>
                  ·
                </span>
                <Link
                  href="/marifetli-kids/cerez-politikasi"
                  className="text-gray-500 dark:text-gray-400 hover:text-brand dark:hover:text-brand hover:underline"
                >
                  Çerez
                </Link>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-xs">
                <Link
                  href="/gizlilik-politikasi"
                  className="text-gray-500 dark:text-gray-400 hover:text-brand dark:hover:text-brand hover:underline"
                >
                  Gizlilik (genel)
                </Link>
                <span className="text-gray-300 dark:text-gray-600" aria-hidden>
                  ·
                </span>
                <Link
                  href="/kullanim-sartlari"
                  className="text-gray-500 dark:text-gray-400 hover:text-brand dark:hover:text-brand hover:underline"
                >
                  Kullanım (genel)
                </Link>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-500">© {new Date().getFullYear()} Marifetli</p>
            </div>
          )}
        </nav>
      </aside>
    </>
  );
}
