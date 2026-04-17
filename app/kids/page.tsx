import type { Metadata } from 'next';
import { Suspense } from 'react';
import { KidsHomeLanding } from '@/src/components/kids/kids-home-landing';
import { kidsPathPrefixFromHost } from '@/src/lib/kids-config';
import tr from '@/language/tr.json';


const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.marifetli.com.tr';

export const metadata: Metadata = {
  title: 'Marifetli Kids - Cocuklar Icin Guvenli Ogrenme Platformu',
  description: "Ogretmenler, ogrenciler ve veliler icin guvenli okul platformu. Okul challenge'lari, rozet yolu, ogretmen paneli ve daha fazlasi.",
  keywords: ['Marifetli Kids', 'cocuk egitim', 'okul platformu', 'ogretmen paneli', 'egitim uygulamasi', 'cocuk gelisimi'],
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    url: `${SITE_URL}/kids`,
    siteName: 'Marifetli',
    title: 'Marifetli Kids - Cocuklar Icin Guvenli Ogrenme Platformu',
    description: 'Ogretmenler, ogrenciler ve veliler icin guvenli okul platformu.',
    images: [{ url: '/og-default.png', width: 1376, height: 768, alt: 'Marifetli Kids' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Marifetli Kids - Cocuklar Icin Guvenli Ogrenme Platformu',
    description: 'Ogretmenler, ogrenciler ve veliler icin guvenli okul platformu.',
    images: ['/og-default.png'],
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
