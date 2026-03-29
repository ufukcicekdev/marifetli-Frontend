/**
 * kids/ogrenci/odev/[id] segmenti için layout. Static export (Capacitor) build'de
 * generateStaticParams gerekli.
 */
export function generateStaticParams() {
  return [{ id: '_' }];
}

export default function KidsStudentHomeworkIdLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

