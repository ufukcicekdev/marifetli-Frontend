'use client';

import { useSidebarStore } from '../stores/sidebar-store';
import { AppSidebarClient } from './app-sidebar-client';
import { MainContentWrapper } from './main-content-wrapper';
import { VerifyEmailBanner } from './verify-email-banner';
import { OnboardingBanner } from './onboarding-banner';
import { SiteFooter } from './site-footer';

/**
 * Sidebar modu: .env'de NEXT_PUBLIC_USE_SIDEBAR=true iken kullanılır.
 * Sol tarafta sürekli sidebar (masaüstünde aç/kapa), içerik sağda.
 */
export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const isOpen = useSidebarStore((s) => s.isOpen);

  return (
    <div className="flex min-h-screen pt-[104px] pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:pb-0">
      <div className="hidden lg:block">
        <AppSidebarClient />
      </div>
      <div
        className={`flex-1 min-w-0 flex flex-col transition-[padding] duration-200 ${
          isOpen ? 'lg:pl-64' : 'lg:pl-16'
        }`}
      >
        <MainContentWrapper>
          <VerifyEmailBanner />
          <OnboardingBanner />
          {children}
        </MainContentWrapper>
        <div className="mt-auto shrink-0 relative z-10">
          <SiteFooter />
        </div>
      </div>
    </div>
  );
}
