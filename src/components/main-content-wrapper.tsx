'use client';

import { GamificationMotivationStrip } from '@/src/components/gamification-motivation-strip';

export function MainContentWrapper({ children }: { children: React.ReactNode }) {
  // overflow-x-hidden + overflow-y:visible → CSS’te y genelde auto olur, açılır menüler kırpılır; clip daha güvenli.
  return (
    <main className="flex-1 min-w-0 overflow-x-clip overflow-y-visible bg-transparent">
      <GamificationMotivationStrip />
      {children}
    </main>
  );
}
