/**
 * Soru kökünün sonundaki "(FEN BİLİMLERİ)" gibi parantezli konu etiketlerini kaldırır.
 * Öğrenci arayüzü için; backend de aynı temizliği yapar, bu yedek / eski yanıtlar içindir.
 */
export function kidsStripTrailingParenTopicSuffix(stem: string): string {
  let s = (stem || '').trim();
  if (!s) return s;
  const re = /\s*\([^)]{1,200}\)\s*$/;
  for (let i = 0; i < 6; i++) {
    const next = s.replace(re, '').trim();
    if (next === s) break;
    s = next;
  }
  return s;
}
