'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { useAuthModalStore } from '../stores/auth-modal-store';
import { useAuthStore } from '../stores/auth-store';
import { useSidebarStore } from '../stores/sidebar-store';
import { ThemeToggle } from './theme-toggle';
import { OptimizedAvatar } from './optimized-avatar';
import api from '@/src/lib/api';

const AuthModal = dynamic(() => import('./auth-modal').then((m) => ({ default: m.AuthModal })), { ssr: false });

/** pathname veya searchParams'tan topluluk slug'ı: /topluluk/[slug] veya /sorular?community=slug */
function useSearchCommunitySlug(): string | null {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return useMemo(() => {
    const match = pathname?.match(/^\/topluluk\/([^/]+)/);
    if (match?.[1]) return match[1];
    if (pathname === '/sorular') return searchParams?.get('community') ?? null;
    return null;
  }, [pathname, searchParams]);
}

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const openAuth = useAuthModalStore((s) => s.open);
  const { isAuthenticated, user, logout } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRefDesktop = useRef<HTMLDivElement>(null);
  const dropdownRefMobile = useRef<HTMLDivElement>(null);
  const sidebarToggle = useSidebarStore((s) => s.toggle);

  const searchCommunitySlug = useSearchCommunitySlug();
  const { data: searchCommunity } = useQuery({
    queryKey: ['community', searchCommunitySlug],
    queryFn: () => api.getCommunity(searchCommunitySlug!).then((r) => r.data),
    enabled: !!searchCommunitySlug,
  });

  const { data: unreadData } = useQuery({
    queryKey: ['notification-unread-count'],
    queryFn: () => api.getNotificationUnreadCount().then((r) => r.data),
    enabled: isAuthenticated,
    refetchInterval: 60_000,
  });
  const unreadCount = unreadData?.unread_count ?? 0;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const insideDropdown =
        dropdownRefDesktop.current?.contains(target) || dropdownRefMobile.current?.contains(target);
      if (!insideDropdown) setDropdownOpen(false);
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (pathname === '/sorular') setSearchQuery(searchParams?.get('q') ?? '');
    if (pathname === '/tasarimlar') setSearchQuery(searchParams?.get('q') ?? '');
  }, [pathname, searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (pathname === '/tasarimlar') {
      router.push(q ? `/tasarimlar?q=${encodeURIComponent(q)}` : '/tasarimlar');
      return;
    }
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (searchCommunitySlug) params.set('community', searchCommunitySlug);
    const query = params.toString();
    router.push(query ? `/sorular?${query}` : '/sorular');
  };

  const clearSearchCommunity = (e: React.MouseEvent) => {
    e.preventDefault();
    const q = searchParams?.get('q')?.trim();
    if (q) router.push(`/sorular?q=${encodeURIComponent(q)}`);
    else router.push('/sorular');
  };

  const clearTasarimlarContext = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push('/sorular');
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-3 sm:px-4 py-2 flex items-center gap-2 sm:gap-4 min-w-0 relative">
          {/* Sol - eşit alan için flex-1 (arama tam ortada kalsın) */}
          <div className="flex items-center gap-2 flex-1 min-w-0 justify-start z-10">
            <button
              onClick={sidebarToggle}
              className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 shrink-0"
              title="Menü"
              aria-label="Menüyü aç"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Link href="/" className="flex items-center gap-2 min-w-0 shrink-0">
              <span className="font-logo text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100 hover:text-orange-500 dark:hover:text-orange-400 transition-colors tracking-tight truncate">
                Marifetli
              </span>
            </Link>
          </div>

          {/* Orta: Arama - topluluk sayfasındayken r/slug pill + topluluk içi arama */}
          <form
            onSubmit={handleSearch}
            className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-[min(100%,28rem)] max-w-md px-2"
          >
            <div className="relative w-full flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 focus-within:ring-1 focus-within:ring-orange-500 pl-3 pr-2 py-1.5">
              <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchCommunitySlug && (
                <div className="flex items-center gap-1.5 shrink-0 rounded-full bg-gray-200 dark:bg-gray-700 pl-2 pr-1.5 py-0.5">
                  {searchCommunity?.avatar_url ? (
                    <img src={searchCommunity.avatar_url} alt={`${searchCommunity.name || searchCommunity.slug} topluluk`} className="w-5 h-5 rounded-full object-cover" />
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold">
                      {(searchCommunity?.name || searchCommunitySlug).charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">r/{searchCommunitySlug}</span>
                  <button
                    type="button"
                    onClick={clearSearchCommunity}
                    className="p-0.5 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                    aria-label="Topluluk filtresini kaldır"
                    title="Topluluk filtresini kaldır"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              )}
              {pathname === '/tasarimlar' && !searchCommunitySlug && (
                <div className="flex items-center gap-1.5 shrink-0 rounded-full bg-gray-200 dark:bg-gray-700 pl-2 pr-1.5 py-0.5">
                  <span className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs" aria-hidden>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Tasarımlar</span>
                  <button
                    type="button"
                    onClick={clearTasarimlarContext}
                    className="p-0.5 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                    aria-label="Tasarımlar bağlamını kaldır"
                    title="Tasarımlar bağlamını kaldır"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              )}
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  searchCommunitySlug
                    ? `r/${searchCommunitySlug}'de arama yapın`
                    : pathname === '/tasarimlar'
                      ? 'Tasarımlarda ara'
                      : 'Bir şey ara...'
                }
                className="flex-1 bg-transparent px-2 py-1 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 outline-none min-w-0"
              />
            </div>
          </form>

          {/* Sağ - eşit alan için flex-1 (arama tam ortada kalsın) */}
          <div className="hidden lg:flex items-center justify-end gap-2 flex-1 min-w-0 shrink-0">
            <span className="shrink-0">
              <ThemeToggle />
            </span>
            {isAuthenticated && user ? (
              <>
                {user.is_verified ? (
                  <Link
                    href="/soru-sor"
                    className="flex items-center gap-1 sm:gap-1.5 bg-orange-500 hover:bg-orange-600 text-white px-2 sm:px-3 py-1.5 rounded-full text-sm font-medium transition-colors shrink-0"
                    title="Gönderi Oluştur"
                  >
                    <span className="text-base leading-none">+</span>
                    <span className="hidden sm:inline">Gönderi Oluştur</span>
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => toast.error('Gönderi paylaşmak için önce e-posta adresinizi doğrulayın.')}
                    className="flex items-center gap-1 sm:gap-1.5 bg-orange-500 hover:bg-orange-600 text-white px-2 sm:px-3 py-1.5 rounded-full text-sm font-medium transition-colors shrink-0"
                    title="Gönderi Oluştur (e-posta doğrulama gerekli)"
                    aria-label="Gönderi oluştur (e-posta doğrulama gerekli)"
                  >
                    <span className="text-base leading-none">+</span>
                    <span className="hidden sm:inline">Gönderi Oluştur</span>
                  </button>
                )}
                <Link
                  href="/bildirimler"
                  className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                  title="Bildirimler"
                  aria-label={unreadCount > 0 ? `Bildirimler (${unreadCount} okunmamış)` : 'Bildirimler'}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-orange-500 text-white text-[10px] font-bold">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>
                <div className="relative shrink-0" ref={dropdownRefDesktop}>
                  <button
                    type="button"
                    onClick={() => setDropdownOpen((o) => !o)}
                    className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    aria-label="Profil menüsünü aç"
                    aria-haspopup="menu"
                    aria-expanded={dropdownOpen}
                  >
                    <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-sm overflow-hidden shrink-0">
                      {user.profile_picture ? (
                        <OptimizedAvatar src={user.profile_picture} size={32} alt="" className="w-full h-full" priority />
                      ) : (
                        (user.first_name || user.username)?.charAt(0)?.toUpperCase() || '?'
                      )}
                    </div>
                    <svg className="w-4 h-4 text-gray-500 hidden sm:block shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 mt-1 w-52 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">@{user.username}</p>
                        <p className="text-xs text-gray-500">Karma · Yeni</p>
                      </div>
                      <Link
                        href={`/profil/${user.username}`}
                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => setDropdownOpen(false)}
                      >
                        Profilim
                      </Link>
                      <Link
                        href={`/profil/${user.username}/basarilar`}
                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => setDropdownOpen(false)}
                      >
                        Başarılar
                      </Link>
                      <Link
                        href="/ayarlar"
                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => setDropdownOpen(false)}
                      >
                        Ayarlar
                      </Link>
                      <Link
                        href="/bildirimler"
                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 sm:hidden"
                        onClick={() => setDropdownOpen(false)}
                      >
                        Bildirimler
                      </Link>
                      <hr className="my-1 border-gray-200 dark:border-gray-700" />
                      <button
                        onClick={() => { setDropdownOpen(false); logout(); }}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Çıkış Yap
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => openAuth('login')}
                  className="min-h-[36px] sm:min-h-0 px-3 py-2 sm:py-1.5 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 bg-transparent text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                >
                  Giriş Yap
                </button>
                <button
                  onClick={() => openAuth('register')}
                  className="min-h-[36px] sm:min-h-0 px-3 py-2 sm:py-1.5 rounded-lg text-sm font-medium bg-orange-500 hover:bg-orange-600 text-white transition-colors"
                >
                  Üye Ol
                </button>
              </div>
            )}
          </div>

          {/* Mobil: giriş yapılmışsa bildirim + profil (tema ve giriş/üye ol sidebar’da) */}
          <div className="flex lg:hidden items-center justify-end gap-2 shrink-0">
            {isAuthenticated && user ? (
              <>
                <Link
                  href="/bildirimler"
                  className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                  title="Bildirimler"
                  aria-label={unreadCount > 0 ? `Bildirimler (${unreadCount} okunmamış)` : 'Bildirimler'}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-orange-500 text-white text-[10px] font-bold">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>
                <div className="relative shrink-0" ref={dropdownRefMobile}>
                  <button
                    type="button"
                    onClick={() => setDropdownOpen((o) => !o)}
                    className="flex items-center gap-1 px-1.5 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    aria-label="Profil menüsünü aç"
                    aria-haspopup="menu"
                    aria-expanded={dropdownOpen}
                  >
                    <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-sm overflow-hidden shrink-0">
                      {user.profile_picture ? (
                        <OptimizedAvatar src={user.profile_picture} size={32} alt="" className="w-full h-full" priority />
                      ) : (
                        (user.first_name || user.username)?.charAt(0)?.toUpperCase() || '?'
                      )}
                    </div>
                  </button>
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-1 w-52 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">@{user.username}</p>
                        <p className="text-xs text-gray-500">Karma · Yeni</p>
                      </div>
                      <Link href={`/profil/${user.username}`} className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => setDropdownOpen(false)}>Profilim</Link>
                      <Link href={`/profil/${user.username}/basarilar`} className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => setDropdownOpen(false)}>Başarılar</Link>
                      <Link href="/ayarlar" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => setDropdownOpen(false)}>Ayarlar</Link>
                      <Link href="/bildirimler" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 sm:hidden" onClick={() => setDropdownOpen(false)}>Bildirimler</Link>
                      <hr className="my-1 border-gray-200 dark:border-gray-700" />
                      <button onClick={() => { setDropdownOpen(false); logout(); }} className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700">Çıkış Yap</button>
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </header>
      <AuthModal />
    </>
  );
}
