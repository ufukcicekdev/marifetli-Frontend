'use client';

import Link from 'next/link';
import { MarifetliKidsFooterBlock } from '@/src/components/legal/marifetli-kids-footer-block';
import { marifetliKidsLegalPathOnMain } from '@/src/lib/marifetli-kids-legal-paths';

/**
 * Her sayfada görünen footer — İletişim, Blog, Hakkımızda, Sorular vb. linkleri
 * ilk HTML'de yer alır. Böylece Google "Yönlendiren sayfa" uyarısı vermez (sitemap'teki
 * sayfalar en az bir sayfadan link alır).
 */
export function SiteFooter() {
  const year = new Date().getFullYear(); // Dinamik: her yıl güncel kalır
  return (
    <footer className="mt-auto border-t border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
      <div className="container mx-auto flex flex-col items-center justify-center gap-4 px-3 py-6 text-center text-sm text-gray-600 dark:text-gray-400 sm:px-4">
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1" aria-label="Site sayfaları">
          <Link href="/" className="transition-colors hover:text-brand dark:hover:text-brand">
            Ana sayfa
          </Link>
          <Link href="/sorular" className="transition-colors hover:text-brand dark:hover:text-brand">
            Sorular
          </Link>
          <Link href="/blog" className="transition-colors hover:text-brand dark:hover:text-brand">
            Blog
          </Link>
          <Link href="/hakkimizda" className="transition-colors hover:text-brand dark:hover:text-brand">
            Hakkımızda
          </Link>
          <Link href="/iletisim" className="transition-colors hover:text-brand dark:hover:text-brand">
            İletişim
          </Link>
          <Link href="/gizlilik-politikasi" className="transition-colors hover:text-brand dark:hover:text-brand">
            Gizlilik
          </Link>
          <Link href="/kullanim-sartlari" className="transition-colors hover:text-brand dark:hover:text-brand">
            Kullanım Şartları
          </Link>
        </nav>
        <MarifetliKidsFooterBlock
          variant="main"
          termsHref={marifetliKidsLegalPathOnMain('terms')}
          privacyHref={marifetliKidsLegalPathOnMain('privacy')}
          kvkkHref={marifetliKidsLegalPathOnMain('kvkk')}
          cookiesHref={marifetliKidsLegalPathOnMain('cookies')}
        />
        <span>© {year} Marifetli</span>
      </div>
    </footer>
  );
}
