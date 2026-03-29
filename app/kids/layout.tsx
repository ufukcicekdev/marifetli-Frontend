import type { Metadata } from 'next';
import { kidsPathPrefixFromHost } from '@/src/lib/kids-config';
import { KidsShell } from '@/src/components/kids/kids-shell';

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.marifetli.com.tr').replace(/\/$/, '');
const kidsUrl = `${siteUrl}/kids`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Marifetli Kids',
    template: '%s | Marifetli Kids',
  },
  description: 'Öğretmen ve öğrenciler için güvenli challenge alanı.',
  alternates: { canonical: kidsUrl },
  robots: { index: true, follow: true },
};

export default function KidsLayout({ children }: { children: React.ReactNode }) {
  const host = '';
  const pathPrefix = kidsPathPrefixFromHost(host);

  return <KidsShell pathPrefix={pathPrefix}>{children}</KidsShell>;
}
