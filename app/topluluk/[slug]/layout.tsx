/**
 * Topluluk [slug] segmenti için layout. Static export (Capacitor) build'de
 * generateStaticParams gerekli; en az bir path üretilmeli.
 */
export function generateStaticParams() {
  return [{ slug: '_' }];
}

export default function ToplulukSlugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
