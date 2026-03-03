'use client';

import { useSidebarStore } from '@/src/stores/sidebar-store';

export function MainContentWrapper({ children }: { children: React.ReactNode }) {
  const isOpen = useSidebarStore((s) => s.isOpen);
  return (
    <main
      className={`flex-1 min-w-0 overflow-x-hidden bg-gray-50 dark:bg-gray-950 transition-[margin] duration-200 ${
        isOpen ? 'lg:ml-64' : 'lg:ml-16'
      }`}
    >
      {children}
    </main>
  );
}
