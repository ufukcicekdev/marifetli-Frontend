import type { KidsUserRole } from '@/src/lib/kids-api';
import { kidsHomeHref, kidsLoginPortalHref } from '@/src/lib/kids-config';
import type { NavIconName } from '@/src/components/nav-icon';

export { kidsHomeHref } from '@/src/lib/kids-config';

export type KidsNavItem = { href: string; label: string; icon: NavIconName };

export const KIDS_SITE_MANAGEMENT_HREF = '/admin';

export function kidsNavLinks(
  pathPrefix: string,
  role: KidsUserRole | null,
  options?: { siteAdmin?: boolean },
): KidsNavItem[] {
  const p = pathPrefix;
  const siteMainAdmin = Boolean(options?.siteAdmin);

  /* Kids yöneticisi: çocuk dünyası menüsü + Yönetim (yalnızca Yönetim değil). */
  if (role === 'admin') {
    return [
      { href: kidsHomeHref(p), label: 'Anasayfa', icon: 'home' },
      { href: KIDS_SITE_MANAGEMENT_HREF, label: 'Yönetim', icon: 'admin' },
      { href: `${p}/ogretmen/panel`, label: 'Öğretmen paneli', icon: 'teacher' },
      { href: `${p}/bildirimler`, label: 'Bildirimler', icon: 'bell' },
      { href: `${p}/profil`, label: 'Profilim', icon: 'profile' },
    ];
  }

  const items: KidsNavItem[] = [{ href: kidsHomeHref(p), label: 'Anasayfa', icon: 'home' }];

  if (siteMainAdmin) {
    items.splice(1, 0, { href: KIDS_SITE_MANAGEMENT_HREF, label: 'Yönetim', icon: 'admin' });
  }

  if (role === 'teacher') {
    items.push({ href: `${p}/ogretmen/panel`, label: 'Öğretmen paneli', icon: 'teacher' });
    items.push({ href: `${p}/ogretmen/odevler`, label: 'Ödevler', icon: 'challenge' });
    items.push({ href: `${p}/ogretmen/testler`, label: 'Testler', icon: 'challenge' });
  }
  if (role === 'student') {
    items.push({ href: `${p}/ogrenci/panel`, label: 'Öğrenci paneli', icon: 'student' });
    items.push({ href: `${p}/ogrenci/odevler`, label: 'Ödevler', icon: 'challenge' });
    items.push({ href: `${p}/ogrenci/testler`, label: 'Testler', icon: 'challenge' });
    items.push({ href: `${p}/ogrenci/projeler`, label: 'Challenges', icon: 'challenge' });
    items.push({ href: `${p}/ogrenci/yarismalar`, label: 'Yarışmalar', icon: 'trophy' });
    items.push({ href: `${p}/ogrenci/oyun-merkezi`, label: 'Oyun merkezi', icon: 'gamepad' });
  }
  if (role === 'parent') {
    items.push({ href: `${p}/veli/panel`, label: 'Veli paneli', icon: 'parent' });
    items.push({ href: `${p}/veli/cocuklarin-durumu`, label: 'Çocukların durumu', icon: 'student' });
    items.push({ href: `${p}/veli/ebeveyn-kontrolleri`, label: 'Ebeveyn kontrolleri', icon: 'timer' });
  }
  if (role && role !== 'student') {
    items.push({ href: `${p}/mesajlar`, label: 'Mesajlar', icon: 'chat' });
  }
  if (role) {
    items.push({ href: `${p}/duyurular`, label: 'Duyurular', icon: 'announce' });
    items.push({ href: `${p}/bildirimler`, label: 'Bildirimler', icon: 'bell' });
    items.push({ href: `${p}/profil`, label: 'Profilim', icon: 'profile' });
  }
  if (!role) {
    items.push({ href: kidsLoginPortalHref(p), label: 'Giriş', icon: 'login' });
  }
  return items;
}

export function normalizeKidsPath(path: string) {
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1);
  return path;
}

export function isKidsNavActive(pathname: string | null, href: string, pathPrefix: string) {
  if (!pathname) return false;
  const p = normalizeKidsPath(pathname);
  const h = normalizeKidsPath(href);
  if (h === '/admin') {
    return p === '/admin' || p.startsWith('/kids/admin');
  }
  const home = normalizeKidsPath(kidsHomeHref(pathPrefix));
  if (h === home) {
    if (p === h) return true;
    if (pathPrefix === '/kids' && p === '/') return true;
    if (!pathPrefix && p === '/') return true;
    return false;
  }
  if (h === '/' || h === '') return p === '/' || p === '';
  return p === h || p.startsWith(`${h}/`) || p.startsWith(`${h}?`);
}
