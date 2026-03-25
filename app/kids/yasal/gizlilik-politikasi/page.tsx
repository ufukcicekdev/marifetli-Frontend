import { MarifetliKidsLegalPageShell } from '@/src/components/legal/marifetli-kids-legal-page-shell';
import { MarifetliKidsPrivacyContent } from '@/src/components/legal/marifetli-kids-legal-content';

export default function KidsYasalGizlilikPage() {
  return (
    <MarifetliKidsLegalPageShell title="Gizlilik Politikası — Marifetli Kids" variant="kids">
      <p className="mb-4 text-sm font-semibold text-violet-900 dark:text-violet-100">
        GİZLİLİK POLİTİKASI – MARİFETLİ KIDS
      </p>
      <MarifetliKidsPrivacyContent variant="kids" />
    </MarifetliKidsLegalPageShell>
  );
}
