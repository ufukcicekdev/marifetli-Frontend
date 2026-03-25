'use client';

import Link from 'next/link';

const SITE_WWW = 'https://www.marifetli.com.tr';

export type MarifetliKidsFooterBlockProps = {
  /** Ana sitede `/marifetli-kids/...`, Kids’ta `/kids/yasal/...` */
  termsHref: string;
  privacyHref: string;
  kvkkHref: string;
  cookiesHref: string;
  /** Kids footer ile aynı görsel dil */
  variant?: 'kids' | 'main';
};

export function MarifetliKidsFooterBlock({
  termsHref,
  privacyHref,
  kvkkHref,
  cookiesHref,
  variant = 'main',
}: MarifetliKidsFooterBlockProps) {
  const year = new Date().getFullYear();
  const textMuted =
    variant === 'kids'
      ? 'text-violet-900/75 dark:text-violet-100/75'
      : 'text-gray-600 dark:text-gray-400';
  const linkClass =
    variant === 'kids'
      ? 'transition-colors hover:text-brand dark:hover:text-brand'
      : 'transition-colors hover:text-brand dark:hover:text-brand';

  const LegalLink = ({ href, children }: { href: string; children: React.ReactNode }) => {
    if (href.startsWith('http')) {
      return (
        <a href={href} className={linkClass} rel="noopener noreferrer">
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={linkClass}>
        {children}
      </Link>
    );
  };

  const sep = (
    <span className={variant === 'kids' ? 'text-violet-400/60 dark:text-violet-500/50' : 'text-gray-300 dark:text-gray-600'}>
      |
    </span>
  );

  return (
    <div
      className={`flex flex-col items-center gap-3 text-center text-xs sm:text-sm ${textMuted}`.trim()}
    >
      <p className="font-medium text-gray-800 dark:text-gray-200">
        © {year} Marifetli Kids ve Marifetli.com.tr — Tüm hakları saklıdır.
      </p>
      <p>
        <a href={SITE_WWW} className={linkClass} rel="noopener noreferrer">
          www.marifetli.com.tr
        </a>{' '}
        bir Startup Sales Support kuruluşudur.
        <br />
        <span className="font-medium text-gray-700 dark:text-gray-300">Startup Sales Support</span>
      </p>
      <p>
        <span aria-hidden>📩</span> İletişim:{' '}
        <a href="mailto:hello@marifetli.com.tr" className={`${linkClass} font-medium`}>
          hello@marifetli.com.tr
        </a>
      </p>
      <p className="max-w-xl">
        Bu platform çocuklar için güvenli bir öğrenme ortamı sunmak amacıyla tasarlanmıştır. 18 yaş altı kullanıcılar için
        veli ve öğretmen onayı gereklidir.
      </p>
      <nav
        className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[0.8125rem] font-medium sm:text-sm"
        aria-label="Marifetli Kids yasal metinler"
      >
        <LegalLink href={termsHref}>Kullanım Şartları</LegalLink>
        {sep}
        <LegalLink href={privacyHref}>Gizlilik Politikası</LegalLink>
        {sep}
        <LegalLink href={kvkkHref}>Aydınlatma Metni</LegalLink>
        {sep}
        <LegalLink href={cookiesHref}>Çerez Politikası</LegalLink>
      </nav>
      {variant === 'main' && (
        <p className="text-[0.7rem] text-gray-500 dark:text-gray-500">
          Marifetli ana site metinleri:{' '}
          <Link href="/kullanim-sartlari" className={linkClass}>
            Kullanım Şartları
          </Link>
          {' · '}
          <Link href="/gizlilik-politikasi" className={linkClass}>
            Gizlilik Politikası
          </Link>
        </p>
      )}
    </div>
  );
}
