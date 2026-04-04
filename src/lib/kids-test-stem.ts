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

const SINGLE_BLOCK_AS_STORY_MIN_LEN = 360;

/**
 * Öğrenci ekranı: `passages` boşken talimat alanında hikâye olabilir.
 * - İki veya daha fazla paragraf: ilk paragraf talimat, geri kalanı okuma metni.
 * - Tek paragraf ama çok uzunsa: tamamı okuma metni (kısa tek cümle talimatlar için değil).
 */
export function kidsSplitReadingFromInstructions(raw: string): { intro: string; story: string | null } {
  const t = (raw || '').trim();
  if (!t) return { intro: '', story: null };
  const parts = t
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    const story = parts.slice(1).join('\n\n');
    return { intro: parts[0] ?? '', story: story || null };
  }
  const one = parts[0] ?? t;
  if (one.length >= SINGLE_BLOCK_AS_STORY_MIN_LEN) {
    return { intro: '', story: one };
  }
  return { intro: t, story: null };
}
