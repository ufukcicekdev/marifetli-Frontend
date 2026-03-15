import type { Metadata } from 'next';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.marifetli.com.tr').replace(/\/$/, '');

export const metadata: Metadata = {
  title: 'Tasarımlar',
  description: 'El işi ve el sanatları tasarımlarını keşfet. Örgü, ahşap, kanaviçe ve daha fazlası.',
  openGraph: {
    type: 'website',
    url: `${SITE_URL}/tasarimlar`,
    title: 'Tasarımlar | Marifetli',
    description: 'El işi ve el sanatları tasarımlarını keşfet. Örgü, ahşap, kanaviçe ve daha fazlası.',
    siteName: 'Marifetli',
    locale: 'tr_TR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tasarımlar | Marifetli',
    description: 'El işi ve el sanatları tasarımlarını keşfet.',
  },
  alternates: { canonical: `${SITE_URL}/tasarimlar` },
};

export default function TasarimlarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
