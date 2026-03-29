/**
 * kids/ogretmen/sinif/[id]/proje/[assignmentId] segmenti için layout.
 * Static export (Capacitor) build'de generateStaticParams gerekli.
 */
export function generateStaticParams() {
  return [{ assignmentId: '_' }];
}

export default function KidsTeacherAssignmentIdLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

