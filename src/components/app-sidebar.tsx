'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useSidebarStore } from '../stores/sidebar-store';

export function AppSidebar() {
  const pathname = usePathname();
  const isOpen = useSidebarStore((s) => s.isOpen);
  const toggle = useSidebarStore((s) => s.toggle);

  useEffect(() => {
    const closeOnMobile = () => {
      if (typeof window !== 'undefined' && !matchMedia('(min-width: 1024px)').matches) {
        useSidebarStore.setState({ isOpen: false });
      }
    };
    closeOnMobile();
  }, [pathname]);

  const navItems = [
    { href: '/sorular', label: 'Anasayfa', icon: '🏠' },
    { href: '/t/populer', label: 'Popüler', icon: '🔥' },
    { href: '/t/tum', label: 'Tümü', icon: '📋' },
  ];

  const communities = [
    { href: '/t/orgu', label: 'Örgü' },
    { href: '/t/dikis', label: 'Dikiş' },
    { href: '/t/nakis', label: 'Nakış' },
    { href: '/t/taki-tasarim', label: 'Takı Tasarımı' },
    { href: '/t/el-sanatlari', label: 'El Sanatları' },
    { href: '/t/dekorasyon', label: 'Dekorasyon' },
  ];

  const tags = [
    { href: '/t/orgu', label: 'Örgü' },
    { href: '/t/tig-isi', label: 'Tığ İşi' },
    { href: '/t/amigurumi', label: 'Amigurumi' },
    { href: '/t/dantel', label: 'Dantel' },
    { href: '/t/makrome', label: 'Makrome' },
    { href: '/t/kece', label: 'Keçe' },
  ];

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
          top-[52px] bottom-0
          pt-0
          ${isOpen ? 'w-64 translate-x-0' : 'w-16 -translate-x-full lg:translate-x-0'}
          shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900
          transition-all duration-200 flex flex-col
          shadow-xl lg:shadow-none
        `}
      >
      <button
        onClick={toggle}
        className={`flex items-center border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors w-full ${isOpen ? 'gap-3 p-4' : 'justify-center p-3'}`}
        title={isOpen ? 'Sidebar\'ı kapat' : 'Sidebar\'ı aç'}
      >
        <svg className="w-5 h-5 text-gray-600 dark:text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        {isOpen && <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Menü</span>}
      </button>

      <nav className={`flex-1 overflow-y-auto ${isOpen ? 'p-3' : 'px-2 py-3'}`}>
        <div className="space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== '/sorular' && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center rounded-lg text-sm transition-colors ${
                  isOpen ? 'gap-3 px-3 py-2' : 'justify-center p-2'
                } ${
                  active
                    ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
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
            <div className="mt-6">
              <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Topluluklar
              </h3>
              <ul className="space-y-1">
                {communities.map((c) => (
                  <li key={c.href}>
                    <Link
                      href={c.href}
                      className="block px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-orange-500"
                    >
                      {c.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4">
              <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Popüler Etiketler
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <Link
                    key={t.href}
                    href={t.href}
                    className="inline-block px-2 py-0.5 text-xs rounded bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60"
                  >
                    {t.label}
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}
      </nav>
    </aside>
    </>
  );
}
