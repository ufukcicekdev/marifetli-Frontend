import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.marifetli.com.tr';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const url = `${SITE_URL}/profil/${username}`;
  return {
    alternates: { canonical: url },
  };
}

export function generateStaticParams() {
  // En az bir değer gerekli (static export). Placeholder; gerçek listeyi API'den çekebilirsin.
  return [{ username: '_' }];
}

export default function ProfilUsernameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
