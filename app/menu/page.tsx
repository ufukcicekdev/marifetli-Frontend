'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { NavIcon, type NavIconName } from '@/src/components/nav-icon';
import { useAuthStore } from '@/src/stores/auth-store';

type MenuItem = { href: string; label: string; icon: NavIconName; description: string };

const MENU_BASE: MenuItem[] = [
  { href: '/', label: 'Anasayfa', icon: 'home', description: 'Keşfet ve gündem' },
  { href: '/sorular', label: 'Sorular', icon: 'questions', description: 'Soru akışı ve yanıtlar' },
  { href: '/kategoriler', label: 'Kategoriler', icon: 'categories', description: 'Kategori listesi' },
  { href: '/tasarimlar', label: 'Tasarımlar', icon: 'designs', description: 'Topluluk tasarımları' },
  { href: '/topluluklar', label: 'Topluluklar', icon: 'discover', description: 'Toplulukları keşfet' },
  { href: '/blog', label: 'Blog', icon: 'blog', description: 'Yazılar ve rehberler' },
  { href: '/t/populer', label: 'Popüler', icon: 'popular', description: 'Öne çıkanlar' },
  { href: '/iletisim', label: 'İletişim', icon: 'contact', description: 'Bize ulaşın' },
  { href: '/uzman', label: 'Uzmana sor', icon: 'expert', description: 'Tam sayfa uzman paneli' },
];

export default function MobileMenuPage() {
  const user = useAuthStore((s) => s.user);
  const items = useMemo(() => {
    const list = [...MENU_BASE];
    if (user?.is_staff || user?.is_superuser) {
      list.splice(1, 0, {
        href: '/admin',
        label: 'Yönetim',
        icon: 'admin',
        description: 'Yönetim araçları',
      });
    }
    return list;
  }, [user?.is_staff, user?.is_superuser]);

  return (
    <div className="mx-auto max-w-3xl px-3 pb-8">
      <h1 className="mb-4 text-2xl font-black text-gray-900 dark:text-white">Menü</h1>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-2xl border border-gray-200 bg-white p-4 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
          >
            <div className="flex items-center gap-3">
              <span aria-hidden>
                <NavIcon name={item.icon} className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 dark:text-gray-100">{item.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{item.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
