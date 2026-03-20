import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.marifetli.com.tr';

const pageTitle = 'Kategori uzmanı — AI yardım';
const description =
  'Marifetli’de ilgi alanına göre yapay zeka kategori uzmanına Türkçe soru sorun: el işleri, örgü, tığ işi, dikiş, nakış, yemek, ev dekorasyonu, müzik, sanat ve hobiler. Samimi, uygulanabilir öneriler; topluluk kurallarına uygun yanıtlar.';
const keywords = [
  'Marifetli',
  'kategori uzmanı',
  'AI asistan',
  'el işleri soru',
  'örgü yardım',
  'dikiş soru',
  'yemek marifetleri',
  'hobi yapay zeka',
  'Türkçe AI yardım',
  'tığ işi soru',
];

export const metadata: Metadata = {
  title: pageTitle,
  description,
  keywords,
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  alternates: { canonical: `${SITE_URL}/uzman` },
  openGraph: {
    title: `${pageTitle} | Marifetli`,
    description,
    url: `${SITE_URL}/uzman`,
    siteName: 'Marifetli',
    locale: 'tr_TR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${pageTitle} | Marifetli`,
    description,
  },
};

function getUzmanJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${SITE_URL}/uzman#webpage`,
        url: `${SITE_URL}/uzman`,
        name: `${pageTitle} | Marifetli`,
        description,
        inLanguage: 'tr-TR',
        isPartOf: {
          '@type': 'WebSite',
          '@id': `${SITE_URL}/#website`,
          name: 'Marifetli',
          url: SITE_URL,
        },
        about: {
          '@type': 'Thing',
          name: 'El işleri, örgü, dikiş, yemek, dekorasyon ve hobilerde soru-cevap yardımı',
        },
        speakable: {
          '@type': 'SpeakableSpecification',
          cssSelector: ['#uzman-main-heading', '#uzman-hero-lead'],
        },
      },
      {
        '@type': 'SoftwareApplication',
        name: 'Marifetli Kategori Uzmanı',
        applicationCategory: 'LifestyleApplication',
        operatingSystem: 'Web',
        url: `${SITE_URL}/uzman`,
        description,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'TRY',
        },
        provider: {
          '@type': 'Organization',
          name: 'Marifetli',
          url: SITE_URL,
        },
      },
    ],
  };
}

export default function UzmanLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(getUzmanJsonLd()) }}
      />
      {children}
    </>
  );
}
