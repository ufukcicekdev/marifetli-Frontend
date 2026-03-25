import type { Metadata } from 'next';
import { MarifetliKidsLegalPageShell } from '@/src/components/legal/marifetli-kids-legal-page-shell';
import { MarifetliKidsPrivacyContent } from '@/src/components/legal/marifetli-kids-legal-content';

export const metadata: Metadata = {
  title: 'Gizlilik Politikası (Marifetli Kids)',
  description: 'Marifetli Kids gizlilik politikası ve çocuk verisi güvenliği.',
};

export default function MarifetliKidsPrivacyPage() {
  return (
    <MarifetliKidsLegalPageShell title="Gizlilik Politikası — Marifetli Kids" variant="main">
      <p className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
        GİZLİLİK POLİTİKASI – MARİFETLİ KIDS
      </p>
      <MarifetliKidsPrivacyContent />
    </MarifetliKidsLegalPageShell>
  );
}
