import type { Metadata } from 'next';
import { MarifetliKidsLegalPageShell } from '@/src/components/legal/marifetli-kids-legal-page-shell';
import { MarifetliKidsCookiesContent } from '@/src/components/legal/marifetli-kids-legal-content';

export const metadata: Metadata = {
  title: 'Çerez Politikası (Marifetli Kids)',
  description: 'Marifetli Kids çerez kullanımı ve çocuk kullanıcıları için reklam hedefleme politikası.',
};

export default function MarifetliKidsCookiesPage() {
  return (
    <MarifetliKidsLegalPageShell title="Çerez Politikası — Marifetli Kids" variant="main">
      <p className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
        ÇEREZ POLİTİKASI – MARİFETLİ KIDS
      </p>
      <MarifetliKidsCookiesContent />
    </MarifetliKidsLegalPageShell>
  );
}
