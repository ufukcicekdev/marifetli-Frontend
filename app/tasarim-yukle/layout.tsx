import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tasarım Yükle',
  description: 'El işi ve el sanatları tasarımlarınızı yükleyin, lisans seçin ve toplulukla paylaşın.',
};

export default function TasarimYukleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
