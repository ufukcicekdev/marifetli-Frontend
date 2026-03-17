import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.marifetli.com.tr';

export const metadata: Metadata = {
  title: 'Kategoriler',
  description: 'El işi ve el sanatları kategorilerine göz atın. Örgü, dikiş, nakış, amigurumi, dantel, tasarım ve daha fazlası. Konuya göre sorulara göz atın.',
  openGraph: {
    title: 'Kategoriler | Marifetli - El İşi & El Sanatları',
    description: 'Örgü, dikiş, nakış, tasarım ve el sanatları kategorileri. Konuya göre soruları keşfedin.',
    url: `${SITE_URL}/kategoriler`,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kategoriler | Marifetli',
    description: 'El işi ve el sanatları kategorilerine göz atın. Konuya göre soruları keşfedin.',
  },
  alternates: { canonical: `${SITE_URL}/kategoriler` },
  robots: { index: true, follow: true },
};

export default function KategorilerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Kategoriler | Marifetli',
    description: 'El işi ve el sanatları kategorilerine göz atın. Örgü, dikiş, nakış, tasarım ve daha fazlası.',
    url: `${SITE_URL}/kategoriler`,
    isPartOf: {
      '@type': 'WebSite',
      name: 'Marifetli',
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
