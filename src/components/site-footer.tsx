'use client';

import Link from 'next/link';

/**
 * Her sayfada görünen footer — İletişim, Blog, Hakkımızda, Sorular vb. linkleri
 * ilk HTML'de yer alır. Böylece Google "Yönlendiren sayfa" uyarısı vermez (sitemap'teki
 * sayfalar en az bir sayfadan link alır).
 */
export function SiteFooter() {
  const year = new Date().getFullYear(); // Dinamik: her yıl güncel kalır
  return (
    <footer className="mt-auto border-t border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
      <div className="container mx-auto px-3 sm:px-4 py-6 flex flex-col items-center justify-center gap-3 text-sm text-gray-600 dark:text-gray-400 text-center">
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1" aria-label="Site sayfaları">
          <Link href="/" className="hover:text-brand dark:hover:text-brand transition-colors">
            Ana sayfa
          </Link>
          <Link href="/sorular" className="hover:text-brand dark:hover:text-brand transition-colors">
            Sorular
          </Link>
          <Link href="/blog" className="hover:text-brand dark:hover:text-brand transition-colors">
            Blog
          </Link>
          <Link href="/hakkimizda" className="hover:text-brand dark:hover:text-brand transition-colors">
            Hakkımızda
          </Link>
          <Link href="/iletisim" className="hover:text-brand dark:hover:text-brand transition-colors">
            İletişim
          </Link>
          <Link href="/gizlilik-politikasi" className="hover:text-brand dark:hover:text-brand transition-colors">
            Gizlilik
          </Link>
          <Link href="/kullanim-sartlari" className="hover:text-brand dark:hover:text-brand transition-colors">
            Kullanım Şartları
          </Link>
        </nav>
        <span>© {year} Marifetli</span>
      </div>
    </footer>
  );
}
