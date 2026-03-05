import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { QueryProvider } from '@/src/providers/query-provider';
import { ThemeProvider } from '@/src/components/theme-provider';
import { Header } from '@/src/components/header';
import { VerifyEmailBanner } from '@/src/components/verify-email-banner';
import { AppSidebar } from '@/src/components/app-sidebar';
import { MainContentWrapper } from '@/src/components/main-content-wrapper';
import { OnboardingGuard } from '@/src/components/onboarding-guard';
import { SiteAnalytics } from '@/src/components/site-analytics';

const inter = Inter({ subsets: ['latin'] });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Marifetli - El İşi & El Sanatları Topluluğu',
  description: 'Örgü, dikiş, nakış, takı tasarımı ve el sanatları tutkunlarının buluşma noktası. Sorular sor, deneyimlerini paylaş, el emeğini keşfet.',
  openGraph: {
    url: SITE_URL,
    siteName: 'Marifetli',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <QueryProvider>
            <SiteAnalytics />
            <OnboardingGuard>
              <Header />
              <div className="flex min-h-[calc(100vh-52px)] pt-[52px]">
                <AppSidebar />
                <MainContentWrapper>
                  <VerifyEmailBanner />
                  {children}
                </MainContentWrapper>
              </div>
            </OnboardingGuard>
          </QueryProvider>
        </ThemeProvider>
        <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      </body>
    </html>
  );
}