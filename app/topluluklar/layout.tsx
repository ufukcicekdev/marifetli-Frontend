import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.marifetli.com.tr';

export const metadata: Metadata = {
  title: 'Toplulukları Keşfet',
  description: 'Örgü, dikiş, yemek, müzik, sanat ve hobiler topluluklarına göz atın. Kategorilere göre soruları keşfedin.',
  openGraph: {
    title: 'Toplulukları Keşfet | Marifetli',
    description: 'Örgü, dikiş, yemek, müzik, sanat ve hobiler topluluklarına göz atın.',
    url: `${SITE_URL}/topluluklar`,
  },
  alternates: { canonical: `${SITE_URL}/topluluklar` },
};

export default function TopluluklarLayout({ children }: { children: React.ReactNode }) {
  return children;
}
