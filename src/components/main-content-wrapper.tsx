'use client';

export function MainContentWrapper({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1 min-w-0 overflow-x-hidden bg-gray-50 dark:bg-gray-950">
      {children}
    </main>
  );
}
