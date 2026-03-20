import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.marifetli.com.tr';

export const metadata: Metadata = {
  title: 'Kategori uzmanı',
  description:
    'Marifetli ana kategori uzmanlarına soru sorun; yanıtlar yapay zeka ile üretilir (site yapılandırmasına bağlı).',
  robots: { index: false, follow: true },
  alternates: { canonical: `${SITE_URL}/uzman` },
};

export default function UzmanLayout({ children }: { children: React.ReactNode }) {
  return children;
}
