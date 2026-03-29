import { redirect } from 'next/navigation';
import { kidsLoginPortalHref, kidsPathPrefixFromHost } from '@/src/lib/kids-config';

/** Eski /giris adresi → anasayfada giriş modali */
export default function KidsGirisRedirectPage() {
  const host = '';
  const p = kidsPathPrefixFromHost(host);
  redirect(kidsLoginPortalHref(p));
}
