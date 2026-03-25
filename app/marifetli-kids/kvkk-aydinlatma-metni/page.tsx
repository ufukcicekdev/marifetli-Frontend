import type { Metadata } from 'next';
import { MarifetliKidsLegalPageShell } from '@/src/components/legal/marifetli-kids-legal-page-shell';
import { MarifetliKidsKvkkContent } from '@/src/components/legal/marifetli-kids-legal-content';

export const metadata: Metadata = {
  title: 'KVKK Aydınlatma Metni (Marifetli Kids)',
  description: 'Marifetli Kids kişisel verilerin korunması ve KVKK aydınlatma metni.',
};

export default function MarifetliKidsKvkkPage() {
  return (
    <MarifetliKidsLegalPageShell title="Kişisel Verilerin Korunması Aydınlatma Metni (Kids)" variant="main">
      <p className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
        KİŞİSEL VERİLERİN KORUNMASI AYDINLATMA METNİ (KIDS)
      </p>
      <MarifetliKidsKvkkContent />
    </MarifetliKidsLegalPageShell>
  );
}
