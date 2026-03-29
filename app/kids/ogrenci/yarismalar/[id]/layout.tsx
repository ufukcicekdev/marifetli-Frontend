/**
 * kids/ogrenci/yarismalar/[id] segmenti için layout. Static export (Capacitor) build'de
 * generateStaticParams gerekli.
 */
export function generateStaticParams() {
  return [{ id: '_' }];
}

export default function KidsStudentChallengesIdLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

