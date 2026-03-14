import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { Inter, Outfit } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { QueryProvider } from '@/src/providers/query-provider';
import { ThemeProvider } from '@/src/components/theme-provider';
import { Header } from '@/src/components/header';
import { VerifyEmailBanner } from '@/src/components/verify-email-banner';
import { OnboardingBanner } from '@/src/components/onboarding-banner';
import { AppSidebar } from '@/src/components/app-sidebar';
import { MainContentWrapper } from '@/src/components/main-content-wrapper';
import { OnboardingGuard } from '@/src/components/onboarding-guard';
import { SiteAnalytics } from '@/src/components/site-analytics';
import { FirebasePushHandler } from '@/src/components/firebase-push-handler';
import { CookieConsentBanner } from '@/src/components/cookie-consent-banner';

// Canlıda NEXT_PUBLIC_SITE_URL deploy ortamında tanımlı olsun; yoksa production URL fallback
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.marifetli.com.tr';

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
      description: 'Örgü, dikiş, nakış, takı tasarımı ve el sanatları tutkunlarının buluşma noktası. Sorular sor, deneyimlerini paylaş, el emeğini keşfet.',
      sameAs: [],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Marifetli',
      url: SITE_URL,
      description: 'El işi ve el sanatları topluluğu. Soru sor, cevapla, paylaş.',
      inLanguage: 'tr-TR',
      publisher: { '@id': `${SITE_URL}/#organization` },
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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Marifetli - El İşi & El Sanatları Topluluğu',
    template: '%s | Marifetli',
  },
  description: 'Örgü, dikiş, nakış, takı tasarımı ve el sanatları tutkunlarının buluşma noktası. Sorular sor, deneyimlerini paylaş, el emeğini keşfet.',
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    url: SITE_URL,
    siteName: 'Marifetli',
    title: 'Marifetli - El İşi & El Sanatları Topluluğu',
    description: 'Örgü, dikiş, nakış, takı tasarımı ve el sanatları tutkunlarının buluşma noktası. Sorular sor, deneyimlerini paylaş, el emeğini keşfet.',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'Marifetli' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Marifetli - El İşi & El Sanatları Topluluğu',
    description: 'Örgü, dikiş, nakış, takı tasarımı ve el sanatları tutkunlarının buluşma noktası.',
  },
  alternates: { canonical: SITE_URL },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.svg', type: 'image/svg+xml' }],
  },
};

export default function RootLayout({
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
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.svg" type="image/svg+xml" />
        <link rel="preconnect" href={API_ORIGIN} crossOrigin="" />
        <link rel="dns-prefetch" href={API_ORIGIN} />
        {/* LCP / third-party: CDN (medya), GTM, GA - kritik yolu kısaltır */}
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://www.google-analytics.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        <link rel="preconnect" href="https://cekfisi.fra1.digitaloceanspaces.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://cekfisi.fra1.digitaloceanspaces.com" />
      </head>
      <body className={`${inter.className} ${outfit.variable}`}>
        <ThemeProvider>
          <QueryProvider>
            <SiteAnalytics />
            <FirebasePushHandler />
            <OnboardingGuard>
              <Suspense fallback={<header className="fixed top-0 left-0 right-0 z-40 h-[52px] bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800" />}>
                <Header />
              </Suspense>
              <div className="flex min-h-[calc(100vh-52px)] pt-[52px]">
                <AppSidebar />
                <MainContentWrapper>
                  <VerifyEmailBanner />
                  <OnboardingBanner />
                  {children}
                </MainContentWrapper>
              </div>
            </OnboardingGuard>
          </QueryProvider>
        </ThemeProvider>
        <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
        <CookieConsentBanner />
      </body>
    </html>
  );
}