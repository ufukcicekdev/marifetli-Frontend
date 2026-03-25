/**
 * Davet önizlemesi — giriş gerektirmez; kids-api import edilmez (Next dev / Turbopack takılmasın).
 */
import { kidsApiUrl } from '@/src/lib/kids-config';

export type KidsInvitePreview = {
  class_name: string;
  class_description: string;
  teacher_display: string;
  school_name: string;
  requires_parent_email: boolean;
  requires_student_email?: boolean;
  expires_at: string;
};

type ApiErrorBody = { detail?: string };

function readJson<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function fetchKidsInvitePreview(token: string): Promise<KidsInvitePreview> {
  const q = new URLSearchParams({ token });
  const res = await fetch(`${kidsApiUrl('/auth/invite-preview/')}?${q.toString()}`, {
    method: 'GET',
  });
  const text = await res.text();
  const data = readJson<KidsInvitePreview & ApiErrorBody>(text);
  if (!res.ok) {
    const d = typeof data?.detail === 'string' ? data.detail : '';
    throw new Error(d || 'Davet bilgisi alınamadı');
  }
  return data as KidsInvitePreview;
}
