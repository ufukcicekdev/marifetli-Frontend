import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { kidsLoginPortalHref, kidsPathPrefixFromHost } from '@/src/lib/kids-config';

/** Eski /giris/veli → anasayfada veli sekmesi */
export default async function KidsGirisVeliRedirectPage() {
  const host = (await headers()).get('host') ?? '';
  const p = kidsPathPrefixFromHost(host);
  redirect(kidsLoginPortalHref(p, 'veli'));
}
