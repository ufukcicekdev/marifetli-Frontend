import {
  kidsApiUrl,
  KIDS_REFRESH_STORAGE_KEY,
  KIDS_TOKEN_STORAGE_KEY,
} from '@/src/lib/kids-config';

export type KidsUserRole = 'admin' | 'teacher' | 'student';

export type KidsUser = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: KidsUserRole;
  created_at: string;
  profile_picture: string | null;
};

export type KidsSchool = {
  id: number;
  name: string;
  province: string;
  district: string;
  neighborhood: string;
  created_at: string;
  updated_at: string;
};

export type KidsClass = {
  id: number;
  name: string;
  description: string;
  /** Her sınıf mutlaka bir okula bağlıdır; adres bilgisi okul kaydındadır. */
  school: KidsSchool;
  teacher: number;
  teacher_email: string;
  created_at: string;
  updated_at: string;
};

/** Okul satırı: okul adı + mahalle · ilçe · il */
export function kidsSchoolLocationLine(
  s: Pick<KidsSchool, 'name' | 'province' | 'district' | 'neighborhood'> | null | undefined,
): string | null {
  if (!s) return null;
  const loc = [s.neighborhood, s.district, s.province].filter((x) => (x || '').trim()).join(' · ');
  const name = (s.name || '').trim();
  if (name && loc) return `${name} · ${loc}`;
  if (name) return name;
  if (loc) return loc;
  return null;
}

export function kidsClassLocationLine(c: Pick<KidsClass, 'school'>): string | null {
  return kidsSchoolLocationLine(c.school);
}

export type KidsAssignment = {
  id: number;
  kids_class: number;
  title: string;
  purpose: string;
  materials: string;
  video_max_seconds: 60 | 120 | 180;
  require_image: boolean;
  require_video: boolean;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type KidsEnrollment = {
  id: number;
  kids_class: number;
  student: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    created_at: string;
    profile_picture: string | null;
  };
  created_at: string;
};

export type KidsInviteResponse = {
  id: number;
  kids_class: number;
  parent_email: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
  signup_url?: string;
  email_sent?: boolean;
  email_error?: string | null;
};

export type KidsInviteBatchResponse = {
  invites: KidsInviteResponse[];
  summary: {
    total: number;
    emails_sent: number;
    emails_failed: number;
  };
};

/** Veli davet formu: virgül, noktalı virgül veya satır sonu ile ayrılmış adresler. */
export function parseKidsInviteEmails(raw: string): string[] {
  const parts = raw
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const k = p.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(p);
    }
  }
  return out;
}

export type ApiErrorBody = { detail?: string };

function readJson<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function tryRefresh(): Promise<boolean> {
  const refresh = localStorage.getItem(KIDS_REFRESH_STORAGE_KEY);
  if (!refresh) return false;
  const res = await fetch(kidsApiUrl('/auth/refresh/'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { access?: string };
  if (data.access) {
    localStorage.setItem(KIDS_TOKEN_STORAGE_KEY, data.access);
    return true;
  }
  return false;
}

export function kidsClearSession() {
  localStorage.removeItem(KIDS_TOKEN_STORAGE_KEY);
  localStorage.removeItem(KIDS_REFRESH_STORAGE_KEY);
}

/** Yetkili istek; 401’de bir kez refresh dener. */
export async function kidsAuthorizedFetch(
  path: string,
  init: RequestInit = {},
  retried = false,
): Promise<Response> {
  const token = localStorage.getItem(KIDS_TOKEN_STORAGE_KEY);
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (
    init.body &&
    !headers.has('Content-Type') &&
    !(typeof FormData !== 'undefined' && init.body instanceof FormData)
  ) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(kidsApiUrl(path), { ...init, headers });
  if (res.status === 401 && !retried) {
    const ok = await tryRefresh();
    if (ok) return kidsAuthorizedFetch(path, init, true);
    kidsClearSession();
  }
  return res;
}

export async function kidsLogin(email: string, password: string) {
  const res = await fetch(kidsApiUrl('/auth/login/'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const text = await res.text();
  const data = readJson<{ access?: string; refresh?: string; user?: KidsUser } & ApiErrorBody>(text);
  if (!res.ok) {
    throw new Error(data?.detail || 'Giriş başarısız');
  }
  if (data?.access) localStorage.setItem(KIDS_TOKEN_STORAGE_KEY, data.access);
  if (data?.refresh) localStorage.setItem(KIDS_REFRESH_STORAGE_KEY, data.refresh);
  return data as { access: string; refresh: string; user: KidsUser };
}

export async function kidsMe(): Promise<KidsUser> {
  const res = await kidsAuthorizedFetch('/auth/me/', { method: 'GET' });
  if (!res.ok) {
    const t = await res.text();
    const err = readJson<ApiErrorBody>(t);
    throw new Error(err?.detail || 'Oturum geçersiz');
  }
  return res.json() as Promise<KidsUser>;
}

export async function kidsPatchMe(body: { first_name?: string; last_name?: string }): Promise<KidsUser> {
  const res = await kidsAuthorizedFetch('/auth/me/', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const data = readJson<KidsUser & ApiErrorBody>(text);
  if (!res.ok) throw new Error(data?.detail || 'Profil güncellenemedi');
  return data as KidsUser;
}

export async function kidsUploadProfilePhoto(file: File): Promise<KidsUser> {
  const fd = new FormData();
  fd.append('photo', file);
  const res = await kidsAuthorizedFetch('/profile/photo/', { method: 'POST', body: fd });
  const text = await res.text();
  const data = readJson<KidsUser & ApiErrorBody>(text);
  if (!res.ok) throw new Error(data?.detail || 'Fotoğraf yüklenemedi');
  return data as KidsUser;
}

export async function kidsListClasses(): Promise<KidsClass[]> {
  const res = await kidsAuthorizedFetch('/classes/', { method: 'GET' });
  if (!res.ok) throw new Error('Sınıflar yüklenemedi');
  return res.json() as Promise<KidsClass[]>;
}

export async function kidsListSchools(): Promise<KidsSchool[]> {
  const res = await kidsAuthorizedFetch('/schools/', { method: 'GET' });
  if (!res.ok) throw new Error('Okullar yüklenemedi');
  return res.json() as Promise<KidsSchool[]>;
}

export async function kidsCreateSchool(body: {
  name: string;
  province?: string;
  district?: string;
  neighborhood?: string;
}): Promise<KidsSchool> {
  const res = await kidsAuthorizedFetch('/schools/', {
    method: 'POST',
    body: JSON.stringify({
      name: body.name.trim(),
      province: body.province?.trim() ?? '',
      district: body.district?.trim() ?? '',
      neighborhood: body.neighborhood?.trim() ?? '',
    }),
  });
  const text = await res.text();
  const data = readJson<KidsSchool & ApiErrorBody>(text);
  if (!res.ok) throw new Error(data?.detail || 'Okul oluşturulamadı');
  return data as KidsSchool;
}

export async function kidsPatchSchool(
  id: number,
  body: Partial<Pick<KidsSchool, 'name' | 'province' | 'district' | 'neighborhood'>>,
): Promise<KidsSchool> {
  const res = await kidsAuthorizedFetch(`/schools/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const data = readJson<KidsSchool & ApiErrorBody>(text);
  if (!res.ok) throw new Error(data?.detail || 'Okul güncellenemedi');
  return data as KidsSchool;
}

export async function kidsDeleteSchool(id: number): Promise<void> {
  const res = await kidsAuthorizedFetch(`/schools/${id}/`, { method: 'DELETE' });
  if (res.status === 204) return;
  const text = await res.text();
  const data = readJson<ApiErrorBody>(text);
  throw new Error(data?.detail || 'Okul silinemedi');
}

export async function kidsCreateClass(body: { name: string; description?: string; school_id: number }) {
  const res = await kidsAuthorizedFetch('/classes/', {
    method: 'POST',
    body: JSON.stringify({
      name: body.name,
      description: body.description ?? '',
      school_id: body.school_id,
    }),
  });
  const text = await res.text();
  const data = readJson<KidsClass & ApiErrorBody>(text);
  if (!res.ok) {
    let msg = 'Sınıf oluşturulamadı';
    if (typeof data?.detail === 'string') msg = data.detail;
    else if (data && typeof data === 'object') {
      for (const v of Object.values(data)) {
        if (Array.isArray(v) && typeof v[0] === 'string') {
          msg = v[0];
          break;
        }
      }
    }
    throw new Error(msg);
  }
  return data as KidsClass;
}

export async function kidsPatchClass(
  id: number,
  body: Partial<Pick<KidsClass, 'name' | 'description'>> & { school_id?: number },
) {
  const res = await kidsAuthorizedFetch(`/classes/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const data = readJson<KidsClass & ApiErrorBody>(text);
  if (!res.ok) throw new Error(data?.detail || 'Güncellenemedi');
  return data as KidsClass;
}

export async function kidsListStudents(classId: number): Promise<KidsEnrollment[]> {
  const res = await kidsAuthorizedFetch(`/classes/${classId}/students/`, { method: 'GET' });
  if (!res.ok) throw new Error('Öğrenci listesi alınamadı');
  return res.json() as Promise<KidsEnrollment[]>;
}

export async function kidsListAssignments(classId: number): Promise<KidsAssignment[]> {
  const res = await kidsAuthorizedFetch(`/classes/${classId}/assignments/`, { method: 'GET' });
  if (!res.ok) throw new Error('Ödevler yüklenemedi');
  return res.json() as Promise<KidsAssignment[]>;
}

export async function kidsCreateAssignment(
  classId: number,
  body: Omit<
    Partial<KidsAssignment>,
    'id' | 'kids_class' | 'created_at' | 'updated_at' | 'teacher_email'
  > & {
    title: string;
  },
) {
  const res = await kidsAuthorizedFetch(`/classes/${classId}/assignments/`, {
    method: 'POST',
    body: JSON.stringify({
      title: body.title,
      purpose: body.purpose ?? '',
      materials: body.materials ?? '',
      video_max_seconds: body.video_max_seconds ?? 120,
      require_image: body.require_image ?? false,
      require_video: body.require_video ?? false,
      is_published: body.is_published ?? true,
    }),
  });
  const text = await res.text();
  const data = readJson<KidsAssignment & ApiErrorBody>(text);
  if (!res.ok) throw new Error(data?.detail || 'Ödev oluşturulamadı');
  return data as KidsAssignment;
}

export async function kidsCreateInvite(body: {
  kids_class_id: number;
  /** Bir veya birden fazla veli adresi (tercihen `parent_emails`). */
  parent_emails: string[];
  expires_days?: number;
}): Promise<KidsInviteBatchResponse> {
  const res = await kidsAuthorizedFetch('/invites/', {
    method: 'POST',
    body: JSON.stringify({
      kids_class_id: body.kids_class_id,
      parent_emails: body.parent_emails,
      expires_days: body.expires_days ?? 7,
    }),
  });
  const text = await res.text();
  const data = readJson<KidsInviteBatchResponse & ApiErrorBody>(text);
  if (!res.ok) {
    let msg = 'Davet oluşturulamadı';
    if (typeof data?.detail === 'string') msg = data.detail;
    else if (data && typeof data === 'object') {
      for (const v of Object.values(data)) {
        if (Array.isArray(v) && typeof v[0] === 'string') {
          msg = v[0];
          break;
        }
      }
    }
    throw new Error(msg);
  }
  return data as KidsInviteBatchResponse;
}

export async function kidsWeeklyChampion(classId: number) {
  const res = await kidsAuthorizedFetch(`/classes/${classId}/weekly-champion/`, { method: 'GET' });
  if (!res.ok) throw new Error('Veri alınamadı');
  return res.json() as Promise<{
    week_start: string;
    top: { student: KidsUser; submission_count: number }[];
  }>;
}

export async function kidsStudentDashboard() {
  const res = await kidsAuthorizedFetch('/student/dashboard/', { method: 'GET' });
  if (!res.ok) throw new Error('Panel yüklenemedi');
  return res.json() as Promise<{ classes: KidsClass[]; assignments: KidsAssignment[] }>;
}

export async function kidsCreateSubmission(body: {
  assignment: number;
  kind: 'steps' | 'video';
  steps_payload?: unknown;
  video_url?: string;
  caption?: string;
}) {
  const res = await kidsAuthorizedFetch('/student/submissions/', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as ApiErrorBody)?.detail || 'Teslim kaydedilemedi');
  return data as Record<string, unknown>;
}

export type FreestyleItem = {
  id: number;
  title: string;
  description: string;
  media_urls: string[];
  created_at: string;
  student_name: string;
};

export async function kidsFreestyleList(): Promise<FreestyleItem[]> {
  const res = await kidsAuthorizedFetch('/freestyle/', { method: 'GET' });
  if (!res.ok) throw new Error('Galeri yüklenemedi');
  return res.json() as Promise<FreestyleItem[]>;
}

export async function kidsFreestyleCreate(body: {
  title: string;
  description?: string;
  media_urls?: string[];
}) {
  const res = await kidsAuthorizedFetch('/freestyle/', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as ApiErrorBody)?.detail || 'Paylaşım oluşturulamadı');
  return data as Record<string, unknown>;
}

export type KidsNotificationType = 'kids_new_assignment' | 'kids_submission_received';

export type KidsNotificationRow = {
  id: number;
  notification_type: KidsNotificationType;
  message: string;
  is_read: boolean;
  created_at: string;
  assignment: number | null;
  submission: number | null;
  action_path: string;
};

export async function kidsNotificationUnreadCount(): Promise<number> {
  const res = await kidsAuthorizedFetch('/notifications/unread-count/', { method: 'GET' });
  if (!res.ok) return 0;
  const d = (await res.json()) as { unread_count?: number };
  return typeof d.unread_count === 'number' ? d.unread_count : 0;
}

export async function kidsListNotifications(): Promise<KidsNotificationRow[]> {
  const res = await kidsAuthorizedFetch('/notifications/', { method: 'GET' });
  if (!res.ok) throw new Error('Bildirimler yüklenemedi');
  const d = (await res.json()) as KidsNotificationRow[] | { results?: KidsNotificationRow[] };
  if (Array.isArray(d)) return d;
  return Array.isArray(d?.results) ? d.results : [];
}

export async function kidsMarkNotificationRead(id: number): Promise<KidsNotificationRow> {
  const res = await kidsAuthorizedFetch(`/notifications/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify({}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as ApiErrorBody)?.detail || 'Güncellenemedi');
  return data as KidsNotificationRow;
}

export async function kidsMarkAllNotificationsRead(): Promise<void> {
  const res = await kidsAuthorizedFetch('/notifications/mark-all-read/', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error('İşlem başarısız');
}

export async function kidsRegisterFCMToken(token: string, deviceName?: string): Promise<void> {
  const res = await kidsAuthorizedFetch('/notifications/fcm-register/', {
    method: 'POST',
    body: JSON.stringify({ token, device_name: deviceName ?? '' }),
  });
  if (!res.ok) throw new Error('Bildirim kaydı başarısız');
}
