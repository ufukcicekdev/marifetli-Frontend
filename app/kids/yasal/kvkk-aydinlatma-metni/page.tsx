import { MarifetliKidsLegalPageShell } from '@/src/components/legal/marifetli-kids-legal-page-shell';
import { MarifetliKidsKvkkContent } from '@/src/components/legal/marifetli-kids-legal-content';

export default function KidsYasalKvkkPage() {
  return (
    <MarifetliKidsLegalPageShell title="Kisisel Verilerin Korunmasi Aydinlatma Metni (Kids)" variant="kids">
      <p className="mb-4 text-sm font-semibold text-violet-900 dark:text-violet-100">
        KISISEL VERILERIN KORUNMASI AYDINLATMA METNI (KIDS)
      </p>
      <MarifetliKidsKvkkContent variant="kids" />
    </MarifetliKidsLegalPageShell>
  );
}
