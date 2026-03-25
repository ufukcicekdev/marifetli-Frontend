import type { Metadata } from 'next';
import { MarifetliKidsLegalPageShell } from '@/src/components/legal/marifetli-kids-legal-page-shell';
import { MarifetliKidsTermsContent } from '@/src/components/legal/marifetli-kids-legal-content';

export const metadata: Metadata = {
  title: 'Kullanım Şartları (Marifetli Kids)',
  description: 'Marifetli Kids platformu kullanım şartları ve kullanıcı sorumlulukları.',
};

export default function MarifetliKidsTermsPage() {
  return (
    <MarifetliKidsLegalPageShell title="Kullanım Şartları — Marifetli Kids" variant="main">
      <p className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
        KULLANIM ŞARTLARI – MARİFETLİ KIDS
      </p>
      <MarifetliKidsTermsContent />
    </MarifetliKidsLegalPageShell>
  );
}
