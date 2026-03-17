/**
 * Profil segmenti için layout. Static export (Capacitor) build'de
 * generateStaticParams gerekli; en az bir path üretilmeli.
 * Client-side navigation ile diğer /profil/xyz sayfaları SPA gibi çalışır.
 */
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
