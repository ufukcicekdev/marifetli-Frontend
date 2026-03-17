'use client';

export function MainContentWrapper({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1 min-w-0 overflow-x-hidden bg-transparent">
      {children}
    </main>
  );
}
