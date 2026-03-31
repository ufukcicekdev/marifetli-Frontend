import { MarifetliKidsLegalPageShell } from '@/src/components/legal/marifetli-kids-legal-page-shell';
import { MarifetliKidsCookiesContent } from '@/src/components/legal/marifetli-kids-legal-content';

export default function KidsYasalCerezPage() {
  return (
    <MarifetliKidsLegalPageShell title="Cerez Politikasi - Marifetli Kids" variant="kids">
      <p className="mb-4 text-sm font-semibold text-violet-900 dark:text-violet-100">
        CEREZ POLITIKASI - MARIFETLI KIDS
      </p>
      <MarifetliKidsCookiesContent variant="kids" />
    </MarifetliKidsLegalPageShell>
  );
}
