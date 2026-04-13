import type { Metadata } from ‘next’;
import { Suspense } from ‘react’;
import { KidsHomeLanding } from ‘@/src/components/kids/kids-home-landing’;
import { kidsPathPrefixFromHost } from ‘@/src/lib/kids-config’;
import tr from ‘@/language/tr.json’;

/** Build-time statik HTML / CDN’de eski kabuk kalmasın; her istekte üret. */
export const dynamic = ‘force-dynamic’;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || ‘https://www.marifetli.com.tr’;

export const metadata: Metadata = {
  title: ‘Marifetli Kids - Çocuklar İçin Güvenli Öğrenme Platformu’,
  description: ‘Öğretmenler, öğrenciler ve veliler için güvenli okul platformu. Okul challenge\’ları, rozet yolu, öğretmen paneli ve daha fazlası.’,
  keywords: [‘Marifetli Kids’, ‘çocuk eğitim’, ‘okul platformu’, ‘öğretmen paneli’, ‘eğitim uygulaması’, ‘çocuk gelişimi’],
  openGraph: {
    type: ‘website’,
    locale: ‘tr_TR’,
    url: `${SITE_URL}/kids`,
    siteName: ‘Marifetli’,
    title: ‘Marifetli Kids - Çocuklar İçin Güvenli Öğrenme Platformu’,
    description: ‘Öğretmenler, öğrenciler ve veliler için güvenli okul platformu.’,
    images: [{ url: ‘/og-default.png’, width: 1376, height: 768, alt: ‘Marifetli Kids’ }],
  },
  twitter: {
    card: ‘summary_large_image’,
    title: ‘Marifetli Kids - Çocuklar İçin Güvenli Öğrenme Platformu’,
    description: ‘Öğretmenler, öğrenciler ve veliler için güvenli okul platformu.’,
    images: [‘/og-default.png’],
  },
  alternates: { canonical: `${SITE_URL}/kids` },
};

export default function KidsHomePage() {
  const host = '';
  const prefix = kidsPathPrefixFromHost(host);

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg py-16 text-center font-medium text-violet-800 dark:text-violet-200">
          {tr['common.loading']}
        </div>
      }
    >
      <KidsHomeLanding pathPrefix={prefix} />
    </Suspense>
  );
}
