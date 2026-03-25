'use client';

import { Suspense, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { reconcileAuthStoreWithAccessToken } from '@/src/stores/auth-store';
import { ThemeProvider } from '@/src/components/theme-provider';
import { Header } from '@/src/components/header';
import { VerifyEmailBanner } from '@/src/components/verify-email-banner';
import { OnboardingBanner } from '@/src/components/onboarding-banner';
import { MainContentWrapper } from '@/src/components/main-content-wrapper';
import { NavMegaMenu } from '@/src/components/nav-mega-menu';
import { SidebarLayout } from '@/src/components/sidebar-layout';
import { OnboardingGuard } from '@/src/components/onboarding-guard';
import { SiteAnalytics } from '@/src/components/site-analytics';
import { SiteFonts } from '@/src/components/site-fonts';
import { CategoriesPrefetcher } from '@/src/components/categories-prefetcher';
import { FirebasePushHandler } from '@/src/components/firebase-push-handler';
import { CookieConsentBanner } from '@/src/components/cookie-consent-banner';
import { SiteFooter } from '@/src/components/site-footer';
import { AchievementUnlockedModal } from '@/src/components/achievement-unlocked-modal';
import { GamificationRoadmapModal } from '@/src/components/gamification-roadmap-modal';
import { RecentUnlockPoller } from '@/src/components/recent-unlock-poller';
import { CategoryExpertChatPanel } from '@/src/components/category-expert-chat-panel';
import { SiteAuthProfileSync } from '@/src/components/site-auth-profile-sync';

export function RootLayoutShell({
  children,
  useSidebar,
}: {
  children: React.ReactNode;
  useSidebar: boolean;
}) {
  const pathname = usePathname();
  const isKidsPortal = pathname === '/kids' || pathname.startsWith('/kids/');

  useEffect(() => {
    void reconcileAuthStoreWithAccessToken();
  }, [pathname]);

  if (isKidsPortal) {
    return <>{children}</>;
  }

  return (
    <ThemeProvider>
      <SiteAuthProfileSync />
      <SiteAnalytics />
      <SiteFonts />
      <CategoriesPrefetcher />
      <FirebasePushHandler />
      <OnboardingGuard>
        <Suspense
          fallback={
            <header className="fixed top-0 left-0 right-0 z-40 h-[104px] bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700" />
          }
        >
          <Header />
        </Suspense>
        {useSidebar ? (
          <SidebarLayout>{children}</SidebarLayout>
        ) : (
          <>
            <NavMegaMenu />
            <div className="flex min-h-screen pt-[104px] flex-col">
              <MainContentWrapper>
                <VerifyEmailBanner />
                <OnboardingBanner />
                {children}
              </MainContentWrapper>
              <div className="mt-auto shrink-0 relative z-10">
                <SiteFooter />
              </div>
            </div>
          </>
        )}
      </OnboardingGuard>
      <CategoryExpertChatPanel />
      <AchievementUnlockedModal />
      <GamificationRoadmapModal />
      <RecentUnlockPoller />
      <CookieConsentBanner />
    </ThemeProvider>
  );
}
