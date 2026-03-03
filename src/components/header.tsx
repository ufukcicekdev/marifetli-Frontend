'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuthModalStore } from '../stores/auth-modal-store';
import { useAuthStore } from '../stores/auth-store';
import { useSidebarStore } from '../stores/sidebar-store';
import { ThemeToggle } from './theme-toggle';
import { AuthModal } from './auth-modal';

export function Header() {
  const router = useRouter();
  const openAuth = useAuthModalStore((s) => s.open);
  const { isAuthenticated, user, logout } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const sidebarToggle = useSidebarStore((s) => s.toggle);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/sorular?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/sorular');
    }
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-3 sm:px-4 py-2 flex items-center gap-2 sm:gap-4 min-w-0">
          {/* Sol */}
          <div className="flex items-center gap-2 flex-1 min-w-0 justify-start">
            <button
              onClick={sidebarToggle}
              className="p-2 -ml-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 shrink-0"
              title="Menü"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Link href="/" className="text-lg sm:text-xl font-bold text-orange-500 hover:text-orange-600 truncate">
              Marifetli
            </Link>
          </div>

          {/* Orta: Arama - ortada */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 justify-center min-w-0 px-2 max-w-xl mx-auto">
            <div className="relative w-full max-w-md flex items-center bg-gray-100 dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 focus-within:ring-1 focus-within:ring-orange-500">
              <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 ml-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Bir şey ara..."
                className="flex-1 bg-transparent px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 outline-none min-w-0"
              />
            </div>
          </form>
          <Link href="/sorular" className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 shrink-0" title="Ara">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </Link>

          {/* Sağ */}
          <div className="flex items-center justify-end gap-1 sm:gap-2 flex-1 min-w-0">
            <ThemeToggle />
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
                  >
                    <span className="text-base leading-none">+</span>
                    <span className="hidden sm:inline">Gönderi Oluştur</span>
                  </button>
                )}
                <Link
                  href="/bildirimler"
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                  title="Bildirimler"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </Link>
                <div className="relative shrink-0" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen((o) => !o)}
                    className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-sm overflow-hidden shrink-0">
                      {user.profile_picture ? (
                        <img src={user.profile_picture} alt="" className="w-full h-full object-cover" />
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
              <>
                <button onClick={() => openAuth('login')} className="text-gray-600 dark:text-gray-400 hover:text-orange-500 font-medium py-1 px-2">
                  Giriş Yap
                </button>
                <button
                  onClick={() => openAuth('register')}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
                >
                  Üye Ol
                </button>
              </>
            )}
          </div>
        </div>
      </header>
      <AuthModal />
    </>
  );
}
