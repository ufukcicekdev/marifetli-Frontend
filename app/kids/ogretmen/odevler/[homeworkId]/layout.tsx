/**
 * kids/ogretmen/odevler/[homeworkId] segmenti için layout. Static export (Capacitor) build'de
 * generateStaticParams gerekli.
 */
export function generateStaticParams() {
  return [{ homeworkId: '_' }];
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
