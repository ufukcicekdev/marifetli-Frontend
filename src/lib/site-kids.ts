/**
 * Ana siteden (www.marifetli.com.tr) Kids’e çıkış adresi.
 *
 * Öncelik (canlıda genelde yalnızca 1. yeterli):
 * 1) NEXT_PUBLIC_KIDS_HOST — örn. cocuk.marifetli.com.tr → https://cocuk.marifetli.com.tr
 *    Yerelde cocuk.localhost → http://cocuk.localhost:PORT (PORT: NEXT_PUBLIC_KIDS_DEV_PORT veya
 *    NEXT_PUBLIC_SITE_URL’deki port veya 3000). İstersen doğrudan cocuk.localhost:3000 veya
 *    http://cocuk.localhost:3000 da verebilirsin.
 * 2) NEXT_PUBLIC_KIDS_SITE_URL — tam taban, örn. https://cocuk.marifetli.com.tr
 * 3) Yoksa aynı origin /kids (path üzerinden Kids, çoğunlukla localhost)
 */

function isLocalKidsHost(hostLower: string): boolean {
  if (hostLower === 'localhost' || hostLower.startsWith('localhost:')) return true;
  if (hostLower.endsWith('.localhost')) return true;
  if (hostLower.includes('.localhost:')) return true;
  return false;
}

/** Yerel Kids linkinde port: açık env → ana site URL → 3000 */
function defaultLocalKidsPort(): string {
  const explicit = (process.env.NEXT_PUBLIC_KIDS_DEV_PORT ?? '').trim();
  if (/^\d+$/.test(explicit)) return explicit;
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? '').trim();
  if (site) {
    try {
      const p = new URL(site).port;
      if (p) return p;
    } catch {
      /* ignore */
    }
  }
  return '3000';
}

/** HOST / SITE_URL’den tek bir kök URL (path yok, sondaki / yok). */
function computeSiteKidsHref(): string {
  const rawHost = (process.env.NEXT_PUBLIC_KIDS_HOST ?? '').trim();
  if (rawHost) {
    if (/^https?:\/\//i.test(rawHost)) {
      try {
        return new URL(rawHost).origin;
      } catch {
        return rawHost.replace(/\/+$/, '');
      }
    }
    const hostOnly = rawHost.split('/')[0].trim();
    const h = hostOnly.toLowerCase();
    const proto = isLocalKidsHost(h) ? 'http' : 'https';
    const needsPort =
      proto === 'http' && isLocalKidsHost(h) && !/]:\d+$/.test(hostOnly) && !/:\d+$/.test(hostOnly);
    const hostWithPort = needsPort ? `${hostOnly}:${defaultLocalKidsPort()}` : hostOnly;
    return `${proto}://${hostWithPort}`;
  }

  const siteUrl = (process.env.NEXT_PUBLIC_KIDS_SITE_URL ?? '').trim();
  if (siteUrl) {
    try {
      return new URL(siteUrl).origin;
    } catch {
      const base = siteUrl.replace(/\/+$/, '');
      return base || '/kids';
    }
  }

  return '/kids';
}

export const SITE_KIDS_HREF = computeSiteKidsHref();

/** Ana sitede Kids CTA’ları: logo gök mavisi + mavi (globals --brand-sky / --brand-blue), kırmızı temayla uyumlu. */
export const SITE_KIDS_BTN_PRIMARY =
  'inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-sky to-brand-blue px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 hover:shadow';

/** İnce çerçeveli ikincil Kids butonu (üst şerit vb.). */
export const SITE_KIDS_BTN_SOFT =
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-sky-300/90 bg-white px-3 py-1.5 text-xs font-semibold text-sky-900 shadow-sm transition hover:bg-sky-50 dark:border-sky-700 dark:bg-gray-900 dark:text-sky-100 dark:hover:bg-sky-950/50 sm:text-sm';
