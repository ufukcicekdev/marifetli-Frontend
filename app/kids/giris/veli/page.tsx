import { redirect } from 'next/navigation';
import { kidsLoginPortalHref, kidsPathPrefixFromHost } from '@/src/lib/kids-config';

/** Eski /giris/veli → anasayfada veli sekmesi */
export default function KidsGirisVeliRedirectPage() {
  const host = '';
  const p = kidsPathPrefixFromHost(host);
  redirect(kidsLoginPortalHref(p, 'veli'));
}
