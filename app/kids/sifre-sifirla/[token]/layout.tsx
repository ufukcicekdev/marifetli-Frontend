/**
 * kids/sifre-sifirla/[token] segmenti için layout. Static export (Capacitor) build'de
 * generateStaticParams gerekli.
 */
export function generateStaticParams() {
  return [{ token: '_' }];
}

export default function KidsPasswordResetTokenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

