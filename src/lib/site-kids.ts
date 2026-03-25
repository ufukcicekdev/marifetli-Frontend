/** Ana siteden Kids'e geçiş adresi: her zaman `/kids` tabanlı. */
function computeSiteKidsHref(): string {
  const kidsSite = (process.env.NEXT_PUBLIC_KIDS_SITE_URL ?? '').trim();
  if (kidsSite) return kidsSite.replace(/\/+$/, '');
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? '').trim().replace(/\/+$/, '');
  if (site) return `${site}/kids`;
  return '/kids';
}

export const SITE_KIDS_HREF = computeSiteKidsHref();

/** Ana sitede Kids CTA’ları: logo gök mavisi + mavi (globals --brand-sky / --brand-blue), kırmızı temayla uyumlu. */
export const SITE_KIDS_BTN_PRIMARY =
  'inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-sky to-brand-blue px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 hover:shadow';

/** İnce çerçeveli ikincil Kids butonu (üst şerit vb.). */
export const SITE_KIDS_BTN_SOFT =
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-sky-300/90 bg-white px-3 py-1.5 text-xs font-semibold text-sky-900 shadow-sm transition hover:bg-sky-50 dark:border-sky-700 dark:bg-gray-900 dark:text-sky-100 dark:hover:bg-sky-950/50 sm:text-sm';
