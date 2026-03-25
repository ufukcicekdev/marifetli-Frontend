'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useSidebarStore } from '../stores/sidebar-store';
import { useAuthStore } from '../stores/auth-store';
import { useAuthModalStore } from '../stores/auth-modal-store';
import { ThemeToggle } from './theme-toggle';
import { UzmanFullPageLink } from './uzman-full-page-link';
import api from '../lib/api';

type CategoryItem = { id: number; name: string; slug: string; subcategories?: CategoryItem[] };

function isNavActive(pathname: string | null | undefined, href: string) {
  if (!pathname) return false;
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`) || pathname.startsWith(`${href}?`);
}

const NAV_ITEMS_BASE: { href: string; label: string; icon: string; description: string }[] = [
  { href: '/', label: 'Anasayfa', icon: '🏠', description: 'Keşfet, kategoriler ve hızlı başlangıç.' },
  { href: '/sorular', label: 'Sorular', icon: '💬', description: 'Gönderi akışı, sıralama ve arama.' },
  { href: '/topluluklar', label: 'Toplulukları Keşfet', icon: '🔍', description: 'Kategorilere göz at, topluluklara katıl.' },
  { href: '/t/populer', label: 'Popüler', icon: '🔥', description: 'Günün çok konuşulanlarına göz at.' },
  { href: '/t/tum', label: 'Tümü', icon: '📋', description: 'Tüm soruları listele.' },
  { href: '/blog', label: 'Blog', icon: '📝', description: 'Makaleler ve rehberler.' },
  { href: '/tasarimlar', label: 'Tasarımlar', icon: '🎨', description: 'Topluluk tasarımlarını keşfet.' },
  { href: '/iletisim', label: 'İletişim', icon: '✉️', description: 'Bizimle iletişime geçin.' },
];

type MegaNavItem =
  | { kind: 'link'; href: string; label: string; icon: string; description: string }
  | { kind: 'expert'; label: string; icon: string; description: string };

export function NavMegaMenu() {
  const pathname = usePathname();
  const isOpen = useSidebarStore((s) => s.isOpen);
  const close = useSidebarStore((s) => s.close);
  const { isAuthenticated, user } = useAuthStore();
  const openAuth = useAuthModalStore((s) => s.open);

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories().then((r) => r.data),
  });

  const { data: expertCfg } = useQuery({
    queryKey: ['category-experts-config', user?.id ?? 'anon'],
    queryFn: () => api.getCategoryExpertsConfig(),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const navItems = useMemo((): MegaNavItem[] => {
    const base = [...NAV_ITEMS_BASE];
    if (user && (user.is_staff || user.is_superuser)) {
      base.splice(1, 0, {
        href: '/admin',
        label: 'Yönetim',
        icon: '🛠️',
        description: 'Marifetli Kids öğretmenleri ve yönetim.',
      });
    }
    const items: MegaNavItem[] = base.map((x) => ({ kind: 'link', ...x }));
    if (expertCfg?.enabled && expertCfg?.backend_ready) {
      const i = items.findIndex((x) => x.kind === 'link' && x.href === '/sorular');
      items.splice(i + 1, 0, {
        kind: 'expert',
        label: 'Uzmana sor',
        icon: '🧠',
        description: 'Sağdaki panelden kategori seçip uzmanla yazışın.',
      });
    }
    return items;
  }, [expertCfg?.enabled, expertCfg?.backend_ready, user]);

  const categoriesTree = useMemo(() => {
    const raw = categoriesData as { results?: CategoryItem[] } | CategoryItem[] | undefined;
    const list = Array.isArray(raw)
      ? raw
      : (raw && typeof raw === 'object' && Array.isArray((raw as { results?: CategoryItem[] }).results)
          ? (raw as { results: CategoryItem[] }).results
          : []);
    return (list as CategoryItem[]).filter((c) => !(c as { parent?: number }).parent);
  }, [categoriesData]);

  useEffect(() => {
    close();
  }, [pathname, close]);

  // Menü açıkken arka plan scroll olmasın (kayma scrollbar-gutter: stable ile globals.css'te önlendi)
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop: mobilde tam kaplama, içerik arkada görünmesin */}
      <div
        className="fixed inset-0 top-[104px] z-40 bg-black/50 backdrop-blur-sm md:bg-black/30"
        onClick={close}
        aria-hidden="true"
      />
      {/* Panel: mobilde tam genişlik (left-0, w-full), masaüstünde soldan boşluklu */}
      <div
        className="fixed left-0 top-[104px] z-50 w-full max-h-[calc(100vh-104px)] md:left-4 md:w-[min(calc(100vw-2rem),900px)] md:min-w-[600px] md:max-h-[calc(100vh-104px-1rem)] md:rounded-b-2xl border-t border-gray-200 dark:border-gray-700 md:border md:border-t-0 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden flex flex-col"
        role="dialog"
        aria-label="Menü"
      >
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {/* Mobil: tek sütun (önce linkler, sonra kategoriler). Masaüstü: yan yana */}
          <div className="min-h-0 flex flex-col md:flex-row">
            {/* Ana sayfalar linkleri */}
            <div
              className="p-4 md:p-6 border-b border-gray-100 dark:border-gray-800 md:border-b-0 md:border-r shrink-0 md:shrink md:flex-1 md:min-w-0 overflow-y-auto"
            >
              {/* Mobil: Gönderi Oluştur + Tema (aydınlık/karanlık) — header’da yer kalmadığı için menüde */}
              <div className="flex flex-col gap-2 pb-4 mb-4 border-b border-gray-100 dark:border-gray-800 md:hidden">
                <UzmanFullPageLink
                  onNavigate={close}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-brand text-white font-medium text-sm shadow-sm"
                >
                  <span className="text-lg" aria-hidden>
                    🧠
                  </span>
                  <span>Uzmana sor</span>
                </UzmanFullPageLink>
                {isAuthenticated && user && (
                  user.is_verified ? (
                    <Link
                      href="/soru-sor"
                      onClick={close}
                      className="flex items-center justify-center gap-2 py-3 rounded-xl bg-brand hover:bg-brand-hover text-white font-medium text-sm"
                    >
                      <span className="text-lg">+</span>
                      <span>Gönderi Oluştur</span>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { toast.error('Gönderi paylaşmak için önce e-posta adresinizi doğrulayın.'); close(); }}
                      className="flex items-center justify-center gap-2 py-3 rounded-xl bg-brand hover:bg-brand-hover text-white font-medium text-sm"
                    >
                      <span className="text-lg">+</span>
                      <span>Gönderi Oluştur</span>
                    </button>
                  )
                )}
                <div className="flex items-center justify-between px-1">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tema</span>
                  <ThemeToggle />
                </div>
              </div>
              <div className="grid gap-1 grid-cols-1 md:grid-cols-2">
                {navItems.map((item) => {
                  if (item.kind === 'expert') {
                    const expertActive =
                      pathname === '/uzman' || (pathname?.startsWith('/uzman/') ?? false) || (pathname?.startsWith('/uzman?') ?? false);
                    return (
                      <UzmanFullPageLink
                        key="nav-expert-uzman"
                        onNavigate={close}
                        className={`flex gap-3 p-3 rounded-xl transition-colors w-full text-left ${
                          expertActive
                            ? 'bg-brand-pink/80 dark:bg-brand/10 text-brand'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200'
                        }`}
                      >
                        <span className="text-2xl shrink-0" aria-hidden>
                          {item.icon}
                        </span>
                        <div className="min-w-0">
                          <span className="font-medium block">{item.label}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 block mt-0.5">{item.description}</span>
                        </div>
                      </UzmanFullPageLink>
                    );
                  }
                  const active = isNavActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={close}
                      className={`flex gap-3 p-3 rounded-xl transition-colors ${
                        active
                          ? 'bg-brand-pink/80 dark:bg-brand/10 text-brand'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200'
                      }`}
                    >
                      <span className="text-2xl shrink-0" aria-hidden>{item.icon}</span>
                      <div className="min-w-0">
                        <span className="font-medium block">{item.label}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 block mt-0.5">{item.description}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
              {/* Mobil: Kategoriler sayfasına tek link (scroll yok) */}
              <Link
                href="/kategoriler"
                onClick={close}
                className="md:hidden flex items-center justify-between gap-3 p-4 rounded-xl bg-brand-pink/80 dark:bg-brand/10 text-brand-hover font-medium mt-2 border border-brand/10 dark:border-brand/30/50"
              >
                <span className="flex items-center gap-2">
                  <span className="text-xl" aria-hidden>📁</span>
                  Kategoriler
                </span>
                <svg className="w-5 h-5 shrink-0 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              {/* Mobil: Giriş/Üye ol */}
              {!isAuthenticated && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex gap-2 md:hidden">
                  <button
                    onClick={() => { openAuth('login'); close(); }}
                    className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
                  >
                    Giriş Yap
                  </button>
                  <button
                    onClick={() => { openAuth('register'); close(); }}
                    className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-brand text-white"
                  >
                    Üye Ol
                  </button>
                </div>
              )}
            </div>

            {/* Kategoriler — sadece masaüstünde sağda (mobilde /kategoriler sayfasına gidilir) */}
            <div
              className="hidden md:flex p-4 md:p-6 bg-gray-50/50 dark:bg-gray-800/30 flex-col w-[300px] min-w-[300px] shrink-0 min-h-0 overflow-hidden border-l border-gray-100 dark:border-gray-800"
            >
              <div className="flex items-center justify-between mb-3 shrink-0">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Kategoriler</h3>
                <Link href="/kategoriler" onClick={close} className="text-xs font-medium text-brand hover:underline">
                  Tümü
                </Link>
              </div>
              <ul className="space-y-2 flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain pr-1 [scrollbar-gutter:stable]">
                {categoriesTree.length === 0 && (
                  <li className="text-sm text-gray-500 dark:text-gray-400 py-2">Yükleniyor…</li>
                )}
                {categoriesTree.map((main) => {
                  const mainActive = pathname === `/t/${main.slug}`;
                  const subs = main.subcategories || [];
                  return (
                    <li key={main.id} className="space-y-0.5">
                      <Link
                        href={`/t/${main.slug}`}
                        onClick={close}
                        className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          mainActive ? 'bg-brand-pink/80 dark:bg-brand/10 text-brand' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200'
                        }`}
                      >
                        {main.name}
                      </Link>
                      {subs.length > 0 && (
                        <ul className="pl-4 space-y-0.5">
                          {subs.map((sub) => {
                            const subActive = pathname === `/t/${sub.slug}`;
                            return (
                              <li key={sub.id}>
                                <Link
                                  href={`/t/${sub.slug}`}
                                  onClick={close}
                                  className={`block px-3 py-1.5 rounded-md text-sm ${
                                    subActive ? 'text-brand font-medium' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                  }`}
                                >
                                  {sub.name}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>

        {/* Alt: Footer linkleri */}
        <div className="shrink-0 border-t border-gray-100 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900 md:px-6">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            <Link href="/iletisim" onClick={close} className="hover:text-brand dark:hover:text-brand">
              İletişim
            </Link>
            <Link href="/hakkimizda" onClick={close} className="hover:text-brand dark:hover:text-brand">
              Hakkımızda
            </Link>
            <Link href="/gizlilik-politikasi" onClick={close} className="hover:text-brand dark:hover:text-brand">
              Gizlilik Politikası
            </Link>
            <Link href="/kullanim-sartlari" onClick={close} className="hover:text-brand dark:hover:text-brand">
              Kullanım Şartları
            </Link>
            <span>© {new Date().getFullYear()} Marifetli</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-t border-gray-100 pt-2 text-[10px] text-gray-500 dark:border-gray-800 dark:text-gray-500">
            <span className="font-semibold text-gray-600 dark:text-gray-400">Marifetli Kids</span>
            <Link href="/marifetli-kids/kullanim-sartlari" onClick={close} className="hover:text-brand dark:hover:text-brand">
              Kullanım Şartları
            </Link>
            <span aria-hidden className="text-gray-300 dark:text-gray-600">
              |
            </span>
            <Link href="/marifetli-kids/gizlilik-politikasi" onClick={close} className="hover:text-brand dark:hover:text-brand">
              Gizlilik
            </Link>
            <span aria-hidden className="text-gray-300 dark:text-gray-600">
              |
            </span>
            <Link href="/marifetli-kids/kvkk-aydinlatma-metni" onClick={close} className="hover:text-brand dark:hover:text-brand">
              Aydınlatma
            </Link>
            <span aria-hidden className="text-gray-300 dark:text-gray-600">
              |
            </span>
            <Link href="/marifetli-kids/cerez-politikasi" onClick={close} className="hover:text-brand dark:hover:text-brand">
              Çerez
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
