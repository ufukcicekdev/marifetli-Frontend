import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.marifetli.com.tr';

export const metadata: Metadata = {
  title: 'Sorular',
  description: 'El işi ve el sanatları topluluğunda sorular sorun, cevaplara ulaşın. Örgü, dikiş, nakış, takı ve daha fazlası.',
  openGraph: {
    title: 'Sorular | Marifetli',
    description: 'El işi ve el sanatları topluluğunda sorular sorun, cevaplara ulaşın.',
    url: `${SITE_URL}/sorular`,
  },
  alternates: { canonical: `${SITE_URL}/sorular` },
};

export default function SorularLayout({ children }: { children: React.ReactNode }) {
  return children;
}
