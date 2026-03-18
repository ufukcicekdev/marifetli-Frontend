'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/src/lib/api';


const VALUE_ITEMS = [
  {
    title: 'Soru sor',
    description: 'Merak ettiğin her şeyi topluluğa sor.',
    href: '/soru-sor',
    icon: '💬',
  },
  {
    title: 'Cevapla',
    description: 'Bildiklerini paylaş, başkalarına ilham ver.',
    href: '/sorular',
    icon: '✨',
  },
  {
    title: 'Topluluklara katıl',
    description: 'Örgü, dikiş, nakış… İlgi alanına göre keşfet.',
    href: '/topluluklar',
    icon: '👥',
  },
  {
    title: 'Tasarım paylaş',
    description: 'El emeği ürünlerini toplulukla paylaş.',
    href: '/tasarimlar',
    icon: '🎨',
  },
];

function scrollToFeed() {
  document.getElementById('sorular')?.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Pinterest tarzı anasayfa landing: amaç, yapı ve keşfet CTA'ları.
 */
export function HomeHero() {
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories().then((r) => r.data),
  });

  const raw = categoriesData as { id: number; name: string; slug: string }[] | { results?: { id: number; name: string; slug: string }[] } | undefined;
  const categoriesList = Array.isArray(raw) ? raw : (raw?.results ?? []);
  const topCategories = categoriesList.slice(0, 8);

  return (
    <section className="mb-6 sm:mb-8">
      {/* Hero blok */}
      <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-gradient-to-br from-brand-pink via-white to-brand-sky/10 dark:from-gray-800/90 dark:via-gray-800/80 dark:to-gray-900/90 overflow-hidden shadow-sm">
        <div className="px-5 sm:px-8 py-8 sm:py-10">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2 max-w-2xl">
            El işi tutkunlarının buluşma noktası
          </h1>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-xl mb-6">
            Örgü, dikiş, nakış, amigurumi, takı ve daha fazlası. Soru sor, cevapla, topluluklara katıl — birlikte öğreniyor ve üretiyoruz.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/soru-sor"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-brand hover:bg-brand-hover text-white transition-colors shadow-sm"
            >
              <span className="text-lg leading-none">+</span>
              Soru sor
            </Link>
            <Link
              href="/topluluklar"
              className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Toplulukları keşfet
            </Link>
            <button
              type="button"
              onClick={scrollToFeed}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-brand hover:bg-brand-pink/50 dark:hover:bg-brand/10 transition-colors"
            >
              Sorulara göz at
              <span aria-hidden>↓</span>
            </button>
          </div>
        </div>
      </div>

      {/* Marifetli'de neler yapabilirsin? */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {VALUE_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 sm:p-5 hover:border-brand/40 hover:shadow-md transition-all"
          >
            <span className="text-2xl sm:text-3xl block mb-2" aria-hidden>
              {item.icon}
            </span>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-brand transition-colors">
              {item.title}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
              {item.description}
            </p>
          </Link>
        ))}
      </div>

      {/* Kategoriler önizleme */}
      {topCategories.length > 0 && (
        <div className="mt-6 rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 sm:p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Kategorileri keşfet
            </h2>
            <Link
              href="/kategoriler"
              className="text-sm font-medium text-brand hover:text-brand-hover"
            >
              Tümü →
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {topCategories.map((c) => (
              <Link
                key={c.id}
                href={`/t/${c.slug}`}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-brand-pink/60 dark:hover:bg-brand/10 hover:text-brand border border-transparent hover:border-brand/30 transition-colors"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Kısa “yapı” metni */}
      <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
        Marifetli, el emeğinin değerini yüceltmek ve herkesin deneyimini paylaşmasına olanak sağlamak için burada. Sorularını sor, cevaplarını yaz, topluluklara katıl.
      </p>
    </section>
  );
}
