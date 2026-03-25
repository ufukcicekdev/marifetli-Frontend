import type { KidsUserRole } from '@/src/lib/kids-api';
import { kidsHomeHref, kidsLoginPortalHref } from '@/src/lib/kids-config';

export { kidsHomeHref } from '@/src/lib/kids-config';

export type KidsNavItem = { href: string; label: string; icon: string };

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
      { href: kidsHomeHref(p), label: 'Anasayfa', icon: '🏠' },
      { href: KIDS_SITE_MANAGEMENT_HREF, label: 'Yönetim', icon: '🛠️' },
      { href: `${p}/ogretmen/panel`, label: 'Öğretmen paneli', icon: '👩‍🏫' },
      { href: `${p}/ogretmen/okullar`, label: 'Okullarım', icon: '🏫' },
      { href: `${p}/bildirimler`, label: 'Bildirimler', icon: '🔔' },
      { href: `${p}/profil`, label: 'Profilim', icon: '👤' },
    ];
  }

  const items: KidsNavItem[] = [{ href: kidsHomeHref(p), label: 'Anasayfa', icon: '🏠' }];

  if (siteMainAdmin) {
    items.splice(1, 0, { href: KIDS_SITE_MANAGEMENT_HREF, label: 'Yönetim', icon: '🛠️' });
  }

  if (role === 'teacher') {
    items.push({ href: `${p}/ogretmen/panel`, label: 'Öğretmen paneli', icon: '👩‍🏫' });
    items.push({ href: `${p}/ogretmen/okullar`, label: 'Okullarım', icon: '🏫' });
  }
  if (role === 'student') {
    items.push({ href: `${p}/ogrenci/panel`, label: 'Öğrenci paneli', icon: '🎒' });
    items.push({ href: `${p}/ogrenci/projeler`, label: 'Challenges', icon: '🎯' });
    items.push({ href: `${p}/ogrenci/yarismalar`, label: 'Yarışmalar', icon: '🏆' });
  }
  if (role === 'parent') {
    items.push({ href: `${p}/veli/panel`, label: 'Veli paneli', icon: '👪' });
    items.push({ href: `${p}/veli/yarismalar`, label: 'Serbest yarışmalar', icon: '🏆' });
  }
  if (role) {
    items.push({ href: `${p}/bildirimler`, label: 'Bildirimler', icon: '🔔' });
    items.push({ href: `${p}/profil`, label: 'Profilim', icon: '👤' });
  }
  if (!role) {
    items.push({ href: kidsLoginPortalHref(p), label: 'Giriş', icon: '🔑' });
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
