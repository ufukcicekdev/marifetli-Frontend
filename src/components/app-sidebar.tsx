'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSidebarStore } from '../stores/sidebar-store';
import { useAuthStore } from '../stores/auth-store';
import { useAuthModalStore } from '../stores/auth-modal-store';
import { ThemeToggle } from './theme-toggle';

// Sol menü: Tasarım Yükle yok; tasarım yükleme sadece /tasarimlar sayfasındaki butondan.
const SIDEBAR_NAV_ITEMS = [
  { href: '/sorular', label: 'Anasayfa', icon: '🏠' },
  { href: '/kategoriler', label: 'Kategoriler', icon: '📁' },
  { href: '/blog', label: 'Blog', icon: '📝' },
  { href: '/tasarimlar', label: 'Tasarımlar', icon: '🎨' },
  { href: '/topluluklar', label: 'Toplulukları Keşfet', icon: '🔍' },
  { href: '/t/populer', label: 'Popüler', icon: '🔥' },
  { href: '/t/tum', label: 'Tümü', icon: '📋' },
  { href: '/iletisim', label: 'İletişim', icon: '✉️' },
] as const;

// dynamic() loading ile birebir aynı placeholder; hydration uyumu için
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
  const { isAuthenticated } = useAuthStore();
  const openAuth = useAuthModalStore((s) => s.open);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const closeOnMobile = () => {
      if (typeof window !== 'undefined' && !matchMedia('(min-width: 1024px)').matches) {
        useSidebarStore.setState({ isOpen: false });
      }
    };
    closeOnMobile();
  }, [pathname]);

  // Chunk yüklendikten sonra ilk render = placeholder (sunucu ile aynı); mount sonrası tam menü (hydration hatası olmasın)
  if (!mounted) return SIDEBAR_PLACEHOLDER;

  return (
    <>
      {/* Mobil backdrop */}
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
      {/* Sidebar aç/kapa — masaüstünde görünür, mobilde header’daki hamburger kullanılır */}
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
        {/* Mobil: tema + giriş/üye ol (sidebar açıkken) */}
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
                  onClick={() => { openAuth('login'); toggle(); }}
                  className="flex-1 min-h-[40px] px-3 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 bg-transparent text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Giriş Yap
                </button>
                <button
                  onClick={() => { openAuth('register'); toggle(); }}
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
          {SIDEBAR_NAV_ITEMS.map((item) => {
            const active = pathname === item.href || (item.href !== '/sorular' && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center rounded-lg text-sm transition-colors ${
                  isOpen ? 'gap-3 px-3 py-2' : 'justify-center p-2'
                } ${
                  active
                    ? 'bg-brand-pink/80 dark:bg-brand/10 text-brand'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                title={!isOpen ? item.label : undefined}
              >
                <span className="text-base shrink-0">{item.icon}</span>
                {isOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {isOpen && (
          <>
            <div className="mt-8 border-t border-gray-200 dark:border-gray-800 pt-3 px-3 space-y-1 text-center">
              <Link
                href="/gizlilik-politikasi"
                className="inline-block text-xs text-gray-500 dark:text-gray-400 hover:text-brand dark:hover:text-brand hover:underline"
              >
                Gizlilik Politikası
              </Link>
              <Link
                href="/kullanim-sartlari"
                className="inline-block text-xs text-gray-500 dark:text-gray-400 hover:text-brand dark:hover:text-brand hover:underline"
              >
                Kullanım Şartları
              </Link>
              <p className="text-[11px] text-gray-500 dark:text-gray-500">
                © 2026 Marifetli
              </p>
            </div>
          </>
        )}
      </nav>
    </aside>
    </>
  );
}
