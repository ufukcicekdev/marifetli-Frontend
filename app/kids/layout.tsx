import type { Metadata } from 'next';
import { kidsPathPrefixFromHost } from '@/src/lib/kids-config';
import { KidsShell } from '@/src/components/kids/kids-shell';

const kidsUrl =
  process.env.NEXT_PUBLIC_KIDS_SITE_URL || 'https://marifetli.com.tr/kids';

export const metadata: Metadata = {
  metadataBase: new URL(kidsUrl),
  title: {
    default: 'Marifetli Kids',
    template: '%s | Marifetli Kids',
  },
  description: 'Öğretmen ve öğrenciler için güvenli challenge alanı.',
  robots: { index: false, follow: false },
};

export default function KidsLayout({ children }: { children: React.ReactNode }) {
  const host = '';
  const pathPrefix = kidsPathPrefixFromHost(host);

  return <KidsShell pathPrefix={pathPrefix}>{children}</KidsShell>;
}
