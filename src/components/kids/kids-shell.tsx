'use client';

import { ThemeProvider } from '@/src/components/theme-provider';
import { HEADER_HEIGHT_PX } from '@/src/components/header';
import { useSidebarStore } from '@/src/stores/sidebar-store';
import { KidsHeader } from '@/src/components/kids/kids-header';
import { KidsSidebar } from '@/src/components/kids/kids-sidebar';
import { KidsNavMegaMenu } from '@/src/components/kids/kids-nav-mega-menu';
import { KidsFooter } from '@/src/components/kids/kids-footer';
import { KidsAuthProvider } from '@/src/providers/kids-auth-provider';
import { KidsPushHandler } from '@/src/components/kids/kids-push-handler';
import { SiteAuthProfileSync } from '@/src/components/site-auth-profile-sync';
import { KIDS_USE_SIDEBAR } from '@/src/lib/kids-config';

type KidsShellProps = {
  pathPrefix: string;
  children: React.ReactNode;
};

export function KidsShell({ pathPrefix, children }: KidsShellProps) {
  const isOpen = useSidebarStore((s) => s.isOpen);

  return (
    <ThemeProvider>
      <SiteAuthProfileSync />
      <KidsAuthProvider pathPrefix={pathPrefix}>
        <KidsPushHandler />
        <KidsHeader pathPrefix={pathPrefix} />
        <div className="flex min-h-screen" style={{ paddingTop: HEADER_HEIGHT_PX }}>
          {KIDS_USE_SIDEBAR ? (
            <KidsSidebar pathPrefix={pathPrefix} />
          ) : (
            <KidsNavMegaMenu pathPrefix={pathPrefix} />
          )}
          <div
            className={`flex min-w-0 flex-1 flex-col transition-[padding] duration-200 ${
              KIDS_USE_SIDEBAR ? (isOpen ? 'lg:pl-64' : 'lg:pl-16') : ''
            }`}
          >
            <main className="relative flex-1 min-w-0 overflow-x-clip px-3 py-6 sm:px-5 sm:py-8">
              <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
                <div className="absolute -right-24 top-0 h-72 w-72 rounded-full bg-fuchsia-400/15 blur-3xl dark:bg-fuchsia-600/10" />
                <div className="absolute -left-20 bottom-0 h-96 w-96 rounded-full bg-amber-300/20 blur-3xl dark:bg-amber-600/10" />
                <div className="absolute left-1/3 top-1/4 h-40 w-40 rounded-full bg-sky-400/10 blur-2xl dark:bg-sky-500/10" />
              </div>
              <div className="relative z-[1]">{children}</div>
            </main>
            <KidsFooter pathPrefix={pathPrefix} />
          </div>
        </div>
      </KidsAuthProvider>
    </ThemeProvider>
  );
}
