/**
 * kids/ogretmen/testler/[id]/ogrenci/[studentId] segmenti için layout. Static export (Capacitor) build'de
 * generateStaticParams gerekli.
 */
export function generateStaticParams() {
  return [{ studentId: '_' }];
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
