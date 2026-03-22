/** Kids arayüzünün kamuya açık kök adresi (davet linkleri, paylaşım) */
export const KIDS_SITE_URL =
  process.env.NEXT_PUBLIC_KIDS_SITE_URL || 'https://cocuk.marifetli.com.tr';

/** Ana sitede `/kids/...`, cocuk alt alan adında kök `/...` */
export function kidsPathPrefixFromHost(host: string): string {
  const h = host.split(':')[0].toLowerCase();
  if (h === 'cocuk.marifetli.com.tr') return '';
  const custom = process.env.NEXT_PUBLIC_KIDS_HOST?.trim().toLowerCase();
  if (custom && h === custom) return '';
  const extras = (process.env.NEXT_PUBLIC_KIDS_EXTRA_HOSTS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (extras.includes(h)) return '';
  return '/kids';
}

function apiOriginFromBase(): string {
  const base =
    process.env.NEXT_PUBLIC_API_BASE_URL || 'https://web-production-5404d.up.railway.app/api';
  try {
    return new URL(base).origin;
  } catch {
    return 'https://web-production-5404d.up.railway.app';
  }
}

/** Kids API: /api/kids/ altı */
export function kidsApiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${apiOriginFromBase()}/api/kids${p}`;
}

export const KIDS_TOKEN_STORAGE_KEY = 'marifetli_kids_access';
export const KIDS_REFRESH_STORAGE_KEY = 'marifetli_kids_refresh';
