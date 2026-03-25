'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/src/lib/api';
import { UzmanFullPageLink } from '@/src/components/uzman-full-page-link';
import { SITE_KIDS_BTN_PRIMARY, SITE_KIDS_HREF } from '@/src/lib/site-kids';

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
    description: 'El işleri, yemek, müzik, sanat… İlgi alanına göre keşfet.',
    href: '/topluluklar',
    icon: '👥',
  },
  {
    title: 'Tasarım paylaş',
    description: 'El emeği ürünlerini toplulukla paylaş.',
    href: '/tasarimlar',
    icon: '🎨',
  },
  {
    title: 'Marifetli Kids',
    description: 'Okul challenge’ları, rozet yolu — öğretmen ve öğrenciler için güvenli alan.',
    href: SITE_KIDS_HREF,
    icon: '🎒',
  },
];

const CATEGORY_ACCENT: Record<string, { icon: string; bg: string; border: string }> = {
  'el-isleri': { icon: '🧵', bg: 'bg-rose-50 dark:bg-rose-950/30', border: 'border-rose-200 dark:border-rose-800' },
  'dikis-moda': { icon: '👗', bg: 'bg-violet-50 dark:bg-violet-950/30', border: 'border-violet-200 dark:border-violet-800' },
  'ev-dekorasyonu': { icon: '🏠', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800' },
  'yemek-marifetleri': { icon: '🍳', bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-200 dark:border-orange-800' },
  'muzik': { icon: '🎵', bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800' },
  'sanat': { icon: '🎨', bg: 'bg-pink-50 dark:bg-pink-950/30', border: 'border-pink-200 dark:border-pink-800' },
  'fotograf-video': { icon: '📷', bg: 'bg-slate-100 dark:bg-slate-800/50', border: 'border-slate-200 dark:border-slate-700' },
  'hobiler': { icon: '🌱', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800' },
  'dijital-beceriler': { icon: '💻', bg: 'bg-cyan-50 dark:bg-cyan-950/30', border: 'border-cyan-200 dark:border-cyan-800' },
};
const defaultAccent = { icon: '📁', bg: 'bg-gray-100 dark:bg-gray-800', border: 'border-gray-200 dark:border-gray-700' };
function getCategoryAccent(slug: string) {
  return CATEGORY_ACCENT[slug] ?? defaultAccent;
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
      {/* Kids — ana hero başlığının üstünde */}
      <div className="mb-4 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:mb-5">
        <div className="h-1 w-full bg-gradient-to-r from-brand via-brand-pink to-brand-sky" aria-hidden />
        <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6 sm:py-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span className="text-2xl shrink-0 sm:text-3xl" aria-hidden>
              🎒
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white sm:text-base">
                Marifetli Kids — okul challenge’ları ve rozetler
              </p>
              <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400 sm:text-sm">
                Öğretmen ve öğrenci hesaplarıyla güvenli challenge alanı; giriş ve davetler Kids ana sayfasından.
              </p>
            </div>
          </div>
          <Link href={SITE_KIDS_HREF} className={`${SITE_KIDS_BTN_PRIMARY} shrink-0 justify-center px-5 py-2.5 sm:px-6`}>
            Kids alanına git
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>

      {/* Hero blok */}
      <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-gradient-to-br from-brand-pink via-white to-brand-sky/10 dark:from-gray-800/90 dark:via-gray-800/80 dark:to-gray-900/90 overflow-hidden shadow-sm">
        <div className="px-5 sm:px-8 py-8 sm:py-10">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2 max-w-2xl">
            İlgi alanlarının buluşma noktası
          </h1>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-xl mb-6">
            Örgü, dikiş, yemek, müzik, sanat, fotoğraf, hobiler ve daha fazlası. Soru sor, cevapla, topluluklara katıl — birlikte öğreniyor ve üretiyoruz.
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
            <Link
              href="/sorular"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-brand border border-brand/30 hover:bg-brand-pink/50 dark:hover:bg-brand/10 transition-colors"
            >
              Tüm sorular
              <span aria-hidden>→</span>
            </Link>
            <UzmanFullPageLink className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-brand hover:opacity-95 text-white shadow-sm transition-opacity">
              <span aria-hidden>🧠</span>
              Uzmana sor
            </UzmanFullPageLink>
            <Link href={SITE_KIDS_HREF} className={SITE_KIDS_BTN_PRIMARY}>
              <span aria-hidden>🎒</span>
              Marifetli Kids
            </Link>
          </div>
        </div>
      </div>

      {/* Marifetli'de neler yapabilirsin? */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-5">
        {VALUE_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group rounded-xl border border-gray-200/80 bg-white p-4 transition-all hover:border-brand/40 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 sm:p-5"
          >
            <span className="mb-2 block text-2xl sm:text-3xl" aria-hidden>
              {item.icon}
            </span>
            <h2 className="text-sm font-semibold text-gray-900 transition-colors group-hover:text-brand dark:text-white">
              {item.title}
            </h2>
            <p className="mt-0.5 line-clamp-2 text-xs text-gray-600 dark:text-gray-400">{item.description}</p>
          </Link>
        ))}
      </div>

      {/* Kategoriler önizleme */}
      {topCategories.length > 0 && (
        <div className="mt-6 rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
          <div className="h-1 w-full bg-gradient-to-r from-brand via-brand-pink to-brand-sky" aria-hidden />
          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
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
              {topCategories.map((c) => {
                const style = getCategoryAccent(c.slug);
                return (
                  <Link
                    key={c.id}
                    href={`/t/${c.slug}`}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all hover:shadow-md hover:scale-[1.02] ${style.bg} ${style.border} text-gray-800 dark:text-gray-200 hover:border-brand/50 dark:hover:border-brand/50`}
                  >
                    <span className="text-base leading-none" aria-hidden>{style.icon}</span>
                    {c.name}
                  </Link>
                );
              })}
              <Link
                href={SITE_KIDS_HREF}
                className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-gray-800 transition-all hover:scale-[1.02] hover:border-brand-sky hover:shadow-md dark:border-sky-700 dark:bg-sky-950/35 dark:text-gray-100 dark:hover:border-brand-sky"
              >
                <span className="text-base leading-none" aria-hidden>
                  🎒
                </span>
                Marifetli Kids
              </Link>
            </div>
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
