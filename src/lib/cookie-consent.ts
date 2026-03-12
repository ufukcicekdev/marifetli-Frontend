/**
 * Çerez onay tercihi - localStorage anahtarı ve tipi.
 * marifetli_cookie_consent: 'all' | 'necessary' | string (JSON: { analytics: boolean })
 */
export const COOKIE_CONSENT_KEY = 'marifetli_cookie_consent';

export type CookieConsentValue = 'all' | 'necessary' | { analytics: boolean };

export function getCookieConsent(): CookieConsentValue | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    if (raw === 'all' || raw === 'necessary') return raw;
    const parsed = JSON.parse(raw) as { analytics?: boolean };
    return { analytics: Boolean(parsed?.analytics) };
  } catch {
    return null;
  }
}

export function setCookieConsent(value: CookieConsentValue): void {
  if (typeof window === 'undefined') return;
  const raw = value === 'all' || value === 'necessary' ? value : JSON.stringify(value);
  localStorage.setItem(COOKIE_CONSENT_KEY, raw);
}

export function hasAnalyticsConsent(): boolean {
  const c = getCookieConsent();
  if (!c) return false;
  if (c === 'all') return true;
  if (typeof c === 'object' && c.analytics) return true;
  return false;
}
