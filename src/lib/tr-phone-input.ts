/** Türkiye cep: saklama/trafiğe giden değer — yalnızca rakam, en fazla 11 (0 + 10). Boş olabilir. */
export function trPhoneDigitsFromInput(raw: string): string {
  let d = raw.replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('90')) d = d.slice(2);
  if (!d.startsWith('0')) d = `0${d}`;
  return d.slice(0, 11);
}

/** Görüntü: 0 XXX XXX XX XX */
export function formatTrMobileDisplay(digitsCanonical: string): string {
  const d = digitsCanonical.replace(/\D/g, '').slice(0, 11);
  if (!d) return '';
  const x = d.startsWith('0') ? d : `0${d}`.slice(0, 11);
  const a = x.slice(0, 4);
  const b = x.slice(4, 7);
  const c = x.slice(7, 9);
  const e = x.slice(9, 11);
  return [a, b, c, e].filter((p) => p.length > 0).join(' ');
}

export function trPhoneInputChange(raw: string): string {
  return formatTrMobileDisplay(trPhoneDigitsFromInput(raw));
}
