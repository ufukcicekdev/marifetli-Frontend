import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { QueryProvider } from '@/src/providers/query-provider';
import { ThemeProvider } from '@/src/components/theme-provider';
import { Header } from '@/src/components/header';
import { AppSidebar } from '@/src/components/app-sidebar';
import { OnboardingGuard } from '@/src/components/onboarding-guard';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Marifetli - El İşi & El Sanatları Topluluğu',
  description: 'Örgü, dikiş, nakış, takı tasarımı ve el sanatları tutkunlarının buluşma noktası. Sorular sor, deneyimlerini paylaş, el emeğini keşfet.',
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
            <OnboardingGuard>
              <Header />
              <div className="flex min-h-[calc(100vh-52px)]">
                <AppSidebar />
                <main className="flex-1 min-w-0 overflow-x-hidden bg-gray-50 dark:bg-gray-950">
                  {children}
                </main>
              </div>
            </OnboardingGuard>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}