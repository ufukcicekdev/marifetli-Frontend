'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/src/lib/api';

const DEFAULT_ABOUT = `Marifetli, el işi ve el sanatları tutkunlarının buluşma noktasıdır. Örgü, dikiş, nakış, takı tasarımı, makrome, amigurumi, keçe ve daha birçok el emeği alanında deneyimlerinizi paylaşabilir, sorularınızı sorabilir, birbirinden ilham alabilirsiniz.

Platformumuzda, yeni başlayanlar deneyimli ellerden tavsiye alırken; ustalar da bildiklerini paylaşarak topluluğun gelişmesine katkı sağlıyor. Her el işi meraklısının bir yeri var.

Misyonumuz: El emeğinin değerini yüceltmek, herkesin el işi deneyimlerini paylaşmasına olanak sağlamak ve geleneksel el sanatlarını gelecek nesillere taşımaktır.

Vizyonumuz: Türkiye'nin en güvenilir ve sıcak el işi topluluğu olmayı hedefliyoruz. Birlikte öğreniyor, paylaşıyor ve üretiyoruz.`;

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
      <main className="container mx-auto px-3 sm:px-4 py-8 max-w-4xl min-w-0 overflow-x-hidden">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          {isLoading ? '…' : 'Marifetli Hakkında'}
        </h1>
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-800 p-6 sm:p-8">
          <div className="prose prose-gray dark:prose-invert max-w-none">
            <div
              className="text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed"
              style={{ whiteSpace: 'pre-line' }}
            >
              {content}
            </div>
          </div>
        </div>
        <p className="mt-6 text-center">
          <Link
            href="/sorular"
            className="text-orange-600 dark:text-orange-400 font-medium hover:underline"
          >
            Sorulara göz atın →
          </Link>
        </p>
      </main>
    </div>
  );
}
