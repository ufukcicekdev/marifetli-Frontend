'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { useSidebarStore } from '@/src/stores/sidebar-store';
import { ThemeToggle } from '@/src/components/theme-toggle';
import { HEADER_HEIGHT_PX } from '@/src/components/header';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import { useAuthStore } from '@/src/stores/auth-store';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';
import { isKidsNavActive, kidsNavLinks, type KidsNavItem } from '@/src/components/kids/kids-nav';
import { marifetliKidsLegalPathOnKidsPortal } from '@/src/lib/marifetli-kids-legal-paths';
import { NavIcon } from '@/src/components/nav-icon';

function navDescription(item: KidsNavItem): string {
  const d: Record<string, string> = {
    Anasayfa: 'Kids girişi, giriş ve tanıtım.',
    Yönetim: 'Kids yönetim ve okul listesi.',
    'Öğretmen paneli': 'Sınıflar, challenge ve davetler.',
    Okullarım: 'Okul kayıtları ve sınıflar.',
    'Öğrenci paneli': 'Görevler ve rozet yolu.',
    Challenges: 'Atanan challenge’lar ve teslimler.',
    Yarışmalar: 'Yarışma ve serbest gönderiler.',
    'Oyun merkezi': 'Eğitici oyunlar ve skor.',
    'Veli paneli': 'Çocuk onayları ve bağlantılar.',
    'Serbest yarışmalar': 'Yarışma akışı.',
    'Ebeveyn kontrolleri': 'Süre ve içerik tercihleri.',
    Bildirimler: 'Duyurular ve hatırlatmalar.',
    Profilim: 'Hesap ve profil ayarları.',
    Giriş: 'Öğrenci, veli veya öğretmen girişi.',
  };
  return d[item.label] ?? `${item.label} sayfasına git.`;
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
  const { user, loading } = useKidsAuth();
  const siteAdmin = useAuthStore((s) => Boolean(s.user?.is_staff || s.user?.is_superuser));

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

  const top = HEADER_HEIGHT_PX;

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
        aria-label="Kids menü"
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="flex min-h-0 flex-col md:flex-row">
            <div className="shrink-0 border-b border-violet-100 p-4 dark:border-violet-900/50 md:min-w-0 md:flex-1 md:border-b-0 md:border-r md:p-6">
              <div className="mb-4 flex flex-col gap-2 border-b border-violet-100 pb-4 dark:border-violet-900/50 md:hidden">
                <div className="flex items-center justify-between px-1">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tema</span>
                  <ThemeToggle />
                </div>
                {!user && (
                  <Link
                    href={kidsLoginPortalHref(pathPrefix)}
                    onClick={close}
                    className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3 text-sm font-bold text-white shadow-md hover:from-violet-500 hover:to-fuchsia-500"
                  >
                  <span aria-hidden>
                    <NavIcon name="login" className="h-4 w-4 text-white" />
                  </span>
                    Giriş yap
                  </Link>
                )}
              </div>

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
                        <span className="block font-medium">{item.label}</span>
                        <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
                          {navDescription(item)}
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
                  Marifetli ana site
                </span>
                <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            <div className="hidden w-[300px] min-w-[300px] shrink-0 flex-col border-l border-violet-100 bg-violet-50/40 p-4 dark:border-violet-900/50 dark:bg-gray-800/30 md:flex md:p-6">
              <h3 className="mb-3 shrink-0 text-sm font-semibold text-violet-900 dark:text-violet-200">
                Kids yasal
              </h3>
              <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain pr-1 text-sm [scrollbar-gutter:stable]">
                <li>
                  <Link
                    href={marifetliKidsLegalPathOnKidsPortal(pathPrefix, 'terms')}
                    onClick={close}
                    className="block rounded-lg px-3 py-2 text-gray-800 hover:bg-white/80 dark:text-gray-200 dark:hover:bg-gray-700/50"
                  >
                    Kullanım şartları
                  </Link>
                </li>
                <li>
                  <Link
                    href={marifetliKidsLegalPathOnKidsPortal(pathPrefix, 'privacy')}
                    onClick={close}
                    className="block rounded-lg px-3 py-2 text-gray-800 hover:bg-white/80 dark:text-gray-200 dark:hover:bg-gray-700/50"
                  >
                    Gizlilik politikası
                  </Link>
                </li>
                <li>
                  <Link
                    href={marifetliKidsLegalPathOnKidsPortal(pathPrefix, 'kvkk')}
                    onClick={close}
                    className="block rounded-lg px-3 py-2 text-gray-800 hover:bg-white/80 dark:text-gray-200 dark:hover:bg-gray-700/50"
                  >
                    KVKK aydınlatma
                  </Link>
                </li>
                <li>
                  <Link
                    href={marifetliKidsLegalPathOnKidsPortal(pathPrefix, 'cookies')}
                    onClick={close}
                    className="block rounded-lg px-3 py-2 text-gray-800 hover:bg-white/80 dark:text-gray-200 dark:hover:bg-gray-700/50"
                  >
                    Çerez politikası
                  </Link>
                </li>
              </ul>
              <Link
                href="/"
                onClick={close}
                className="mt-4 shrink-0 rounded-xl border border-violet-200/80 px-3 py-2.5 text-center text-sm font-medium text-violet-800 hover:bg-white/60 dark:border-violet-800 dark:text-violet-200 dark:hover:bg-gray-800/50"
              >
                Ana siteye git
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
              Kullanım şartları
            </Link>
            <Link
              href={marifetliKidsLegalPathOnKidsPortal(pathPrefix, 'privacy')}
              onClick={close}
              className="hover:text-violet-600 dark:hover:text-fuchsia-400"
            >
              Gizlilik
            </Link>
            <span>© {new Date().getFullYear()} Marifetli Kids</span>
          </div>
        </div>
      </div>
    </>
  );
}
