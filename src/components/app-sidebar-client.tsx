'use client';

import dynamic from 'next/dynamic';

const AppSidebar = dynamic(
  () => import('@/src/components/app-sidebar').then((m) => ({ default: m.AppSidebar })),
  {
    ssr: false,
    loading: () => (
      <aside
        className="fixed left-0 z-30 top-[104px] bottom-0 w-16 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
        aria-label="Navigasyon"
        aria-hidden="true"
      />
    ),
  }
);

export function AppSidebarClient() {
  return <AppSidebar />;
}
