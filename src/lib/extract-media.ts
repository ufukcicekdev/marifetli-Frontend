/**
 * HTML content'ten medya URL'lerini çıkarır (img src, video src, source src)
 */
export type MediaItem = { url: string; type: 'image' | 'video' };

export function extractMediaFromHtml(html: string | null | undefined): MediaItem[] {
  if (!html || typeof html !== 'string') return [];
  const items: MediaItem[] = [];
  const seen = new Set<string>();

  // img src
  const imgRe = /<img[^>]+src=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = imgRe.exec(html)) !== null) {
    const url = m[1]?.trim();
    if (url && !seen.has(url)) {
      seen.add(url);
      items.push({ url, type: 'image' });
    }
  }

  // video src veya source src
  const videoSrcRe = /<video[^>]+src=["']([^"']+)["'][^>]*>/gi;
  while ((m = videoSrcRe.exec(html)) !== null) {
    const url = m[1]?.trim();
    if (url && !seen.has(url)) {
      seen.add(url);
      items.push({ url, type: 'video' });
    }
  }
  const sourceRe = /<source[^>]+src=["']([^"']+)["'][^>]*>/gi;
  while ((m = sourceRe.exec(html)) !== null) {
    const url = m[1]?.trim();
    if (url && !seen.has(url)) {
      seen.add(url);
      items.push({ url, type: 'video' });
    }
  }

  return items;
}

/** Slider'da gösterildiği için content'ten img/video etiketlerini kaldırır (tekrarları önlemek için) */
export function stripMediaFromHtml(html: string | null | undefined): string {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<video[^>]*>[\s\S]*?<\/video>/gi, '')
    .replace(/<source[^>]*\/?>/gi, '')
    .replace(/<img[^>]*\/?>/gi, '');
}
