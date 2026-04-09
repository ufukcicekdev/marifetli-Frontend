'use client';

import Image from 'next/image';
import Link from 'next/link';
import { MarifetliKidsFooterBlock } from '@/src/components/legal/marifetli-kids-footer-block';
import { marifetliKidsLegalPathOnKidsPortal } from '@/src/lib/marifetli-kids-legal-paths';

type KidsFooterProps = {
  pathPrefix: string;
};

/** Üst başlıktaki Kids markası ile aynı logo kilidi (logo.png + arifetli + KIDS rozeti) */
function KidsFooterBrandLink({ homeHref }: { homeHref: string }) {
  return (
    <Link
      href={homeHref}
      prefetch={false}
      className="font-logo inline-flex max-w-full items-center gap-0 whitespace-nowrap text-lg font-semibold tracking-tight text-gray-900 hover:opacity-90 dark:text-white sm:text-xl md:text-2xl"
    >
      <Image
        src="/logo.png"
        alt=""
        width={40}
        height={40}
        className="-mr-1.5 h-7 w-7 shrink-0 object-contain sm:h-8 sm:w-8 md:h-9 md:w-9"
      />
      <span lang="en" className="leading-none">
        arifetli
      </span>
      <span
        lang="en"
        className="ml-1.5 rounded-xl bg-linear-to-r from-amber-400 to-orange-400 px-2 py-0.5 text-xs font-extrabold tracking-wide text-white shadow-sm"
      >
        KIDS
      </span>
    </Link>
  );
}

export function KidsFooter({ pathPrefix }: KidsFooterProps) {
  const kidsHome = pathPrefix || '/';

  return (
    <footer className="mt-auto border-t border-slate-200/80 bg-slate-50 pb-[calc(4.75rem+env(safe-area-inset-bottom))] dark:border-zinc-800 dark:bg-zinc-950 md:pb-0">
      <div
        className="h-1 w-full bg-linear-to-r from-violet-500 via-amber-400 to-sky-500"
        aria-hidden
      />
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-10 xl:gap-14">
          <div className="shrink-0 lg:pt-0.5">
            <KidsFooterBrandLink homeHref={kidsHome} />
          </div>
          <div className="min-w-0 flex-1">
            <MarifetliKidsFooterBlock
              variant="kids"
              align="start"
              compact
              layout="wide"
              termsHref={marifetliKidsLegalPathOnKidsPortal(pathPrefix, 'terms')}
              privacyHref={marifetliKidsLegalPathOnKidsPortal(pathPrefix, 'privacy')}
              kvkkHref={marifetliKidsLegalPathOnKidsPortal(pathPrefix, 'kvkk')}
              cookiesHref={marifetliKidsLegalPathOnKidsPortal(pathPrefix, 'cookies')}
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
