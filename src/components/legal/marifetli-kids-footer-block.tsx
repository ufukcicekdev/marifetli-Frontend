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
  /** Kids footer’da metinleri sola hizala */
  align?: 'center' | 'start';
  /** Daha sıkı satır aralığı (Kids footer) */
  compact?: boolean;
  /**
   * `wide`: md+ ekranlarda iki sütun — sol telif/şirket/iletişim, sağ açıklama metni;
   * alt satırda yasal linkler tam genişlik. Footer alanını yatay kullanır.
   */
  layout?: 'stack' | 'wide';
};

export function MarifetliKidsFooterBlock({
  termsHref,
  privacyHref,
  kvkkHref,
  cookiesHref,
  variant = 'main',
  align = 'center',
  compact = false,
  layout = 'stack',
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

  const isStart = align === 'start';
  const gapClass = compact ? 'gap-1.5 leading-snug' : 'gap-3';
  const baseClass = `text-xs sm:text-sm ${textMuted} ${
    isStart ? 'items-start text-left' : 'items-center text-center'
  }`.trim();

  const copyrightP = (
    <p className="font-medium text-gray-800 dark:text-gray-200">
      © {year} Marifetli Kids ve Marifetli.com.tr — Tüm hakları saklıdır.
    </p>
  );
  const startupP = (
    <p>
      <a href={SITE_WWW} className={linkClass} rel="noopener noreferrer">
        www.marifetli.com.tr
      </a>{' '}
      bir Startup Sales Support kuruluşudur.
      {compact ? ' ' : <br />}
      <span className="font-medium text-gray-700 dark:text-gray-300">Startup Sales Support</span>
    </p>
  );
  const contactP = (
    <p>
      <span aria-hidden>📩</span> İletişim:{' '}
      <a href="mailto:hello@marifetli.com.tr" className={`${linkClass} font-medium`}>
        hello@marifetli.com.tr
      </a>
    </p>
  );
  const disclaimerP = (
    <p className={layout === 'wide' ? undefined : isStart ? 'max-w-2xl' : 'max-w-xl'}>
      Bu platform çocuklar için güvenli bir öğrenme ortamı sunmak amacıyla tasarlanmıştır. 18 yaş altı kullanıcılar için
      veli ve öğretmen onayı gereklidir.
    </p>
  );

  const legalNav = (
    <nav
      className={`flex flex-wrap gap-x-2 gap-y-1 text-[0.8125rem] font-medium sm:text-sm ${
        isStart ? 'items-center justify-start' : 'items-center justify-center'
      } ${layout === 'wide' ? 'md:pt-1' : ''}`}
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
  );

  const mainSiteExtra =
    variant === 'main' ? (
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
    ) : null;

  if (layout === 'wide') {
    return (
      <div className={`flex w-full min-w-0 flex-col ${gapClass} ${baseClass}`}>
        <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2 md:items-start md:gap-x-10 md:gap-y-2 lg:gap-x-14">
          <div className={`flex min-w-0 flex-col ${compact ? 'gap-1.5' : 'gap-3'}`}>
            {copyrightP}
            {startupP}
            {contactP}
          </div>
          <div className="min-w-0 md:pt-0">{disclaimerP}</div>
        </div>
        {legalNav}
        {mainSiteExtra}
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${gapClass} ${baseClass}`}>
      {copyrightP}
      {startupP}
      {contactP}
      {disclaimerP}
      {legalNav}
      {mainSiteExtra}
    </div>
  );
}
