'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { useAuthModalStore } from '../stores/auth-modal-store';
import { useAuthStore } from '../stores/auth-store';
import { useSidebarStore } from '../stores/sidebar-store';
import { useUIStore } from '../stores/ui-store';
import { ThemeToggle } from './theme-toggle';
import { AvatarCornerBadges, OptimizedAvatar } from './optimized-avatar';
import { AuthModal } from './auth-modal';
import { Gift } from 'lucide-react';
import api from '@/src/lib/api';
import { useGamificationRoadmapModalStore } from '@/src/stores/gamification-roadmap-modal-store';

/** Tek parça header yüksekliği (nav + search bar) — layout/mega menu/sticky için */
export const HEADER_HEIGHT_PX = 104;

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const openAuth = useAuthModalStore((s) => s.open);
  const { isAuthenticated, user, logout } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [searchScopeOverride, setSearchScopeOverride] = useState<'global' | null>(null);
  const dropdownRefDesktop = useRef<HTMLDivElement>(null);
  const dropdownRefMobile = useRef<HTMLDivElement>(null);
  const sidebarToggle = useSidebarStore((s) => s.toggle);
  const pageSearchScope = useUIStore((s) => s.pageSearchScope);
  const useSidebar = process.env.NEXT_PUBLIC_USE_SIDEBAR === 'true';

  /** Kategori/topluluk/blog sayfasından scope. /topluluklar'da seçim yoksa "Tümü", /blog'da "Blog" scope'u gelir. */
  type ScopeRaw =
    | { type: 'community'; slug: string }
    | { type: 'category'; slug: string }
    | { type: 'topluluklar_tum' }
    | { type: 'blog' };

  const searchScopeRaw = ((): ScopeRaw | null => {
    if (searchScopeOverride === 'global') return null;
    if (pathname === '/blog' || pathname?.startsWith('/blog/')) return { type: 'blog' };
    if (pathname === '/topluluklar') {
      if (pageSearchScope) return { type: pageSearchScope.type, slug: pageSearchScope.slug };
      return { type: 'topluluklar_tum' };
    }
    const matchTopluluk = pathname?.match(/^\/topluluk\/([^/]+)/);
    if (matchTopluluk) return { type: 'community', slug: matchTopluluk[1] };
    const matchT = pathname?.match(/^\/t\/([^/]+)/);
    if (matchT && matchT[1] !== 'populer' && matchT[1] !== 'tum') return { type: 'category', slug: matchT[1] };
    return null;
  })();

  const categorySlug = searchScopeRaw?.type === 'category' ? searchScopeRaw.slug : '';
  const communitySlug = searchScopeRaw?.type === 'community' ? searchScopeRaw.slug : '';

  const { data: scopeCategory } = useQuery({
    queryKey: ['category', categorySlug],
    queryFn: () => api.getCategoryBySlug(categorySlug),
    enabled: !!categorySlug,
  });

  const { data: scopeCommunity } = useQuery({
    queryKey: ['community', communitySlug],
    queryFn: () => api.getCommunity(communitySlug).then((r) => r.data),
    enabled: !!communitySlug,
  });

  const searchScope: { type: 'community' | 'category' | 'topluluklar_tum' | 'blog'; slug: string; label: string } | null =
    !searchScopeRaw
      ? null
      : searchScopeRaw.type === 'blog'
        ? { type: 'blog', slug: '', label: 'Blog' }
        : searchScopeRaw.type === 'topluluklar_tum'
          ? { type: 'topluluklar_tum', slug: '', label: 'Tümü' }
          : {
              type: searchScopeRaw.type,
              slug: searchScopeRaw.slug,
              label:
                searchScopeRaw.type === 'category'
                  ? `t/${scopeCategory?.name ?? categorySlug}`
                  : `r/${scopeCommunity?.name ?? communitySlug}`,
            };

  useEffect(() => {
    setSearchScopeOverride(null);
  }, [pathname]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const term = searchQ.trim();
    if (searchScope?.type === 'blog') {
      if (term) router.push(`/blog?q=${encodeURIComponent(term)}`);
      else router.push('/blog');
    } else if (searchScope?.type === 'community') {
      const params = new URLSearchParams();
      if (term) params.set('q', term);
      params.set('community', searchScope.slug);
      router.push(`/sorular?${params.toString()}`);
    } else if (searchScope?.type === 'category') {
      const params = new URLSearchParams();
      if (term) params.set('q', term);
      router.push(`/t/${searchScope.slug}?${params.toString()}`);
    } else {
      if (term) router.push(`/sorular?q=${encodeURIComponent(term)}`);
      else router.push('/sorular');
    }
  };

  const { data: unreadData } = useQuery({
    queryKey: ['notification-unread-count'],
    queryFn: () => api.getNotificationUnreadCount().then((r) => r.data),
    enabled: isAuthenticated,
    refetchInterval: 60_000,
  });
  const unreadCount = unreadData?.unread_count ?? 0;

  const { data: siteSettings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => api.getSiteSettings().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
  const logoUrl = siteSettings?.logo_url?.trim() || null;

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

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 h-[104px] flex flex-col bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm text-gray-900 dark:text-white" style={{ height: HEADER_HEIGHT_PX }}>
        {/* Üst satır: Hamburger | Marifetli (ortada) | Tema, Giriş/Üye — 52px, dikey ortada */}
        <div className="relative h-[52px] min-h-[52px] flex items-stretch justify-between gap-1 sm:gap-2 px-2 sm:px-4 container mx-auto w-full min-w-0 shrink-0">
          {/* Sol: sidebar açma — sidebar modunda sadece mobilde hamburger görünür; masaüstünde div spacer kalır */}
          <div className="flex items-center shrink-0 min-w-0 w-9 sm:w-auto sm:min-w-0">
            <button
              onClick={sidebarToggle}
              className={`header-nav-btn px-2 sm:px-2 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/15 ${useSidebar ? 'lg:!hidden' : ''}`}
              title="Menü"
              aria-label="Menüyü aç"
            >
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
          {/* Orta: logo + arifetli — daha büyük, açık modda koyu renk */}
          <Link href="/" className="font-logo flex items-center justify-center gap-0 text-xl sm:text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white tracking-tight hover:opacity-90 transition-opacity shrink-0 absolute left-1/2 -translate-x-1/2 whitespace-nowrap" tabIndex={0}>
            {logoUrl ? (
              <Image src={logoUrl} alt="" width={40} height={40} className="shrink-0 w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 object-contain -mr-1.5" priority />
            ) : (
              <Image src="/logo.png" alt="" width={40} height={40} className="shrink-0 w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 object-contain -mr-1.5" priority />
            )}
            <span className="leading-none">arifetli</span>
          </Link>
          {/* Sağ: header üst satırı (52px) içinde dikey ortalı */}
          <div
            className="header-top-right flex items-center justify-end gap-0.5 sm:gap-2 shrink-0 min-w-0 self-stretch"
            style={{ minHeight: 52, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}
          >
            <button
              type="button"
              onClick={() =>
                useGamificationRoadmapModalStore.getState().openModal({
                  tab: isAuthenticated ? 'personal' : 'general',
                })
              }
              className="header-nav-btn gap-1.5 px-2 sm:px-3 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/15"
              title="Ödüller ve yol haritası"
              aria-label="Ödüller ve yol haritası"
            >
              <Gift
                className="w-[22px] h-[22px] sm:w-5 sm:h-5 shrink-0 text-brand dark:text-brand stroke-[2.25]"
                aria-hidden
              />
              <span className="hidden sm:inline text-sm font-medium">Ödüller</span>
            </button>
            <span className="header-nav-theme-wrap hidden md:inline-flex">
              <ThemeToggle />
            </span>
            {isAuthenticated && user ? (
              <>
                {/* Gönderi Oluştur — sadece md ve üzeri (mobilde menüde); wrapper ile gizle çünkü globals .header-nav-btn display eziyor */}
                <span className="hidden md:inline-flex">
                  {user.is_verified ? (
                    <Link
                      href="/soru-sor"
                      className="header-nav-btn bg-brand hover:bg-brand-hover text-white px-3"
                      title="Gönderi Oluştur"
                    >
                      <span className="text-base">+</span>
                      <span>Gönderi Oluştur</span>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toast.error('Gönderi paylaşmak için önce e-posta adresinizi doğrulayın.')}
                      className="header-nav-btn bg-brand hover:bg-brand-hover text-white px-3"
                      title="Gönderi Oluştur (e-posta doğrulama gerekli)"
                    >
                      <span className="text-base">+</span>
                      <span>Gönderi Oluştur</span>
                    </button>
                  )}
                </span>
                <Link
                  href="/bildirimler"
                  className="header-nav-btn relative w-9 min-w-[36px] px-0 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/15"
                  title="Bildirimler"
                  aria-label={unreadCount > 0 ? `Bildirimler (${unreadCount} okunmamış)` : 'Bildirimler'}
                >
                  <svg className="w-5 h-5 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-brand text-white text-[10px] font-bold">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>
                <div className="relative shrink-0 flex items-center" ref={dropdownRefDesktop}>
                  <button
                    type="button"
                    onClick={() => setDropdownOpen((o) => !o)}
                    className="header-nav-btn gap-1.5 px-1 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/15"
                    aria-label="Profil menüsünü aç"
                    aria-haspopup="menu"
                    aria-expanded={dropdownOpen}
                  >
                    <div className="relative w-8 h-8 rounded-full bg-gray-200 dark:bg-white/20 flex items-center justify-center text-gray-700 dark:text-white font-bold text-sm shrink-0 ring-1 ring-gray-200/90 dark:ring-white/25 overflow-visible">
                      {user.profile_picture ? (
                        <OptimizedAvatar
                          src={user.profile_picture}
                          size={32}
                          alt=""
                          className="w-full h-full"
                          priority
                          badges={user.avatar_badges}
                          levelTitleFallback={user.current_level_title}
                          cornerTone="header"
                        />
                      ) : (
                        <>
                          {(user.first_name || user.username)?.charAt(0)?.toUpperCase() || '?'}
                          <AvatarCornerBadges
                            badges={user.avatar_badges}
                            size={32}
                            levelTitleFallback={user.current_level_title}
                            cornerTone="header"
                          />
                        </>
                      )}
                    </div>
                    <svg className="w-4 h-4 text-gray-600 dark:text-white/90 hidden sm:block shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {dropdownOpen && (
                    <div className="absolute right-0 top-full mt-1 w-52 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-[100]">
                      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">@{user.username}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                          {user.current_level_title?.trim() || 'Marifetli üyesi'}
                        </p>
                      </div>
                      <Link href={`/profil/${user.username}`} className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => setDropdownOpen(false)}>Profilim</Link>
                      <Link href={`/profil/${user.username}/basarilar`} className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => setDropdownOpen(false)}>Başarılar</Link>
                      <button
                        type="button"
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => {
                          setDropdownOpen(false);
                          useGamificationRoadmapModalStore.getState().openModal({ tab: 'personal' });
                        }}
                      >
                        Yol haritası
                      </button>
                      <Link href="/ayarlar" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => setDropdownOpen(false)}>Ayarlar</Link>
                      <Link href="/bildirimler" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 sm:hidden" onClick={() => setDropdownOpen(false)}>Bildirimler</Link>
                      <hr className="my-1 border-gray-200 dark:border-gray-700" />
                      <button onClick={() => { setDropdownOpen(false); logout(); }} className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700">Çıkış Yap</button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="hidden sm:flex items-center gap-2 shrink-0">
                <button
                  onClick={() => openAuth('login')}
                  className="header-nav-btn border border-gray-300 dark:border-white/60 text-gray-900 dark:text-white px-3 hover:bg-gray-100 dark:hover:bg-white/15"
                >
                  Giriş Yap
                </button>
                <button
                  onClick={() => openAuth('register')}
                  className="header-nav-btn bg-brand hover:bg-brand-hover text-white px-3"
                >
                  Üye Ol
                </button>
              </div>
            )}
          </div>
        </div>
        {/* Alt satır: Arama çubuğu — Marifetli'nin altında */}
        <div className="flex-1 flex items-center justify-center px-3 sm:px-4 pb-3 pt-1 min-h-0">
          <div className="w-full max-w-2xl">
            <form
              onSubmit={handleSearchSubmit}
              className="flex items-center rounded-full bg-white dark:bg-gray-900 shadow-sm overflow-hidden border border-gray-200/80 dark:border-gray-700 focus-within:ring-2 focus-within:ring-brand/50 focus-within:border-brand hover:border-brand/70 dark:hover:border-brand/60 hover:shadow-md transition-all duration-200"
            >
              <span className="pl-4 pr-2 text-gray-400 dark:text-gray-500 shrink-0 py-2" aria-hidden>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              {searchScope && (
                <div className="flex items-center gap-1 shrink-0 py-1.5 pl-2.5 pr-1.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium border border-gray-200 dark:border-gray-600">
                  <span>{searchScope.label}</span>
                  <button
                    type="button"
                    onClick={() => setSearchScopeOverride('global')}
                    className="flex items-center justify-center w-6 h-6 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                    title="Kapsamı kaldır, tüm sitede ara"
                    aria-label="Kapsamı kaldır"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
              <input
                type="search"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder={searchScope ? `${searchScope.label} içinde ara...` : 'Bir şey ara...'}
                className="flex-1 min-w-0 py-2.5 px-3 border-0 bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-0 text-sm"
                aria-label="Arama"
              />
              <button
                type="submit"
                className="shrink-0 px-4 py-2.5 bg-brand hover:bg-brand-hover text-white font-medium text-sm transition-colors rounded-full"
              >
                Ara
              </button>
            </form>
          </div>
        </div>
      </header>
      <AuthModal />
    </>
  );
}
