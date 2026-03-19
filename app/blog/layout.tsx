import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.marifetli.com.tr';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Marifetli blog: örgü, dikiş, yemek, müzik, sanat ve hobiler üzerine ipuçları, rehberler ve topluluk yazıları.',
  openGraph: {
    title: 'Blog | Marifetli',
    description: 'Marifetli blog: örgü, dikiş, yemek, müzik, sanat ve hobiler üzerine ipuçları, rehberler ve topluluk yazıları.',
    url: `${SITE_URL}/blog`,
  },
  alternates: { canonical: `${SITE_URL}/blog` },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
