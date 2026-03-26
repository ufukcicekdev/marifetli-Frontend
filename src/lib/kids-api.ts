import {
  kidsApiUrl,
  KIDS_REFRESH_STORAGE_KEY,
  KIDS_TOKEN_STORAGE_KEY,
  KIDS_UNIFIED_MAIN_AUTH_FLAG,
} from '@/src/lib/kids-config';
import { applyKidsSessionFromAuthResponse } from '@/src/lib/kids-session-storage';
import { useAuthStore } from '@/src/stores/auth-store';
import type { User as MainSiteUser } from '@/src/types';

/** Ana site `api` ile aynı kök (`/api` dahil). */
const MAIN_SITE_API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

export type KidsUserRole = 'admin' | 'teacher' | 'parent' | 'student';

/** Öğrenci için /auth/me yanıtında; öğretmende çoğunlukla null. */
export type KidsGrowthStage = {
  code: string;
  title: string;
  subtitle: string;
};

export type KidsLinkedStudent = {
  id: number;
  first_name: string;
  last_name: string;
  student_login_name: string | null;
};

/** Veli paneli: çocuk başarı / proje özeti (`GET /parent/children-overview/`). */
export type KidsParentBadge = {
  key: string;
  label: string;
  earned_at: string;
};

export type KidsParentAssignmentRow = {
  id: number;
  title: string;
  class_name: string;
  submission_closes_at: string | null;
  submission_rounds: number;
  rounds_submitted: number;
  has_submissions: boolean;
  awaiting_teacher_feedback: boolean;
  teacher_feedback_preview: string | null;
  got_teacher_star: boolean;
};

export type KidsParentChallengeRow = {
  title: string;
  status: string;
  class_name: string;
  /** Sunucu yanıtında olabilir: serbest yarışmada `free_parent`. */
  peer_scope?: string;
  is_initiator: boolean;
};

export type KidsParentChildOverview = {
  id: number;
  first_name: string;
  last_name: string;
  student_login_name: string | null;
  growth_points: number;
  growth_stage: KidsGrowthStage | null;
  classes: { id: number; name: string; school_name: string }[];
  badges: KidsParentBadge[];
  assignments_recent: KidsParentAssignmentRow[];
  challenges: KidsParentChallengeRow[];
  /** İleride medya onayı vb.; şimdilik boş dizi. */
  pending_parent_actions: unknown[];
};

export type KidsAdminTeacher = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  created_at: string;
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
  /** Yalnızca kendi profilin için; çocuk giriş adı (e-posta yerine). */
  student_login_name?: string | null;
  phone?: string | null;
  linked_students?: KidsLinkedStudent[] | null;
};

export type KidsSchool = {
  id: number;
  name: string;
  province: string;
  district: string;
  neighborhood: string;
  lifecycle_stage: 'demo' | 'sales';
  demo_start_at?: string | null;
  demo_end_at?: string | null;
  student_user_cap: number;
  created_at: string;
  updated_at: string;
};

export type KidsClass = {
  id: number;
  name: string;
  description: string;
  /** Örn. `2024-2025`; yeni eğitim yılında sınıfları ayırt etmek için (isteğe bağlı). */
  academic_year_label?: string;
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

/** Eylül itibarıyla başlayan eğitim-öğretim yılı etiketi (placeholder önerisi). */
export function kidsSuggestedAcademicYearLabel(d = new Date()): string {
  const y = d.getFullYear();
  const m = d.getMonth();
  const start = m >= 8 ? y : y - 1;
  return `${start}-${start + 1}`;
}

/** Takvim yılı → eğitim yılının başlangıç yılı (Eylül kuralı). */
export function kidsAcademicYearStart(d = new Date()): number {
  const y = d.getFullYear();
  const m = d.getMonth();
  return m >= 8 ? y : y - 1;
}

/** Eğitim-öğretim yılı dropdown seçenekleri; `value: ''` = seçilmedi. */
export function kidsAcademicYearSelectOptions(
  yearsBack = 4,
  yearsForward = 2,
  d = new Date(),
): { value: string; label: string }[] {
  const base = kidsAcademicYearStart(d);
  const out: { value: string; label: string }[] = [{ value: '', label: 'Seçilmedi' }];
  for (let s = base + yearsForward; s >= base - yearsBack; s--) {
    const label = `${s}-${s + 1}`;
    out.push({ value: label, label });
  }
  return out;
}

export const KIDS_CLASS_GRADE_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const n = i + 1;
  return { value: String(n), label: `${n}. sınıf` };
});

export const KIDS_CLASS_SECTION_OPTIONS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((L) => ({
  value: L,
  label: `Şube ${L}`,
}));

/** Standart `4-B` veya `4-B Sınıfı` adını parçala; şube yalnızca A–Z ise döner. */
export function kidsParseStandardClassName(
  name: string,
): { grade: string; section: string; suffix?: string } | null {
  const t = name.trim();
  const m = /^(\d{1,2})-([A-Za-z])(?:\s+(.*))?$/.exec(t);
  if (!m) return null;
  const g = parseInt(m[1], 10);
  if (g < 1 || g > 12) return null;
  const sectionUp = m[2].toUpperCase();
  if (!/^[A-Z]$/.test(sectionUp)) return null;
  const suffix = (m[3] || '').trim();
  return { grade: String(g), section: sectionUp, suffix: suffix || undefined };
}

export function kidsBuildStandardClassName(grade: string, section: string, suffix?: string): string {
  const g = (grade || '').trim();
  const s = (section || '').trim().toUpperCase();
  const core = `${g}-${s}`;
  const rest = (suffix || '').trim();
  return rest ? `${core} ${rest}` : core;
}

/** Görsel teslimde teknik üst sınır (öğretmen seçmez; backend ile aynı). */
export const KIDS_MAX_IMAGES_PER_SUBMISSION = 1;

/** Öğrenci: bu konu için gerekli tüm teslim turları gönderildi mi? (panel / challenges sekmeleri). */
export function kidsStudentAssignmentAllRoundsSubmitted(a: KidsAssignment): boolean {
  const total = Math.max(1, a.submission_rounds ?? 1);
  const rp = a.my_rounds_progress;
  if (rp) return rp.submitted >= rp.total;
  return Boolean(a.my_submission) && total <= 1;
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
  /** Aynı konu başlığı altında kaç ayrı teslim (Challenge 1…N). */
  submission_rounds?: number;
  is_published: boolean;
  /** Öğrencilere “yeni challenge” bildiriminin gittiği zaman (planlı challenge’larda başlangıçtan sonra dolur). */
  students_notified_at?: string | null;
  /** Boş veya null: yayınlandığı andan itibaren teslim (başlangıç kısıtı yok). ISO 8601. */
  submission_opens_at?: string | null;
  /** Son teslim anı (ISO 8601). Yeni challenge’larda zorunlu. */
  submission_closes_at?: string | null;
  created_at: string;
  updated_at: string;
  /** Öğretmen listesi: bu challenge’a yapılan teslim sayısı. */
  submission_count?: number | null;
  /** Öğretmen listesi: sınıftaki kayıtlı öğrenci sayısı (payda, örn. 3/20). */
  enrolled_student_count?: number | null;
  /** Öğrenci paneli: bu challenge’daki son tesliminin özeti (öğretmen yanıtı / yıldız). */
  my_submission?: KidsStudentAssignmentSubmission | null;
  /** Öğrenci paneli: kaç tur teslim edildi / toplam tur. */
  my_rounds_progress?: { submitted: number; total: number } | null;
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
  /** Bu sınıfta yayında olan challenge sayısı (öğretmen öğrenci listesi). */
  class_published_assignment_count?: number;
  /** Öğrencinin bu sınıftaki yayınlanmış challenge’lardan en az bir teslim gönderdiği challenge sayısı. */
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

export type { KidsInvitePreview } from '@/src/lib/kids-invite-public';

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

/**
 * DRF / benzeri JSON hata gövdelerinden ilk okunabilir mesajı alır
 * (`detail` string | string[], alan bazlı `string[]`, `non_field_errors`).
 */
export function kidsFirstApiErrorMessage(body: unknown, fallback: string): string {
  if (body == null || typeof body !== 'object') return fallback;
  const o = body as Record<string, unknown>;
  const detail = o.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (Array.isArray(detail) && detail.length) {
    const first = detail[0];
    if (typeof first === 'string') return first;
  }
  const nfe = o.non_field_errors;
  if (Array.isArray(nfe) && nfe.length && typeof nfe[0] === 'string') return nfe[0];
  for (const [key, v] of Object.entries(o)) {
    if (key === 'detail') continue;
    if (Array.isArray(v) && v.length) {
      const first = v[0];
      if (typeof first === 'string') return first;
    }
    if (typeof v === 'string' && v.trim()) return v;
  }
  return fallback;
}

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

/** Ana site API ile aynı localStorage anahtarı (auth-store). */
const MAIN_SITE_ACCESS_STORAGE_KEY = 'access_token';

/**
 * Kids’te ana site JWT ile giriş sonrası: `access_token` yazılır ama Zustand (`marifetli-auth`)
 * güncellenmez; ana site “giriş yok” gösterir. Bu fonksiyon GET /auth/me/ ile store’u doldurur.
 */
export async function kidsSyncMainSiteAuthStore(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const access = localStorage.getItem(MAIN_SITE_ACCESS_STORAGE_KEY);
  if (!access?.trim()) return false;
  try {
    const res = await fetch(`${MAIN_SITE_API_BASE}/auth/me/`, {
      headers: { Authorization: `Bearer ${access.trim()}` },
    });
    if (!res.ok) return false;
    const user = (await res.json()) as MainSiteUser;
    useAuthStore.getState().setAuth(user, access.trim());
    return true;
  } catch {
    return false;
  }
}

/** @see applyKidsSessionFromAuthResponse — geriye dönük isim. */
export const kidsApplySessionFromAuthResponse = applyKidsSessionFromAuthResponse;

/**
 * Authorization: Kids öğrenci JWT veya birleşik oturumda `access_token`.
 * Google/ana site ile girişte `marifetli_kids_unified_main_auth` bazen set olmaz; Kids token yoksa
 * ana site `access_token` kullanılır (öğretmen/staff Kids paneli).
 */
function getEffectiveKidsAccessToken(): string {
  if (typeof window === 'undefined') return '';
  if (localStorage.getItem(KIDS_UNIFIED_MAIN_AUTH_FLAG) === '1') {
    const m = (localStorage.getItem(MAIN_SITE_ACCESS_STORAGE_KEY) || '').trim();
    if (m) return m;
    return (localStorage.getItem(KIDS_TOKEN_STORAGE_KEY) || '').trim();
  }
  const kids = (localStorage.getItem(KIDS_TOKEN_STORAGE_KEY) || '').trim();
  const main = (localStorage.getItem(MAIN_SITE_ACCESS_STORAGE_KEY) || '').trim();
  if (kids) return kids;
  return main;
}

async function tryRefresh(): Promise<boolean> {
  const unified = localStorage.getItem(KIDS_UNIFIED_MAIN_AUTH_FLAG) === '1';
  const refresh = (
    unified ? localStorage.getItem('refresh_token') : localStorage.getItem(KIDS_REFRESH_STORAGE_KEY)
  )?.trim();
  if (!refresh) return false;

  const url = unified ? `${MAIN_SITE_API_BASE}/auth/token/refresh/` : kidsApiUrl('/auth/refresh/');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { access?: string; refresh?: string };
  if (!data.access) return false;

  if (unified) {
    localStorage.setItem(MAIN_SITE_ACCESS_STORAGE_KEY, data.access);
    if (data.refresh) localStorage.setItem('refresh_token', data.refresh);
    await kidsSyncMainSiteAuthStore();
  } else {
    localStorage.setItem(KIDS_TOKEN_STORAGE_KEY, data.access);
    if (data.refresh) localStorage.setItem(KIDS_REFRESH_STORAGE_KEY, data.refresh);
  }
  return true;
}

type KidsOrMainFetchPhase = 'initial' | 'after_refresh' | 'main_fallback';

/**
 * Önce Kids JWT, yoksa ana site JWT (staff/süper kullanıcı Kids yönetimi için).
 * Diğer Kids uçlarında yalnızca Kids token kullanılmalı (kidsAuthorizedFetch).
 *
 * Eski/geçersiz `marifetli_kids_access` ana sitedeki geçerli `access_token`’ı gölgeler;
 * 401/403 sonrası refresh başarısızsa ve iki token farklıysa bir kez yalnızca ana token ile yeniden dener.
 */
async function kidsFetchKidsOrMainAccess(
  path: string,
  init: RequestInit = {},
  phase: KidsOrMainFetchPhase = 'initial',
): Promise<Response> {
  const unified = localStorage.getItem(KIDS_UNIFIED_MAIN_AUTH_FLAG) === '1';
  const kidsTok = (localStorage.getItem(KIDS_TOKEN_STORAGE_KEY) || '').trim();
  const mainTok = (localStorage.getItem(MAIN_SITE_ACCESS_STORAGE_KEY) || '').trim();
  const preferMainOnly = phase === 'main_fallback';
  const token = (preferMainOnly ? mainTok : getEffectiveKidsAccessToken() || mainTok).trim();
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
  if (res.status === 401 && phase === 'initial' && token) {
    const ok = await tryRefresh();
    if (ok) return kidsFetchKidsOrMainAccess(path, init, 'after_refresh');
    kidsClearSession();
  }
  // Kimlik uçlarında ana site token’ına düşme: veli → çocuk JWT geçişinde hem token’lar
  // kısa süre depoda kalır; 403/401 sonrası /auth/me veli döner, öğrenci paneli girişe atar.
  const isAuthMePath = /^\/auth\/me\/?(?:\?|$)/.test(path);
  if (
    !isAuthMePath &&
    (res.status === 401 || res.status === 403) &&
    phase !== 'main_fallback' &&
    !unified &&
    kidsTok &&
    mainTok &&
    kidsTok !== mainTok
  ) {
    return kidsFetchKidsOrMainAccess(path, init, 'main_fallback');
  }
  return res;
}

export function kidsClearSession() {
  const wasUnified = localStorage.getItem(KIDS_UNIFIED_MAIN_AUTH_FLAG) === '1';
  localStorage.removeItem(KIDS_TOKEN_STORAGE_KEY);
  localStorage.removeItem(KIDS_REFRESH_STORAGE_KEY);
  localStorage.removeItem(KIDS_UNIFIED_MAIN_AUTH_FLAG);
  if (wasUnified) {
    useAuthStore.getState().logout();
  }
}

/**
 * Yetkili istek; 401’de bir kez refresh dener.
 * Aynı tarayıcıda hem öğrenci Kids JWT hem ana site `access_token` varken (Google girişi + eski Kids
 * oturumu), önce Kids token gider; öğretmen uçları 403 verir — ana site token ile bir kez yeniden dener.
 */
export async function kidsAuthorizedFetch(
  path: string,
  init: RequestInit = {},
  retried = false,
  mainFallback = false,
): Promise<Response> {
  const unified = localStorage.getItem(KIDS_UNIFIED_MAIN_AUTH_FLAG) === '1';
  const kidsTok = (localStorage.getItem(KIDS_TOKEN_STORAGE_KEY) || '').trim();
  const mainTok = (localStorage.getItem(MAIN_SITE_ACCESS_STORAGE_KEY) || '').trim();

  const token = (mainFallback && mainTok ? mainTok : getEffectiveKidsAccessToken()).trim();
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

  if (res.status === 401 && !retried && token) {
    const ok = await tryRefresh();
    if (ok) return kidsAuthorizedFetch(path, init, true, mainFallback);
    if (!mainFallback && !unified && mainTok && kidsTok && kidsTok !== mainTok) {
      return kidsAuthorizedFetch(path, init, false, true);
    }
    kidsClearSession();
    return res;
  }

  const isAuthMePath = /^\/auth\/me\/?(?:\?|$)/.test(path);
  if (
    !isAuthMePath &&
    (res.status === 401 || res.status === 403) &&
    !mainFallback &&
    !unified &&
    kidsTok &&
    mainTok &&
    kidsTok !== mainTok
  ) {
    return kidsAuthorizedFetch(path, init, retried, true);
  }
  return res;
}

export async function kidsLogin(identifier: string, password: string) {
  const idTrim = identifier.trim();
  const res = await fetch(kidsApiUrl('/auth/login/'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: idTrim, email: idTrim, password }),
  });
  const text = await res.text();
  const data = readJson<{ access?: string; refresh?: string; user?: KidsUser } & ApiErrorBody>(text);
  if (!res.ok) {
    throw new Error(kidsFirstApiErrorMessage(data, 'Giriş başarısız'));
  }
  const tokenKind = (data as { token_kind?: string }).token_kind;
  kidsApplySessionFromAuthResponse({
    access: data?.access,
    refresh: data?.refresh,
    token_kind: tokenKind,
  });
  if (tokenKind === 'main_site' && data?.access) {
    await kidsSyncMainSiteAuthStore();
  }
  return data as { access: string; refresh: string; user: KidsUser; token_kind?: string };
}

/** Veli / öğretmen / staff: ana site `/auth/login/` ile giriş; token hem Marifetli hem Kids API için aynı. */
export async function kidsLoginViaMainSiteApi(email: string, password: string): Promise<KidsUser> {
  const em = email.trim();
  const res = await fetch(`${MAIN_SITE_API_BASE}/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: em, password }),
  });
  const text = await res.text();
  const data = readJson<{ access?: string; refresh?: string; user?: MainSiteUser } & ApiErrorBody>(
    text,
  );
  if (!res.ok) {
    throw new Error(kidsFirstApiErrorMessage(data, 'Giriş başarısız'));
  }
  const access = data?.access;
  const refresh = data?.refresh;
  const mainUser = data?.user;
  if (!access || !mainUser) {
    throw new Error('Yanıt eksik');
  }

  useAuthStore.getState().setAuth(mainUser, access);
  if (refresh) {
    localStorage.setItem('refresh_token', refresh);
  }
  kidsApplySessionFromAuthResponse({
    access,
    refresh,
    token_kind: 'main_site',
  });

  try {
    return await kidsMe();
  } catch {
    kidsClearSession();
    throw new Error(
      'Bu hesapla Kids bölümüne giriş yetkiniz yok. Öğretmen veya veli ataması için yöneticiye danışın.',
    );
  }
}

/** Veli oturumu: bağlı çocuğun öğrenci JWT’sine geç (çocuğun e-postası / kullanıcı adı gerekmez). */
export async function kidsParentSwitchToStudent(studentId: number): Promise<KidsUser> {
  const res = await kidsAuthorizedFetch('/auth/parent/switch-student/', {
    method: 'POST',
    body: JSON.stringify({ student_id: studentId }),
  });
  const text = await res.text();
  const data = readJson<{ access?: string; refresh?: string; user?: KidsUser } & ApiErrorBody>(text);
  if (!res.ok) {
    throw new Error(kidsFirstApiErrorMessage(data, 'Çocuk hesabına geçilemedi'));
  }
  kidsApplySessionFromAuthResponse({
    access: data?.access,
    refresh: data?.refresh,
    token_kind: 'kids',
  });
  if (!data?.user) throw new Error('Yanıt eksik');
  return data.user;
}

/** Veli paneli: tüm bağlı çocukların özetleri. */
export async function kidsParentChildrenOverview(): Promise<{ children: KidsParentChildOverview[] }> {
  const res = await kidsAuthorizedFetch('/parent/children-overview/', { method: 'GET' });
  const text = await res.text();
  const data = readJson<{ children?: KidsParentChildOverview[] } & ApiErrorBody>(text);
  if (!res.ok) {
    throw new Error(kidsFirstApiErrorMessage(data, 'Özet yüklenemedi'));
  }
  return { children: data?.children ?? [] };
}

export type KidsGame = {
  id: number;
  title: string;
  slug: string;
  description: string;
  instructions: string;
  min_grade: number;
  max_grade: number;
  difficulty: 'easy' | 'medium' | 'hard';
  is_active: boolean;
  sort_order: number;
  progress?: {
    current_difficulty: 'easy' | 'medium' | 'hard';
    streak_count: number;
    best_score: number;
    daily_quest_completed_today: boolean;
    daily_quest_target_score: number;
  };
};

export type KidsParentGamePolicy = {
  student: number;
  daily_minutes_limit: number;
  allowed_start_time: string | null;
  allowed_end_time: string | null;
  blocked_game_ids: number[];
  updated_at: string;
};

export type KidsGameSession = {
  id: number;
  game: KidsGame;
  grade_level: number;
  difficulty: 'easy' | 'medium' | 'hard';
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  score: number;
  progress_percent: number;
  status: 'active' | 'completed' | 'aborted';
  created_at: string;
};

export async function kidsStudentGamesOverview(): Promise<{
  grade_level: number;
  policy: KidsParentGamePolicy;
  today_minutes_played: number;
  games: KidsGame[];
  progresses: {
    game: number;
    current_difficulty: 'easy' | 'medium' | 'hard';
    streak_count: number;
    last_played_on: string | null;
    daily_quest_completed_on: string | null;
    best_score: number;
  }[];
  daily_quests: {
    game_id: number;
    difficulty: 'easy' | 'medium' | 'hard';
    score_target: number;
    completed_today: boolean;
    streak_count: number;
  }[];
}> {
  const res = await kidsAuthorizedFetch('/student/games/', { method: 'GET' });
  const text = await res.text();
  const data = readJson<{
    grade_level?: number;
    policy?: KidsParentGamePolicy;
    today_minutes_played?: number;
    games?: KidsGame[];
    progresses?: {
      game: number;
      current_difficulty: 'easy' | 'medium' | 'hard';
      streak_count: number;
      last_played_on: string | null;
      daily_quest_completed_on: string | null;
      best_score: number;
    }[];
    daily_quests?: {
      game_id: number;
      difficulty: 'easy' | 'medium' | 'hard';
      score_target: number;
      completed_today: boolean;
      streak_count: number;
    }[];
  } & ApiErrorBody>(text);
  if (!res.ok) throw new Error(kidsFirstApiErrorMessage(data, 'Oyunlar yuklenemedi'));
  return {
    grade_level: Number(data?.grade_level ?? 1),
    policy: (data?.policy as KidsParentGamePolicy) ?? {
      student: 0,
      daily_minutes_limit: 30,
      allowed_start_time: null,
      allowed_end_time: null,
      blocked_game_ids: [],
      updated_at: '',
    },
    today_minutes_played: Number(data?.today_minutes_played ?? 0),
    games: Array.isArray(data?.games) ? data.games : [],
    progresses: Array.isArray(data?.progresses) ? data.progresses : [],
    daily_quests: Array.isArray(data?.daily_quests) ? data.daily_quests : [],
  };
}

export async function kidsGetParentGamePolicy(studentId: number): Promise<KidsParentGamePolicy> {
  const res = await kidsAuthorizedFetch(`/parent/game-policies/${studentId}/`, { method: 'GET' });
  const text = await res.text();
  const data = readJson<KidsParentGamePolicy & ApiErrorBody>(text);
  if (!res.ok) throw new Error(kidsFirstApiErrorMessage(data, 'Kontrol kurali yuklenemedi'));
  return data as KidsParentGamePolicy;
}

export async function kidsParentGamesList(studentId?: number): Promise<{ student_id: number | null; grade_level: number; games: KidsGame[] }> {
  const q =
    typeof studentId === 'number' && Number.isFinite(studentId) && studentId > 0
      ? `?student_id=${encodeURIComponent(String(studentId))}`
      : '';
  const res = await kidsAuthorizedFetch(`/parent/games/${q}`, { method: 'GET' });
  const text = await res.text();
  const data = readJson<{
    student_id?: number | null;
    grade_level?: number;
    games?: (KidsGame & {
      progress?: {
        current_difficulty: 'easy' | 'medium' | 'hard';
        streak_count: number;
        best_score: number;
        daily_quest_completed_today: boolean;
        daily_quest_target_score: number;
      };
    })[];
  } & ApiErrorBody>(text);
  if (!res.ok) throw new Error(kidsFirstApiErrorMessage(data, 'Oyunlar yuklenemedi'));
  return {
    student_id: data?.student_id ?? null,
    grade_level: Number(data?.grade_level ?? 1),
    games: Array.isArray(data?.games) ? data.games : [],
  };
}

export async function kidsUpdateParentGamePolicy(
  studentId: number,
  body: Partial<Pick<KidsParentGamePolicy, 'daily_minutes_limit' | 'allowed_start_time' | 'allowed_end_time' | 'blocked_game_ids'>>,
): Promise<KidsParentGamePolicy> {
  const res = await kidsAuthorizedFetch(`/parent/game-policies/${studentId}/`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const data = readJson<KidsParentGamePolicy & ApiErrorBody>(text);
  if (!res.ok) throw new Error(kidsFirstApiErrorMessage(data, 'Kontrol kurali kaydedilemedi'));
  return data as KidsParentGamePolicy;
}

export async function kidsStartGameSession(
  gameId: number,
  body?: { grade_level?: number; difficulty?: 'easy' | 'medium' | 'hard' },
): Promise<KidsGameSession> {
  const res = await kidsAuthorizedFetch(`/student/games/${gameId}/sessions/start/`, {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
  });
  const text = await res.text();
  const data = readJson<KidsGameSession & ApiErrorBody>(text);
  if (!res.ok) throw new Error(kidsFirstApiErrorMessage(data, 'Oyun baslatilamadi'));
  return data as KidsGameSession;
}

export async function kidsCompleteGameSession(
  sessionId: number,
  body?: { score?: number; progress_percent?: number; status?: 'completed' | 'aborted' },
): Promise<KidsGameSession> {
  const res = await kidsAuthorizedFetch(`/student/game-sessions/${sessionId}/complete/`, {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
  });
  const text = await res.text();
  const data = readJson<KidsGameSession & ApiErrorBody>(text);
  if (!res.ok) throw new Error(kidsFirstApiErrorMessage(data, 'Oturum kapatilamadi'));
  return data as KidsGameSession;
}

export async function kidsMyGameSessions(): Promise<{ sessions: KidsGameSession[] }> {
  const res = await kidsAuthorizedFetch('/student/game-sessions/me/', { method: 'GET' });
  const text = await res.text();
  const data = readJson<{ sessions?: KidsGameSession[] } & ApiErrorBody>(text);
  if (!res.ok) throw new Error(kidsFirstApiErrorMessage(data, 'Oyun gecmisi yuklenemedi'));
  return { sessions: Array.isArray(data?.sessions) ? data.sessions : [] };
}

export async function kidsAdminTeachersList(): Promise<KidsAdminTeacher[]> {
  const res = await kidsFetchKidsOrMainAccess('/admin/teachers/', { method: 'GET' });
  const text = await res.text();
  const data = readJson<{ teachers?: KidsAdminTeacher[] } & ApiErrorBody>(text);
  if (!res.ok) throw new Error(kidsFirstApiErrorMessage(data, 'Öğretmen listesi alınamadı'));
  return data?.teachers ?? [];
}

export async function kidsAdminPatchTeacher(
  id: number,
  payload: { is_active: boolean },
): Promise<KidsAdminTeacher> {
  const res = await kidsFetchKidsOrMainAccess(`/admin/teachers/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  const data = readJson<{ teacher?: KidsAdminTeacher } & ApiErrorBody>(text);
  if (!res.ok) throw new Error(kidsFirstApiErrorMessage(data, 'Öğretmen güncellenemedi'));
  if (!data?.teacher) throw new Error('Yanıt eksik');
  return data.teacher;
}

export type KidsAdminSchoolYearProfile = {
  id: number;
  academic_year: string;
  contracted_student_count: number;
  enrolled_student_count: number;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type KidsAdminSchoolTeacherRow = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  joined_at: string;
};

export type KidsAdminSchoolDetail = KidsSchool & {
  year_profiles: KidsAdminSchoolYearProfile[];
  teachers: KidsAdminSchoolTeacherRow[];
  enrolled_distinct_student_count?: number;
  capacity_remaining?: number;
  demo_is_active?: boolean;
};

export async function kidsAdminSchoolsList(): Promise<KidsAdminSchoolDetail[]> {
  const res = await kidsFetchKidsOrMainAccess('/admin/schools/', { method: 'GET' });
  const text = await res.text();
  const data = readJson<{ schools?: KidsAdminSchoolDetail[] } & ApiErrorBody>(text);
  if (!res.ok) throw new Error(kidsFirstApiErrorMessage(data, 'Okul listesi alınamadı'));
  return data?.schools ?? [];
}

export async function kidsAdminCreateSchool(body: {
  name: string;
  province?: string;
  district?: string;
  neighborhood?: string;
  lifecycle_stage?: 'demo' | 'sales';
  demo_start_at?: string | null;
  demo_end_at?: string | null;
  student_user_cap: number;
  year_profiles?: { academic_year: string; contracted_student_count: number; notes?: string }[];
}): Promise<KidsAdminSchoolDetail> {
  const res = await kidsFetchKidsOrMainAccess('/admin/schools/', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const data = readJson<KidsAdminSchoolDetail & ApiErrorBody>(text);
  if (!res.ok) throw new Error(kidsFirstApiErrorMessage(data, 'Okul oluşturulamadı'));
  return data as KidsAdminSchoolDetail;
}

export async function kidsAdminPatchSchool(
  id: number,
  body: Partial<
    Pick<
      KidsSchool,
      | 'name'
      | 'province'
      | 'district'
      | 'neighborhood'
      | 'lifecycle_stage'
      | 'demo_start_at'
      | 'demo_end_at'
      | 'student_user_cap'
    >
  >,
): Promise<KidsAdminSchoolDetail> {
  const res = await kidsFetchKidsOrMainAccess(`/admin/schools/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const data = readJson<KidsAdminSchoolDetail & ApiErrorBody>(text);
  if (!res.ok) throw new Error(kidsFirstApiErrorMessage(data, 'Okul güncellenemedi'));
  return data as KidsAdminSchoolDetail;
}

export async function kidsAdminDeleteSchool(id: number): Promise<void> {
  const res = await kidsFetchKidsOrMainAccess(`/admin/schools/${id}/`, { method: 'DELETE' });
  if (res.status === 204) return;
  const text = await res.text();
  const data = readJson<ApiErrorBody>(text);
  throw new Error(kidsFirstApiErrorMessage(data, 'Okul silinemedi'));
}

export async function kidsAdminAddSchoolYearProfile(
  schoolId: number,
  body: { academic_year: string; contracted_student_count: number; notes?: string },
): Promise<KidsAdminSchoolYearProfile> {
  const res = await kidsFetchKidsOrMainAccess(`/admin/schools/${schoolId}/year-profiles/`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const data = readJson<KidsAdminSchoolYearProfile & ApiErrorBody>(text);
  if (!res.ok) throw new Error(kidsFirstApiErrorMessage(data, 'Yıl profili eklenemedi'));
  return data as KidsAdminSchoolYearProfile;
}

export async function kidsAdminPatchSchoolYearProfile(
  profileId: number,
  body: Partial<Pick<KidsAdminSchoolYearProfile, 'academic_year' | 'contracted_student_count' | 'notes'>>,
): Promise<KidsAdminSchoolYearProfile> {
  const res = await kidsFetchKidsOrMainAccess(`/admin/school-year-profiles/${profileId}/`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const data = readJson<KidsAdminSchoolYearProfile & ApiErrorBody>(text);
  if (!res.ok) throw new Error(kidsFirstApiErrorMessage(data, 'Kota güncellenemedi'));
  return data as KidsAdminSchoolYearProfile;
}

export async function kidsAdminDeleteSchoolYearProfile(profileId: number): Promise<void> {
  const res = await kidsFetchKidsOrMainAccess(`/admin/school-year-profiles/${profileId}/`, {
    method: 'DELETE',
  });
  if (res.status === 204) return;
  const text = await res.text();
  const data = readJson<ApiErrorBody>(text);
  throw new Error(kidsFirstApiErrorMessage(data, 'Profil silinemedi'));
}

export async function kidsAdminAssignSchoolTeacher(
  schoolId: number,
  teacherUserId: number,
): Promise<KidsAdminSchoolDetail> {
  const res = await kidsFetchKidsOrMainAccess(`/admin/schools/${schoolId}/teachers/`, {
    method: 'POST',
    body: JSON.stringify({ teacher_user_id: teacherUserId }),
  });
  const text = await res.text();
  const data = readJson<KidsAdminSchoolDetail & ApiErrorBody>(text);
  if (!res.ok) throw new Error(kidsFirstApiErrorMessage(data, 'Öğretmen atanamadı'));
  return data as KidsAdminSchoolDetail;
}

export async function kidsAdminRemoveSchoolTeacher(
  schoolId: number,
  teacherUserId: number,
): Promise<KidsAdminSchoolDetail> {
  const res = await kidsFetchKidsOrMainAccess(`/admin/schools/${schoolId}/teachers/${teacherUserId}/`, {
    method: 'DELETE',
  });
  const text = await res.text();
  const data = readJson<KidsAdminSchoolDetail & ApiErrorBody>(text);
  if (!res.ok) throw new Error(kidsFirstApiErrorMessage(data, 'Öğretmen çıkarılamadı'));
  return data as KidsAdminSchoolDetail;
}

export async function kidsAdminCreateTeacher(payload: {
  email: string;
  first_name?: string;
  last_name?: string;
  /** Bu okul kimliklerine üyelik eklenir (öğretmen oluşturulurken). */
  school_ids?: number[];
}): Promise<{ teacher: KidsAdminTeacher; email_sent: boolean; email_error?: string | null; temporary_password?: string | null }> {
  const res = await kidsFetchKidsOrMainAccess('/admin/teachers/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  const data = readJson<
    {
      teacher?: KidsAdminTeacher;
      email_sent?: boolean;
      email_error?: string | null;
      temporary_password?: string | null;
    } & ApiErrorBody
  >(text);
  if (!res.ok) throw new Error(kidsFirstApiErrorMessage(data, 'Öğretmen oluşturulamadı'));
  if (!data?.teacher) throw new Error('Yanıt eksik');
  return {
    teacher: data.teacher,
    email_sent: Boolean(data.email_sent),
    email_error: data.email_error ?? null,
    temporary_password: data.temporary_password ?? null,
  };
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
    throw new Error(kidsFirstApiErrorMessage(data, 'İstek gönderilemedi'));
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
    throw new Error(kidsFirstApiErrorMessage(data, 'Şifre güncellenemedi'));
  }
}

export type KidsTeacherAppConfig = {
  invite_email_enabled: boolean;
  /** False iken öğretmen challenge’da “video ile teslim” seçemez. */
  assignment_video_enabled: boolean;
};

/** Öğretmen Kids arayüzü: sunucu .env ile açılıp kapanan özellikler. */
export async function kidsTeacherAppConfig(): Promise<KidsTeacherAppConfig> {
  const res = await kidsAuthorizedFetch('/config/', { method: 'GET' });
  if (!res.ok) throw new Error('Ayarlar yüklenemedi');
  return res.json() as Promise<KidsTeacherAppConfig>;
}

export async function kidsMe(): Promise<KidsUser> {
  const res = await kidsFetchKidsOrMainAccess('/auth/me/', { method: 'GET' });
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

/** Öğrenci challenge teslim görseli (JPEG/PNG/WebP; boyut üst sınırı sunucuda, varsayılan ~25 MB). */
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

export async function kidsAdminCreateMebSchool(body: {
  province: string;
  district: string;
  name: string;
}): Promise<{ school: MebSchoolPick; created: boolean }> {
  const res = await kidsAuthorizedFetch('/admin/meb-schools/manual/', {
    method: 'POST',
    body: JSON.stringify({
      province: body.province.trim(),
      district: body.district.trim(),
      name: body.name.trim(),
    }),
  });
  const text = await res.text();
  const data = readJson<
    { school?: MebSchoolPick; created?: boolean; detail?: string } & ApiErrorBody
  >(text);
  if (!res.ok) {
    throw new Error(
      (typeof data?.detail === 'string' && data.detail) ||
        'MEB listesine okul eklenemedi',
    );
  }
  if (!data?.school) {
    throw new Error('MEB okul kaydı yanıtı eksik');
  }
  return { school: data.school, created: Boolean(data.created) };
}

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

export async function kidsCreateClass(body: {
  name: string;
  description?: string;
  school_id: number;
  academic_year_label?: string;
}) {
  const res = await kidsAuthorizedFetch('/classes/', {
    method: 'POST',
    body: JSON.stringify({
      name: body.name,
      description: body.description ?? '',
      school_id: body.school_id,
      academic_year_label: body.academic_year_label?.trim() ?? '',
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
  body: Partial<Pick<KidsClass, 'name' | 'description' | 'academic_year_label'>> & { school_id?: number },
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
  if (!res.ok) throw new Error('Challenges yüklenemedi');
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
  round_number?: number;
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

/** Öğretmen: sınıftaki öğrenci teslimleri (challenge başlığı + içerik). */
export type KidsTeacherSubmission = {
  id: number;
  assignment: { id: number; title: string };
  round_number?: number;
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

/** Öğretmen: tek challenge özeti + teslim listesi. */
export async function kidsGetAssignmentSubmissions(
  classId: number,
  assignmentId: number,
): Promise<{
  assignment: KidsAssignment;
  submissions: KidsTeacherSubmission[];
  /** Bu challenge’a henüz teslim göndermemiş kayıtlı öğrenciler (öğretmen paneli). */
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
    throw new Error((data as ApiErrorBody)?.detail || 'Challenge yüklenemedi');
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
    submission_opens_at: string;
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
      submission_rounds: body.submission_rounds ?? 1,
      is_published: body.is_published ?? true,
      submission_opens_at: body.submission_opens_at,
      submission_closes_at: body.submission_closes_at,
    }),
  });
  const text = await res.text();
  const data = readJson<KidsAssignment & ApiErrorBody>(text);
  if (!res.ok) throw new Error(kidsFirstApiErrorMessage(data, 'Challenge oluşturulamadı'));
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
    submission_rounds: number;
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
    throw new Error(kidsFirstApiErrorMessage(data, 'Challenge güncellenemedi'));
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
export { fetchKidsInvitePreview as kidsInvitePreview } from '@/src/lib/kids-invite-public';

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

/** Sınıf içi arkadaş yarışması (KidsChallenge; öğretmen onayı + davet). Öğretmenin verdiği ödevlerden ayrı. */
export type KidsPeerChallengeStatus =
  | 'pending_teacher'
  | 'pending_parent'
  | 'rejected'
  | 'active'
  | 'ended';
export type KidsPeerChallengeSource = 'student' | 'teacher';
export type KidsPeerChallengeScope = 'class_peer' | 'free_parent';

export type KidsPeerChallengeMember = {
  id: number;
  student: KidsUser;
  is_initiator: boolean;
  joined_at: string;
};

export type KidsPeerChallengeOutgoingInvite = {
  id: number;
  invitee: KidsUser;
  created_at: string;
};

export type KidsPeerChallenge = {
  id: number;
  kids_class: number | null;
  kids_class_name: string;
  /** Eski yanıtlarda yok; varsayılan sınıf yarışması. */
  peer_scope?: KidsPeerChallengeScope;
  source: KidsPeerChallengeSource;
  status: KidsPeerChallengeStatus;
  title: string;
  description: string;
  rules_or_goal: string;
  /** Öğretmen ödevindeki gibi: aynı konu altında 1–5 ayrı challenge adımı. */
  submission_rounds?: number;
  created_by_student: number | null;
  teacher_rejection_note: string;
  parent_rejection_note?: string;
  reviewed_at: string | null;
  activated_at: string | null;
  ended_at: string | null;
  /** Öğrenci önerisi: yarışma başlangıcı (ISO). */
  starts_at: string | null;
  /** Öğrenci önerisi: yarışma bitişi (ISO). */
  ends_at: string | null;
  created_at: string;
  members: KidsPeerChallengeMember[];
  /** Giriş yapan öğrencinin bu yarışmada gönderdiği bekleyen davetler (detay / liste). */
  outgoing_pending_invites?: KidsPeerChallengeOutgoingInvite[];
};

export type KidsPeerChallengeInviteRow = {
  id: number;
  challenge: KidsPeerChallenge;
  inviter: KidsUser;
  personal_message: string;
  status: string;
  created_at: string;
  responded_at: string | null;
};

export async function kidsStudentPeerChallengesList(): Promise<{
  challenges: KidsPeerChallenge[];
  pending_invites: KidsPeerChallengeInviteRow[];
  allow_free_parent_challenge: boolean;
}> {
  const res = await kidsAuthorizedFetch('/student/challenges/', { method: 'GET' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as ApiErrorBody)?.detail || 'Yarışmalar yüklenemedi');
  const d = data as {
    challenges?: KidsPeerChallenge[];
    pending_invites?: KidsPeerChallengeInviteRow[];
    allow_free_parent_challenge?: boolean;
  };
  return {
    challenges: Array.isArray(d.challenges) ? d.challenges : [],
    pending_invites: Array.isArray(d.pending_invites) ? d.pending_invites : [],
    allow_free_parent_challenge: d.allow_free_parent_challenge !== false,
  };
}

export async function kidsProposePeerChallenge(body: {
  peer_scope?: KidsPeerChallengeScope;
  kids_class_id?: number | null;
  title: string;
  description?: string;
  rules_or_goal?: string;
  submission_rounds?: number;
  /** ISO 8601 (UTC önerilir) */
  starts_at: string;
  ends_at: string;
}): Promise<KidsPeerChallenge> {
  const scope = body.peer_scope ?? 'class_peer';
  const payload: Record<string, unknown> = {
    peer_scope: scope,
    title: body.title.trim(),
    description: (body.description ?? '').trim(),
    rules_or_goal: (body.rules_or_goal ?? '').trim(),
    submission_rounds: body.submission_rounds ?? 1,
    starts_at: body.starts_at,
    ends_at: body.ends_at,
  };
  if (scope === 'class_peer') {
    payload.kids_class_id = body.kids_class_id;
  }
  const res = await kidsAuthorizedFetch('/student/challenges/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as ApiErrorBody)?.detail || 'Öneri gönderilemedi');
  return data as KidsPeerChallenge;
}

export type KidsParentPendingFreeChallengeItem = {
  challenge: KidsPeerChallenge;
  child: { id: number; first_name: string; last_name: string } | null;
};

/** Veli: bekleyen + geçmiş (bu velinin onayladığı / reddettiği) serbest yarışmalar. */
export async function kidsParentFreeChallengesOverview(): Promise<{
  pending: KidsParentPendingFreeChallengeItem[];
  history: KidsParentPendingFreeChallengeItem[];
}> {
  const res = await kidsAuthorizedFetch('/parent/free-challenges/', { method: 'GET' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as ApiErrorBody)?.detail || 'Serbest yarışmalar yüklenemedi');
  const d = data as {
    pending?: KidsParentPendingFreeChallengeItem[];
    history?: KidsParentPendingFreeChallengeItem[];
  };
  return {
    pending: Array.isArray(d.pending) ? d.pending : [],
    history: Array.isArray(d.history) ? d.history : [],
  };
}

/** Geriye dönük / hafif istemciler: yalnızca bekleyen liste. */
export async function kidsParentPendingFreeChallenges(): Promise<{
  items: KidsParentPendingFreeChallengeItem[];
}> {
  const { pending } = await kidsParentFreeChallengesOverview();
  return { items: pending };
}

export async function kidsParentReviewFreeChallenge(
  challengeId: number,
  body: { decision: 'approve' | 'reject'; rejection_note?: string },
): Promise<KidsPeerChallenge> {
  const res = await kidsAuthorizedFetch(`/parent/free-challenges/${challengeId}/review/`, {
    method: 'POST',
    body: JSON.stringify({
      decision: body.decision,
      rejection_note: (body.rejection_note ?? '').trim(),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as ApiErrorBody)?.detail || 'İşlem yapılamadı');
  return data as KidsPeerChallenge;
}

export async function kidsGetPeerChallenge(id: number): Promise<KidsPeerChallenge> {
  const res = await kidsAuthorizedFetch(`/student/challenges/${id}/`, { method: 'GET' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as ApiErrorBody)?.detail || 'Yarışma bulunamadı');
  return data as KidsPeerChallenge;
}

export async function kidsInvitePeerChallenge(
  challengeId: number,
  body: { invitee_user_id: number; personal_message?: string },
): Promise<KidsPeerChallengeInviteRow> {
  const res = await kidsAuthorizedFetch(`/student/challenges/${challengeId}/invite/`, {
    method: 'POST',
    body: JSON.stringify({
      invitee_user_id: body.invitee_user_id,
      personal_message: (body.personal_message ?? '').trim(),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as ApiErrorBody)?.detail || 'Davet gönderilemedi');
  return data as KidsPeerChallengeInviteRow;
}

export type KidsPeerChallengeBulkInviteResult = {
  bulk: true;
  invited_count: number;
  skipped_already_in_challenge: number;
  skipped_pending_invite: number;
  skipped_other: number;
};

/** Aynı sınıftaki tüm arkadaşlara (kendin ve zaten üyeler hariç) davet bildirimi gönderir. */
export async function kidsInviteAllClassmatesToPeerChallenge(
  challengeId: number,
  body: { personal_message?: string },
): Promise<KidsPeerChallengeBulkInviteResult> {
  const res = await kidsAuthorizedFetch(`/student/challenges/${challengeId}/invite/`, {
    method: 'POST',
    body: JSON.stringify({
      invite_all_classmates: true,
      personal_message: (body.personal_message ?? '').trim(),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as ApiErrorBody)?.detail || 'Toplu davet gönderilemedi');
  }
  return data as KidsPeerChallengeBulkInviteResult;
}

export async function kidsRespondPeerChallengeInvite(
  inviteId: number,
  action: 'accept' | 'decline',
): Promise<{ kind: 'declined' } | { kind: 'accepted'; challenge: KidsPeerChallenge }> {
  const res = await kidsAuthorizedFetch(`/student/challenge-invites/${inviteId}/respond/`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as ApiErrorBody)?.detail || 'Yanıt verilemedi');
  if (action === 'decline' || (data as { status?: string }).status === 'declined') {
    return { kind: 'declined' };
  }
  return { kind: 'accepted', challenge: data as KidsPeerChallenge };
}

/** Daveti gönderen öğrenci, karşı taraf kabul etmeden geri çeker. */
export async function kidsRevokePeerChallengeInvite(inviteId: number): Promise<void> {
  const res = await kidsAuthorizedFetch(`/student/challenge-invites/${inviteId}/revoke/`, { method: 'POST' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as ApiErrorBody)?.detail || 'Davet geri alınamadı');
}

export async function kidsClassmates(classId: number): Promise<KidsUser[]> {
  const res = await kidsAuthorizedFetch(`/classes/${classId}/classmates/`, { method: 'GET' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as ApiErrorBody)?.detail || 'Sınıf arkadaşları yüklenemedi');
  const d = data as { classmates?: KidsUser[] };
  return Array.isArray(d.classmates) ? d.classmates : [];
}

export async function kidsTeacherClassPeerChallenges(
  classId: number,
  status?: string,
): Promise<KidsPeerChallenge[]> {
  const q = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await kidsAuthorizedFetch(`/classes/${classId}/challenges/${q}`, { method: 'GET' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as ApiErrorBody)?.detail || 'Yarışmalar yüklenemedi');
  const d = data as { challenges?: KidsPeerChallenge[] };
  return Array.isArray(d.challenges) ? d.challenges : [];
}

export async function kidsTeacherReviewPeerChallenge(
  classId: number,
  challengeId: number,
  body: { decision: 'approve' | 'reject'; rejection_note?: string },
): Promise<KidsPeerChallenge> {
  const res = await kidsAuthorizedFetch(`/classes/${classId}/challenges/${challengeId}/review/`, {
    method: 'POST',
    body: JSON.stringify({
      decision: body.decision,
      rejection_note: (body.rejection_note ?? '').trim(),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as ApiErrorBody)?.detail || 'İşlem yapılamadı');
  return data as KidsPeerChallenge;
}

export async function kidsCreateSubmission(body: {
  assignment: number;
  /** 1..assignment.submission_rounds */
  round_number?: number;
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

export type KidsAssignmentRoundSlot = {
  round_number: number;
  submission: KidsSubmissionRecord | null;
};

/** Öğrenci: bu konu için tüm turlar (Challenge 1…N) ve her birinin teslimi. */
export async function kidsGetSubmissionRoundsForAssignment(assignmentId: number): Promise<{
  submission_rounds: number;
  rounds: KidsAssignmentRoundSlot[];
}> {
  const q = new URLSearchParams({ assignment_id: String(assignmentId) });
  const res = await kidsAuthorizedFetch(`/student/submissions/for-assignment/?${q}`, {
    method: 'GET',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as ApiErrorBody)?.detail || 'Teslim bilgisi alınamadı');
  }
  const payload = data as {
    submission_rounds?: number;
    rounds?: KidsAssignmentRoundSlot[];
  };
  return {
    submission_rounds: payload.submission_rounds ?? 1,
    rounds: Array.isArray(payload.rounds) ? payload.rounds : [],
  };
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

export type KidsNotificationType =
  | 'kids_new_assignment'
  | 'kids_submission_received'
  | 'kids_challenge_pending_teacher'
  | 'kids_challenge_pending_parent'
  | 'kids_challenge_approved'
  | 'kids_challenge_rejected'
  | 'kids_challenge_invite';

export type KidsNotificationRow = {
  id: number;
  notification_type: KidsNotificationType | string;
  message: string;
  is_read: boolean;
  created_at: string;
  assignment: number | null;
  submission: number | null;
  challenge?: number | null;
  challenge_invite?: number | null;
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
