import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.marifetli.com.tr';

export const metadata: Metadata = {
  title: 'Hakkımızda',
  description:
    'Marifetli, el işi ve el sanatları tutkunlarının buluşma noktası. Örgü, dikiş, nakış, amigurumi, takı ve daha fazlası hakkında soru sorun, deneyimlerinizi paylaşın.',
  openGraph: {
    title: 'Hakkımızda | Marifetli - El İşi & El Sanatları Topluluğu',
    description:
      'El işi ve el sanatları topluluğu Marifetli hakkında bilgi. Misyon, vizyon ve topluluk değerleri.',
    url: `${SITE_URL}/hakkimizda`,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hakkımızda | Marifetli',
    description: 'El işi ve el sanatları topluluğu Marifetli. Birlikte öğreniyor, paylaşıyor ve üretiyoruz.',
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
      'Marifetli, el işi ve el sanatları tutkunlarının buluşma noktası. Örgü, dikiş, nakış ve daha fazlası.',
    url: `${SITE_URL}/hakkimizda`,
    isPartOf: {
      '@type': 'WebSite',
      name: 'Marifetli',
      url: SITE_URL,
    },
    mainEntity: {
      '@type': 'Organization',
      name: 'Marifetli',
      description: 'El işi ve el sanatları topluluğu.',
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
