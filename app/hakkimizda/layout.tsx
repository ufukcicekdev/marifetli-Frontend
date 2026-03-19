import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.marifetli.com.tr';

export const metadata: Metadata = {
  title: 'Hakkımızda',
  description:
    'Marifetli, ilgi alanlarının buluşma noktası. Örgü, dikiş, yemek, müzik, sanat, hobiler ve daha fazlası hakkında soru sorun, deneyimlerinizi paylaşın.',
  openGraph: {
    title: 'Hakkımızda | Marifetli - İlgi Alanları Topluluğu',
    description:
      'İlgi alanları topluluğu Marifetli hakkında bilgi. Misyon, vizyon ve topluluk değerleri.',
    url: `${SITE_URL}/hakkimizda`,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hakkımızda | Marifetli',
    description: 'İlgi alanları topluluğu Marifetli. Birlikte öğreniyor, paylaşıyor ve üretiyoruz.',
  },
  alternates: { canonical: `${SITE_URL}/hakkimizda` },
  robots: { index: true, follow: true },
};

export default function HakkımızdaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: 'Hakkımızda | Marifetli',
    description:
      'Marifetli, ilgi alanlarının buluşma noktası. Örgü, dikiş, yemek, müzik, sanat ve hobiler.',
    url: `${SITE_URL}/hakkimizda`,
    isPartOf: {
      '@type': 'WebSite',
      name: 'Marifetli',
      url: SITE_URL,
    },
    mainEntity: {
      '@type': 'Organization',
      name: 'Marifetli',
      description: 'İlgi alanları topluluğu.',
      url: SITE_URL,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
