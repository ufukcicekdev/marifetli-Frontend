/** Marifetli Kids yasal sayfaları — ana sitede `/marifetli-kids/...`, Kids portalında `/kids/yasal/...`. */

export const MARIFETLI_KIDS_LEGAL_SLUGS = {
  terms: 'kullanim-sartlari',
  privacy: 'gizlilik-politikasi',
  kvkk: 'kvkk-aydinlatma-metni',
  cookies: 'cerez-politikasi',
} as const;

export type MarifetliKidsLegalSlug = keyof typeof MARIFETLI_KIDS_LEGAL_SLUGS;

export function marifetliKidsLegalPathOnMain(slug: MarifetliKidsLegalSlug): string {
  return `/marifetli-kids/${MARIFETLI_KIDS_LEGAL_SLUGS[slug]}`;
}

export function marifetliKidsLegalPathOnKidsPortal(pathPrefix: string, slug: MarifetliKidsLegalSlug): string {
  const p = pathPrefix.replace(/\/$/, '') || '';
  return `${p}/yasal/${MARIFETLI_KIDS_LEGAL_SLUGS[slug]}`;
}
