import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter, Outfit } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { QueryProvider } from '@/src/providers/query-provider';
import { RootLayoutShell } from '@/src/components/root-layout-shell';

// Canlıda NEXT_PUBLIC_SITE_URL deploy ortamında tanımlı olsun; yoksa production URL fallback
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.marifetli.com.tr';

/** true ise sol sidebar (menü sürekli solda), false ise menü butonuyla açılan mega menü */
const USE_SIDEBAR = process.env.NEXT_PUBLIC_USE_SIDEBAR === 'true';

function getApiOrigin(): string {
  try {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://web-production-5404d.up.railway.app/api';
    const url = new URL(base);
    return url.origin;
  } catch {
    return 'https://web-production-5404d.up.railway.app';
  }
}

const API_ORIGIN = getApiOrigin();

/** Site-wide structured data: Google ve AI arama motorları için Organization + WebSite */
function getSiteStructuredData() {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'Marifetli',
      url: SITE_URL,
      description: 'İlgi alanlarının buluşma noktası.. Sor .Cevapla .Öğren. En marifetli rozetini kazan.',
      sameAs: [],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: 'Marifetli',
      url: SITE_URL,
      description: 'İlgi alanlarının buluşma noktası.. Sor .Cevapla .Öğren. En marifetli rozetini kazan.',
      inLanguage: 'tr-TR',
      publisher: { '@id': `${SITE_URL}/#organization` },
      // Arama URL’si: sitelinks’te arama kutusu çıkma ihtimali + site yapısının anlaşılması
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${SITE_URL}/sorular?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
  ];
}

const inter = Inter({
  subsets: ['latin'],
  display: 'optional',
  adjustFontFallback: true,
  preload: true,
});

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-logo',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  /** env(safe-area-inset-*) için (çentik / home bar); kids modal & tam ekran */
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fe544e' },
    { media: '(prefers-color-scheme: dark)', color: '#ea3750' },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Marifetli - İlgi Alanları Topluluğu',
    template: '%s | Marifetli',
  },
  description: 'İlgi alanlarının buluşma noktası.. Sor .Cevapla .Öğren. En marifetli rozetini kazan.',
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    url: SITE_URL,
    siteName: 'Marifetli',
    title: 'Marifetli - İlgi Alanları Topluluğu',
    description: 'İlgi alanlarının buluşma noktası.. Sor .Cevapla .Öğren. En marifetli rozetini kazan.',
    images: [{ url: '/android-chrome-512x512.png', width: 1200, height: 630, alt: 'Marifetli' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Marifetli - İlgi Alanları Topluluğu',
    description: 'İlgi alanlarının buluşma noktası.. Sor .Cevapla .Öğren. En marifetli rozetini kazan.',
  },
  alternates: { canonical: SITE_URL },
  // Mutlak URL kullan ki Google/Vercel kendi favicon'unu göstermesin (site:marifetli.com.tr aramasında)
  icons: {
    icon: [
      { url: `${SITE_URL}/favicon.ico`, sizes: 'any' },
      { url: `${SITE_URL}/favicon-32x32.png`, sizes: '32x32', type: 'image/png' },
      { url: `${SITE_URL}/favicon-16x16.png`, sizes: '16x16', type: 'image/png' },
      { url: `${SITE_URL}/favicon.svg`, type: 'image/svg+xml' },
    ],
    apple: [{ url: `${SITE_URL}/apple-touch-icon.png`, sizes: '180x180', type: 'image/png' }],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(getSiteStructuredData()) }}
        />
        <link rel="icon" href={`${SITE_URL}/favicon.ico`} sizes="any" />
        <link rel="icon" href={`${SITE_URL}/favicon-32x32.png`} sizes="32x32" type="image/png" />
        <link rel="shortcut icon" href={`${SITE_URL}/favicon.ico`} />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href={`${SITE_URL}/apple-touch-icon.png`} sizes="180x180" type="image/png" />
        <link rel="preconnect" href={API_ORIGIN} crossOrigin="" />
        <link rel="dns-prefetch" href={API_ORIGIN} />
        {/* LCP / third-party: CDN (medya), GTM, GA - kritik yolu kısaltır */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://www.google-analytics.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        <link rel="preconnect" href="https://cekfisi.fra1.digitaloceanspaces.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://cekfisi.fra1.digitaloceanspaces.com" />
      </head>
      <body className={`${inter.className} ${outfit.variable}`}>
        <QueryProvider>
          <RootLayoutShell useSidebar={USE_SIDEBAR}>{children}</RootLayoutShell>
        </QueryProvider>
        <Toaster
          position="top-center"
          toastOptions={{ duration: 3000 }}
          containerStyle={{ zIndex: 200000 }}
        />
      </body>
    </html>
  );
}