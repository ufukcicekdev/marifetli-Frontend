'use client';

import Link from 'next/link';
import { UzmanFullPageLink } from '@/src/components/uzman-full-page-link';
import { HomeHero } from '@/src/components/home-hero';
import { RecentActivitySidebar } from '@/src/components/recent-activity-sidebar';
import { PopularQuestionsSidebar } from '@/src/components/popular-questions-sidebar';
import { SiteStatsSidebar } from '@/src/components/site-stats-sidebar';

/**
 * Ana sayfa: hero + keşif; tam soru listesi /sorular’da (ilk yükleme hızı için).
 */
export default function HomePage() {
  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 flex flex-col lg:flex-row lg:items-start gap-4 sm:gap-6 min-w-0 min-h-[calc(100vh-104px)]">
      <div className="flex-1 min-w-0 overflow-hidden">
        <HomeHero />
        <section
          aria-labelledby="home-feed-cta-heading"
          className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div className="min-w-0">
            <h2 id="home-feed-cta-heading" className="text-lg font-semibold text-gray-900 dark:text-white">
              Sorular ve gönderiler
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-xl">
              Sıralama, görünüm ve arama <strong className="font-medium text-gray-800 dark:text-gray-200">Sorular</strong> sayfasında.
              Ana sayfada tam liste yok; açılış daha hızlı kalır.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <Link
              href="/sorular"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-brand hover:bg-brand-hover text-white shadow-sm transition-colors"
            >
              Tüm sorulara git
              <span aria-hidden>→</span>
            </Link>
            <Link
              href="/soru-sor"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Gönderi oluştur
            </Link>
            <UzmanFullPageLink className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-brand hover:opacity-95 text-white shadow-sm transition-opacity border border-white/10">
              <span aria-hidden>🧠</span>
              Uzmana sor
            </UzmanFullPageLink>
          </div>
        </section>
      </div>

      <div className="w-80 shrink-0 hidden lg:block self-start pb-6">
        <RecentActivitySidebar />
        <SiteStatsSidebar />
        <PopularQuestionsSidebar />
      </div>
    </div>
  );
}
