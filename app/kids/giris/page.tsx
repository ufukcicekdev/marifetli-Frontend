import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { kidsLoginPortalHref, kidsPathPrefixFromHost } from '@/src/lib/kids-config';

/** Eski /giris adresi → anasayfada giriş modali */
export default async function KidsGirisRedirectPage() {
  const host = (await headers()).get('host') ?? '';
  const p = kidsPathPrefixFromHost(host);
  redirect(kidsLoginPortalHref(p));
}
