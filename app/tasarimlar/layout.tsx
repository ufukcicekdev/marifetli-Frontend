import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tasarımlar',
  description: 'El işi ve el sanatları tasarımlarını keşfet.',
};

export default function TasarimlarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
