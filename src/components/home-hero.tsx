'use client';

import Link from 'next/link';

/**
 * Anasayfa üstünde forum kimliği ve CTA — modern, sade hero.
 */
export function HomeHero() {
  return (
    <section className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-800/80 dark:to-gray-900/80 border border-amber-100/80 dark:border-gray-700/80 px-4 py-5 sm:px-5 sm:py-6 mb-4 sm:mb-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
            El işi & el sanatları topluluğu
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-xl">
            Örgü, dikiş, nakış, takı tasarımı ve daha fazlası — sorular sor, deneyimlerini paylaş, el emeğini keşfet.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/soru-sor"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-orange-500 hover:bg-orange-600 text-white transition-colors"
          >
            <span className="text-base leading-none">+</span>
            Soru sor
          </Link>
          <Link
            href="/topluluklar"
            className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Toplulukları keşfet
          </Link>
        </div>
      </div>
    </section>
  );
}
