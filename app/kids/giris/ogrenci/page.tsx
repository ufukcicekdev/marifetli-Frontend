import { redirect } from 'next/navigation';
import { kidsLoginPortalHref, kidsPathPrefixFromHost } from '@/src/lib/kids-config';

export default function KidsStudentLoginRedirectPage() {
  const host = '';
  const p = kidsPathPrefixFromHost(host);
  redirect(kidsLoginPortalHref(p, 'ogrenci'));
}
