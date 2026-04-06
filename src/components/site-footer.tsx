'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { MarifetliKidsFooterBlock } from '@/src/components/legal/marifetli-kids-footer-block';
import { marifetliKidsLegalPathOnMain } from '@/src/lib/marifetli-kids-legal-paths';
import api from '@/src/lib/api';

/** Kids footer’daki marka hizası; ana sitede KIDS rozeti yok, header ile aynı logo kaynağı */
function MainSiteFooterBrandLink() {
  const { data: siteSettings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => api.getSiteSettings().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
  const logoUrl = siteSettings?.logo_url?.trim() || null;

  return (
    <Link
      href="/"
      className="font-logo inline-flex max-w-full items-center gap-0 whitespace-nowrap text-lg font-semibold tracking-tight text-gray-900 hover:opacity-90 dark:text-white sm:text-xl md:text-2xl"
    >
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt=""
          width={40}
          height={40}
          className="-mr-1.5 h-7 w-7 shrink-0 object-contain sm:h-8 sm:w-8 md:h-9 md:w-9"
        />
      ) : (
        <Image
          src="/logo.png"
          alt=""
          width={40}
          height={40}
          className="-mr-1.5 h-7 w-7 shrink-0 object-contain sm:h-8 sm:w-8 md:h-9 md:w-9"
        />
      )}
      <span className="leading-none">arifetli</span>
    </Link>
  );
}

/**
 * Kids portal footer ile aynı görsel yapı (gradient şerit, zemin, iki sütun).
 * Yasal linkler ana sitedeki Marifetli Kids metin yollarını kullanır.
 */
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200/80 bg-slate-50 pb-[calc(4.75rem+env(safe-area-inset-bottom))] dark:border-zinc-800 dark:bg-zinc-950 md:pb-0">
      <div className="h-1 w-full bg-linear-to-r from-violet-500 via-amber-400 to-sky-500" aria-hidden />
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-10 xl:gap-14">
          <div className="shrink-0 lg:pt-0.5">
            <MainSiteFooterBrandLink />
          </div>
          <div className="min-w-0 flex-1">
            <MarifetliKidsFooterBlock
              variant="kids"
              align="start"
              compact
              layout="wide"
              termsHref={marifetliKidsLegalPathOnMain('terms')}
              privacyHref={marifetliKidsLegalPathOnMain('privacy')}
              kvkkHref={marifetliKidsLegalPathOnMain('kvkk')}
              cookiesHref={marifetliKidsLegalPathOnMain('cookies')}
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
