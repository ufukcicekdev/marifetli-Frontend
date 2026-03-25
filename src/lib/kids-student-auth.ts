import { kidsApiUrl } from '@/src/lib/kids-config';

type ApiErrorBody = { detail?: string };

function readJson<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/**
 * /api/kids altındaki DRF benzeri `detail` hata mesajını alır.
 * Bu modül sadece öğrenci şifre-sıfırlama için kullanılır; ağır `kids-api.ts` import edilmez.
 */
function kidsFirstApiErrorMessage(body: unknown, fallback: string): string {
  if (body == null || typeof body !== 'object') return fallback;
  const o = body as Record<string, unknown>;
  const detail = o.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (Array.isArray(detail) && detail.length && typeof detail[0] === 'string') return detail[0];
  const nfe = o.non_field_errors;
  if (Array.isArray(nfe) && nfe.length && typeof nfe[0] === 'string') return nfe[0];
  return fallback;
}

export async function kidsRequestPasswordReset(email: string): Promise<void> {
  const res = await fetch(kidsApiUrl('/auth/request-password-reset/'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim() }),
  });
  const text = await res.text();
  const data = readJson<ApiErrorBody>(text);
  if (!res.ok) {
    throw new Error(kidsFirstApiErrorMessage(data, 'İstek gönderilemedi'));
  }

  // Başarılı durumda hata atmıyoruz; çağıran taraf toast mesajını gösterir.
}

