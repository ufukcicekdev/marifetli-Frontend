'use client';

import Link from 'next/link';
import { MarifetliKidsFooterBlock } from '@/src/components/legal/marifetli-kids-footer-block';
import { marifetliKidsLegalPathOnKidsPortal } from '@/src/lib/marifetli-kids-legal-paths';

type KidsFooterProps = {
  pathPrefix: string;
};

export function KidsFooter({ pathPrefix }: KidsFooterProps) {
  const kidsHome = pathPrefix || '/';

  return (
    <footer className="mt-auto bg-white/90 backdrop-blur-md dark:bg-gray-900/90">
      <div
        className="h-1 w-full bg-gradient-to-r from-violet-500 via-amber-400 to-sky-500"
        aria-hidden
      />
      <div className="container mx-auto flex flex-col items-center justify-center gap-4 px-3 py-6 text-center text-sm text-violet-900/80 dark:text-violet-100/80 sm:px-4">
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1" aria-label="Kids sayfaları">
          <Link href={kidsHome} className="transition-colors hover:text-brand dark:hover:text-brand">
            Kids Anasayfa
          </Link>
          <Link href="/" className="transition-colors hover:text-brand dark:hover:text-brand">
            Marifetli
          </Link>
          <Link href="/iletisim" className="transition-colors hover:text-brand dark:hover:text-brand">
            İletişim
          </Link>
        </nav>
        <MarifetliKidsFooterBlock
          variant="kids"
          termsHref={marifetliKidsLegalPathOnKidsPortal(pathPrefix, 'terms')}
          privacyHref={marifetliKidsLegalPathOnKidsPortal(pathPrefix, 'privacy')}
          kvkkHref={marifetliKidsLegalPathOnKidsPortal(pathPrefix, 'kvkk')}
          cookiesHref={marifetliKidsLegalPathOnKidsPortal(pathPrefix, 'cookies')}
        />
      </div>
    </footer>
  );
}
