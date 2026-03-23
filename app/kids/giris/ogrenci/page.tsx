import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { kidsLoginPortalHref, kidsPathPrefixFromHost } from '@/src/lib/kids-config';

export default async function KidsStudentLoginRedirectPage() {
  const host = (await headers()).get('host') ?? '';
  const p = kidsPathPrefixFromHost(host);
  redirect(kidsLoginPortalHref(p, 'ogrenci'));
}
