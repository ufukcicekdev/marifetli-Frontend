import DOMPurify from 'isomorphic-dompurify';

/** Kullanıcı kaynaklı HTML'i XSS'e karşı sanitize eder (SSR ve client'ta çalışır). */
export function sanitizeHtml(html: string): string {
  if (typeof html !== 'string' || !html.trim()) return '';
  try {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li',
        'h1', 'h2', 'h3', 'h4', 'blockquote', 'code', 'pre', 'img',
        'span', 'div',
      ],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'class'],
      ADD_ATTR: ['target'],
    });
  } catch {
    return '';
  }
}
