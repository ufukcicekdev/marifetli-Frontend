import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { kidsLoginPortalHref, kidsPathPrefixFromHost } from '@/src/lib/kids-config';

export default async function KidsTeacherLoginRedirectPage() {
  const host = (await headers()).get('host') ?? '';
  const p = kidsPathPrefixFromHost(host);
  redirect(kidsLoginPortalHref(p, 'ogretmen'));
}
