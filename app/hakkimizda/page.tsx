'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import api from '@/src/lib/api';

const LOGIN_REGISTER_IMAGES = {
  heroMain: '/login-register/hero-main.png',
  heroPeople1: '/login-register/hero-people-1.png',
  heroPeople2: '/login-register/hero-people-2.png',
} as const;

const DEFAULT_ABOUT = `Marifetli, ilgi alanlarının buluşma noktasıdır. Örgü, dikiş, yemek, müzik, sanat, hobiler ve daha birçok alanda deneyimlerinizi paylaşabilir, sorularınızı sorabilir, birbirinden ilham alabilirsiniz.

Platformumuzda yeni başlayanlar deneyimli üyelerden tavsiye alırken; bilenler de bildiklerini paylaşarak topluluğun gelişmesine katkı sağlıyor. Her meraklısının bir yeri var.

Misyonumuz: El emeğinin ve üretimin değerini yüceltmek, herkesin deneyimlerini paylaşmasına olanak sağlamak.

Vizyonumuz: Türkiye'nin en güvenilir ve sıcak topluluk platformu olmayı hedefliyoruz. Birlikte öğreniyor, paylaşıyor ve üretiyoruz.`;

export default function AboutPage() {
  const { data: settings, isLoading } = useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const { data } = await api.getSiteSettings();
      return data;
    },
  });

  const content = (settings?.about_content?.trim() || DEFAULT_ABOUT).trim();

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-3 sm:px-4 py-8 max-w-5xl min-w-0 overflow-x-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Sol: Görsel collage — mobilde üstte, masaüstünde solda */}
          <div className="relative order-1 flex justify-center lg:justify-start w-full min-w-0">
            <div className="relative w-full min-w-[300px] max-w-[380px] lg:max-w-none rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 p-8 min-h-[320px] flex flex-col">
              <div className="relative flex-1 min-h-[260px] w-full" style={{ minWidth: 280 }}>
                {/* Ana büyük kart */}
                <div className="absolute inset-y-4 left-4 right-8 flex items-center justify-center">
                  <div className="relative w-[260px] h-[190px] rounded-2xl overflow-hidden shadow-xl ring-2 ring-gray-200/80 dark:ring-gray-600/50 bg-white dark:bg-gray-900">
                    <Image
                      src={LOGIN_REGISTER_IMAGES.heroMain}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="260px"
                    />
                  </div>
                </div>
                {/* Üstte küçük kart */}
                <div className="absolute -top-2 right-4 w-32 h-24 rounded-2xl overflow-hidden shadow-lg ring-2 ring-gray-200 dark:ring-gray-600 bg-white dark:bg-gray-900">
                  <Image
                    src={LOGIN_REGISTER_IMAGES.heroPeople1}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="128px"
                  />
                </div>
                {/* Altta küçük kart */}
                <div className="absolute bottom-0 left-0 w-32 h-24 rounded-2xl overflow-hidden shadow-lg ring-2 ring-gray-200 dark:ring-gray-600 bg-white dark:bg-gray-900">
                  <Image
                    src={LOGIN_REGISTER_IMAGES.heroPeople2}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="128px"
                  />
                </div>
                {/* Uçuşan ikonlar */}
                <span className="absolute top-4 left-36 w-10 h-10 rounded-xl bg-white dark:bg-gray-700 shadow-md border border-gray-200 dark:border-gray-600 flex items-center justify-center text-xl" aria-hidden>🧵</span>
                <span className="absolute top-16 right-1 w-9 h-9 rounded-lg bg-white dark:bg-gray-700 shadow-md border border-gray-200 dark:border-gray-600 flex items-center justify-center text-lg" aria-hidden>✂️</span>
                <span className="absolute bottom-6 left-28 w-9 h-9 rounded-lg bg-white dark:bg-gray-700 shadow-md border border-gray-200 dark:border-gray-600 flex items-center justify-center text-lg" aria-hidden>🪡</span>
                <span className="absolute bottom-2 right-10 w-8 h-8 rounded-full bg-white dark:bg-gray-700 shadow border border-gray-200 dark:border-gray-600 flex items-center justify-center text-sm" aria-hidden>❤️</span>
              </div>
            </div>
          </div>

          {/* Sağ: Başlık + metin — mobilde altta, masaüstünde sağda */}
          <div className="order-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              {isLoading ? '…' : 'Marifetli Hakkında'}
            </h1>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 sm:p-8">
              <div
                className="text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed text-base"
                style={{ whiteSpace: 'pre-line' }}
              >
                {content}
              </div>
            </div>
            <p className="mt-6">
              <Link
                href="/sorular"
                className="inline-flex items-center gap-2 text-brand font-medium hover:underline"
              >
                Sorulara göz atın
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
