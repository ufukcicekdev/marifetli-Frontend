import {
  kidsApiUrl,
  KIDS_REFRESH_STORAGE_KEY,
  KIDS_TOKEN_STORAGE_KEY,
} from '@/src/lib/kids-config';

export type KidsUserRole = 'admin' | 'teacher' | 'student';

/** Öğrenci için /auth/me yanıtında; öğretmende çoğunlukla null. */
export type KidsGrowthStage = {
  code: string;
  title: string;
  subtitle: string;
};

export type KidsUser = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: KidsUserRole;
  created_at: string;
  profile_picture: string | null;
  /** Eski API yanıtlarında olmayabilir; öğrenci panelinde varsayılan 0 kullanılır. */
  growth_points?: number;
  growth_stage?: KidsGrowthStage | null;
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
  /** Görsel teslimde öğrencinin ekleyebileceği en fazla görsel (1–3). */
  max_step_images?: 1 | 2 | 3;
  is_published: boolean;
  /** Öğrencilere “yeni proje” bildiriminin gittiği zaman (planlı projelerde başlangıçtan sonra dolur). */
  students_notified_at?: string | null;
  /** Boş veya null: yayınlandığı andan itibaren teslim (başlangıç kısıtı yok). ISO 8601. */
  submission_opens_at?: string | null;
  /** Son teslim anı (ISO 8601). Yeni projelerde zorunlu. */
  submission_closes_at?: string | null;
  created_at: string;
  updated_at: string;
  /** Öğretmen listesi: bu projeye yapılan teslim sayısı. */
  submission_count?: number | null;
  /** Öğretmen listesi: sınıftaki kayıtlı öğrenci sayısı (payda, örn. 3/20). */
  enrolled_student_count?: number | null;
  /** Öğrenci paneli: bu projedeki son tesliminin özeti (öğretmen yanıtı / yıldız). */
  my_submission?: KidsStudentAssignmentSubmission | null;
};

/** `/student/dashboard/` içindeki `assignments[].my_submission`. */
export type KidsStudentAssignmentSubmission = {
  id: number;
  teacher_reviewed_at: string | null;
  teacher_review_positive: boolean | null;
  is_teacher_pick: boolean;
  review_hint_title: string;
  review_hint_code: string;
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
  /** Bu sınıfta yayında olan proje sayısı (öğretmen öğrenci listesi). */
  class_published_assignment_count?: number;
  /** Öğrencinin bu sınıftaki yayınlanmış projelerden en az bir teslim gönderdiği proje sayısı. */
  assignments_submitted_count?: number;
};

export type KidsInviteResponse = {
  id: number;
  kids_class: number;
  parent_email: string;
  is_class_link?: boolean;
  token: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
  signup_url?: string;
  email_sent?: boolean;
  email_error?: string | null;
};

export type KidsInvitePreview = {
  class_name: string;
  class_description: string;
  teacher_display: string;
  school_name: string;
  requires_student_email: boolean;
  expires_at: string;
};

export type KidsClassInviteLinkResponse = {
  invite: KidsInviteResponse;
  signup_url: string;
  expires_days: number;
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

/** `datetime-local` için varsayılan son teslim (örn. 7 gün sonra 23:59). */
export function kidsDatetimeLocalDefaultClose(daysAhead = 7): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(23, 59, 0, 0);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function kidsDatetimeLocalToIso(local: string): string | null {
  const t = local.trim();
  if (!t) return null;
  const dt = new Date(t);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
}

/** ISO tarihi `datetime-local` alanına (tarayıcı yerel saati). */
export function kidsIsoToDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function kidsAssignmentSubmissionGate(
  a: Pick<KidsAssignment, 'submission_opens_at' | 'submission_closes_at'>,
): { ok: true; phase: 'legacy' | 'open' } | { ok: false; phase: 'not_yet' | 'closed' } {
  const now = Date.now();
  const o = a.submission_opens_at ? new Date(a.submission_opens_at).getTime() : null;
  const c = a.submission_closes_at ? new Date(a.submission_closes_at).getTime() : null;
  if (o == null && c == null) return { ok: true, phase: 'legacy' };
  if (o != null && now < o) return { ok: false, phase: 'not_yet' };
  if (c != null && now > c) return { ok: false, phase: 'closed' };
  return { ok: true, phase: 'open' };
}

export function kidsFormatAssignmentWindowTr(
  a: Pick<KidsAssignment, 'submission_opens_at' | 'submission_closes_at'>,
): string {
  const o = a.submission_opens_at ? new Date(a.submission_opens_at) : null;
  const c = a.submission_closes_at ? new Date(a.submission_closes_at) : null;
  const opt: Intl.DateTimeFormatOptions = { dateStyle: 'short', timeStyle: 'short' };
  if (o && c) return `${o.toLocaleString('tr-TR', opt)} – ${c.toLocaleString('tr-TR', opt)}`;
  if (c) return `Son teslim: ${c.toLocaleString('tr-TR', opt)}`;
  if (o) return `Teslime başlangıç: ${o.toLocaleString('tr-TR', opt)}`;
  return '';
}

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

/** Kids hesabı (öğrenci/öğretmen) şifre sıfırlama isteği; yanıt her zaman aynı türde güvenlik mesajıdır. */
export async function kidsRequestPasswordReset(email: string): Promise<void> {
  const res = await fetch(kidsApiUrl('/auth/request-password-reset/'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim() }),
  });
  const text = await res.text();
  const data = readJson<ApiErrorBody>(text);
  if (!res.ok) {
    throw new Error(data?.detail || 'İstek gönderilemedi');
  }
}

export async function kidsConfirmPasswordReset(token: string, newPassword: string): Promise<void> {
  const res = await fetch(kidsApiUrl('/auth/confirm-password-reset/'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, new_password: newPassword }),
  });
  const text = await res.text();
  const data = readJson<ApiErrorBody>(text);
  if (!res.ok) {
    throw new Error(data?.detail || 'Şifre güncellenemedi');
  }
}

export type KidsTeacherAppConfig = {
  invite_email_enabled: boolean;
  /** False iken öğretmen projede “video ile teslim” seçemez. */
  assignment_video_enabled: boolean;
};

/** Öğretmen Kids arayüzü: sunucu .env ile açılıp kapanan özellikler. */
export async function kidsTeacherAppConfig(): Promise<KidsTeacherAppConfig> {
  const res = await kidsAuthorizedFetch('/config/', { method: 'GET' });
  if (!res.ok) throw new Error('Ayarlar yüklenemedi');
  return res.json() as Promise<KidsTeacherAppConfig>;
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

/** Öğrenci proje görseli (JPEG/PNG/WebP, en fazla 2 MB). */
export async function kidsUploadSubmissionImage(file: File): Promise<{ url: string }> {
  const fd = new FormData();
  fd.append('image', file);
  const res = await kidsAuthorizedFetch('/student/upload-submission-image/', {
    method: 'POST',
    body: fd,
  });
  const text = await res.text();
  const data = readJson<{ url?: string } & ApiErrorBody>(text);
  if (!res.ok || !data?.url) throw new Error(data?.detail || 'Görsel yüklenemedi');
  return { url: data.url };
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

/** MEB dizininden okul seçimi (öğretmen okul kaydı formu). */
export type MebSchoolPick = {
  yol: string;
  name: string;
  province: string;
  district: string;
  line_full?: string;
};

export async function kidsMebProvinces(): Promise<string[]> {
  const res = await kidsAuthorizedFetch('/meb-schools/provinces/', { method: 'GET' });
  if (!res.ok) throw new Error('İller yüklenemedi');
  const d = (await res.json()) as { provinces?: string[] };
  return Array.isArray(d.provinces) ? d.provinces : [];
}

export async function kidsMebDistricts(province: string): Promise<string[]> {
  const params = new URLSearchParams();
  params.set('province', province.trim());
  const res = await kidsAuthorizedFetch(`/meb-schools/districts/?${params.toString()}`, {
    method: 'GET',
  });
  if (!res.ok) throw new Error('İlçeler yüklenemedi');
  const d = (await res.json()) as { districts?: string[] };
  return Array.isArray(d.districts) ? d.districts : [];
}

export async function kidsMebSchoolsPick(
  province: string,
  district: string,
  q?: string,
  limit = 80,
): Promise<MebSchoolPick[]> {
  const params = new URLSearchParams();
  params.set('province', province.trim());
  params.set('district', district.trim());
  if (q?.trim()) params.set('q', q.trim());
  params.set('limit', String(limit));
  const res = await kidsAuthorizedFetch(`/meb-schools/pick/?${params.toString()}`, {
    method: 'GET',
  });
  if (!res.ok) throw new Error('Okullar yüklenemedi');
  const d = (await res.json()) as { schools?: MebSchoolPick[] };
  return Array.isArray(d.schools) ? d.schools : [];
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

export async function kidsDeleteClass(id: number): Promise<void> {
  const res = await kidsAuthorizedFetch(`/classes/${id}/`, { method: 'DELETE' });
  if (res.status === 204) return;
  const text = await res.text();
  const data = readJson<ApiErrorBody>(text);
  throw new Error(data?.detail || 'Sınıf silinemedi');
}

export async function kidsListStudents(classId: number): Promise<KidsEnrollment[]> {
  const res = await kidsAuthorizedFetch(`/classes/${classId}/students/`, { method: 'GET' });
  if (!res.ok) throw new Error('Öğrenci listesi alınamadı');
  return res.json() as Promise<KidsEnrollment[]>;
}

export async function kidsRemoveEnrollment(classId: number, enrollmentId: number): Promise<void> {
  const res = await kidsAuthorizedFetch(`/classes/${classId}/students/${enrollmentId}/`, {
    method: 'DELETE',
  });
  if (res.status === 204) return;
  const text = await res.text();
  const data = readJson<ApiErrorBody>(text);
  throw new Error(data?.detail || 'Öğrenci kaydı kaldırılamadı');
}

export async function kidsListAssignments(classId: number): Promise<KidsAssignment[]> {
  const res = await kidsAuthorizedFetch(`/classes/${classId}/assignments/`, { method: 'GET' });
  if (!res.ok) throw new Error('Projeler yüklenemedi');
  return res.json() as Promise<KidsAssignment[]>;
}

/** Öğrenci teslim kaydı + öğretmen geri bildirimi özeti. */
export type KidsReviewHint = {
  code: string;
  title: string;
  body: string;
};

export type KidsSubmissionRecord = {
  id: number;
  assignment: number;
  student: number;
  kind: 'steps' | 'video';
  steps_payload: {
    steps?: { text: string }[];
    image_urls?: string[];
  } | null;
  video_url: string;
  caption: string;
  teacher_review_valid: boolean | null;
  teacher_review_positive: boolean | null;
  teacher_note_to_student: string;
  teacher_reviewed_at: string | null;
  is_teacher_pick?: boolean;
  teacher_picked_at?: string | null;
  review_hint: KidsReviewHint;
  created_at: string;
  updated_at: string;
};

/** Öğretmen: sınıftaki öğrenci teslimleri (proje başlığı + içerik). */
export type KidsTeacherSubmission = {
  id: number;
  assignment: { id: number; title: string };
  student: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    created_at: string;
    profile_picture: string | null;
  };
  kind: 'steps' | 'video';
  steps_payload: {
    steps?: { text: string }[];
    image_urls?: string[];
  } | null;
  video_url: string;
  caption: string;
  teacher_review_valid: boolean | null;
  teacher_review_positive: boolean | null;
  teacher_note_to_student: string;
  teacher_reviewed_at: string | null;
  is_teacher_pick?: boolean;
  teacher_picked_at?: string | null;
  /** Son teslim zamanı geçtiyse değerlendirme formu açılır. */
  can_review: boolean;
  created_at: string;
};

export async function kidsListClassSubmissions(classId: number): Promise<KidsTeacherSubmission[]> {
  const res = await kidsAuthorizedFetch(`/classes/${classId}/submissions/`, { method: 'GET' });
  if (!res.ok) throw new Error('Teslimler yüklenemedi');
  return res.json() as Promise<KidsTeacherSubmission[]>;
}

/** Öğretmen: tek proje özeti + teslim listesi. */
export async function kidsGetAssignmentSubmissions(
  classId: number,
  assignmentId: number,
): Promise<{
  assignment: KidsAssignment;
  submissions: KidsTeacherSubmission[];
  /** Bu projeye henüz teslim göndermemiş kayıtlı öğrenciler (öğretmen paneli). */
  not_submitted_students: KidsUser[];
  teacher_pick_limit: number;
  teacher_pick_count: number;
}> {
  const res = await kidsAuthorizedFetch(
    `/classes/${classId}/assignments/${assignmentId}/submissions/`,
    { method: 'GET' },
  );
  const text = await res.text();
  const data = readJson<{
    assignment?: KidsAssignment;
    submissions?: KidsTeacherSubmission[];
    not_submitted_students?: KidsUser[];
    teacher_pick_limit?: number;
    teacher_pick_count?: number;
  }>(text);
  if (!res.ok || !data?.assignment) {
    throw new Error((data as ApiErrorBody)?.detail || 'Proje yüklenemedi');
  }
  return {
    assignment: data.assignment,
    submissions: data.submissions ?? [],
    not_submitted_students: Array.isArray(data.not_submitted_students) ? data.not_submitted_students : [],
    teacher_pick_limit: typeof data.teacher_pick_limit === 'number' ? data.teacher_pick_limit : 5,
    teacher_pick_count: typeof data.teacher_pick_count === 'number' ? data.teacher_pick_count : 0,
  };
}

export type KidsRoadmapMilestone = {
  key: string;
  order: number;
  icon: string;
  title: string;
  subtitle: string;
  unlocked: boolean;
  earned_at: string | null;
};

export type KidsRoadmapTeacherPick = {
  key: string;
  assignment_id: number;
  label: string;
  earned_at: string;
};

export type KidsBadgeRoadmap = {
  milestones: KidsRoadmapMilestone[];
  teacher_picks: KidsRoadmapTeacherPick[];
  growth_points: number;
  teacher_pick_limit: number;
};

export async function kidsGetBadgeRoadmap(): Promise<KidsBadgeRoadmap> {
  const res = await kidsAuthorizedFetch('/student/badges/roadmap/', { method: 'GET' });
  const text = await res.text();
  const data = readJson<KidsBadgeRoadmap & ApiErrorBody>(text);
  if (!res.ok) {
    throw new Error(data?.detail || 'Rozet yolu yüklenemedi');
  }
  return data as KidsBadgeRoadmap;
}

export async function kidsPatchSubmissionHighlight(
  classId: number,
  submissionId: number,
  is_teacher_pick: boolean,
): Promise<KidsTeacherSubmission> {
  const res = await kidsAuthorizedFetch(
    `/classes/${classId}/submissions/${submissionId}/highlight/`,
    {
      method: 'PATCH',
      body: JSON.stringify({ is_teacher_pick }),
    },
  );
  const text = await res.text();
  const data = readJson<KidsTeacherSubmission & ApiErrorBody>(text);
  if (!res.ok) {
    let msg = 'Kaydedilemedi';
    if (typeof data?.detail === 'string') msg = data.detail;
    throw new Error(msg);
  }
  return data as KidsTeacherSubmission;
}

export async function kidsCreateAssignment(
  classId: number,
  body: Omit<
    Partial<KidsAssignment>,
    'id' | 'kids_class' | 'created_at' | 'updated_at' | 'teacher_email'
  > & {
    title: string;
    submission_closes_at: string;
    submission_opens_at?: string | null;
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
      max_step_images: body.max_step_images ?? 3,
      is_published: body.is_published ?? true,
      submission_opens_at: body.submission_opens_at ?? null,
      submission_closes_at: body.submission_closes_at,
    }),
  });
  const text = await res.text();
  const data = readJson<KidsAssignment & ApiErrorBody>(text);
  if (!res.ok) throw new Error(data?.detail || 'Proje oluşturulamadı');
  return data as KidsAssignment;
}

export async function kidsPatchAssignment(
  classId: number,
  assignmentId: number,
  body: Partial<{
    title: string;
    purpose: string;
    materials: string;
    video_max_seconds: 60 | 120 | 180;
    require_image: boolean;
    require_video: boolean;
    max_step_images: 1 | 2 | 3;
    submission_opens_at: string | null;
    submission_closes_at: string | null;
  }>,
): Promise<KidsAssignment> {
  const res = await kidsAuthorizedFetch(`/classes/${classId}/assignments/${assignmentId}/`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const data = readJson<KidsAssignment & ApiErrorBody>(text);
  if (!res.ok) {
    let msg = 'Proje güncellenemedi';
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

/** Davet sayfası: token ile sınıf / öğretmen bilgisi (giriş gerekmez). */
export async function kidsInvitePreview(token: string): Promise<KidsInvitePreview> {
  const q = new URLSearchParams({ token });
  const res = await fetch(`${kidsApiUrl('/auth/invite-preview/')}?${q.toString()}`, { method: 'GET' });
  const text = await res.text();
  const data = readJson<KidsInvitePreview & ApiErrorBody>(text);
  if (!res.ok) throw new Error(data?.detail || 'Davet bilgisi alınamadı');
  return data as KidsInvitePreview;
}

/** Sınıfa özel paylaşılabilir davet linki (çok kullanımlı). */
export async function kidsCreateClassInviteLink(
  classId: number,
  expiresDays?: number,
): Promise<KidsClassInviteLinkResponse> {
  const res = await kidsAuthorizedFetch(`/classes/${classId}/invite-link/`, {
    method: 'POST',
    body: JSON.stringify({ expires_days: expiresDays ?? 7 }),
  });
  const text = await res.text();
  const data = readJson<KidsClassInviteLinkResponse & ApiErrorBody>(text);
  if (!res.ok) throw new Error(data?.detail || 'Davet linki oluşturulamadı');
  return data as KidsClassInviteLinkResponse;
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
}): Promise<KidsSubmissionRecord> {
  const res = await kidsAuthorizedFetch('/student/submissions/', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as ApiErrorBody)?.detail || 'Teslim kaydedilemedi');
  return data as KidsSubmissionRecord;
}

/** Öğrenci: bu proje için kayıtlı son teslim (düzenleme / geri bildirim). */
export async function kidsGetSubmissionForAssignment(
  assignmentId: number,
): Promise<KidsSubmissionRecord | null> {
  const q = new URLSearchParams({ assignment_id: String(assignmentId) });
  const res = await kidsAuthorizedFetch(`/student/submissions/for-assignment/?${q}`, {
    method: 'GET',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as ApiErrorBody)?.detail || 'Teslim bilgisi alınamadı');
  }
  const sub = (data as { submission?: KidsSubmissionRecord | null }).submission;
  return sub ?? null;
}

/** Öğretmen: teslimi değerlendir (son teslimden sonra). */
export async function kidsPatchTeacherSubmissionReview(
  classId: number,
  submissionId: number,
  body: {
    teacher_review_valid: boolean;
    teacher_review_positive?: boolean | null;
    teacher_note_to_student?: string;
  },
): Promise<KidsTeacherSubmission> {
  const res = await kidsAuthorizedFetch(
    `/classes/${classId}/submissions/${submissionId}/review/`,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    },
  );
  const text = await res.text();
  const data = readJson<KidsTeacherSubmission & ApiErrorBody>(text);
  if (!res.ok) {
    let msg = 'Kaydedilemedi';
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
  return data as KidsTeacherSubmission;
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
