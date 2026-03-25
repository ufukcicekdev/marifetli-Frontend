import { MarifetliKidsLegalPageShell } from '@/src/components/legal/marifetli-kids-legal-page-shell';
import { MarifetliKidsTermsContent } from '@/src/components/legal/marifetli-kids-legal-content';

export default function KidsYasalKullanimSartlariPage() {
  return (
    <MarifetliKidsLegalPageShell title="Kullanım Şartları — Marifetli Kids" variant="kids">
      <p className="mb-4 text-sm font-semibold text-violet-900 dark:text-violet-100">
        KULLANIM ŞARTLARI – MARİFETLİ KIDS
      </p>
      <MarifetliKidsTermsContent variant="kids" />
    </MarifetliKidsLegalPageShell>
  );
}
