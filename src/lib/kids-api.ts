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

/** `none`: ana sitede hesap var, kids_portal_role atanmamış — Kids öğretmen/veli API izni yok. */
export type KidsUserRole = 'admin' | 'teacher' | 'parent' | 'student' | 'none';
export type KidsLanguageCode = 'tr' | 'en' | 'ge';

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
  id?: number;
  title: string;
  status: string;
  class_name: string;
  /** Sunucu yanıtında olabilir: serbest yarışmada `free_parent`. */
  peer_scope?: string;
  is_initiator: boolean;
  joined_at?: string | null;
};

export type KidsParentHomeworkHistoryRow = {
  submission_id: number;
  homework_id: number;
  title: string;
  description: string;
  class_name: string;
  teacher_display: string;
  teacher_subject: string;
  status:
    | 'published'
    | 'student_done'
    | 'parent_approved'
    | 'parent_rejected'
    | 'teacher_approved'
    | 'teacher_revision';
  due_at: string | null;
  student_done_at: string | null;
  student_note: string;
  parent_reviewed_at: string | null;
  parent_note: string;
  teacher_reviewed_at: string | null;
  teacher_note: string;
  attachments: {
    id: number;
    url: string;
    original_name: string;
    content_type: string;
    size_bytes: number;
  }[];
  submission_attachments: {
    id: number;
    url: string;
    original_name: string;
    content_type: string;
    size_bytes: number;
  }[];
};

export type KidsParentTestAttemptSummary = {
  attempt_id: number;
  test_id: number;
  title: string;
  class_name: string;
  submitted_at: string | null;
  score: number;
  total_questions: number;
  total_correct: number;
  total_wrong: number;
  auto_submitted: boolean;
};

export type KidsParentChildOverview = {
  id: number;
  first_name: string;
  last_name: string;
  student_login_name: string | null;
  growth_points: number;
  growth_stage: KidsGrowthStage | null;
  classes: {
    id: number;
    name: string;
    /** Anaokulu / anasınıfı günlükleri için; yoksa sınıf adından çıkarım. */
    class_kind?: 'standard' | 'kindergarten' | 'anasinifi';
    school_name: string;
    teacher_user_id: number;
    teacher_display: string;
    teachers?: {
      teacher_user_id: number;
      teacher_display: string;
      subject: string;
      is_primary: boolean;
    }[];
  }[];
  badges: KidsParentBadge[];
  assignments_recent: KidsParentAssignmentRow[];
  challenges: KidsParentChallengeRow[];
  homework_history: KidsParentHomeworkHistoryRow[];
  /** Tamamlanmış test denemeleri (veli özeti); backend yoksa boş dizi. */
  test_attempts_history?: KidsParentTestAttemptSummary[];
  pending_parent_actions: {
    type: 'homework_parent_review';
    submission_id: number;
    assignment_id: number;
    assignment_title: string;
    class_name: string;
    round_number: number;
    student_marked_done_at: string | null;
    submission_attachments: {
      id: number;
      url: string;
      original_name: string;
      content_type: string;
      size_bytes: number;
    }[];
  }[];
};

export type KidsAdminTeacher = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  subject: string;
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
  preferred_language?: KidsLanguageCode | null;
  effective_language?: KidsLanguageCode;
  language_locked_by_teacher?: boolean;
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
  default_academic_year_label?: string;
  created_at: string;
  updated_at: string;
};

/** Sınıf içi ders dökümanı klasörü. */
export type KidsClassDocumentFolder = {
  id: number;
  parent_id?: number | null;
  name: string;
  document_count: number;
  subfolder_count?: number;
};

/** Öğretmen paneli: aynı klasör adı farklı sınıflarda birleştirilmiş özet. */
export type KidsTeacherFolderGrouped = {
  name: string;
  document_count: number;
  total_size_bytes: number;
  class_names: string[];
};

export type KidsTeacherFolderFlat = {
  id: number;
  kids_class_id: number;
  parent_id?: number | null;
  class_name: string;
  name: string;
  document_count: number;
  total_size_bytes: number;
};

/** Öğretmenin sınıfa dağıttığı ders dökümanı (PDF / DOCX / görsel). */
export type KidsClassDocument = {
  id: number;
  kids_class: number;
  class_name: string;
  folder_id: number | null;
  folder_name: string;
  folder_path?: string;
  title: string;
  description: string;
  file_url: string;
  original_name: string;
  content_type: string;
  size_bytes: number;
  file_kind: string;
  created_at: string;
  updated_at: string;
};

/** Okul öncesi (`anasinifi`) ve eski kayıtlar (`kindergarten`): günlük devam / yemek / uyku (aynı API). */
export type KidsClassKind = 'standard' | 'kindergarten' | 'anasinifi';

export type KidsClass = {
  id: number;
  name: string;
  description: string;
  /** Örn. `2024-2025`; yeni eğitim yılında sınıfları ayırt etmek için (isteğe bağlı). */
  academic_year_label?: string;
  language?: KidsLanguageCode;
  class_kind?: KidsClassKind;
  /** Her sınıf mutlaka bir okula bağlıdır; adres bilgisi okul kaydındadır. */
  school: KidsSchool;
  teacher: number;
  teacher_email: string;
  teachers?: {
    teacher_user_id: number;
    teacher_display: string;
    subject: string;
    is_primary: boolean;
  }[];
  /** Kayıtlı öğrenci sayısı (enrollment). */
  student_count?: number;
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

/** Öğretmen paneli: anasınıfı satır değeri (1–12 dışı). Eski `Anaokulu-X` adları da buna eşlenir. */
export const KIDS_CLASS_SPECIAL_GRADE = {
  PRE_PRIMARY: '__as__',
} as const;

/** Yalnızca 1–12; anaokulu/anasınıfı seçenekleri arayüzde bu dizinin üstüne eklenir. */
export const KIDS_CLASS_NUMERIC_GRADE_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const n = i + 1;
  return { value: String(n), label: `${n}. sınıf` };
});

/** @deprecated Yalnızca sayısal sınıflar; tam liste için `KIDS_CLASS_NUMERIC_GRADE_OPTIONS` + özel satırlar kullanın. */
export const KIDS_CLASS_GRADE_OPTIONS = KIDS_CLASS_NUMERIC_GRADE_OPTIONS;

export const KIDS_CLASS_SECTION_OPTIONS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((L) => ({
  value: L,
  label: `Şube ${L}`,
}));

/** Standart `4-B` veya `4-B Sınıfı` adını parçala; şube yalnızca A–Z ise döner. */
export function kidsParseStandardClassName(
  name: string,
): { grade: string; section: string; suffix?: string } | null {
  const t = name.trim();
  const mKg = /^Anaokulu-([A-Za-z])(?:\s+(.*))?$/.exec(t);
  if (mKg) {
    const suffix = (mKg[2] || '').trim();
    return {
      grade: KIDS_CLASS_SPECIAL_GRADE.PRE_PRIMARY,
      section: mKg[1].toUpperCase(),
      ...(suffix ? { suffix } : {}),
    };
  }
  const mAsTr = /^Anasınıfı-([A-Za-z])(?:\s+(.*))?$/u.exec(t);
  if (mAsTr) {
    const suffix = (mAsTr[2] || '').trim();
    return {
      grade: KIDS_CLASS_SPECIAL_GRADE.PRE_PRIMARY,
      section: mAsTr[1].toUpperCase(),
      ...(suffix ? { suffix } : {}),
    };
  }
  const mAsAscii = /^Anasinifi-([A-Za-z])(?:\s+(.*))?$/i.exec(t);
  if (mAsAscii) {
    const suffix = (mAsAscii[2] || '').trim();
    return {
      grade: KIDS_CLASS_SPECIAL_GRADE.PRE_PRIMARY,
      section: mAsAscii[1].toUpperCase(),
      ...(suffix ? { suffix } : {}),
    };
  }
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

/** Öğretmen paneli: `Anasınıfı-A` veya `4-A` biçiminde sınıf adı. */
export function kidsBuildTeacherPanelClassName(grade: string, section: string, suffix?: string): string {
  const g = (grade || '').trim();
  if (g === KIDS_CLASS_SPECIAL_GRADE.PRE_PRIMARY) {
    const s = (section || '').trim().toUpperCase();
    const core = `Anasınıfı-${s}`;
    const rest = (suffix || '').trim();
    return rest ? `${core} ${rest}` : core;
  }
  return kidsBuildStandardClassName(grade, section, suffix);
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
  class_name?: string;
  teacher_display?: string;
  teacher_subject?: string;
  title: string;
  purpose: string;
  materials: string;
  video_max_seconds: 60 | 120 | 180;
  require_image: boolean;
  require_video: boolean;
  /** Aynı konu başlığı altında kaç ayrı teslim (Challenge 1…N). */
  submission_rounds?: number;
  /** Öğretmen listesinde kart üst bandı / etiket teması; boşsa istemci id’ye göre renk seçer. */
  challenge_card_theme?: 'art' | 'science' | 'motion' | 'music' | null;
  is_published: boolean;
  peer_submissions_visible?: boolean;
  /** Öğrencilere “yeni challenge” bildiriminin gittiği zaman (planlı challenge’larda başlangıçtan sonra dolur). */
  students_notified_at?: string | null;
  /** Boş veya null: yayınlandığı andan itibaren teslim (başlangıç kısıtı yok). ISO 8601. */
  submission_opens_at?: string | null;
  /** Son teslim anı (ISO 8601). Yeni challenge’larda zorunlu. */
  submission_closes_at?: string | null;
  recurrence_type?: 'none' | 'daily' | 'weekly';
  recurrence_interval?: number;
  recurrence_until?: string | null;
  allow_late_submissions?: boolean;
  late_grace_hours?: number;
  late_penalty_percent?: number;
  rubric_schema?: { id?: string; label: string; max_points: number; weight?: number }[];
  due_soon_notified_at?: string | null;
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

export type KidsAchievementCertificate = {
  period_key: 'weekly' | 'monthly';
  period_label: string;
  title: string;
  start_date: string;
  target_count: number;
  challenge_count: number;
  homework_count: number;
  total_count: number;
  progress_percent: number;
  earned: boolean;
  level: 'starter' | 'bronze' | 'silver' | 'gold';
  message: string;
  last_earned_at: string | null;
};

export type KidsHomework = {
  id: number;
  kids_class: number;
  class_name?: string;
  teacher_display?: string;
  teacher_subject?: string;
  title: string;
  description: string;
  page_start: number | null;
  page_end: number | null;
  due_at: string | null;
  is_published: boolean;
  attachments?: {
    id: number;
    url: string;
    original_name: string;
    content_type: string;
    size_bytes: number;
    created_at: string | null;
  }[];
  created_at: string;
  updated_at: string;
};

export type KidsHomeworkSubmission = {
  id: number;
  homework: KidsHomework;
  student: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    created_at: string;
    profile_picture: string | null;
    student_login_name?: string | null;
  };
  status:
    | 'published'
    | 'student_done'
    | 'parent_approved'
    | 'parent_rejected'
    | 'teacher_approved'
    | 'teacher_revision';
  student_done_at: string | null;
  student_note: string;
  parent_reviewed_at: string | null;
  parent_note: string;
  teacher_reviewed_at: string | null;
  teacher_note: string;
  attachments: {
    id: number;
    url: string;
    original_name: string;
    content_type: string;
    size_bytes: number;
    created_at: string | null;
  }[];
  created_at: string;
  updated_at: string;
  /** Yalnızca `mark-done` PATCH yanıtında: işlem öncesi/sonrası büyüme puanı. */
  growth_points_before?: number;
  growth_points_after?: number;
  growth_points_delta?: number;
};

export type KidsHomeworkSubmissionOverview = {
  homework: KidsHomework;
  summary: {
    total: number;
    submitted: number;
    not_submitted: number;
    status_counts: Record<string, number>;
  };
  submissions: KidsHomeworkSubmission[];
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
    student_login_name?: string | null;
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
  const hadMainToken = Boolean((localStorage.getItem(MAIN_SITE_ACCESS_STORAGE_KEY) || '').trim());
  localStorage.removeItem(KIDS_TOKEN_STORAGE_KEY);
  localStorage.removeItem(KIDS_REFRESH_STORAGE_KEY);
  localStorage.removeItem(KIDS_UNIFIED_MAIN_AUTH_FLAG);
  // Kids çıkışında ana site JWT de temizlenir; refresh ile otomatik geri giriş engellenir.
  localStorage.removeItem(MAIN_SITE_ACCESS_STORAGE_KEY);
  localStorage.removeItem('refresh_token');
  if (hadMainToken) {
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

export async function kidsParentVerifyPassword(password: string): Promise<void> {
  const res = await kidsAuthorizedFetch('/auth/parent/verify-password/', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
  const text = await res.text();
  const data = readJson<ApiErrorBody>(text);
  if (!res.ok) {
    throw new Error(kidsFirstApiErrorMessage(data, 'Şifre doğrulanamadı'));
  }
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
  payload: { is_active?: boolean; subject?: string },
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

export async function kidsAdminResendTeacherWelcome(
  id: number,
): Promise<{ email_sent: boolean; email_error: string | null; temporary_password: string | null }> {
  const res = await kidsFetchKidsOrMainAccess(`/admin/teachers/${id}/resend-welcome/`, {
    method: 'POST',
  });
  const text = await res.text();
  const data = readJson<
    { email_sent?: boolean; email_error?: string | null; temporary_password?: string | null } & ApiErrorBody
  >(text);
  if (!res.ok) throw new Error(kidsFirstApiErrorMessage(data, 'Mail tekrar gönderilemedi'));
  return {
    email_sent: Boolean(data?.email_sent),
    email_error: data?.email_error ?? null,
    temporary_password: data?.temporary_password ?? null,
  };
}

export type KidsAdminSubject = {
  id: number;
  name: string;
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
};

export type KidsAdminAchievementSettings = {
  code: string;
  weekly_certificate_target: number;
  monthly_certificate_target: number;
  updated_at: string;
};

export async function kidsAdminSubjectsList(): Promise<KidsAdminSubject[]> {
  const res = await kidsFetchKidsOrMainAccess('/admin/subjects/', { method: 'GET' });
  const text = await res.text();
  const data = readJson<{ subjects?: KidsAdminSubject[] } & ApiErrorBody>(text);
  if (!res.ok) throw new Error(kidsFirstApiErrorMessage(data, 'Branş listesi alınamadı'));
  return data?.subjects ?? [];
}

export async function kidsAdminCreateSubject(body: { name: string; is_active?: boolean }): Promise<KidsAdminSubject> {
  const res = await kidsFetchKidsOrMainAccess('/admin/subjects/', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const data = readJson<KidsAdminSubject & ApiErrorBody>(text);
  if (!res.ok) throw new Error(kidsFirstApiErrorMessage(data, 'Branş eklenemedi'));
  return data as KidsAdminSubject;
}

export async function kidsAdminPatchSubject(
  id: number,
  body: { name?: string; is_active?: boolean },
): Promise<KidsAdminSubject> {
  const res = await kidsFetchKidsOrMainAccess(`/admin/subjects/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const data = readJson<KidsAdminSubject & ApiErrorBody>(text);
  if (!res.ok) throw new Error(kidsFirstApiErrorMessage(data, 'Branş güncellenemedi'));
  return data as KidsAdminSubject;
}

export async function kidsAdminGetAchievementSettings(): Promise<KidsAdminAchievementSettings> {
  const res = await kidsFetchKidsOrMainAccess('/admin/achievement-settings/', { method: 'GET' });
  const text = await res.text();
  const data = readJson<KidsAdminAchievementSettings & ApiErrorBody>(text);
  if (!res.ok) throw new Error(kidsFirstApiErrorMessage(data, 'Sertifika ayarları alınamadı'));
  return data as KidsAdminAchievementSettings;
}

export async function kidsAdminPatchAchievementSettings(
  body: Partial<Pick<KidsAdminAchievementSettings, 'weekly_certificate_target' | 'monthly_certificate_target'>>,
): Promise<KidsAdminAchievementSettings> {
  const res = await kidsFetchKidsOrMainAccess('/admin/achievement-settings/', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const data = readJson<KidsAdminAchievementSettings & ApiErrorBody>(text);
  if (!res.ok) throw new Error(kidsFirstApiErrorMessage(data, 'Sertifika ayarları güncellenemedi'));
  return data as KidsAdminAchievementSettings;
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
  subject: string;
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

export async function kidsPatchMe(body: {
  first_name?: string;
  last_name?: string;
  preferred_language?: KidsLanguageCode;
}): Promise<KidsUser> {
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

const DOC_MAX_BYTES = 20 * 1024 * 1024;

export async function kidsDistributeClassDocuments(body: {
  title: string;
  description?: string;
  class_ids: number[];
  file: File;
  /** Örn. "Matematik/Ünite 1" — her sınıfta zincir oluşturulur. */
  folder_path?: string;
  /** @deprecated folder_path kullanın; tek segment için de olur. */
  folder_name?: string;
}): Promise<KidsClassDocument[]> {
  if (!body.file || body.file.size <= 0) throw new Error('Dosya seçin.');
  if (body.file.size > DOC_MAX_BYTES) throw new Error('Dosya en fazla 20 MB olabilir.');
  if (!body.class_ids.length) throw new Error('En az bir sınıf seçin.');
  const fd = new FormData();
  fd.append('title', body.title.trim());
  fd.append('description', (body.description ?? '').trim());
  fd.append('class_ids', JSON.stringify(body.class_ids));
  const path = (body.folder_path ?? body.folder_name ?? '').trim();
  if (path) fd.append('folder_path', path);
  fd.append('file', body.file);
  const res = await kidsAuthorizedFetch('/teacher/documents/distribute/', { method: 'POST', body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as ApiErrorBody)?.detail || 'Döküman dağıtılamadı');
  return data as KidsClassDocument[];
}

export async function kidsTeacherRecentDocuments(limit = 30): Promise<KidsClassDocument[]> {
  const res = await kidsAuthorizedFetch(`/teacher/documents/recent/?limit=${limit}`, { method: 'GET' });
  if (!res.ok) throw new Error('Dökümanlar yüklenemedi');
  return res.json() as Promise<KidsClassDocument[]>;
}

export async function kidsTeacherFoldersOverview(): Promise<{
  grouped: KidsTeacherFolderGrouped[];
  flat: KidsTeacherFolderFlat[];
}> {
  const res = await kidsAuthorizedFetch('/teacher/documents/folder-overview/', { method: 'GET' });
  if (!res.ok) throw new Error('Klasör özeti yüklenemedi');
  return res.json() as Promise<{ grouped: KidsTeacherFolderGrouped[]; flat: KidsTeacherFolderFlat[] }>;
}

export async function kidsCreateClassDocumentFolder(
  classId: number,
  name: string,
  options?: { parentId?: number | null },
): Promise<KidsClassDocumentFolder> {
  const body: { name: string; parent_id?: number } = { name: name.trim() };
  if (options?.parentId != null) body.parent_id = options.parentId;
  const res = await kidsAuthorizedFetch(`/classes/${classId}/document-folders/`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as ApiErrorBody)?.detail || 'Klasör oluşturulamadı');
  return data as KidsClassDocumentFolder;
}

export async function kidsDeleteClassDocumentFolder(
  classId: number,
  folderId: number,
  options?: { cascade?: boolean },
): Promise<void> {
  const qs = options?.cascade ? '?cascade=1' : '';
  const res = await kidsAuthorizedFetch(`/classes/${classId}/document-folders/${folderId}/${qs}`, {
    method: 'DELETE',
  });
  if (res.status === 204) return;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as ApiErrorBody)?.detail || 'Klasör silinemedi');
}

export async function kidsListClassDocumentFolders(classId: number): Promise<KidsClassDocumentFolder[]> {
  const res = await kidsAuthorizedFetch(`/classes/${classId}/document-folders/`, { method: 'GET' });
  if (!res.ok) throw new Error('Klasörler yüklenemedi');
  return res.json() as Promise<KidsClassDocumentFolder[]>;
}

export type KidsClassDocumentBrowseRow = {
  id: number;
  name: string;
  document_count: number;
  subfolder_count: number;
};

export async function kidsBrowseClassDocuments(
  classId: number,
  folderId?: number | null,
): Promise<{
  breadcrumbs: { id: number | null; name: string }[];
  current_folder_id: number | null;
  folders: KidsClassDocumentBrowseRow[];
  documents: KidsClassDocument[];
}> {
  const q = folderId != null ? `?folder_id=${folderId}` : '';
  const res = await kidsAuthorizedFetch(`/classes/${classId}/document-folders/browse${q}`, {
    method: 'GET',
  });
  if (!res.ok) throw new Error('Klasör içeriği yüklenemedi');
  return res.json() as Promise<{
    breadcrumbs: { id: number | null; name: string }[];
    current_folder_id: number | null;
    folders: KidsClassDocumentBrowseRow[];
    documents: KidsClassDocument[];
  }>;
}

export async function kidsStudentListDocuments(): Promise<KidsClassDocument[]> {
  const res = await kidsAuthorizedFetch('/student/documents/', { method: 'GET' });
  if (!res.ok) throw new Error('Dökümanlar yüklenemedi');
  return res.json() as Promise<KidsClassDocument[]>;
}

export async function kidsPatchClassDocument(
  classId: number,
  documentId: number,
  body: { title?: string; description?: string; folder_id?: number | null; folder_name?: string },
): Promise<KidsClassDocument> {
  const res = await kidsAuthorizedFetch(`/classes/${classId}/documents/${documentId}/`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as ApiErrorBody)?.detail || 'Güncellenemedi');
  return data as KidsClassDocument;
}

export async function kidsDeleteClassDocument(classId: number, documentId: number): Promise<void> {
  const res = await kidsAuthorizedFetch(`/classes/${classId}/documents/${documentId}/`, {
    method: 'DELETE',
  });
  if (res.status === 204) return;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as ApiErrorBody)?.detail || 'Silinemedi');
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
  class_kind?: KidsClassKind;
}) {
  const res = await kidsAuthorizedFetch('/classes/', {
    method: 'POST',
    body: JSON.stringify({
      name: body.name,
      description: body.description ?? '',
      school_id: body.school_id,
      academic_year_label: body.academic_year_label?.trim() ?? '',
      ...(body.class_kind && body.class_kind !== 'standard' ? { class_kind: body.class_kind } : {}),
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
  body: Partial<Pick<KidsClass, 'name' | 'description' | 'academic_year_label' | 'language' | 'class_kind'>> & {
    school_id?: number;
  },
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

export type KidsClassTeacherAssignment = {
  teacher_user_id: number;
  teacher_display: string;
  subject: string;
  is_active: boolean;
  assigned_at: string;
};

export type KidsSchoolDirectoryClassRow = {
  id: number;
  name: string;
  description: string;
  academic_year_label: string;
  teacher_display: string;
  is_assigned: boolean;
};

export async function kidsListClassTeachers(classId: number): Promise<KidsClassTeacherAssignment[]> {
  const res = await kidsAuthorizedFetch(`/classes/${classId}/teachers/`, { method: 'GET' });
  if (!res.ok) throw new Error('Sınıf öğretmenleri alınamadı');
  return res.json() as Promise<KidsClassTeacherAssignment[]>;
}

export async function kidsAddClassTeacher(
  classId: number,
  body: { teacher_user_id: number; subject: string; is_active?: boolean },
): Promise<KidsClassTeacherAssignment> {
  const res = await kidsAuthorizedFetch(`/classes/${classId}/teachers/`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const data = readJson<KidsClassTeacherAssignment & ApiErrorBody>(text);
  if (!res.ok) throw new Error(kidsFirstApiErrorMessage(data, 'Öğretmen atanamadı'));
  return data as KidsClassTeacherAssignment;
}

export async function kidsRemoveClassTeacher(classId: number, teacherUserId: number): Promise<void> {
  const res = await kidsAuthorizedFetch(`/classes/${classId}/teachers/${teacherUserId}/`, {
    method: 'DELETE',
  });
  if (res.status === 204) return;
  const text = await res.text();
  const data = readJson<ApiErrorBody>(text);
  throw new Error(data?.detail || 'Sınıf öğretmeni kaldırılamadı');
}

export type KidsKindergartenDayPlan = {
  plan_date: string;
  plan_text: string;
  updated_at: string | null;
};

export type KidsKindergartenSlotItem = { label: string; ok: boolean | null };

export type KidsKindergartenDailyRecordRow = {
  id: number;
  kids_class_id: number;
  student_id: number;
  record_date: string;
  present: boolean | null;
  present_marked_at: string | null;
  meal_ok: boolean | null;
  meal_marked_at: string | null;
  meal_slots?: KidsKindergartenSlotItem[];
  nap_ok: boolean | null;
  nap_marked_at: string | null;
  nap_slots?: KidsKindergartenSlotItem[];
  teacher_day_note: string;
  digest_sent_at: string | null;
  created_at: string;
  updated_at: string;
};

export type KidsKindergartenDailyBoardResponse = {
  record_date: string;
  plan: KidsKindergartenDayPlan;
  rows: {
    student: {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
      profile_picture?: string | null;
      student_login_name?: string | null;
    };
    record: KidsKindergartenDailyRecordRow | null;
  }[];
};

function _kgDateQuery(date?: string): string {
  return date && date.trim() ? `?date=${encodeURIComponent(date.trim())}` : '';
}

export async function kidsGetKindergartenDayPlan(classId: number, date?: string): Promise<KidsKindergartenDayPlan> {
  const res = await kidsAuthorizedFetch(
    `/classes/${classId}/kindergarten/day-plan/${_kgDateQuery(date)}`,
    { method: 'GET' },
  );
  const text = await res.text();
  const data = readJson<KidsKindergartenDayPlan & ApiErrorBody>(text);
  if (!res.ok) throw new Error(kidsFirstApiErrorMessage(data, 'Gün planı alınamadı'));
  return data as KidsKindergartenDayPlan;
}

export async function kidsPutKindergartenDayPlan(
  classId: number,
  body: { plan_text: string },
  date?: string,
): Promise<KidsKindergartenDayPlan> {
  const res = await kidsAuthorizedFetch(`/classes/${classId}/kindergarten/day-plan/${_kgDateQuery(date)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const data = readJson<KidsKindergartenDayPlan & ApiErrorBody>(text);
  if (!res.ok) throw new Error(kidsFirstApiErrorMessage(data, 'Gün planı kaydedilemedi'));
  return data as KidsKindergartenDayPlan;
}

export async function kidsGetKindergartenDailyBoard(
  classId: number,
  date?: string,
): Promise<KidsKindergartenDailyBoardResponse> {
  const res = await kidsAuthorizedFetch(
    `/classes/${classId}/kindergarten/daily-board/${_kgDateQuery(date)}`,
    { method: 'GET' },
  );
  const text = await res.text();
  const data = readJson<KidsKindergartenDailyBoardResponse & ApiErrorBody>(text);
  if (!res.ok) throw new Error(kidsFirstApiErrorMessage(data, 'Günlük tablo alınamadı'));
  return data as KidsKindergartenDailyBoardResponse;
}

export async function kidsPatchKindergartenDailyRecord(
  classId: number,
  studentId: number,
  body: Partial<{
    present: boolean | null;
    meal_ok: boolean | null;
    nap_ok: boolean | null;
    meal_slots: KidsKindergartenSlotItem[];
    nap_slots: KidsKindergartenSlotItem[];
    teacher_day_note: string;
  }>,
  date?: string,
): Promise<KidsKindergartenDailyRecordRow> {
  const res = await kidsAuthorizedFetch(
    `/classes/${classId}/kindergarten/daily/${studentId}/${_kgDateQuery(date)}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  );
  const text = await res.text();
  const data = readJson<KidsKindergartenDailyRecordRow & ApiErrorBody>(text);
  if (!res.ok) throw new Error(kidsFirstApiErrorMessage(data, 'Kayıt güncellenemedi'));
  return data as KidsKindergartenDailyRecordRow;
}

export type KidsKindergartenBulkAction =
  | 'mark_present'
  | 'meal_slot'
  | 'nap_slot'
  | 'set_note'
  | 'send_digest';

export type KidsKindergartenBulkBody = {
  action: KidsKindergartenBulkAction;
  target?: 'all_enrolled' | 'present_only';
  student_ids?: number[];
  present?: boolean | null;
  slot_label?: string;
  ok?: boolean | null;
  note?: string;
};

export type KidsKindergartenBulkResult =
  | { action: Exclude<KidsKindergartenBulkAction, 'send_digest'>; updated: number }
  | {
      action: 'send_digest';
      digest_sent: number;
      skipped_no_record: number;
      failed_student_ids: number[];
    };

export async function kidsPostKindergartenBulk(
  classId: number,
  body: KidsKindergartenBulkBody,
  date?: string,
): Promise<KidsKindergartenBulkResult> {
  const res = await kidsAuthorizedFetch(
    `/classes/${classId}/kindergarten/bulk/${_kgDateQuery(date)}`,
    { method: 'POST', body: JSON.stringify(body) },
  );
  const text = await res.text();
  const data = readJson<KidsKindergartenBulkResult & ApiErrorBody & { detail?: string }>(text);
  if (!res.ok) throw new Error(kidsFirstApiErrorMessage(data, 'Toplu işlem yapılamadı'));
  return data as KidsKindergartenBulkResult;
}

export async function kidsSendKindergartenEndOfDay(
  classId: number,
  studentId: number,
  date?: string,
): Promise<void> {
  const res = await kidsAuthorizedFetch(
    `/classes/${classId}/kindergarten/daily/${studentId}/send-end-of-day/${_kgDateQuery(date)}`,
    { method: 'POST' },
  );
  const text = await res.text();
  const data = readJson<ApiErrorBody>(text);
  if (!res.ok) throw new Error(kidsFirstApiErrorMessage(data, 'Gün sonu bildirimi gönderilemedi'));
}

export async function kidsParentKindergartenRecords(
  studentId: number,
  yearMonth?: string,
): Promise<{ year_month: string; records: KidsKindergartenDailyRecordRow[] }> {
  const q =
    `?student_id=${encodeURIComponent(String(studentId))}` +
    (yearMonth && yearMonth.trim() ? `&year_month=${encodeURIComponent(yearMonth.trim())}` : '');
  const res = await kidsAuthorizedFetch(`/parent/kindergarten/records/${q}`, { method: 'GET' });
  const text = await res.text();
  const data = readJson<{ year_month?: string; records?: KidsKindergartenDailyRecordRow[] } & ApiErrorBody>(text);
  if (!res.ok) throw new Error(kidsFirstApiErrorMessage(data, 'Kayıtlar alınamadı'));
  const payload = data ?? {};
  return {
    year_month: String(payload.year_month || ''),
    records: Array.isArray(payload.records) ? payload.records : [],
  };
}

export async function kidsListSchoolClassDirectory(schoolId: number): Promise<KidsSchoolDirectoryClassRow[]> {
  const res = await kidsAuthorizedFetch(`/schools/${schoolId}/classes-directory/`, { method: 'GET' });
  const text = await res.text();
  const data = readJson<{ classes?: KidsSchoolDirectoryClassRow[] } & ApiErrorBody>(text);
  if (!res.ok) throw new Error(kidsFirstApiErrorMessage(data, 'Sınıf listesi alınamadı'));
  return Array.isArray(data?.classes) ? data.classes : [];
}

export async function kidsSelfJoinClass(classId: number): Promise<KidsClassTeacherAssignment> {
  const res = await kidsAuthorizedFetch(`/classes/${classId}/self-join/`, { method: 'POST' });
  const text = await res.text();
  const data = readJson<KidsClassTeacherAssignment & ApiErrorBody>(text);
  if (!res.ok) throw new Error(kidsFirstApiErrorMessage(data, 'Sınıfa katılım başarısız'));
  return data as KidsClassTeacherAssignment;
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
  student_marked_done_at: string | null;
  parent_review_status: 'pending' | 'approved' | 'rejected';
  parent_reviewed_at: string | null;
  parent_note_to_teacher: string;
  is_late_submission?: boolean;
  rubric_scores?: { criterion_id: string; points: number; note?: string }[];
  rubric_total_score?: number | null;
  rubric_feedback?: string;
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
    student_login_name?: string | null;
  };
  kind: 'steps' | 'video';
  steps_payload: {
    steps?: { text: string }[];
    image_urls?: string[];
  } | null;
  video_url: string;
  caption: string;
  student_marked_done_at: string | null;
  parent_review_status: 'pending' | 'approved' | 'rejected';
  parent_reviewed_at: string | null;
  parent_note_to_teacher: string;
  is_late_submission?: boolean;
  rubric_scores?: { criterion_id: string; points: number; note?: string }[];
  rubric_total_score?: number | null;
  rubric_feedback?: string;
  teacher_review_valid: boolean | null;
  teacher_review_positive: boolean | null;
  teacher_note_to_student: string;
  teacher_reviewed_at: string | null;
  is_teacher_pick?: boolean;
  teacher_picked_at?: string | null;
  /** Veli onayı geldiyse öğretmen değerlendirme formu açılır. */
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

export type KidsNextMilestoneProgress = {
  key: string;
  current: number;
  target: number;
  /** Sıradaki kilitli kilometre taşına göre 0–100 (current/target). */
  percent: number;
};

export type KidsBadgeRoadmap = {
  milestones: KidsRoadmapMilestone[];
  teacher_picks: KidsRoadmapTeacherPick[];
  growth_points: number;
  teacher_pick_limit: number;
  /** Yoksa tüm kilometre taşları açık veya liste boş. */
  next_milestone_progress?: KidsNextMilestoneProgress | null;
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
      challenge_card_theme: body.challenge_card_theme ?? null,
      recurrence_type: body.recurrence_type ?? 'none',
      recurrence_interval: body.recurrence_interval ?? 1,
      recurrence_until: body.recurrence_until ?? null,
      allow_late_submissions: body.allow_late_submissions ?? false,
      late_grace_hours: body.late_grace_hours ?? 0,
      late_penalty_percent: body.late_penalty_percent ?? 0,
      rubric_schema: body.rubric_schema ?? [],
      is_published: body.is_published ?? true,
      peer_submissions_visible: body.peer_submissions_visible ?? false,
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
    challenge_card_theme: 'art' | 'science' | 'motion' | 'music' | null;
    submission_opens_at: string | null;
    submission_closes_at: string | null;
    recurrence_type: 'none' | 'daily' | 'weekly';
    recurrence_interval: number;
    recurrence_until: string | null;
    allow_late_submissions: boolean;
    late_grace_hours: number;
    late_penalty_percent: number;
    rubric_schema: { id?: string; label: string; max_points: number; weight?: number }[];
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
  return res.json() as Promise<{
    classes: KidsClass[];
    assignments: KidsAssignment[];
    achievement_certificates?: KidsAchievementCertificate[];
  }>;
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
    rubric_scores?: { criterion_id: string; points: number; note?: string }[];
    rubric_feedback?: string;
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

export async function kidsListClassHomeworks(classId: number): Promise<KidsHomework[]> {
  const res = await kidsAuthorizedFetch(`/classes/${classId}/homeworks/`, { method: 'GET' });
  if (!res.ok) throw new Error('Ödevler yüklenemedi');
  return res.json() as Promise<KidsHomework[]>;
}

export async function kidsCreateClassHomework(
  classId: number,
  body: {
    title: string;
    description?: string;
    page_start?: number | null;
    page_end?: number | null;
    due_at?: string | null;
    is_published?: boolean;
  },
): Promise<KidsHomework> {
  const res = await kidsAuthorizedFetch(`/classes/${classId}/homeworks/`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const data = readJson<KidsHomework & ApiErrorBody>(text);
  if (!res.ok) {
    throw new Error(kidsFirstApiErrorMessage(data, 'Ödev oluşturulamadı'));
  }
  return data as KidsHomework;
}

export async function kidsUploadHomeworkAttachment(
  classId: number,
  homeworkId: number,
  file: File,
): Promise<KidsHomework> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await kidsAuthorizedFetch(`/classes/${classId}/homeworks/${homeworkId}/attachments/`, {
    method: 'POST',
    body: fd,
  });
  const text = await res.text();
  const data = readJson<{ homework?: KidsHomework } & ApiErrorBody>(text);
  if (!res.ok) throw new Error(kidsFirstApiErrorMessage(data, 'Ödev dosyası yüklenemedi'));
  if (!data?.homework) throw new Error('Yanıt eksik');
  return data.homework;
}

export async function kidsPatchClassHomework(
  classId: number,
  homeworkId: number,
  body: Partial<{
    title: string;
    description: string;
    page_start: number | null;
    page_end: number | null;
    due_at: string | null;
    is_published: boolean;
  }>,
): Promise<KidsHomework> {
  const res = await kidsAuthorizedFetch(`/classes/${classId}/homeworks/${homeworkId}/`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const data = readJson<KidsHomework & ApiErrorBody>(text);
  if (!res.ok) throw new Error(kidsFirstApiErrorMessage(data, 'Ödev güncellenemedi'));
  return data as KidsHomework;
}

export async function kidsDeleteHomeworkAttachment(
  classId: number,
  homeworkId: number,
  attachmentId: number,
): Promise<KidsHomework> {
  const res = await kidsAuthorizedFetch(
    `/classes/${classId}/homeworks/${homeworkId}/attachments/${attachmentId}/`,
    { method: 'DELETE' },
  );
  const text = await res.text();
  const data = readJson<{ homework?: KidsHomework } & ApiErrorBody>(text);
  if (!res.ok) throw new Error(kidsFirstApiErrorMessage(data, 'Ödev eki silinemedi'));
  if (!data?.homework) throw new Error('Yanıt eksik');
  return data.homework;
}

export async function kidsListStudentHomeworks(): Promise<KidsHomeworkSubmission[]> {
  const res = await kidsAuthorizedFetch('/student/homeworks/', { method: 'GET' });
  if (!res.ok) throw new Error('Ödevler yüklenemedi');
  return res.json() as Promise<KidsHomeworkSubmission[]>;
}

export async function kidsMarkHomeworkDone(
  submissionId: number,
  body?: { note?: string },
): Promise<KidsHomeworkSubmission> {
  const res = await kidsAuthorizedFetch(
    `/student/homework-submissions/${submissionId}/mark-done/`,
    {
      method: 'PATCH',
      body: JSON.stringify(body ?? {}),
    },
  );
  const text = await res.text();
  const data = readJson<KidsHomeworkSubmission & ApiErrorBody>(text);
  if (!res.ok) {
    throw new Error(kidsFirstApiErrorMessage(data, 'Ödev tamamlandı olarak işaretlenemedi'));
  }
  return data as KidsHomeworkSubmission;
}

export async function kidsUploadStudentHomeworkSubmissionAttachment(
  submissionId: number,
  file: File,
): Promise<KidsHomeworkSubmission> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await kidsAuthorizedFetch(`/student/homework-submissions/${submissionId}/attachments/`, {
    method: 'POST',
    body: fd,
  });
  const text = await res.text();
  const data = readJson<{ submission?: KidsHomeworkSubmission } & ApiErrorBody>(text);
  if (!res.ok) {
    throw new Error(kidsFirstApiErrorMessage(data, 'Ödev görseli yüklenemedi'));
  }
  if (!data?.submission) throw new Error('Yanıt eksik');
  return data.submission;
}

export async function kidsDeleteStudentHomeworkSubmissionAttachment(
  submissionId: number,
  attachmentId: number,
): Promise<KidsHomeworkSubmission> {
  const res = await kidsAuthorizedFetch(
    `/student/homework-submissions/${submissionId}/attachments/${attachmentId}/`,
    { method: 'DELETE' },
  );
  const text = await res.text();
  const data = readJson<{ submission?: KidsHomeworkSubmission } & ApiErrorBody>(text);
  if (!res.ok) {
    throw new Error(kidsFirstApiErrorMessage(data, 'Ödev görseli silinemedi'));
  }
  if (!data?.submission) throw new Error('Yanıt eksik');
  return data.submission;
}

export async function kidsListParentHomeworkPending(): Promise<KidsHomeworkSubmission[]> {
  const res = await kidsAuthorizedFetch('/parent/homeworks/pending/', { method: 'GET' });
  if (!res.ok) throw new Error('Veli ödev listesi yüklenemedi');
  return res.json() as Promise<KidsHomeworkSubmission[]>;
}

export async function kidsParentReviewHomeworkSubmission(
  submissionId: number,
  body: { approved: boolean; note?: string },
): Promise<KidsHomeworkSubmission> {
  const res = await kidsAuthorizedFetch(`/parent/homework-submissions/${submissionId}/review/`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const data = readJson<KidsHomeworkSubmission & ApiErrorBody>(text);
  if (!res.ok) {
    throw new Error(kidsFirstApiErrorMessage(data, 'Veli onayı kaydedilemedi'));
  }
  return data as KidsHomeworkSubmission;
}

export async function kidsDeleteParentHomeworkSubmissionAttachment(
  submissionId: number,
  attachmentId: number,
): Promise<KidsHomeworkSubmission> {
  const res = await kidsAuthorizedFetch(
    `/parent/homework-submissions/${submissionId}/attachments/${attachmentId}/`,
    { method: 'DELETE' },
  );
  const text = await res.text();
  const data = readJson<{ submission?: KidsHomeworkSubmission } & ApiErrorBody>(text);
  if (!res.ok) {
    throw new Error(kidsFirstApiErrorMessage(data, 'Öğrenci görseli silinemedi'));
  }
  if (!data?.submission) throw new Error('Yanıt eksik');
  return data.submission;
}

export async function kidsTeacherHomeworkInbox(): Promise<KidsHomeworkSubmission[]> {
  const res = await kidsAuthorizedFetch('/teacher/homeworks/submissions/inbox/', {
    method: 'GET',
  });
  if (!res.ok) throw new Error('Öğretmen ödev kutusu yüklenemedi');
  return res.json() as Promise<KidsHomeworkSubmission[]>;
}

export async function kidsTeacherReviewHomeworkSubmission(
  submissionId: number,
  body: { approved: boolean; note?: string },
): Promise<KidsHomeworkSubmission> {
  const res = await kidsAuthorizedFetch(`/teacher/homeworks/submissions/${submissionId}/review/`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const data = readJson<KidsHomeworkSubmission & ApiErrorBody>(text);
  if (!res.ok) {
    throw new Error(kidsFirstApiErrorMessage(data, 'Ödev değerlendirmesi kaydedilemedi'));
  }
  return data as KidsHomeworkSubmission;
}

export async function kidsListHomeworkSubmissionsByHomework(
  classId: number,
  homeworkId: number,
): Promise<KidsHomeworkSubmissionOverview> {
  const res = await kidsAuthorizedFetch(
    `/classes/${classId}/homeworks/${homeworkId}/submissions/`,
    { method: 'GET' },
  );
  if (!res.ok) throw new Error('Ödev teslim detayları yüklenemedi');
  return res.json() as Promise<KidsHomeworkSubmissionOverview>;
}

export async function kidsListTeacherHomeworkSubmissionsByHomework(
  homeworkId: number,
): Promise<KidsHomeworkSubmissionOverview> {
  const res = await kidsAuthorizedFetch(`/teacher/homeworks/${homeworkId}/submissions/`, {
    method: 'GET',
  });
  if (!res.ok) throw new Error('Ödev teslim detayları yüklenemedi');
  return res.json() as Promise<KidsHomeworkSubmissionOverview>;
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
  | 'kids_new_test'
  | 'kids_submission_received'
  | 'kids_challenge_pending_teacher'
  | 'kids_challenge_pending_parent'
  | 'kids_challenge_approved'
  | 'kids_challenge_rejected'
  | 'kids_challenge_invite'
  | 'kids_new_message'
  | 'kids_new_announcement'
  | 'kids_assignment_due_soon'
  | 'kids_assignment_late_submitted'
  | 'kids_assignment_graded_with_rubric';

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
  conversation?: number | null;
  message_record?: number | null;
  announcement?: number | null;
  action_path: string;
};

export type KidsConversation = {
  id: number;
  kids_class: number | null;
  student: number;
  parent_user: number;
  teacher_user: number;
  topic: string;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
  unread_count: number;
};

export type KidsMessage = {
  id: number;
  conversation: number;
  sender_student: number | null;
  sender_user: number | null;
  body: string;
  attachment?: {
    id: number;
    url: string;
    original_name: string;
    content_type: string;
    size_bytes: number;
    created_at: string | null;
  } | null;
  edited_at: string | null;
  created_at: string;
};

export type KidsAnnouncementCategory = 'event' | 'info' | 'general';

export type KidsAnnouncement = {
  id: number;
  scope: 'class' | 'school';
  kids_class: number | null;
  school: number | null;
  target_role: 'all' | 'parent' | 'student' | 'teacher';
  title: string;
  body: string;
  /** Yoksa (eski kayıt) istemci `general` varsayar */
  category?: KidsAnnouncementCategory;
  is_pinned: boolean;
  is_published: boolean;
  published_at: string | null;
  expires_at: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  attachments?: {
    id: number;
    url: string;
    original_name: string;
    content_type: string;
    size_bytes: number;
    created_at: string | null;
  }[];
};

export type KidsTestReadingPassage = {
  id: number;
  order: number;
  title: string;
  body: string;
  created_at?: string;
  updated_at?: string;
};

export type KidsTestQuestionFormat = 'multiple_choice' | 'constructed';

export type KidsTestQuestion = {
  id: number;
  order: number;
  stem: string;
  topic?: string;
  subtopic?: string;
  choices: { key: string; text: string }[];
  correct_choice_key: string;
  points: number;
  /** Okuma metni sırası (passages[].order ile eşleşir). */
  reading_passage_order?: number | null;
  /** Kaynak görsel sayfa sırası (1-based), yoksa tek sayfa veya eşleşme yok. */
  source_page_order?: number | null;
  source_image_url?: string | null;
  /** Soru metninin üstünde gösterilen isteğe bağlı görsel. */
  illustration_url?: string | null;
  source_meta?: Record<string, unknown>;
  /** API okuma: `source_meta.question_format` ile uyumlu. */
  question_format?: KidsTestQuestionFormat;
  /** Yapılandırılmış cevap sorularında öğretmenin girdiği / AI metni (gösterim). */
  constructed_answer_display?: string;
};

export type KidsTest = {
  id: number;
  kids_class: number | null;
  created_by: number;
  source_test?: number | null;
  title: string;
  instructions: string;
  duration_minutes: number | null;
  status: 'draft' | 'published' | 'archived';
  published_at: string | null;
  /** Öğrenci denemesi yoksa silinebilir (GET /tests/mine/ ve detay). */
  deletable?: boolean;
  /** Okuma metinleri; eski API yanıtlarında boş olabilir. */
  passages?: KidsTestReadingPassage[];
  questions: KidsTestQuestion[];
  source_images: { id: number; page_order: number; url: string }[];
  created_at: string;
  updated_at: string;
};

export type KidsStudentTestListAttemptStatus = 'pending' | 'in_progress' | 'submitted';

export type KidsStudentTestListItem = {
  id: number;
  kids_class: number;
  title: string;
  instructions: string;
  duration_minutes: number | null;
  published_at: string | null;
  question_count: number;
  /** Öğrenci henüz başlatmadı | çözüyor | teslim etti */
  attempt_status?: KidsStudentTestListAttemptStatus;
  /** Teslim edilmiş denemenin süresi (dakika); yalnızca submitted. */
  attempt_duration_minutes?: number | null;
  /** Teslimde kazanılan büyüme puanı; yalnızca submitted. */
  xp_earned?: number | null;
  /** Yüz üzerinden puan; yalnızca submitted. */
  attempt_score?: number | null;
};

export type KidsTestAttempt = {
  id: number;
  test: number;
  student: number;
  started_at: string;
  submitted_at: string | null;
  auto_submitted: boolean;
  score: number;
  total_questions: number;
  total_correct: number;
};

export async function kidsListConversations(): Promise<KidsConversation[]> {
  const res = await kidsAuthorizedFetch('/messages/', { method: 'GET' });
  const data = await res.json().catch(() => []);
  if (!res.ok) throw new Error((data as ApiErrorBody)?.detail || 'Mesaj kutusu yüklenemedi');
  return Array.isArray(data) ? (data as KidsConversation[]) : [];
}

export async function kidsCreateConversation(body: {
  student_id: number;
  teacher_user_id?: number;
  kids_class_id?: number;
  topic?: string;
  message?: string;
}): Promise<KidsConversation> {
  const res = await kidsAuthorizedFetch('/messages/', { method: 'POST', body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as ApiErrorBody)?.detail || 'Konuşma açılamadı');
  return data as KidsConversation;
}

export async function kidsGetConversation(conversationId: number): Promise<KidsConversation> {
  const res = await kidsAuthorizedFetch(`/messages/${conversationId}/`, { method: 'GET' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as ApiErrorBody)?.detail || 'Konuşma bulunamadı');
  return data as KidsConversation;
}

export async function kidsListConversationMessages(conversationId: number): Promise<KidsMessage[]> {
  const res = await kidsAuthorizedFetch(`/messages/${conversationId}/items/`, { method: 'GET' });
  const data = await res.json().catch(() => []);
  if (!res.ok) throw new Error((data as ApiErrorBody)?.detail || 'Mesajlar yüklenemedi');
  return Array.isArray(data) ? (data as KidsMessage[]) : [];
}

export async function kidsSendConversationMessage(
  conversationId: number,
  body: string,
  file?: File | null,
): Promise<KidsMessage> {
  const hasFile = Boolean(file);
  const payload =
    hasFile && file
      ? (() => {
          const fd = new FormData();
          fd.append('body', body);
          fd.append('file', file);
          return fd;
        })()
      : JSON.stringify({ body });
  const res = await kidsAuthorizedFetch(`/messages/${conversationId}/items/`, {
    method: 'POST',
    body: payload,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as ApiErrorBody)?.detail || 'Mesaj gönderilemedi');
  return data as KidsMessage;
}

/** Kids duyurular listesi sayfa boyutu (API `limit` ile aynı). */
export const KIDS_ANNOUNCEMENTS_PAGE_SIZE = 3;

export type KidsAnnouncementsPaged = {
  results: KidsAnnouncement[];
  count: number;
  limit: number;
  offset: number;
  has_more: boolean;
};

/**
 * Duyuruları listeler. `limit` verilirse sayfalı JSON döner; verilmezse tüm liste (dizi) — geriye dönük uyumluluk.
 */
export async function kidsListAnnouncements(
  params?: { limit: number; offset?: number },
): Promise<KidsAnnouncement[] | KidsAnnouncementsPaged> {
  const sp = new URLSearchParams();
  if (params?.limit != null) {
    sp.set('limit', String(params.limit));
    sp.set('offset', String(params.offset ?? 0));
  }
  const q = sp.toString();
  const res = await kidsAuthorizedFetch(`/announcements/${q ? `?${q}` : ''}`, { method: 'GET' });
  const data = await res.json().catch(() => (params?.limit != null ? {} : []));
  if (!res.ok) throw new Error((data as ApiErrorBody)?.detail || 'Duyurular yüklenemedi');
  if (params?.limit != null && data && typeof data === 'object' && !Array.isArray(data) && 'results' in data) {
    const o = data as KidsAnnouncementsPaged;
    return {
      results: Array.isArray(o.results) ? o.results : [],
      count: typeof o.count === 'number' ? o.count : 0,
      limit: typeof o.limit === 'number' ? o.limit : params.limit,
      offset: typeof o.offset === 'number' ? o.offset : params.offset ?? 0,
      has_more: Boolean(o.has_more),
    };
  }
  return Array.isArray(data) ? (data as KidsAnnouncement[]) : [];
}

export async function kidsExtractTestQuestions(
  images: File[],
  pdfFile?: File | null,
): Promise<{
  title: string;
  instructions: string;
  passages: { order: number; title: string; body: string }[];
  questions: {
    order: number;
    stem: string;
    topic?: string;
    subtopic?: string;
    question_format?: KidsTestQuestionFormat;
    constructed_answer?: string;
    choices: { key: string; text: string }[];
    correct_choice_key: string;
    points: number;
    source_page_order?: number;
    reading_passage_order?: number | null;
  }[];
}> {
  const fd = new FormData();
  for (const image of images) fd.append('images', image);
  if (pdfFile) fd.append('pdf', pdfFile);
  const res = await kidsAuthorizedFetch('/tests/extract/', {
    method: 'POST',
    body: fd,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as ApiErrorBody)?.detail || 'Test soruları çıkarılamadı');
  return data as {
    title: string;
    instructions: string;
    passages: { order: number; title: string; body: string }[];
    questions: {
      order: number;
      stem: string;
      topic?: string;
      subtopic?: string;
      question_format?: KidsTestQuestionFormat;
      constructed_answer?: string;
      choices: { key: string; text: string }[];
      correct_choice_key: string;
      points: number;
      source_page_order?: number;
      reading_passage_order?: number | null;
    }[];
  };
}

export async function kidsGenerateTestFromDocument(
  file: File | File[],
  questionCount: number = 10,
): Promise<{
  title: string;
  instructions: string;
  passages: { order: number; title: string; body: string }[];
  questions: {
    order: number;
    stem: string;
    topic?: string;
    subtopic?: string;
    question_format?: KidsTestQuestionFormat;
    constructed_answer?: string;
    choices: { key: string; text: string }[];
    correct_choice_key: string;
    points: number;
    reading_passage_order?: number | null;
  }[];
}> {
  const fd = new FormData();
  const files = Array.isArray(file) ? file : [file];
  files.forEach((f) => fd.append('files', f));
  fd.append('question_count', String(questionCount));
  const res = await kidsAuthorizedFetch('/tests/generate-from-document/', {
    method: 'POST',
    body: fd,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as ApiErrorBody)?.detail || 'Döküman\'dan soru üretilemedi');
  return data as ReturnType<typeof kidsGenerateTestFromDocument> extends Promise<infer T> ? T : never;
}

export async function kidsCreateClassTest(
  classId: number,
  body: {
    title: string;
    instructions?: string;
    duration_minutes?: number | null;
    status?: 'draft' | 'published' | 'archived';
    passages?: { order: number; title: string; body: string }[];
    questions: {
      order: number;
      stem: string;
      topic?: string;
      subtopic?: string;
      question_format?: KidsTestQuestionFormat;
      constructed_answer?: string;
      choices: { key: string; text: string }[];
      correct_choice_key: string;
      points?: number;
      source_page_order?: number | null;
      reading_passage_order?: number | null;
    }[];
    source_images?: File[];
  },
): Promise<KidsTest> {
  const fd = new FormData();
  fd.append('title', body.title);
  fd.append('instructions', body.instructions ?? '');
  if (body.duration_minutes != null) fd.append('duration_minutes', String(body.duration_minutes));
  if (body.status) fd.append('status', body.status);
  fd.append('passages', JSON.stringify(body.passages ?? []));
  fd.append('questions', JSON.stringify(body.questions));
  for (const image of body.source_images ?? []) fd.append('source_images', image);
  const res = await kidsAuthorizedFetch(`/classes/${classId}/tests/`, {
    method: 'POST',
    body: fd,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as ApiErrorBody)?.detail || 'Test oluşturulamadı');
  return data as KidsTest;
}

/** Sınıfa bağlı olmayan taslak test (öğretmen arşivi). */
export async function kidsCreateStandaloneTest(body: {
  title: string;
  instructions?: string;
  duration_minutes?: number | null;
  status?: 'draft' | 'published' | 'archived';
  passages?: { order: number; title: string; body: string }[];
  questions: {
    order: number;
    stem: string;
    topic?: string;
    subtopic?: string;
    question_format?: KidsTestQuestionFormat;
    constructed_answer?: string;
    choices: { key: string; text: string }[];
    correct_choice_key: string;
    points?: number;
    source_page_order?: number | null;
    reading_passage_order?: number | null;
  }[];
  source_images?: File[];
  /** Soru sırası (1-based) ile eşleşen görsel dosyaları */
  questionIllustrationFiles?: { order: number; file: File }[];
}): Promise<KidsTest> {
  const fd = new FormData();
  fd.append('title', body.title);
  fd.append('instructions', body.instructions ?? '');
  if (body.duration_minutes != null) fd.append('duration_minutes', String(body.duration_minutes));
  if (body.status) fd.append('status', body.status);
  fd.append('passages', JSON.stringify(body.passages ?? []));
  fd.append('questions', JSON.stringify(body.questions));
  for (const image of body.source_images ?? []) fd.append('source_images', image);
  for (const { order, file } of body.questionIllustrationFiles ?? []) {
    fd.append(`question_illustration_${order}`, file);
  }
  const res = await kidsAuthorizedFetch('/tests/create/', {
    method: 'POST',
    body: fd,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as ApiErrorBody)?.detail || 'Test oluşturulamadı');
  return data as KidsTest;
}

export async function kidsListClassTests(classId: number): Promise<KidsTest[]> {
  const res = await kidsAuthorizedFetch(`/classes/${classId}/tests/`, { method: 'GET' });
  const data = await res.json().catch(() => []);
  if (!res.ok) throw new Error((data as ApiErrorBody)?.detail || 'Testler yüklenemedi');
  return Array.isArray(data) ? (data as KidsTest[]) : [];
}

export async function kidsListMyCreatedTests(): Promise<KidsTest[]> {
  const res = await kidsAuthorizedFetch('/tests/mine/', { method: 'GET' });
  const data = await res.json().catch(() => []);
  if (!res.ok) throw new Error((data as ApiErrorBody)?.detail || 'Yüklediğim testler alınamadı');
  return Array.isArray(data) ? (data as KidsTest[]) : [];
}

export async function kidsDistributeTestToClasses(
  testId: number,
  classIds: number[],
  opts?: { duration_minutes?: number | null },
): Promise<{
  created: KidsTest[];
  created_count: number;
  skipped_class_ids: number[];
  home_class_assigned?: boolean;
}> {
  const payload: { class_ids: number[]; duration_minutes?: number } = { class_ids: classIds };
  if (opts?.duration_minutes != null) payload.duration_minutes = opts.duration_minutes;
  const res = await kidsAuthorizedFetch(`/tests/${testId}/distribute/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as ApiErrorBody)?.detail || 'Test sınıflara gönderilemedi');
  return data as {
    created: KidsTest[];
    created_count: number;
    skipped_class_ids: number[];
    home_class_assigned?: boolean;
  };
}

export async function kidsGetTest(testId: number): Promise<KidsTest> {
  const res = await kidsAuthorizedFetch(`/tests/${testId}/`, { method: 'GET' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as ApiErrorBody)?.detail || 'Test yüklenemedi');
  return data as KidsTest;
}

export async function kidsPatchTest(
  testId: number,
  body: Partial<{
    title: string;
    instructions: string;
    duration_minutes: number | null;
    status: 'draft' | 'published' | 'archived';
    passages: { order: number; title: string; body: string }[];
    questions: {
      order: number;
      stem: string;
      topic?: string;
      subtopic?: string;
      question_format?: KidsTestQuestionFormat;
      constructed_answer?: string;
      choices: { key: string; text: string }[];
      correct_choice_key: string;
      points?: number;
      source_page_order?: number | null;
      reading_passage_order?: number | null;
    }[];
  }>,
  fileOpts?: {
    questionIllustrations?: { order: number; file: File }[];
    questionIllustrationClearOrders?: number[];
  },
): Promise<KidsTest> {
  const useMultipart =
    (fileOpts?.questionIllustrations?.length ?? 0) > 0 ||
    (fileOpts?.questionIllustrationClearOrders?.length ?? 0) > 0;
  if (!useMultipart) {
    const res = await kidsAuthorizedFetch(`/tests/${testId}/`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as ApiErrorBody)?.detail || 'Test güncellenemedi');
    return data as KidsTest;
  }
  const fd = new FormData();
  if (body.title != null) fd.append('title', body.title);
  if (body.instructions != null) fd.append('instructions', body.instructions);
  if (body.duration_minutes !== undefined) {
    fd.append('duration_minutes', body.duration_minutes == null ? '' : String(body.duration_minutes));
  }
  if (body.status != null) fd.append('status', body.status);
  if (body.passages != null) fd.append('passages', JSON.stringify(body.passages));
  if (body.questions != null) fd.append('questions', JSON.stringify(body.questions));
  for (const { order, file } of fileOpts?.questionIllustrations ?? []) {
    fd.append(`question_illustration_${order}`, file);
  }
  for (const o of fileOpts?.questionIllustrationClearOrders ?? []) {
    fd.append(`question_illustration_clear_${o}`, '1');
  }
  const res = await kidsAuthorizedFetch(`/tests/${testId}/`, {
    method: 'PATCH',
    body: fd,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as ApiErrorBody)?.detail || 'Test güncellenemedi');
  return data as KidsTest;
}

export async function kidsDeleteTest(testId: number): Promise<void> {
  const res = await kidsAuthorizedFetch(`/tests/${testId}/`, { method: 'DELETE' });
  if (res.status === 204) return;
  const data = await res.json().catch(() => ({}));
  throw new Error((data as ApiErrorBody)?.detail || 'Test silinemedi');
}

export async function kidsStudentListTests(): Promise<KidsStudentTestListItem[]> {
  const res = await kidsAuthorizedFetch('/student/tests/', { method: 'GET' });
  const data = await res.json().catch(() => []);
  if (!res.ok) throw new Error((data as ApiErrorBody)?.detail || 'Test listesi yüklenemedi');
  return Array.isArray(data) ? (data as KidsStudentTestListItem[]) : [];
}

export async function kidsStudentGetTest(testId: number): Promise<{
  id: number;
  title: string;
  instructions: string;
  duration_minutes: number | null;
  published_at: string | null;
  passages: { id: number; order: number; title: string; body: string }[];
  questions: {
    id: number;
    order: number;
    stem: string;
    topic?: string;
    subtopic?: string;
    choices: { key: string; text: string }[];
    points: number;
    reading_passage_order?: number | null;
    source_image_url?: string | null;
    source_page_order?: number | null;
    illustration_url?: string | null;
    question_format?: KidsTestQuestionFormat;
    /** Teslim sonrası: çoktan seçmelide şık (A–E); yazılı cevapta metin. */
    selected_choice_key?: string;
    is_correct?: boolean;
    correct_choice_key?: string | null;
    /** Teslim sonrası inceleme: beklenen cevap metni (yazılı sorular). */
    constructed_correct_display?: string;
  }[];
  attempt: KidsTestAttempt | null;
}> {
  const res = await kidsAuthorizedFetch(`/tests/${testId}/`, { method: 'GET' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as ApiErrorBody)?.detail || 'Test yüklenemedi');
  return data as {
    id: number;
    title: string;
    instructions: string;
    duration_minutes: number | null;
    published_at: string | null;
    passages: { id: number; order: number; title: string; body: string }[];
    questions: {
      id: number;
      order: number;
      stem: string;
      topic?: string;
      subtopic?: string;
      choices: { key: string; text: string }[];
      points: number;
      reading_passage_order?: number | null;
      source_image_url?: string | null;
      source_page_order?: number | null;
      question_format?: KidsTestQuestionFormat;
      illustration_url?: string | null;
      selected_choice_key?: string;
      is_correct?: boolean;
      correct_choice_key?: string | null;
      constructed_correct_display?: string;
    }[];
    attempt: KidsTestAttempt | null;
  };
}

export async function kidsStudentStartTest(testId: number): Promise<KidsTestAttempt> {
  const res = await kidsAuthorizedFetch(`/student/tests/${testId}/start/`, { method: 'POST', body: JSON.stringify({}) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as ApiErrorBody)?.detail || 'Test başlatılamadı');
  return data as KidsTestAttempt;
}

export async function kidsStudentSubmitTest(
  testId: number,
  answers: Record<string, string>,
  auto_submitted = false,
): Promise<KidsTestAttempt> {
  const res = await kidsAuthorizedFetch(`/student/tests/${testId}/submit/`, {
    method: 'POST',
    body: JSON.stringify({ answers, auto_submitted }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as ApiErrorBody)?.detail || 'Test gönderilemedi');
  return data as KidsTestAttempt;
}

export async function kidsClassTestReport(classId: number, testId: number): Promise<{
  test_id: number;
  class_name: string;
  title: string;
  students_total: number;
  students_submitted: number;
  average_score: number;
  students: {
    student_id: number;
    student_name: string;
    started_at: string;
    submitted_at: string | null;
    duration_seconds: number | null;
    score: number;
    total_correct: number;
    total_questions: number;
  }[];
  question_stats: {
    question_id: number;
    order: number;
    correct_count: number;
    attempt_count: number;
    success_rate: number;
  }[];
}> {
  const res = await kidsAuthorizedFetch(`/classes/${classId}/tests/${testId}/report/`, { method: 'GET' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as ApiErrorBody)?.detail || 'Test raporu yüklenemedi');
  return data as {
    test_id: number;
    class_name: string;
    title: string;
    students_total: number;
    students_submitted: number;
    average_score: number;
    students: {
      student_id: number;
      student_name: string;
      started_at: string;
      submitted_at: string | null;
      duration_seconds: number | null;
      score: number;
      total_correct: number;
      total_questions: number;
    }[];
    question_stats: {
      question_id: number;
      order: number;
      correct_count: number;
      attempt_count: number;
      success_rate: number;
    }[];
  };
}

export async function kidsClassTestStudentReport(classId: number, testId: number, studentId: number): Promise<{
  test_id: number;
  class_name: string;
  test_title: string;
  student: { id: number; name: string };
  attempt: {
    started_at: string;
    submitted_at: string | null;
    duration_seconds: number | null;
    auto_submitted: boolean;
    total_questions: number;
    total_correct: number;
    score: number;
  } | null;
  questions: {
    question_id: number;
    order: number;
    stem: string;
    topic?: string;
    subtopic?: string;
    choices: { key: string; text: string }[];
    correct_choice_key: string;
    selected_choice_key: string;
    is_correct: boolean;
  }[];
}> {
  const res = await kidsAuthorizedFetch(`/classes/${classId}/tests/${testId}/students/${studentId}/report/`, { method: 'GET' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as ApiErrorBody)?.detail || 'Öğrenci raporu yüklenemedi');
  return data as {
    test_id: number;
    class_name: string;
    test_title: string;
    student: { id: number; name: string };
    attempt: {
      started_at: string;
      submitted_at: string | null;
      duration_seconds: number | null;
      auto_submitted: boolean;
      total_questions: number;
      total_correct: number;
      score: number;
    } | null;
    questions: {
      question_id: number;
      order: number;
      stem: string;
      topic?: string;
      subtopic?: string;
      choices: { key: string; text: string }[];
      correct_choice_key: string;
      selected_choice_key: string;
      is_correct: boolean;
    }[];
  };
}

export async function kidsCreateAnnouncement(body: {
  scope: 'class' | 'school';
  kids_class?: number | null;
  school?: number | null;
  target_role?: 'all' | 'parent' | 'student' | 'teacher';
  title: string;
  body: string;
  category?: KidsAnnouncementCategory;
  is_pinned?: boolean;
  is_published?: boolean;
  expires_at?: string | null;
}): Promise<KidsAnnouncement> {
  const res = await kidsAuthorizedFetch('/announcements/', { method: 'POST', body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as ApiErrorBody)?.detail || 'Duyuru oluşturulamadı');
  return data as KidsAnnouncement;
}

export async function kidsUploadAnnouncementAttachment(
  announcementId: number,
  file: File,
): Promise<KidsAnnouncement> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await kidsAuthorizedFetch(`/announcements/${announcementId}/attachments/`, {
    method: 'POST',
    body: fd,
  });
  const text = await res.text();
  const data = readJson<{ announcement?: KidsAnnouncement } & ApiErrorBody>(text);
  if (!res.ok) throw new Error(kidsFirstApiErrorMessage(data, 'Dosya yüklenemedi'));
  if (!data?.announcement) throw new Error('Yanıt eksik');
  return data.announcement;
}

export async function kidsDeleteAnnouncementAttachment(
  announcementId: number,
  attachmentId: number,
): Promise<KidsAnnouncement> {
  const res = await kidsAuthorizedFetch(`/announcements/${announcementId}/attachments/${attachmentId}/`, {
    method: 'DELETE',
  });
  const text = await res.text();
  const data = readJson<{ announcement?: KidsAnnouncement } & ApiErrorBody>(text);
  if (!res.ok) throw new Error(kidsFirstApiErrorMessage(data, 'Dosya silinemedi'));
  if (!data?.announcement) throw new Error('Yanıt eksik');
  return data.announcement;
}

export async function kidsPatchAnnouncement(
  announcementId: number,
  body: Partial<{
    title: string;
    body: string;
    category: KidsAnnouncementCategory;
    is_pinned: boolean;
    is_published: boolean;
    expires_at: string | null;
    target_role: 'all' | 'parent' | 'student' | 'teacher';
  }>,
): Promise<KidsAnnouncement> {
  const res = await kidsAuthorizedFetch(`/announcements/${announcementId}/`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as ApiErrorBody)?.detail || 'Duyuru güncellenemedi');
  return data as KidsAnnouncement;
}

export async function kidsDeleteAnnouncement(announcementId: number): Promise<void> {
  const res = await kidsAuthorizedFetch(`/announcements/${announcementId}/`, { method: 'DELETE' });
  const text = await res.text();
  const data = readJson<ApiErrorBody>(text);
  if (!res.ok) throw new Error(kidsFirstApiErrorMessage(data, 'Duyuru silinemedi'));
}

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

export async function kidsOgretmenAiChat(
  message: string,
  opts?: { sinif_adi?: string; ders_adi?: string; egitim_yili?: string },
): Promise<string> {
  const res = await kidsAuthorizedFetch('/ogretmen-ai/chat/', {
    method: 'POST',
    body: JSON.stringify({ message, ...opts }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || 'AI yanıt vermedi');
  return (data as { reply: string }).reply || '';
}

export type KidsPeerSubmission = {
  id: number;
  student_name: string;
  student_avatar: string | null;
  kind: string;
  steps_payload: unknown;
  video_url: string | null;
  caption: string;
  created_at: string;
  is_teacher_pick: boolean;
};

export async function kidsGetPeerSubmissions(assignmentId: number): Promise<KidsPeerSubmission[]> {
  const res = await kidsAuthorizedFetch(`/assignments/${assignmentId}/peer-submissions/`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error('Peer teslimler alınamadı');
  return (data as { submissions: KidsPeerSubmission[] }).submissions ?? [];
}

export async function kidsOgretmenAiDersler(
  classId: number,
  egitimYili = '2025/2026',
): Promise<{ sinif_adi: string | null; dersler: string[] }> {
  const res = await kidsAuthorizedFetch(
    `/classes/${classId}/ogretmen-ai/dersler/?egitim_yili=${encodeURIComponent(egitimYili)}`,
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error('Dersler alınamadı');
  return data as { sinif_adi: string | null; dersler: string[] };
}

// ── Reading Game API ──────────────────────────────────────────────────────────

export type ReadingWord = {
  id: number;
  word: string;
  difficulty: 'easy' | 'medium' | 'hard';
  grade_level: number;
};

export type ReadingStoryQuestion = {
  id: number;
  question: string;
  options: [string, string, string];
  correct: 'a' | 'b' | 'c';
  order: number;
};

export type ReadingStory = {
  id: number;
  title: string;
  text: string;
  difficulty: 'easy' | 'medium' | 'hard';
  grade_level: number;
  questions: ReadingStoryQuestion[];
};

export async function kidsGetReadingWords(
  difficulty: 'easy' | 'medium' | 'hard',
  gradeLevel: number,
  count = 10,
): Promise<ReadingWord[]> {
  const res = await kidsAuthorizedFetch(
    `/student/reading/words/?difficulty=${difficulty}&grade_level=${gradeLevel}&count=${count}`,
  );
  const data = await res.json().catch(() => []);
  if (!res.ok) throw new Error('Kelimeler yüklenemedi');
  return data as ReadingWord[];
}

export async function kidsGetReadingStory(
  difficulty: 'easy' | 'medium' | 'hard',
  gradeLevel: number,
): Promise<ReadingStory> {
  const res = await kidsAuthorizedFetch(
    `/student/reading/story/?difficulty=${difficulty}&grade_level=${gradeLevel}`,
  );
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error('Hikaye yüklenemedi');
  return data as ReadingStory;
}

export function kidsTtsUrl(text: string, lang: 'tr' | 'en' = 'tr'): string {
  return `${kidsApiUrl('/tts/')}?text=${encodeURIComponent(text)}&lang=${lang}`;
}
