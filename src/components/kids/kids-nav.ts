import type { KidsUserRole } from '@/src/lib/kids-api';
import { kidsHomeHref, kidsLoginPortalHref } from '@/src/lib/kids-config';
import type { NavIconName } from '@/src/components/nav-icon';

export { kidsHomeHref } from '@/src/lib/kids-config';

export type KidsNavItem = { href: string; labelKey: string; icon: NavIconName };

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
      { href: kidsHomeHref(p), labelKey: 'nav.home', icon: 'home' },
      { href: KIDS_SITE_MANAGEMENT_HREF, labelKey: 'nav.admin', icon: 'admin' },
      { href: `${p}/ogretmen/panel`, labelKey: 'nav.teacherPanel', icon: 'teacher' },
      { href: `${p}/bildirimler`, labelKey: 'nav.notifications', icon: 'bell' },
      { href: `${p}/profil`, labelKey: 'nav.profile', icon: 'profile' },
    ];
  }

  const items: KidsNavItem[] = [{ href: kidsHomeHref(p), labelKey: 'nav.home', icon: 'home' }];

  if (siteMainAdmin) {
    items.splice(1, 0, { href: KIDS_SITE_MANAGEMENT_HREF, labelKey: 'nav.admin', icon: 'admin' });
  }

  if (role === 'teacher') {
    items.push({ href: `${p}/ogretmen/panel`, labelKey: 'nav.teacherPanel', icon: 'teacher' });
    items.push({ href: `${p}/ogretmen/odevler`, labelKey: 'nav.homeworks', icon: 'challenge' });
    items.push({ href: `${p}/ogretmen/testler`, labelKey: 'nav.tests', icon: 'challenge' });
  }
  if (role === 'student') {
    items.push({ href: `${p}/ogrenci/panel`, labelKey: 'nav.studentPanel', icon: 'student' });
    items.push({ href: `${p}/ogrenci/odevler`, labelKey: 'nav.homeworks', icon: 'challenge' });
    items.push({ href: `${p}/ogrenci/testler`, labelKey: 'nav.tests', icon: 'challenge' });
    items.push({ href: `${p}/ogrenci/projeler`, labelKey: 'nav.challenges', icon: 'challenge' });
    items.push({ href: `${p}/ogrenci/yarismalar`, labelKey: 'nav.competitions', icon: 'trophy' });
    items.push({ href: `${p}/ogrenci/oyun-merkezi`, labelKey: 'nav.gameCenter', icon: 'gamepad' });
  }
  if (role === 'parent') {
    items.push({ href: `${p}/veli/panel`, labelKey: 'nav.parentPanel', icon: 'parent' });
    items.push({ href: `${p}/veli/cocuklarin-durumu`, labelKey: 'nav.childrenStatus', icon: 'student' });
    items.push({ href: `${p}/veli/ebeveyn-kontrolleri`, labelKey: 'nav.parentControls', icon: 'timer' });
  }
  if (role && role !== 'student') {
    items.push({ href: `${p}/mesajlar`, labelKey: 'nav.messages', icon: 'chat' });
  }
  if (role) {
    items.push({ href: `${p}/duyurular`, labelKey: 'nav.announcements', icon: 'announce' });
    items.push({ href: `${p}/bildirimler`, labelKey: 'nav.notifications', icon: 'bell' });
    items.push({ href: `${p}/profil`, labelKey: 'nav.profile', icon: 'profile' });
  }
  if (!role) {
    items.push({ href: kidsLoginPortalHref(p), labelKey: 'nav.login', icon: 'login' });
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
