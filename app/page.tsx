import { HomeHero } from '@/src/components/home-hero';
import { RecentActivitySidebar } from '@/src/components/recent-activity-sidebar';
import { PopularQuestionsSidebar } from '@/src/components/popular-questions-sidebar';
import { SiteStatsSidebar } from '@/src/components/site-stats-sidebar';

/**
 * Ana sayfa: hero (arama, CTA, trending, kategoriler) + sağ kenar çubuğu.
 */
export default function HomePage() {
  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 flex flex-col lg:flex-row lg:items-start gap-4 sm:gap-6 min-w-0 min-h-[calc(100vh-104px)]">
      <div className="flex-1 min-w-0 overflow-hidden">
        <HomeHero />
      </div>

      <aside className="w-80 shrink-0 hidden lg:block self-start pb-6 space-y-4">
        <RecentActivitySidebar />
        <SiteStatsSidebar />
        <PopularQuestionsSidebar />
      </aside>
    </div>
  );
}
