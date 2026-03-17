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
import api from '../lib/api';

type CategoryItem = { id: number; name: string; slug: string; subcategories?: CategoryItem[] };

const NAV_ITEMS: { href: string; label: string; icon: string; description: string }[] = [
  { href: '/sorular', label: 'Anasayfa', icon: '🏠', description: 'Son gönderileri gör, topluluğu keşfet.' },
  { href: '/topluluklar', label: 'Toplulukları Keşfet', icon: '🔍', description: 'Kategorilere göz at, topluluklara katıl.' },
  { href: '/t/populer', label: 'Popüler', icon: '🔥', description: 'Günün çok konuşulanlarına göz at.' },
  { href: '/t/tum', label: 'Tümü', icon: '📋', description: 'Tüm soruları listele.' },
  { href: '/blog', label: 'Blog', icon: '📝', description: 'Makaleler ve rehberler.' },
  { href: '/tasarimlar', label: 'Tasarımlar', icon: '🎨', description: 'Topluluk tasarımlarını keşfet.' },
  { href: '/iletisim', label: 'İletişim', icon: '✉️', description: 'Bizimle iletişime geçin.' },
];

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
                {isAuthenticated && user && (
                  user.is_verified ? (
                    <Link
                      href="/soru-sor"
                      onClick={close}
                      className="flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-medium text-sm"
                    >
                      <span className="text-lg">+</span>
                      <span>Gönderi Oluştur</span>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { toast.error('Gönderi paylaşmak için önce e-posta adresinizi doğrulayın.'); close(); }}
                      className="flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-medium text-sm"
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
                {NAV_ITEMS.map((item) => {
                  const active = pathname === item.href || (item.href !== '/sorular' && pathname?.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={close}
                      className={`flex gap-3 p-3 rounded-xl transition-colors ${
                        active
                          ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
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
                className="md:hidden flex items-center justify-between gap-3 p-4 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 font-medium mt-2 border border-orange-100 dark:border-orange-800/50"
              >
                <span className="flex items-center gap-2">
                  <span className="text-xl" aria-hidden>📁</span>
                  Kategoriler
                </span>
                <svg className="w-5 h-5 shrink-0 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-orange-500 text-white"
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
                <Link href="/kategoriler" onClick={close} className="text-xs font-medium text-orange-600 dark:text-orange-400 hover:underline">
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
                          mainActive ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200'
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
                                    subActive ? 'text-orange-600 dark:text-orange-400 font-medium' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
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
        <div className="bg-white dark:bg-gray-900 px-4 md:px-6 py-3 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400 shrink-0">
            <Link href="/iletisim" onClick={close} className="hover:text-orange-600 dark:hover:text-orange-400">İletişim</Link>
            <Link href="/hakkimizda" onClick={close} className="hover:text-orange-600 dark:hover:text-orange-400">Hakkımızda</Link>
            <Link href="/gizlilik-politikasi" onClick={close} className="hover:text-orange-600 dark:hover:text-orange-400">Gizlilik Politikası</Link>
            <Link href="/kullanim-sartlari" onClick={close} className="hover:text-orange-600 dark:hover:text-orange-400">Kullanım Şartları</Link>
            <span>© {new Date().getFullYear()} Marifetli</span>
        </div>
      </div>
    </>
  );
}
