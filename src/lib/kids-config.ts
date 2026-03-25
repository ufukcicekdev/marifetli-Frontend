/** Kids arayüzünün kamuya açık kök adresi (davet linkleri, paylaşım) */
export const KIDS_SITE_URL =
  process.env.NEXT_PUBLIC_KIDS_SITE_URL || 'https://marifetli.com.tr/kids';

/** Kids her zaman ana site altında: `/kids/...` */
export function kidsPathPrefixFromHost(host: string): string {
  void host;
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
/** Veli/öğretmen: Kids girişi ana site SimpleJWT döndürdü; refresh'te ana anahtarlar da güncellenir. */
export const KIDS_UNIFIED_MAIN_AUTH_FLAG = 'marifetli_kids_unified_main_auth';

/** Kids kök yolu (alt alan adında boş → `/`). */
export function kidsHomeHref(pathPrefix: string): string {
  return pathPrefix || '/';
}

/**
 * Giriş modali anasayfada açılır; `giris=1` varsayılan sekme, `ogrenci` / `ogretmen` / `veli` sekmeleri.
 */
export function kidsLoginPortalHref(
  pathPrefix: string,
  tab?: 'ogrenci' | 'ogretmen' | 'veli',
): string {
  const base = kidsHomeHref(pathPrefix);
  const slug =
    tab === 'ogrenci' ? 'ogrenci' : tab === 'ogretmen' ? 'ogretmen' : tab === 'veli' ? 'veli' : '1';
  return `${base}?giris=${slug}`;
}
