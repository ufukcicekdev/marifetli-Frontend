/**
 * kids/ogretmen/sinif/[id] segmenti için layout. Static export (Capacitor) build'de
 * generateStaticParams gerekli.
 */
export function generateStaticParams() {
  return [{ id: '_' }];
}

export default function KidsTeacherClassIdLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

