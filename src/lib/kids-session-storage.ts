/**
 * Kids oturum anahtarları — auth store / büyük kids-api grafiğinden ayrı (davet sayfası hızlı derlensin).
 */
import {
  KIDS_REFRESH_STORAGE_KEY,
  KIDS_TOKEN_STORAGE_KEY,
  KIDS_UNIFIED_MAIN_AUTH_FLAG,
} from '@/src/lib/kids-config';

const MAIN_SITE_ACCESS_STORAGE_KEY = 'access_token';

export function applyKidsSessionFromAuthResponse(data: {
  access?: string;
  refresh?: string;
  token_kind?: string;
}) {
  if (data.token_kind === 'main_site') {
    localStorage.setItem(KIDS_UNIFIED_MAIN_AUTH_FLAG, '1');
    if (data.access) localStorage.setItem(MAIN_SITE_ACCESS_STORAGE_KEY, data.access);
    if (data.refresh) localStorage.setItem('refresh_token', data.refresh);
    localStorage.removeItem(KIDS_TOKEN_STORAGE_KEY);
    localStorage.removeItem(KIDS_REFRESH_STORAGE_KEY);
  } else {
    localStorage.removeItem(KIDS_UNIFIED_MAIN_AUTH_FLAG);
    if (data.access) localStorage.setItem(KIDS_TOKEN_STORAGE_KEY, data.access);
    if (data.refresh) localStorage.setItem(KIDS_REFRESH_STORAGE_KEY, data.refresh);
  }
}
