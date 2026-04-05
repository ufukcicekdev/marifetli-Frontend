'use client';

import { Suspense, useCallback, useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AlignLeft,
  Building2,
  Calendar,
  Check,
  Clock,
  Copy,
  FlaskConical,
  FolderOpen,
  Globe,
  GraduationCap,
  Heart,
  Layers,
  LayoutGrid,
  Link2,
  List as LucideList,
  ListFilter,
  LogOut,
  Medal,
  MessageCircle,
  MoreVertical,
  Music2,
  Paintbrush,
  Plus,
  QrCode,
  Rocket,
  Search,
  Star,
  TrendingUp,
  Trophy,
  Upload,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import {
  kidsAuthorizedFetch,
  kidsCreateAssignment,
  kidsCreateConversation,
  kidsCreateClassInviteLink,
  kidsCreateInvite,
  kidsDeleteClass,
  kidsListAssignments,
  kidsPatchAssignment,
  parseKidsInviteEmails,
  kidsListStudents,
  kidsClassLocationLine,
  kidsListSchools,
  kidsPatchClass,
  kidsRemoveEnrollment,
  KIDS_CLASS_NUMERIC_GRADE_OPTIONS,
  KIDS_CLASS_SECTION_OPTIONS,
  KIDS_CLASS_SPECIAL_GRADE,
  kidsAcademicYearSelectOptions,
  kidsBuildStandardClassName,
  kidsBuildTeacherPanelClassName,
  kidsParseStandardClassName,
  kidsSchoolLocationLine,
  kidsTeacherAppConfig,
  kidsDatetimeLocalDefaultClose,
  kidsDatetimeLocalToIso,
  kidsIsoToDatetimeLocal,
  kidsWeeklyChampion,
  kidsTeacherClassPeerChallenges,
  kidsTeacherReviewPeerChallenge,
  kidsGetKindergartenDailyBoard,
  kidsPatchKindergartenDailyRecord,
  kidsPostKindergartenBulk,
  kidsPutKindergartenDayPlan,
  type KidsAssignment,
  type KidsClass,
  type KidsClassKind,
  type KidsEnrollment,
  type KidsKindergartenDailyBoardResponse,
  type KidsKindergartenDailyRecordRow,
  type KidsKindergartenSlotItem,
  type KidsPeerChallenge,
  type KidsPeerChallengeStatus,
  type KidsSchool,
  type KidsUser,
} from '@/src/lib/kids-api';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';
import { useKidsI18n } from '@/src/providers/kids-language-provider';
import {
  KidsCenteredModal,
  KidsFormField,
  KidsPanelMax,
  KidsPrimaryButton,
  KidsSecondaryButton,
  KidsSelect,
  type KidsSelectOption,
  KidsTabs,
  kidsInputClass,
  kidsLabelClass,
  kidsTextareaClass,
} from '@/src/components/kids/kids-ui';
import { KidsDateTimeField } from '@/src/components/kids/kids-datetime-field';
import { KidsPreschoolDailyBoard } from '@/src/components/kids/kids-preschool-daily-board';

const VIDEO_DURATION_VALUES = [60, 120, 180] as const;
const SUBMISSION_ROUNDS_VALUES = [1, 2, 3, 4, 5] as const;
const INVITE_DAYS_VALUES = [3, 7, 14, 30] as const;

type TabId = 'general' | 'invite' | 'students' | 'kindergarten' | 'assignments' | 'peer' | 'stars';

const TEACHER_CLASS_TAB_IDS: TabId[] = [
  'general',
  'invite',
  'students',
  'kindergarten',
  'assignments',
  'peer',
  'stars',
];

function tabFromSearchParam(raw: string | null): TabId | null {
  if (!raw) return null;
  return TEACHER_CLASS_TAB_IDS.includes(raw as TabId) ? (raw as TabId) : null;
}

const BASE_TEACHER_TABS: { id: TabId; labelKey: string; icon: LucideIcon }[] = [
  { id: 'general', labelKey: 'teacherClass.tabs.class', icon: Layers },
  { id: 'invite', labelKey: 'teacherClass.tabs.invite', icon: UserPlus },
  { id: 'students', labelKey: 'teacherClass.tabs.students', icon: Users },
  { id: 'assignments', labelKey: 'teacherClass.tabs.challenges', icon: Rocket },
  { id: 'peer', labelKey: 'teacherClass.tabs.competitions', icon: Trophy },
  { id: 'stars', labelKey: 'teacherClass.tabs.star', icon: Star },
];

const PRESCHOOL_DAILY_TAB = {
  id: 'kindergarten' as const,
  labelKey: 'teacherClass.tabs.preschoolDaily',
  icon: Calendar,
};

/** Pasif sekmede ikonlar renkli; aktif sekmede mor zemin üzerinde beyaz */
const TEACHER_TAB_ICON_CLASS: Record<TabId, string> = {
  general: 'text-violet-600 dark:text-violet-400',
  invite: 'text-sky-600 dark:text-sky-400',
  students: 'text-emerald-600 dark:text-emerald-400',
  kindergarten: 'text-amber-600 dark:text-amber-400',
  assignments: 'text-fuchsia-600 dark:text-fuchsia-400',
  peer: 'text-orange-600 dark:text-orange-400',
  stars: 'text-yellow-500 dark:text-yellow-400',
};

type ChallengeFormThemeId = 'art' | 'science' | 'motion' | 'music';

const CHALLENGE_FORM_THEMES: { id: ChallengeFormThemeId; icon: LucideIcon }[] = [
  { id: 'art', icon: Paintbrush },
  { id: 'science', icon: FlaskConical },
  { id: 'motion', icon: Rocket },
  { id: 'music', icon: Music2 },
];

function challengeCardVisualTheme(assignmentId: number): ChallengeFormThemeId {
  const order: ChallengeFormThemeId[] = ['art', 'science', 'motion', 'music'];
  return order[Math.abs(assignmentId) % 4]!;
}

function isChallengeCardThemeId(v: string | null | undefined): v is ChallengeFormThemeId {
  return v === 'art' || v === 'science' || v === 'motion' || v === 'music';
}

/** Sunucuda tema yoksa (eski kayıtlar) id’ye göre renk döner. */
function assignmentCardTheme(a: KidsAssignment): ChallengeFormThemeId {
  const raw = a.challenge_card_theme;
  if (isChallengeCardThemeId(raw)) return raw;
  return challengeCardVisualTheme(a.id);
}

type AssignmentBadgeKind = 'draft' | 'planned' | 'endsSoon' | 'active' | 'ended';

function assignmentBadgeKind(a: KidsAssignment, nowMs: number): AssignmentBadgeKind {
  if (!a.is_published) return 'draft';
  const opens = a.submission_opens_at ? new Date(a.submission_opens_at).getTime() : 0;
  const closes = a.submission_closes_at ? new Date(a.submission_closes_at).getTime() : NaN;
  if (opens > nowMs) return 'planned';
  if (Number.isFinite(closes) && closes <= nowMs) return 'ended';
  if (Number.isFinite(closes) && closes - nowMs <= 86400000) return 'endsSoon';
  return 'active';
}

/** Öğrenci panelinde şu an “açık” sayılabilecek challenge (yayında, süresi dolmamış, başlangıcı gelmiş). */
function assignmentStudentFacingActive(a: KidsAssignment, nowMs: number): boolean {
  if (!a.is_published) return false;
  if (a.submission_opens_at) {
    const opens = new Date(a.submission_opens_at).getTime();
    if (!Number.isNaN(opens) && opens > nowMs) return false;
  }
  const closes = a.submission_closes_at ? new Date(a.submission_closes_at).getTime() : NaN;
  if (Number.isFinite(closes) && closes <= nowMs) return false;
  return true;
}

/** KPI: süresi dolmamış yayınlanmış challenge’lar (planlı dahil). */
function assignmentIncludedInKpis(a: KidsAssignment, nowMs: number): boolean {
  if (!a.is_published) return false;
  const closes = a.submission_closes_at ? new Date(a.submission_closes_at).getTime() : NaN;
  if (Number.isFinite(closes) && closes <= nowMs) return false;
  return true;
}

function challengeCardHeaderGradient(themeId: ChallengeFormThemeId): string {
  switch (themeId) {
    case 'art':
      return 'from-pink-500 via-rose-400 to-fuchsia-600';
    case 'science':
      return 'from-sky-500 via-blue-600 to-violet-700';
    case 'motion':
      return 'from-amber-400 via-orange-500 to-red-500';
    case 'music':
      return 'from-violet-500 via-purple-600 to-indigo-700';
    default:
      return 'from-violet-600 to-fuchsia-600';
  }
}

function assignmentDeadlinePillText(a: KidsAssignment, nowMs: number, translate: (key: string) => string): string {
  const raw = a.submission_closes_at;
  if (!raw) return translate('teacherClass.assignments.deadlineOpen');
  const end = new Date(raw).getTime();
  if (!Number.isFinite(end) || end <= nowMs) return translate('teacherClass.assignments.deadlineEnded');
  const dayMs = 86400000;
  const days = Math.ceil((end - nowMs) / dayMs);
  if (days <= 1) return translate('teacherClass.assignments.deadlineTomorrow');
  if (days === 2) return translate('teacherClass.assignments.deadlineTwoDays');
  return translate('teacherClass.assignments.deadlineNDays').replace('{n}', String(days));
}

function truncateInviteUrlDisplay(url: string, head = 22, tail = 6): string {
  if (url.length <= head + tail + 3) return url;
  return `${url.slice(0, head)}…${url.slice(-tail)}`;
}

function studentDisplayName(en: KidsEnrollment): string {
  return [en.student.first_name, en.student.last_name].filter(Boolean).join(' ').trim() || en.student.email;
}

function studentInitials(en: KidsEnrollment): string {
  const f = (en.student.first_name || '').trim();
  const l = (en.student.last_name || '').trim();
  const a = f.charAt(0) || en.student.email.charAt(0) || '?';
  const b = l.charAt(0) || '';
  return (a + b).toUpperCase();
}

function studentsParticipationPercent(list: KidsEnrollment[]): number | null {
  if (list.length === 0) return null;
  const parts: number[] = [];
  for (const e of list) {
    const pub = e.class_published_assignment_count;
    if (typeof pub !== 'number' || pub <= 0) continue;
    const sub = e.assignments_submitted_count ?? 0;
    parts.push(Math.min(100, Math.round((sub / pub) * 100)));
  }
  if (parts.length === 0) return null;
  return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
}

function ClassSettingsFieldRow({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">{label}</p>
      <div className="mt-1.5 flex min-h-[52px] items-center gap-3 rounded-xl bg-zinc-100 px-3 py-2.5 sm:gap-3.5 sm:px-4 dark:bg-zinc-800/90">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 shadow-sm ring-1 ring-violet-200/80 dark:bg-violet-950/70 dark:text-violet-300 dark:ring-violet-700/50"
          aria-hidden
        >
          <Icon className="h-[22px] w-[22px]" strokeWidth={2.35} />
        </span>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

function localDateInputValue(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isKidsPreschoolClass(c: KidsClass | null | undefined): boolean {
  const k = c?.class_kind;
  return k === 'anasinifi' || k === 'kindergarten';
}

function peerRowStatusTr(s: KidsPeerChallengeStatus, t: (key: string) => string): string {
  switch (s) {
    case 'pending_teacher':
      return t('teacherClass.peer.status.pending');
    case 'pending_parent':
      return t('teacherClass.peer.status.pendingParent');
    case 'rejected':
      return t('teacherClass.peer.status.rejected');
    case 'active':
      return t('teacherClass.peer.status.active');
    case 'ended':
      return t('teacherClass.peer.status.ended');
    default:
      return s;
  }
}

function peerStatusBadgeClass(s: KidsPeerChallengeStatus): string {
  switch (s) {
    case 'pending_teacher':
      return 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200';
    case 'pending_parent':
      return 'bg-violet-100 text-violet-900 dark:bg-violet-950/40 dark:text-violet-200';
    case 'rejected':
      return 'bg-rose-100 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200';
    case 'active':
      return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200';
    case 'ended':
      return 'bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100';
    default:
      return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200';
  }
}

function formatStarWeekRangeLabel(weekStartIso: string, lang: string): string {
  const raw = (weekStartIso || '').trim();
  if (!raw) return '';
  const start = new Date(raw.includes('T') ? raw : `${raw}T12:00:00`);
  if (Number.isNaN(start.getTime())) return '';
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const loc = lang === 'tr' ? 'tr-TR' : lang === 'ge' ? 'de-DE' : 'en-US';
  return `${start.toLocaleDateString(loc, { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString(loc, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })}`;
}

function starStudentDisplayName(u: KidsUser): string {
  return [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || u.email;
}

function starStudentInitials(u: KidsUser): string {
  const f = (u.first_name || '').trim();
  const l = (u.last_name || '').trim();
  const a = f.charAt(0) || u.email.charAt(0) || '?';
  const b = l.charAt(0) || '';
  return (a + b).toUpperCase();
}

function KidsTeacherClassPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const classId = Number(params.id);
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();
  const { t, language } = useKidsI18n();
  const [tab, setTab] = useState<TabId>(() => tabFromSearchParam(searchParams.get('tab')) ?? 'general');

  const [cls, setCls] = useState<KidsClass | null>(null);
  const [schools, setSchools] = useState<KidsSchool[]>([]);
  const [students, setStudents] = useState<KidsEnrollment[]>([]);
  const [assignments, setAssignments] = useState<KidsAssignment[]>([]);
  const [champion, setChampion] = useState<{
    week_start: string;
    top: { student: KidsUser; submission_count: number }[];
  } | null>(null);
  const [starsLoading, setStarsLoading] = useState(false);
  const [peerChallenges, setPeerChallenges] = useState<KidsPeerChallenge[]>([]);
  const [peerLoading, setPeerLoading] = useState(false);
  const [rejectNoteById, setRejectNoteById] = useState<Record<number, string>>({});

  const [editName, setEditName] = useState('');
  const [editClassNonStandard, setEditClassNonStandard] = useState(false);
  const [editClassGrade, setEditClassGrade] = useState('4');
  const [editClassSection, setEditClassSection] = useState('A');
  const [editAcademicYear, setEditAcademicYear] = useState('');
  const [editLanguage, setEditLanguage] = useState<'tr' | 'en' | 'ge'>('tr');
  const [editDesc, setEditDesc] = useState('');
  const [editSchoolId, setEditSchoolId] = useState<string>('');
  const [savingClass, setSavingClass] = useState(false);

  const [inviteEmailsText, setInviteEmailsText] = useState('');
  const [inviteDays, setInviteDays] = useState(7);
  const [inviting, setInviting] = useState(false);
  const [classInviteUrl, setClassInviteUrl] = useState('');
  const [inviteQrOpen, setInviteQrOpen] = useState(false);
  const [creatingClassLink, setCreatingClassLink] = useState(false);
  const [studentsSearchQuery, setStudentsSearchQuery] = useState('');
  const [studentsNameSortDesc, setStudentsNameSortDesc] = useState(false);
  /** Sunucu `KIDS_INVITE_EMAIL_ENABLED` — kapaliyken e-posta davet formu gosterilmez. */
  const [inviteEmailEnabled, setInviteEmailEnabled] = useState(true);
  /** Sunucu `KIDS_ASSIGNMENT_VIDEO_ENABLED` — kapaliyken challenge’da video teslim secenegi yok. */
  const [assignmentVideoEnabled, setAssignmentVideoEnabled] = useState(true);

  const [asgTitle, setAsgTitle] = useState('');
  const [asgPurpose, setAsgPurpose] = useState('');
  const [asgMaterials, setAsgMaterials] = useState('');
  const [asgMaterialTags, setAsgMaterialTags] = useState<string[]>([]);
  const [asgMaterialDraft, setAsgMaterialDraft] = useState('');
  const [asgChallengeTheme, setAsgChallengeTheme] = useState<ChallengeFormThemeId>('art');
  const [assignmentsViewMode, setAssignmentsViewMode] = useState<'grid' | 'list'>('grid');
  /** Challenge listesi: tüm kayıtlar veya yalnızca öğrenciye açık / süresi dolmamış olanlar. */
  const [assignmentsListFilter, setAssignmentsListFilter] = useState<'all' | 'active'>('active');
  const [asgVideoSec, setAsgVideoSec] = useState<60 | 120 | 180>(120);
  /** Ayni konu altinda ogrencinin teslim edecegi ayri challenge sayisi (1–5). */
  const [asgSubmissionRounds, setAsgSubmissionRounds] = useState<1 | 2 | 3 | 4 | 5>(1);
  /** Ogrenci teslim turu: gorsel/adim adim veya video (ikisi birden degil). */
  const [asgMediaType, setAsgMediaType] = useState<'image' | 'video'>('image');
  /** Teslime baslangic (zorunlu), `YYYY-MM-DDTHH:mm` */
  const [asgOpenAt, setAsgOpenAt] = useState('');
  /** Son teslim (zorunlu), `YYYY-MM-DDTHH:mm` */
  const [asgCloseAt, setAsgCloseAt] = useState('');
  const [asgSaving, setAsgSaving] = useState(false);
  const [isNewChallengeOpen, setIsNewChallengeOpen] = useState(false);
  const [editAssignment, setEditAssignment] = useState<KidsAssignment | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPurpose, setEditPurpose] = useState('');
  const [editMaterials, setEditMaterials] = useState('');
  const [editVideoSec, setEditVideoSec] = useState<60 | 120 | 180>(120);
  const [editSubmissionRounds, setEditSubmissionRounds] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [editMediaType, setEditMediaType] = useState<'image' | 'video'>('image');
  const [editOpenAt, setEditOpenAt] = useState('');
  const [editCloseAt, setEditCloseAt] = useState('');
  const [editChallengeTheme, setEditChallengeTheme] = useState<ChallengeFormThemeId>('art');
  const [editSaving, setEditSaving] = useState(false);
  /** Modal `<dialog>` ust katmanda oldugu icin toast gorunmez; hata bu metinle gosterilir. */
  const [editAssignmentError, setEditAssignmentError] = useState<string | null>(null);
  const [deletingClass, setDeletingClass] = useState(false);
  const [deleteClassModalOpen, setDeleteClassModalOpen] = useState(false);
  const [removingEnrollmentId, setRemovingEnrollmentId] = useState<number | null>(null);

  const [kgDate, setKgDate] = useState(() => localDateInputValue());
  const [kgBoard, setKgBoard] = useState<KidsKindergartenDailyBoardResponse | null>(null);
  const [kgPlanDraft, setKgPlanDraft] = useState('');
  const [kgLoading, setKgLoading] = useState(false);
  const [kgSavingPlan, setKgSavingPlan] = useState(false);
  const [kgPatchingStudents, setKgPatchingStudents] = useState<Set<number>>(() => new Set());
  const [kgBulkTarget, setKgBulkTarget] = useState<'all_enrolled' | 'present_only'>('all_enrolled');
  const [kgBulkNote, setKgBulkNote] = useState('');
  const [kgBulkBusy, setKgBulkBusy] = useState(false);

  const editNameId = useId();
  const editClassGradeId = useId();
  const editClassSectionId = useId();
  const editAcademicYearId = useId();
  const editLanguageId = useId();
  const editDescId = useId();
  const editSchoolSelectId = useId();
  const inviteEmailsId = useId();
  const classLinkInputId = useId();
  const studentsSearchInputId = useId();
  const asgTitleId = useId();
  const asgOpenAtId = useId();
  const asgCloseAtId = useId();
  const newChallengeSectionId = useId();
  const editAsgTitleId = useId();
  const editAsgOpenAtId = useId();
  const editAsgCloseAtId = useId();
  const videoDurationOptions = useMemo<KidsSelectOption[]>(
    () =>
      VIDEO_DURATION_VALUES.map((v) => ({
        value: String(v),
        label: `${Math.max(1, Math.floor(v / 60))} ${t('teacherClass.assignments.minuteUnit')}`,
      })),
    [t],
  );
  const submissionRoundsOptions = useMemo<KidsSelectOption[]>(
    () =>
      SUBMISSION_ROUNDS_VALUES.map((v) => ({
        value: String(v),
        label: `${v} ${t('teacherClass.assignments.challengeUnit')}`,
      })),
    [t],
  );
  const inviteDaysOptions = useMemo<KidsSelectOption[]>(
    () =>
      INVITE_DAYS_VALUES.map((v) => ({
        value: String(v),
        label: `${v} ${t('teacherClass.invite.dayUnit')}`,
      })),
    [t],
  );
  const classLanguageOptions = useMemo<KidsSelectOption[]>(
    () => [
      { value: 'tr', label: t('profile.language.tr') },
      { value: 'en', label: t('profile.language.en') },
      { value: 'ge', label: t('profile.language.ge') },
    ],
    [t],
  );
  const editClassGradeOptions = useMemo<KidsSelectOption[]>(
    () => [
      { value: KIDS_CLASS_SPECIAL_GRADE.PRE_PRIMARY, label: t('teacher.panel.programPrePrimary') },
      ...KIDS_CLASS_NUMERIC_GRADE_OPTIONS,
    ],
    [t],
  );

  const teacherTabs = useMemo(() => {
    if (!isKidsPreschoolClass(cls)) return BASE_TEACHER_TABS;
    const ix = BASE_TEACHER_TABS.findIndex((x) => x.id === 'assignments');
    return [...BASE_TEACHER_TABS.slice(0, ix), PRESCHOOL_DAILY_TAB, ...BASE_TEACHER_TABS.slice(ix)];
  }, [cls]);

  const studentsParticipation = useMemo(() => studentsParticipationPercent(students), [students]);

  const filteredStudents = useMemo(() => {
    const q = studentsSearchQuery.trim().toLowerCase();
    let list = students;
    if (q) {
      list = students.filter((e) => {
        const name = studentDisplayName(e).toLowerCase();
        const email = e.student.email.toLowerCase();
        const idStr = String(e.student.id);
        return name.includes(q) || email.includes(q) || idStr.includes(q);
      });
    }
    const loc = language === 'tr' ? 'tr' : language === 'ge' ? 'de' : 'en';
    return [...list].sort((a, b) => {
      const an = studentDisplayName(a).toLowerCase();
      const bn = studentDisplayName(b).toLowerCase();
      return studentsNameSortDesc ? bn.localeCompare(an, loc) : an.localeCompare(bn, loc);
    });
  }, [students, studentsSearchQuery, studentsNameSortDesc, language]);

  const mergeKgRecord = useCallback((studentId: number, rec: KidsKindergartenDailyRecordRow) => {
    setKgBoard((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        rows: prev.rows.map((r) => (r.student.id === studentId ? { ...r, record: rec } : r)),
      };
    });
  }, []);

  const loadKgBoard = useCallback(async () => {
    if (!Number.isFinite(classId) || !isKidsPreschoolClass(cls)) return;
    setKgLoading(true);
    try {
      const data = await kidsGetKindergartenDailyBoard(classId, kgDate);
      setKgBoard(data);
      setKgPlanDraft(data.plan.plan_text || '');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('teacherClass.kindergarten.loadError'));
      setKgBoard(null);
    } finally {
      setKgLoading(false);
    }
  }, [classId, cls, kgDate, t]);

  const kgPatchField = useCallback(
    async (
      studentId: number,
      body: Partial<{
        present: boolean | null;
        meal_ok: boolean | null;
        nap_ok: boolean | null;
        meal_slots: KidsKindergartenSlotItem[];
        nap_slots: KidsKindergartenSlotItem[];
        teacher_day_note: string;
      }>,
    ) => {
      if (!Number.isFinite(classId)) return;
      setKgPatchingStudents((s) => new Set(s).add(studentId));
      try {
        const rec = await kidsPatchKindergartenDailyRecord(classId, studentId, body, kgDate);
        mergeKgRecord(studentId, rec);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t('teacherClass.kindergarten.patchError'));
      } finally {
        setKgPatchingStudents((s) => {
          const n = new Set(s);
          n.delete(studentId);
          return n;
        });
      }
    },
    [classId, kgDate, mergeKgRecord, t],
  );

  const kgSavePlan = useCallback(async () => {
    if (!Number.isFinite(classId) || !isKidsPreschoolClass(cls)) return;
    setKgSavingPlan(true);
    try {
      const plan = await kidsPutKindergartenDayPlan(classId, { plan_text: kgPlanDraft }, kgDate);
      setKgBoard((prev) => (prev ? { ...prev, plan } : prev));
      toast.success(t('teacherClass.kindergarten.planSaved'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('teacherClass.kindergarten.planSaveError'));
    } finally {
      setKgSavingPlan(false);
    }
  }, [classId, cls, kgDate, kgPlanDraft, t]);

  const kgRunBulk = useCallback(
    async (body: Parameters<typeof kidsPostKindergartenBulk>[1]) => {
      if (!Number.isFinite(classId)) return;
      setKgBulkBusy(true);
      try {
        const res = await kidsPostKindergartenBulk(classId, { target: kgBulkTarget, ...body }, kgDate);
        if (res.action === 'send_digest') {
          const failed = res.failed_student_ids.length;
          toast.success(
            t('teacherClass.kindergarten.bulkDigestToast')
              .replace('{sent}', String(res.digest_sent))
              .replace('{skip}', String(res.skipped_no_record)),
          );
          if (failed > 0) {
            toast.error(t('teacherClass.kindergarten.bulkDigestPartialFail').replace('{n}', String(failed)));
          }
        } else {
          toast.success(t('teacherClass.kindergarten.bulkUpdatedToast').replace('{n}', String(res.updated)));
        }
        await loadKgBoard();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t('teacherClass.kindergarten.bulkError'));
      } finally {
        setKgBulkBusy(false);
      }
    },
    [classId, kgBulkTarget, kgDate, loadKgBoard, t],
  );

  useEffect(() => {
    setAsgCloseAt((v) => v || kidsDatetimeLocalDefaultClose(7));
  }, []);

  useEffect(() => {
    if (!cls) return;
    if (tab === 'kindergarten' && !isKidsPreschoolClass(cls)) {
      setTab('general');
    }
  }, [cls, tab]);

  useEffect(() => {
    if (tab !== 'kindergarten' || !cls || !isKidsPreschoolClass(cls)) return;
    void loadKgBoard();
  }, [tab, cls, loadKgBoard]);

  useEffect(() => {
    const t = tabFromSearchParam(searchParams.get('tab'));
    if (t) setTab(t);
  }, [searchParams]);

  const loadAll = useCallback(async () => {
    if (!Number.isFinite(classId)) return;
    try {
      const res = await kidsAuthorizedFetch(`/classes/${classId}/`, { method: 'GET' });
      if (!res.ok) {
        toast.error(t('teacherClass.classNotFound'));
        router.replace(`${pathPrefix}/ogretmen/panel`);
        return;
      }
      const c = (await res.json()) as KidsClass;
      const [schList, st, as] = await Promise.all([
        kidsListSchools(),
        kidsListStudents(classId),
        kidsListAssignments(classId),
      ]);
      setCls(c);
      setSchools([...schList].sort((a, b) => a.name.localeCompare(b.name, 'tr')));
      const p = kidsParseStandardClassName(c.name);
      if (p) {
        setEditClassNonStandard(false);
        setEditClassGrade(p.grade);
        setEditClassSection(p.section);
        setEditName(c.name);
      } else {
        setEditClassNonStandard(true);
        setEditClassGrade('4');
        setEditClassSection('A');
        setEditName(c.name);
      }
      setEditAcademicYear((c.academic_year_label || '').trim());
      setEditLanguage(c.language === 'en' || c.language === 'ge' ? c.language : 'tr');
      setEditDesc(c.description || '');
      setEditSchoolId(String(c.school.id));
      setStudents(st);
      setAssignments(as);
    } catch {
      toast.error(t('teacherClass.dataLoadError'));
    }
  }, [classId, pathPrefix, router, t]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      router.replace(kidsLoginPortalHref(pathPrefix, 'ogretmen'));
      return;
    }
    loadAll();
  }, [authLoading, user, router, pathPrefix, loadAll]);

  useEffect(() => {
    if (authLoading || !user) return;
    if (user.role !== 'teacher' && user.role !== 'admin') return;
    let cancelled = false;
    kidsTeacherAppConfig()
      .then((c) => {
        if (!cancelled) {
          setInviteEmailEnabled(c.invite_email_enabled);
          setAssignmentVideoEnabled(c.assignment_video_enabled ?? true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setInviteEmailEnabled(true);
          setAssignmentVideoEnabled(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  useEffect(() => {
    if (!assignmentVideoEnabled && asgMediaType === 'video') {
      setAsgMediaType('image');
    }
  }, [assignmentVideoEnabled, asgMediaType]);

  useEffect(() => {
    if (!assignmentVideoEnabled && editMediaType === 'video') {
      setEditMediaType('image');
    }
  }, [assignmentVideoEnabled, editMediaType]);

  const loadPeerChallenges = useCallback(async () => {
    if (!Number.isFinite(classId)) return;
    setPeerLoading(true);
    try {
      const list = await kidsTeacherClassPeerChallenges(classId);
      setPeerChallenges(list);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('teacherClass.competitionsLoadError'));
    } finally {
      setPeerLoading(false);
    }
  }, [classId, t]);

  const loadChampion = useCallback(async () => {
    if (!Number.isFinite(classId)) return;
    setStarsLoading(true);
    try {
      const data = await kidsWeeklyChampion(classId);
      setChampion(data);
    } catch {
      toast.error(t('teacherClass.stars.loadFailed'));
    } finally {
      setStarsLoading(false);
    }
  }, [classId, t]);

  useEffect(() => {
    if (tab !== 'peer' || !cls) return;
    void loadPeerChallenges();
  }, [tab, cls, loadPeerChallenges]);

  useEffect(() => {
    if (tab !== 'stars' || !cls) return;
    void loadChampion();
  }, [tab, cls, loadChampion]);

  const starNominees = useMemo((): { student: KidsUser; submission_count: number }[] => {
    if (!champion?.top.length) return [];
    const top = champion.top;
    let rest = top.slice(1, 5);
    if (rest.length === 0 && top.length === 1) {
      const wid = top[0]!.student.id;
      rest = students
        .filter((e) => e.student.id !== wid)
        .sort((a, b) => (b.assignments_submitted_count ?? 0) - (a.assignments_submitted_count ?? 0))
        .slice(0, 4)
        .map((e) => ({
          student: e.student as KidsUser,
          submission_count: e.assignments_submitted_count ?? 0,
        }));
    }
    return rest;
  }, [champion, students]);

  const classStarActiveCount = useMemo(
    () => students.filter((e) => (e.assignments_submitted_count ?? 0) > 0).length,
    [students],
  );

  const starsMaxSubmission = useMemo(() => {
    if (!champion?.top.length) return 1;
    return Math.max(...champion.top.map((r) => r.submission_count), 1);
  }, [champion]);

  const starsMaxGrowthPoints = useMemo(() => {
    const pts: number[] = [];
    if (champion?.top.length) {
      for (const r of champion.top) pts.push(r.student.growth_points ?? 0);
    }
    for (const e of students) pts.push((e.student as KidsUser).growth_points ?? 0);
    return Math.max(...pts, 1);
  }, [champion, students]);

  /** Planlanmis / yayindan kalkmis: tum alanlar. Yayindaki: baslangic + challenge tur sayisi kilitli (backend ile ayni mantik). */
  function isAssignmentEditFullyFree(a: KidsAssignment): boolean {
    if (!a.is_published) return true;
    const raw = a.submission_opens_at;
    if (!raw) return false;
    const t = new Date(raw).getTime();
    if (Number.isNaN(t)) return false;
    return t > Date.now();
  }

  const openAssignmentEdit = useCallback((a: KidsAssignment) => {
    setEditAssignment(a);
    setEditAssignmentError(null);
    setEditTitle(a.title);
    setEditPurpose(a.purpose || '');
    setEditMaterials(a.materials || '');
    setEditVideoSec(a.video_max_seconds);
    if (a.require_video && !a.require_image) setEditMediaType('video');
    else setEditMediaType('image');
    setEditSubmissionRounds((a.submission_rounds ?? 1) as 1 | 2 | 3 | 4 | 5);
    setEditOpenAt(kidsIsoToDatetimeLocal(a.submission_opens_at));
    const closeLocal = kidsIsoToDatetimeLocal(a.submission_closes_at);
    setEditCloseAt(closeLocal || kidsDatetimeLocalDefaultClose(7));
    setEditChallengeTheme(assignmentCardTheme(a));
  }, []);

  const { liveAssignments, plannedAssignments } = useMemo(() => {
    const now = Date.now();
    const live: KidsAssignment[] = [];
    const planned: KidsAssignment[] = [];
    for (const a of assignments) {
      if (!a.is_published) {
        live.push(a);
        continue;
      }
      const raw = a.submission_opens_at;
      const opensMs = raw ? new Date(raw).getTime() : NaN;
      if (raw && !Number.isNaN(opensMs) && opensMs > now) planned.push(a);
      else live.push(a);
    }
    planned.sort((x, y) => {
      const tx = x.submission_opens_at ? new Date(x.submission_opens_at).getTime() : 0;
      const ty = y.submission_opens_at ? new Date(y.submission_opens_at).getTime() : 0;
      return tx - ty;
    });
    return { liveAssignments: live, plannedAssignments: planned };
  }, [assignments]);

  const adventureAssignments = useMemo(
    () => [...plannedAssignments, ...liveAssignments],
    [plannedAssignments, liveAssignments],
  );

  const displayedAdventureAssignments = useMemo(() => {
    const now = Date.now();
    if (assignmentsListFilter === 'all') return adventureAssignments;
    return adventureAssignments.filter((a) => assignmentStudentFacingActive(a, now));
  }, [adventureAssignments, assignmentsListFilter]);

  const classChallengeKpis = useMemo(() => {
    const now = Date.now();
    let num = 0;
    let den = 0;
    let pending = 0;
    for (const a of assignments) {
      if (!assignmentIncludedInKpis(a, now)) continue;
      const enr = Math.max(1, a.enrolled_student_count ?? students.length);
      const sub = a.submission_count ?? 0;
      num += sub;
      den += enr;
      pending += Math.max(0, enr - sub);
    }
    const submissionRatePct = den > 0 ? Math.round((num / den) * 100) : 0;
    return { submissionRatePct, pendingSubmissions: pending };
  }, [assignments, students.length]);

  const editAcademicYearOptions = useMemo(() => {
    const base = kidsAcademicYearSelectOptions();
    const v = (editAcademicYear || '').trim();
    if (v && !base.some((o) => o.value === v)) {
      return [{ value: v, label: `${v} (kayitli)` }, ...base.filter((o) => o.value !== '')];
    }
    return base;
  }, [editAcademicYear]);

  async function saveClass(e: React.FormEvent) {
    e.preventDefault();
    if (!cls) return;
    const sidRaw = editSchoolId.trim();
    const sid = Number(sidRaw);
    if (!sidRaw || !Number.isFinite(sid) || sid <= 0) {
      toast.error(t('teacherClass.general.selectSchoolError'));
      return;
    }
    let nameToSave: string;
    if (!canEditClassIdentity) {
      nameToSave = cls.name;
    } else if (editClassNonStandard) {
      nameToSave = editName.trim();
      if (!nameToSave) {
        toast.error(t('teacherClass.general.classNameRequired'));
        return;
      }
    } else {
      if (!editClassGrade || !editClassSection) {
        toast.error(t('teacherClass.general.gradeSectionRequired'));
        return;
      }
      nameToSave = kidsBuildTeacherPanelClassName(editClassGrade, editClassSection);
    }
    let classKind: KidsClassKind | undefined;
    if (canEditClassIdentity && !editClassNonStandard) {
      if (editClassGrade === KIDS_CLASS_SPECIAL_GRADE.PRE_PRIMARY) classKind = 'anasinifi';
      else classKind = 'standard';
    }
    setSavingClass(true);
    try {
      const updated = await kidsPatchClass(cls.id, {
        name: nameToSave,
        academic_year_label: canEditClassIdentity ? editAcademicYear.trim() : (cls.academic_year_label || '').trim(),
        language: editLanguage,
        description: editDesc.trim(),
        school_id: sid,
        ...(classKind !== undefined ? { class_kind: classKind } : {}),
      });
      setCls(updated);
      toast.success(t('teacherClass.general.updated'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.saveFailed'));
    } finally {
      setSavingClass(false);
    }
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    const emails = parseKidsInviteEmails(inviteEmailsText);
    if (emails.length === 0) {
      toast.error(t('teacherClass.invite.enterEmailOrUseLink'));
      return;
    }
    setInviting(true);
    try {
      const { summary, invites } = await kidsCreateInvite({
        kids_class_id: classId,
        parent_emails: emails,
        expires_days: inviteDays,
      });
      setInviteEmailsText('');
      if (summary.emails_failed === 0) {
        toast.success(
          summary.total === 1
            ? t('teacherClass.invite.emailSentSingle')
            : t('teacherClass.invite.emailSentMultiple').replace('{count}', String(summary.total)),
        );
      } else if (summary.emails_sent === 0) {
        const err = invites[0]?.email_error || t('teacherClass.invite.emailFailed');
        toast.error(`${t('teacherClass.invite.savedButEmailFailed')}: ${err}`, { duration: 10_000 });
        const first = invites[0]?.signup_url;
        if (first && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          try {
            await navigator.clipboard.writeText(first);
            toast(t('teacherClass.invite.firstLinkCopied'), { duration: 6000 });
          } catch {
            /* ignore */
          }
        }
      } else {
        toast.success(
          t('teacherClass.invite.partialSendResult')
            .replace('{sent}', String(summary.emails_sent))
            .replace('{failed}', String(summary.emails_failed)),
          { duration: 8000 },
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('teacherClass.invite.createFailed'));
    } finally {
      setInviting(false);
    }
  }

  async function createClassShareLink() {
    if (!Number.isFinite(classId)) return;
    setCreatingClassLink(true);
    try {
      const r = await kidsCreateClassInviteLink(classId, inviteDays);
      setClassInviteUrl(r.signup_url);
      try {
        await navigator.clipboard?.writeText(r.signup_url);
        toast.success(t('teacherClass.invite.linkCreatedAndCopied'), { duration: 4000 });
      } catch {
        toast.success(t('teacherClass.invite.linkCreatedCopyBelow'), { duration: 5000 });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('teacherClass.invite.linkCreateFailed'));
    } finally {
      setCreatingClassLink(false);
    }
  }

  async function createAssignment(e: React.FormEvent) {
    e.preventDefault();
    if (!asgTitle.trim()) {
      toast.error(t('teacherClass.assignments.titleRequired'));
      return;
    }
    const closeIso = kidsDatetimeLocalToIso(asgCloseAt);
    if (!closeIso) {
      toast.error(t('teacherClass.assignments.closeAtRequired'));
      return;
    }
    const openIso = kidsDatetimeLocalToIso(asgOpenAt);
    if (!openIso) {
      toast.error(t('teacherClass.assignments.openAtRequired'));
      return;
    }
    setAsgSaving(true);
    try {
      const a = await kidsCreateAssignment(classId, {
        title: asgTitle.trim(),
        purpose: asgPurpose.trim(),
        materials: (asgMaterialTags.length ? asgMaterialTags.join(', ') : asgMaterials).trim(),
        video_max_seconds: asgVideoSec,
        require_image: asgMediaType === 'image',
        require_video: asgMediaType === 'video',
        submission_rounds: asgSubmissionRounds,
        challenge_card_theme: asgChallengeTheme,
        is_published: true,
        submission_opens_at: openIso,
        submission_closes_at: closeIso,
      });
      setAssignments((prev) => [a, ...prev]);
      setAsgTitle('');
      setAsgPurpose('');
      setAsgMaterials('');
      setAsgMaterialTags([]);
      setAsgMaterialDraft('');
      setAsgChallengeTheme('art');
      setAsgOpenAt('');
      setAsgCloseAt(kidsDatetimeLocalDefaultClose(7));
      setAsgMediaType('image');
      setAsgSubmissionRounds(1);
      setAsgVideoSec(120);
      const plannedLater = new Date(openIso).getTime() > Date.now();
      toast.success(
        plannedLater
          ? t('teacherClass.assignments.plannedSuccess')
          : t('teacherClass.assignments.publishedSuccess'),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('teacherClass.assignments.createFailed'));
    } finally {
      setAsgSaving(false);
    }
  }

  async function saveAssignmentEdit(e: React.FormEvent) {
    e.preventDefault();
    setEditAssignmentError(null);
    if (!editAssignment) return;
    if (!editTitle.trim()) {
      setEditAssignmentError(t('teacherClass.assignments.titleRequired'));
      return;
    }
    const closeIso = kidsDatetimeLocalToIso(editCloseAt);
    if (!closeIso) {
      setEditAssignmentError(t('teacherClass.assignments.closeAtRequired'));
      return;
    }
    const free = isAssignmentEditFullyFree(editAssignment);
    let openIso: string | undefined;
    if (free) {
      const parsed = kidsDatetimeLocalToIso(editOpenAt);
      if (!parsed) {
        setEditAssignmentError(t('teacherClass.assignments.openAtRequired'));
        return;
      }
      openIso = parsed;
    }
    setEditSaving(true);
    try {
      const body: Parameters<typeof kidsPatchAssignment>[2] = {
        title: editTitle.trim(),
        purpose: editPurpose.trim(),
        materials: editMaterials.trim(),
        video_max_seconds: editVideoSec,
        require_image: editMediaType === 'image',
        require_video: editMediaType === 'video',
        challenge_card_theme: editChallengeTheme,
        submission_closes_at: closeIso,
      };
      if (free) {
        body.submission_opens_at = openIso!;
        body.submission_rounds = editSubmissionRounds;
      }
      const updated = await kidsPatchAssignment(classId, editAssignment.id, body);
      setAssignments((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      setEditAssignment(null);
      setEditAssignmentError(null);
      toast.success(t('teacherClass.assignments.updated'));
    } catch (err) {
      setEditAssignmentError(err instanceof Error ? err.message : t('teacherClass.assignments.updateFailed'));
    } finally {
      setEditSaving(false);
    }
  }

  async function reviewPeerChallengeRow(chId: number, decision: 'approve' | 'reject') {
    try {
      await kidsTeacherReviewPeerChallenge(classId, chId, {
        decision,
        rejection_note: rejectNoteById[chId] ?? '',
      });
      toast.success(decision === 'approve' ? t('teacherClass.peer.approved') : t('teacherClass.peer.rejected'));
      setRejectNoteById((prev) => {
        const next = { ...prev };
        delete next[chId];
        return next;
      });
      await loadPeerChallenges();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('teacherClass.actionFailed'));
    }
  }

  async function startParentConversation(en: KidsEnrollment) {
    try {
      const display = `${en.student.first_name} ${en.student.last_name}`.trim() || en.student.email;
      const conv = await kidsCreateConversation({
        student_id: en.student.id,
        kids_class_id: classId,
        topic: `${display} · ${cls?.name || t('announcements.class')}`,
      });
      toast.success(t('teacherClass.conversationOpened'));
      router.push(`${pathPrefix}/mesajlar/${conv.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('teacherClass.conversationOpenFailed'));
    }
  }

  function peerStarterLabel(ch: KidsPeerChallenge) {
    if (!ch.created_by_student) return '—';
    const en = students.find((e) => e.student.id === ch.created_by_student);
    if (!en) return `${t('teacherClass.students.fallbackStudent')} #${ch.created_by_student}`;
    return [en.student.first_name, en.student.last_name].filter(Boolean).join(' ') || en.student.email;
  }

  async function removeStudentFromClass(en: KidsEnrollment) {
    const label = [en.student.first_name, en.student.last_name].filter(Boolean).join(' ').trim() || en.student.email;
    const ok = window.confirm(
      t('teacherClass.students.removeConfirm').replace('{name}', label),
    );
    if (!ok) return;
    setRemovingEnrollmentId(en.id);
    try {
      await kidsRemoveEnrollment(classId, en.id);
      setStudents((prev) => prev.filter((x) => x.id !== en.id));
      try {
        setAssignments(await kidsListAssignments(classId));
      } catch {
        /* challenge ozetleri guncellenemedi */
      }
      toast.success(t('teacherClass.students.removed'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('teacherClass.actionFailed'));
    } finally {
      setRemovingEnrollmentId(null);
    }
  }

  async function executeDeleteClass() {
    if (!cls) return;
    setDeletingClass(true);
    try {
      await kidsDeleteClass(cls.id);
      setDeleteClassModalOpen(false);
      toast.success(t('teacherClass.classDeleted'));
      router.replace(`${pathPrefix}/ogretmen/panel`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('teacherClass.classDeleteFailed'));
    } finally {
      setDeletingClass(false);
    }
  }

  if (authLoading || !user) {
    return (
      <KidsPanelMax>
        <p className="text-center text-violet-800 dark:text-violet-200">{t('common.loading')}</p>
      </KidsPanelMax>
    );
  }

  if (!cls) {
    return (
      <KidsPanelMax>
        <p className="text-center text-violet-800 dark:text-violet-200">{t('common.loading')}</p>
      </KidsPanelMax>
    );
  }

  const classLocationLine = kidsClassLocationLine(cls);
  const canEditClassIdentity = user.role === 'admin';

  const selectInFieldClass =
    'min-h-[44px] w-full justify-between gap-2 rounded-none border-0 bg-transparent px-0 py-0 text-left text-base font-medium text-slate-900 shadow-none ring-0 focus:border-0 focus:ring-0 focus-visible:ring-0 dark:text-white';

  return (
    <KidsPanelMax className="max-w-6xl! px-4 py-6 pb-12 sm:px-6">
      <nav
        className="mb-5 text-sm text-zinc-500 dark:text-zinc-400"
        aria-label={t('teacherClass.headerBreadcrumbAria')}
      >
        <Link
          href={`${pathPrefix}/ogretmen/panel`}
          className="font-semibold text-violet-700 hover:underline dark:text-violet-300"
        >
          {t('teacherClass.headerBreadcrumbParent')}
        </Link>
        <span className="mx-1.5 text-zinc-400" aria-hidden>
          ›
        </span>
        <span className="font-medium text-zinc-800 dark:text-zinc-200">{cls.name}</span>
      </nav>

      <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-100/90 py-1 pr-3 pl-2 text-xs font-bold uppercase tracking-wider text-violet-800 ring-1 ring-violet-200/90 dark:bg-violet-950/60 dark:text-violet-200 dark:ring-violet-700/60">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-violet-700 shadow-sm dark:bg-violet-900 dark:text-violet-300">
              <GraduationCap className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
            </span>
            {t('teacherClass.panel')}
          </div>
          <h1 className="mt-2 font-logo text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            {cls.name}
            {(cls.academic_year_label || '').trim() ? (
              <span className="ml-3 align-middle text-xl font-bold text-zinc-500 dark:text-zinc-400 sm:text-2xl">
                {(cls.academic_year_label || '').trim()}
              </span>
            ) : null}
          </h1>
          {tab === 'students' ? (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {t('teacherClass.students.pageSubtitle')}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-gray-100">
              <Users className="h-4 w-4 text-violet-700 dark:text-violet-300" strokeWidth={2.5} aria-hidden />
              {t('teacherClass.headerStatStudent').replace('{count}', String(students.length))}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-gray-100">
              <Rocket className="h-4 w-4 text-fuchsia-700 dark:text-fuchsia-300" strokeWidth={2.5} aria-hidden />
              {t('teacherClass.headerStatChallenges').replace('{count}', String(assignments.length))}
            </span>
          </div>
          {classLocationLine ? (
            <p className="mt-3 max-w-2xl text-sm font-medium text-zinc-600 dark:text-zinc-400">{classLocationLine}</p>
          ) : null}
        </div>
        <div className="flex w-full shrink-0 flex-col gap-3 sm:flex-row lg:w-auto lg:max-w-md lg:flex-col xl:max-w-none xl:flex-row">
          <div className="flex min-h-[88px] min-w-0 flex-1 items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700 ring-2 ring-violet-200/80 dark:bg-violet-950/60 dark:text-violet-300 dark:ring-violet-800/60">
              <Users className="h-6 w-6" strokeWidth={2.35} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {t('teacherClass.students.statTotalLabel')}
              </p>
              <p className="font-logo text-3xl font-black text-slate-900 dark:text-white">{students.length}</p>
            </div>
          </div>
          <div className="flex min-h-[88px] min-w-0 flex-1 items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 ring-2 ring-rose-200/80 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-900/50">
              <TrendingUp className="h-6 w-6" strokeWidth={2.35} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {t('teacherClass.students.statParticipationLabel')}
              </p>
              <p className="font-logo text-3xl font-black text-slate-900 dark:text-white" title={t('teacherClass.students.statParticipationHint')}>
                {studentsParticipation === null ? '—' : `%${studentsParticipation}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      <KidsTabs
        tabs={teacherTabs.map((row) => {
          const Icon = row.icon;
          const activeTab = tab === row.id;
          return {
            id: row.id,
            label: t(row.labelKey),
            icon: (
              <Icon
                className={`h-4 w-4 shrink-0 ${activeTab ? 'text-white' : TEACHER_TAB_ICON_CLASS[row.id]}`}
                strokeWidth={2.25}
                aria-hidden
              />
            ),
          };
        })}
        active={tab}
        onChange={(id) => setTab(id as TabId)}
        ariaLabel={t('teacherClass.tabs.aria')}
        variant="outline"
      />

      {tab === 'general' && (
        <section className="rounded-3xl border border-zinc-100 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
          <h2 className="border-l-[5px] border-violet-700 pl-4 font-logo text-xl font-bold text-slate-900 dark:border-violet-500 dark:text-white">
            {t('teacherClass.general.title')}
          </h2>
          <p className="mt-2 pl-4 text-sm text-zinc-600 dark:text-zinc-400">{t('teacherClass.general.subtitle')}</p>
          <p className="mt-1 pl-4 text-xs text-zinc-500 dark:text-zinc-500">{t('teacherClass.general.schoolHint')}</p>

          <form className="mt-8 space-y-5" onSubmit={saveClass}>
            <ClassSettingsFieldRow label={t('schools.title')} icon={Building2}>
              <KidsSelect
                id={editSchoolSelectId}
                value={editSchoolId}
                onChange={setEditSchoolId}
                disabled={schools.length === 0}
                buttonClassName={selectInFieldClass}
                options={schools.map((s) => ({
                  value: String(s.id),
                  label: kidsSchoolLocationLine(s) || s.name,
                }))}
              />
            </ClassSettingsFieldRow>

            {editClassNonStandard ? (
              <ClassSettingsFieldRow label={t('teacherClass.general.customClassName')} icon={FolderOpen}>
                <input
                  id={editNameId}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full border-0 bg-transparent p-0 text-base font-medium text-slate-900 outline-none placeholder:text-zinc-400 disabled:opacity-60 dark:text-white"
                  maxLength={200}
                  disabled={!canEditClassIdentity}
                />
              </ClassSettingsFieldRow>
            ) : (
              <>
                <div className="grid gap-5 sm:grid-cols-2">
                  <ClassSettingsFieldRow label={t('teacher.panel.classLevel')} icon={Layers}>
                    <KidsSelect
                      id={editClassGradeId}
                      value={editClassGrade}
                      onChange={setEditClassGrade}
                      options={editClassGradeOptions}
                      searchable={false}
                      disabled={!canEditClassIdentity}
                      buttonClassName={selectInFieldClass}
                    />
                  </ClassSettingsFieldRow>
                  <ClassSettingsFieldRow label={t('teacher.panel.section')} icon={FolderOpen}>
                    <KidsSelect
                      id={editClassSectionId}
                      value={editClassSection}
                      onChange={setEditClassSection}
                      options={KIDS_CLASS_SECTION_OPTIONS}
                      searchable
                      disabled={!canEditClassIdentity}
                      buttonClassName={selectInFieldClass}
                    />
                  </ClassSettingsFieldRow>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {t('teacherClass.general.preview')}:{' '}
                  <strong className="font-logo text-slate-900 dark:text-white">
                    {kidsBuildTeacherPanelClassName(editClassGrade, editClassSection)}
                  </strong>
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-500">{t('teacherClass.general.gradeHint')}</p>
              </>
            )}

            <ClassSettingsFieldRow label={t('teacher.panel.academicYear')} icon={Calendar}>
              <KidsSelect
                id={editAcademicYearId}
                value={editAcademicYear}
                onChange={setEditAcademicYear}
                options={editAcademicYearOptions}
                searchable={false}
                disabled
                buttonClassName={selectInFieldClass}
              />
            </ClassSettingsFieldRow>
            <p className="-mt-3 text-xs text-zinc-500 dark:text-zinc-500">{t('teacherClass.general.academicYearHint')}</p>

            <ClassSettingsFieldRow label={t('teacherClass.general.language')} icon={Globe}>
              <KidsSelect
                id={editLanguageId}
                value={editLanguage}
                onChange={(next) => setEditLanguage(next as 'tr' | 'en' | 'ge')}
                options={classLanguageOptions}
                searchable={false}
                buttonClassName={selectInFieldClass}
              />
            </ClassSettingsFieldRow>
            <p className="-mt-3 text-xs text-zinc-500 dark:text-zinc-500">{t('teacherClass.general.languageHint')}</p>

            <ClassSettingsFieldRow label={t('teacherHomework.description')} icon={AlignLeft}>
              <textarea
                id={editDescId}
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={3}
                className="w-full resize-y border-0 bg-transparent p-0 text-base text-slate-900 outline-none placeholder:text-zinc-400 dark:text-white"
              />
            </ClassSettingsFieldRow>
            <p className="-mt-3 text-xs text-zinc-500 dark:text-zinc-500">{t('teacherClass.general.descriptionHint')}</p>

            <KidsPrimaryButton type="submit" disabled={savingClass}>
              {savingClass ? t('profile.saving') : t('profile.save')}
            </KidsPrimaryButton>
          </form>

          <div className="mt-10 border-t border-rose-200/80 pt-6 dark:border-rose-900/50">
            <h3 className="font-logo text-base font-bold text-rose-900 dark:text-rose-100">{t('teacherClass.general.dangerTitle')}</h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-gray-400">{t('teacherClass.general.dangerHint')}</p>
            <KidsSecondaryButton
              type="button"
              className="mt-4 border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40"
              disabled={deletingClass}
              onClick={() => setDeleteClassModalOpen(true)}
            >
              {t('teacherClass.general.deleteClass')}
            </KidsSecondaryButton>
          </div>
        </section>
      )}

      {tab === 'invite' && (
        <>
          {inviteQrOpen && classInviteUrl ? (
            <KidsCenteredModal title={t('teacherClass.invite.qrModalTitle')} onClose={() => setInviteQrOpen(false)}>
              <div className="flex flex-col items-center gap-4 py-2">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(classInviteUrl)}`}
                  alt=""
                  width={220}
                  height={220}
                  className="rounded-2xl border border-zinc-200 bg-white p-2 dark:border-zinc-600"
                />
                <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">{t('teacherClass.invite.qrScanHint')}</p>
              </div>
            </KidsCenteredModal>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-5 lg:gap-8">
            <div className="rounded-3xl border border-zinc-100 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 sm:p-8 lg:col-span-3">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <h2 className="font-logo text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
                  {t('teacherClass.invite.heroTitle')}
                </h2>
                <div
                  className="rounded-2xl bg-violet-100 p-3 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300"
                  aria-hidden
                >
                  <UserPlus className="h-8 w-8" strokeWidth={1.75} />
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{t('teacherClass.invite.heroLead')}</p>
              <ul className="mt-6 space-y-3">
                {(['heroFeature1', 'heroFeature2', 'heroFeature3'] as const).map((key) => (
                  <li key={key} className="flex gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300">
                      <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                    </span>
                    <span className="text-sm leading-snug text-zinc-700 dark:text-zinc-300">
                      {t(`teacherClass.invite.${key}`)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-xs text-zinc-500 dark:text-zinc-500">{t('teacherClass.invite.subtitle')}</p>
            </div>

            <div className="space-y-4 lg:col-span-2">
              <div className="rounded-3xl bg-zinc-100/90 p-5 dark:bg-zinc-800/50">
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {t('teacherClass.invite.linkValidity')}
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">{t('teacherClass.invite.linkValidityHint')}</p>
                <div className="mt-4">
                  <KidsSelect
                    id="invite-days"
                    value={String(inviteDays)}
                    onChange={(v) => setInviteDays(Number(v))}
                    options={inviteDaysOptions}
                  />
                </div>
                <button
                  type="button"
                  disabled={creatingClassLink}
                  onClick={() => void createClassShareLink()}
                  className="mt-4 flex w-full min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-violet-600 px-6 text-sm font-bold text-white shadow-lg shadow-violet-500/30 transition hover:bg-violet-500 disabled:pointer-events-none disabled:opacity-50 dark:bg-violet-600 dark:hover:bg-violet-500"
                >
                  <Link2 className="h-5 w-5 shrink-0" aria-hidden />
                  {creatingClassLink ? t('teacherClass.invite.creatingLink') : t('teacherClass.invite.createLink')}
                </button>
                {classInviteUrl ? (
                  <div className="mt-4 space-y-2">
                    <label htmlFor={classLinkInputId} className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                      {t('teacherClass.invite.shareableLink')}
                    </label>
                    <input
                      id={classLinkInputId}
                      readOnly
                      value={classInviteUrl}
                      className={kidsInputClass}
                      onFocus={(e) => e.target.select()}
                    />
                    <p className="text-xs text-zinc-500 dark:text-zinc-500">{t('teacherClass.invite.shareableLinkHint')}</p>
                  </div>
                ) : null}
              </div>

              <div className="rounded-3xl border border-zinc-100 bg-white p-5 shadow-md dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex gap-3">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300"
                    aria-hidden
                  >
                    <QrCode className="h-6 w-6" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-logo text-base font-bold text-slate-900 dark:text-white">
                      {t('teacherClass.invite.qrTitle')}
                    </h3>
                    <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{t('teacherClass.invite.qrSubtitle')}</p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!classInviteUrl}
                  onClick={() => classInviteUrl && setInviteQrOpen(true)}
                  className="mt-4 text-sm font-bold text-violet-600 underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-40 dark:text-violet-400"
                >
                  {t('teacherClass.invite.qrCta')}
                </button>
              </div>

              <div className="rounded-3xl border border-zinc-100 bg-white p-5 shadow-md dark:border-zinc-800 dark:bg-zinc-900">
                <h3 className="flex items-center gap-2 font-logo text-base font-bold text-slate-900 dark:text-white">
                  <Clock className="h-5 w-5 text-violet-600 dark:text-violet-400" aria-hidden />
                  {t('teacherClass.invite.recentTitle')}
                </h3>
                {classInviteUrl ? (
                  <div className="mt-4 flex items-center gap-3 rounded-2xl bg-zinc-50 px-3 py-3 dark:bg-zinc-800/60">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                      <Link2 className="h-4 w-4" aria-hidden />
                    </span>
                    <p className="min-w-0 flex-1 truncate font-mono text-sm text-zinc-800 dark:text-zinc-200">
                      {truncateInviteUrlDisplay(classInviteUrl)}
                    </p>
                    <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      {t('teacherClass.invite.activeBadge')}
                    </span>
                    <button
                      type="button"
                      title={t('teacherClass.invite.copyLink')}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-800 dark:hover:bg-zinc-600 dark:hover:text-white"
                      onClick={() => {
                        void navigator.clipboard?.writeText(classInviteUrl).then(
                          () => toast.success(t('teacherClass.invite.copied')),
                          () => toast.error(t('teacherClass.invite.copyFailed')),
                        );
                      }}
                    >
                      <Copy className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">{t('teacherClass.invite.recentEmpty')}</p>
                )}
              </div>
            </div>
          </div>

          {inviteEmailEnabled ? (
            <div className="relative mt-10 rounded-3xl border border-zinc-100 bg-white p-6 shadow-lg dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                {t('teacherClass.invite.optional')}
              </p>
              <h3 className="font-logo text-base font-bold text-slate-900 dark:text-white">{t('teacherClass.invite.emailTitle')}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {t('teacherClass.invite.emailSubtitle')}
              </p>
              <form className="mt-5 space-y-5" onSubmit={sendInvite}>
                <KidsFormField
                  id={inviteEmailsId}
                  label={t('teacherClass.invite.parentEmails')}
                  hint={t('teacherClass.invite.parentEmailsHint')}
                >
                  <textarea
                    id={inviteEmailsId}
                    rows={4}
                    value={inviteEmailsText}
                    onChange={(e) => setInviteEmailsText(e.target.value)}
                    className={kidsTextareaClass}
                    placeholder={'anne@ornek.com\nbaba@ornek.com'}
                    aria-describedby={`${inviteEmailsId}-hint`}
                  />
                </KidsFormField>
                <KidsPrimaryButton type="submit" disabled={inviting}>
                  {inviting ? t('teacherClass.invite.sending') : t('teacherClass.invite.sendEmails')}
                </KidsPrimaryButton>
              </form>
            </div>
          ) : (
            <p className="mt-8 text-xs text-zinc-500 dark:text-zinc-400">{t('teacherClass.invite.emailDisabled')}</p>
          )}
        </>
      )}

      {tab === 'students' && (
        <section className="rounded-3xl border border-zinc-100 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="font-logo text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
                {t('teacherClass.students.title')}
              </h2>
              <p className="mt-1 max-w-xl text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                {t('teacherClass.students.subtitle')}
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto lg:max-w-lg">
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-violet-600 dark:text-violet-400"
                  strokeWidth={2.5}
                  aria-hidden
                />
                <input
                  id={studentsSearchInputId}
                  type="search"
                  value={studentsSearchQuery}
                  onChange={(e) => setStudentsSearchQuery(e.target.value)}
                  placeholder={t('teacherClass.students.searchPlaceholder')}
                  autoComplete="off"
                  className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 py-2.5 pr-3 pl-10 text-sm font-medium text-slate-900 outline-none transition placeholder:text-zinc-400 focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-400/25 dark:border-zinc-600 dark:bg-zinc-800/80 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-violet-500 dark:focus:bg-zinc-900"
                />
              </div>
              <button
                type="button"
                aria-pressed={studentsNameSortDesc}
                title={
                  studentsNameSortDesc
                    ? t('teacherClass.students.sortNameAscHint')
                    : t('teacherClass.students.sortNameDescHint')
                }
                onClick={() => setStudentsNameSortDesc((v) => !v)}
                className="flex h-11 w-full shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-violet-700 shadow-sm transition hover:border-violet-300 hover:bg-violet-50 sm:w-11 dark:border-zinc-600 dark:bg-zinc-800 dark:text-violet-300 dark:hover:border-violet-600 dark:hover:bg-violet-950/40"
              >
                <ListFilter className="h-5 w-5" strokeWidth={2.35} aria-hidden />
                <span className="sr-only">{t('teacherClass.students.filterAria')}</span>
              </button>
            </div>
          </div>

          {students.length === 0 ? (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 px-6 py-10 text-center dark:border-zinc-700 dark:bg-zinc-800/40 sm:col-span-2 lg:col-span-2">
                <p className="font-logo text-lg font-bold text-slate-800 dark:text-white">{t('teacherClass.students.emptyTitle')}</p>
                <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600 dark:text-zinc-400">{t('teacherClass.students.emptyDesc')}</p>
              </div>
              <button
                type="button"
                onClick={() => setTab('invite')}
                className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50/30 p-6 text-center transition hover:border-violet-400 hover:bg-violet-50/40 dark:border-zinc-600 dark:bg-zinc-900/30 dark:hover:border-violet-600 dark:hover:bg-violet-950/20"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-100 text-violet-700 ring-2 ring-violet-200/80 dark:bg-violet-950/60 dark:text-violet-300 dark:ring-violet-800/60">
                  <UserPlus className="h-7 w-7" strokeWidth={2.25} aria-hidden />
                </span>
                <span className="font-logo text-base font-bold text-slate-800 dark:text-white">{t('teacherClass.students.addNewCard')}</span>
              </button>
            </div>
          ) : (
            <>
              {filteredStudents.length === 0 ? (
                <p className="mt-8 text-center text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  {t('teacherClass.students.searchNoResults')}
                </p>
              ) : null}
              <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredStudents.map((en) => {
                  const pic = en.student.profile_picture;
                  const pub = en.class_published_assignment_count;
                  const sub = en.assignments_submitted_count ?? 0;
                  const pubLabel = typeof pub === 'number' ? String(pub) : '—';
                  const subLabel = typeof pub === 'number' ? String(sub) : '—';
                  return (
                    <article
                      key={en.id}
                      className="relative flex flex-col rounded-2xl border border-zinc-100 bg-white p-4 shadow-lg ring-1 ring-black/[0.03] dark:border-zinc-800 dark:bg-zinc-900 dark:ring-white/5"
                    >
                      <details className="absolute top-3 right-3 z-10">
                        <summary className="flex cursor-pointer list-none items-center justify-center rounded-full p-2 text-zinc-600 outline-none hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-violet-400 dark:text-zinc-300 dark:hover:bg-zinc-800 [&::-webkit-details-marker]:hidden">
                          <span className="sr-only">{t('teacherClass.students.menuAria')}</span>
                          <MoreVertical className="h-5 w-5" strokeWidth={2.25} aria-hidden />
                        </summary>
                        <div
                          className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
                          role="menu"
                        >
                          <button
                            type="button"
                            role="menuitem"
                            className="flex w-full px-4 py-2.5 text-left text-sm font-medium text-slate-800 hover:bg-zinc-50 dark:text-gray-100 dark:hover:bg-zinc-800"
                            onClick={(e) => {
                              void navigator.clipboard?.writeText(en.student.email).then(
                                () => {
                                  toast.success(t('teacherClass.students.emailCopied'));
                                  (e.currentTarget.closest('details') as HTMLDetailsElement | null)?.removeAttribute(
                                    'open',
                                  );
                                },
                                () => toast.error(t('teacherClass.invite.copyFailed')),
                              );
                            }}
                          >
                            {t('teacherClass.students.menuCopyEmail')}
                          </button>
                          <p className="border-t border-zinc-100 px-4 py-2 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                            {t('teacherClass.students.registered')}: {new Date(en.created_at).toLocaleDateString(language)}
                          </p>
                        </div>
                      </details>

                      <div className="flex gap-3 pr-10">
                        {pic ? (
                          <img
                            src={pic}
                            alt={studentDisplayName(en)}
                            className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-violet-100 dark:ring-violet-900/50"
                          />
                        ) : (
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-violet-100 font-logo text-lg font-black text-violet-800 ring-2 ring-violet-200/80 dark:bg-violet-950/60 dark:text-violet-200 dark:ring-violet-800/60">
                            {studentInitials(en)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-logo text-base font-bold text-slate-900 dark:text-white">
                            {studentDisplayName(en)}
                          </p>
                          <p className="mt-0.5 truncate text-sm text-zinc-500 dark:text-zinc-400">{en.student.email}</p>
                          <p className="mt-1 text-xs font-medium text-zinc-400 dark:text-zinc-500">
                            {t('teacherClass.students.studentIdLabel').replace('{id}', String(en.student.id))}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <div className="rounded-xl bg-zinc-100 px-3 py-2.5 dark:bg-zinc-800/90">
                          <p className="text-[9px] font-bold uppercase leading-tight tracking-wide text-zinc-500 dark:text-zinc-400">
                            {t('teacherClass.students.publishedChallenges')}
                          </p>
                          <p className="mt-1 font-logo text-2xl font-black text-slate-900 dark:text-white">{pubLabel}</p>
                        </div>
                        <div className="rounded-xl bg-zinc-100 px-3 py-2.5 dark:bg-zinc-800/90">
                          <p className="text-[9px] font-bold uppercase leading-tight tracking-wide text-zinc-500 dark:text-zinc-400">
                            {t('teacherClass.students.submitted')}
                          </p>
                          <p className="mt-1 font-logo text-2xl font-black text-slate-900 dark:text-white">{subLabel}</p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => void startParentConversation(en)}
                          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-violet-600 px-4 text-sm font-bold text-white shadow-md shadow-violet-500/25 transition hover:bg-violet-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 dark:bg-violet-600 dark:hover:bg-violet-500"
                        >
                          <MessageCircle className="h-5 w-5 shrink-0" strokeWidth={2.25} aria-hidden />
                          {t('teacherClass.students.messageParent')}
                        </button>
                        <button
                          type="button"
                          disabled={removingEnrollmentId === en.id}
                          onClick={() => void removeStudentFromClass(en)}
                          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-zinc-200 bg-zinc-100 px-4 text-sm font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-rose-300 dark:hover:bg-rose-950/30"
                        >
                          <LogOut className="h-4 w-4 shrink-0" strokeWidth={2.35} aria-hidden />
                          {removingEnrollmentId === en.id ? t('teacherClass.students.removing') : t('teacherClass.students.removeFromClass')}
                        </button>
                      </div>
                    </article>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setTab('invite')}
                  className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50/30 p-6 text-center transition hover:border-violet-400 hover:bg-violet-50/40 dark:border-zinc-600 dark:bg-zinc-900/30 dark:hover:border-violet-600 dark:hover:bg-violet-950/20"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-100 text-violet-700 ring-2 ring-violet-200/80 dark:bg-violet-950/60 dark:text-violet-300 dark:ring-violet-800/60">
                    <UserPlus className="h-7 w-7" strokeWidth={2.25} aria-hidden />
                  </span>
                  <span className="font-logo text-base font-bold text-slate-800 dark:text-white">{t('teacherClass.students.addNewCard')}</span>
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {tab === 'kindergarten' && isKidsPreschoolClass(cls) && (
        <section className="max-w-none overflow-visible rounded-3xl border border-zinc-100 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
          <KidsPreschoolDailyBoard
            kgDate={kgDate}
            setKgDate={setKgDate}
            kgBoard={kgBoard}
            kgLoading={kgLoading}
            kgPlanDraft={kgPlanDraft}
            setKgPlanDraft={setKgPlanDraft}
            kgSavingPlan={kgSavingPlan}
            onSavePlan={() => void kgSavePlan()}
            onRefresh={() => void loadKgBoard()}
            kgPatchField={kgPatchField}
            kgPatchingStudents={kgPatchingStudents}
            kgBulkTarget={kgBulkTarget}
            setKgBulkTarget={setKgBulkTarget}
            kgRunBulk={(b) => void kgRunBulk(b)}
            kgBulkBusy={kgBulkBusy}
            kgBulkNote={kgBulkNote}
            setKgBulkNote={setKgBulkNote}
            t={t}
            locale={language}
          />
        </section>
      )}

      {tab === 'assignments' && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-slate-600 dark:text-gray-400 lg:hidden">{t('teacherClass.assignments.mobileHint')}</p>
          <div className="grid gap-6 lg:grid-cols-[minmax(17rem,22rem)_minmax(0,1fr)] lg:items-start lg:gap-8 xl:grid-cols-[minmax(19rem,24rem)_minmax(0,1fr)]">
            <section className="order-2 flex min-h-[260px] flex-col rounded-3xl border border-zinc-100 bg-white p-5 shadow-lg dark:border-zinc-800 dark:bg-zinc-900 sm:p-6 lg:order-1 lg:min-h-0">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white shadow-md shadow-violet-500/30 dark:bg-violet-500">
                  <Plus className="h-6 w-6" strokeWidth={2.5} aria-hidden />
                </span>
                <div className="min-w-0">
                  <h2 className="font-logo text-lg font-bold leading-tight text-slate-900 dark:text-white sm:text-xl">
                    {t('teacherClass.assignments.formSidebarTitle')}
                  </h2>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {assignmentVideoEnabled
                      ? t('teacherClass.assignments.videoEnabled')
                      : t('teacherClass.assignments.videoDisabled')}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{t('teacherClass.assignments.heroSubtitle')}</p>

              <button
                type="button"
                className="mt-4 flex w-full items-center justify-between rounded-2xl border border-violet-200/80 bg-violet-50/60 px-4 py-3 text-left text-sm font-bold text-violet-900 dark:border-violet-800/50 dark:bg-violet-950/30 dark:text-violet-100 lg:hidden"
                onClick={() => setIsNewChallengeOpen((v) => !v)}
                aria-expanded={isNewChallengeOpen}
                aria-controls={newChallengeSectionId}
              >
                <span>{t('teacherClass.assignments.formSidebarTitle')}</span>
                <span aria-hidden>{isNewChallengeOpen ? '▲' : '▼'}</span>
              </button>

              <div id={newChallengeSectionId} className={`mt-5 ${isNewChallengeOpen ? 'block' : 'hidden'} lg:block`}>
                <form className="space-y-4" onSubmit={createAssignment}>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      {t('teacherClass.assignments.formClassLabel')}
                    </p>
                    <div className="mt-1.5 rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-slate-800 dark:bg-zinc-800/90 dark:text-zinc-100">
                      {cls.name}
                    </div>
                  </div>
                  <div>
                    <label htmlFor={asgTitleId} className="text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      {t('teacherClass.assignments.title')}
                    </label>
                    <input
                      id={asgTitleId}
                      required
                      value={asgTitle}
                      onChange={(e) => setAsgTitle(e.target.value)}
                      className="mt-1.5 w-full rounded-2xl border-0 bg-zinc-100 px-4 py-3 text-base text-slate-900 shadow-inner shadow-zinc-200/50 outline-none ring-0 transition placeholder:text-zinc-400 focus:bg-white focus:ring-2 focus:ring-violet-400/35 dark:bg-zinc-800/80 dark:text-white dark:shadow-none dark:placeholder:text-zinc-500 dark:focus:bg-zinc-900 dark:focus:ring-violet-600/40"
                      placeholder={t('teacherClass.assignments.titlePlaceholderHomework')}
                    />
                  </div>
                  <div>
                    <label htmlFor="asg-purpose" className="text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      {t('teacherClass.assignments.descriptionLabel')}
                    </label>
                    <textarea
                      id="asg-purpose"
                      value={asgPurpose}
                      onChange={(e) => setAsgPurpose(e.target.value)}
                      rows={4}
                      className="mt-1.5 min-h-[120px] w-full resize-y rounded-2xl border-0 bg-zinc-100 px-4 py-3 text-base text-slate-900 shadow-inner shadow-zinc-200/50 outline-none ring-0 transition placeholder:text-zinc-400 focus:bg-white focus:ring-2 focus:ring-violet-400/35 dark:bg-zinc-800/80 dark:text-white dark:shadow-none dark:placeholder:text-zinc-500 dark:focus:bg-zinc-900 dark:focus:ring-violet-600/40"
                      placeholder={t('teacherClass.assignments.purposePlaceholderHomework')}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor={asgOpenAtId} className="text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        {t('teacherClass.assignments.startDateLabel')}
                      </label>
                      <div className="mt-1.5 rounded-2xl bg-zinc-100 px-2 py-2 dark:bg-zinc-800/80">
                        <KidsDateTimeField
                          id={asgOpenAtId}
                          value={asgOpenAt}
                          onChange={setAsgOpenAt}
                          required
                          placeholder={t('teacherClass.assignments.openAtPlaceholder')}
                        />
                      </div>
                      <p className="mt-1 text-[10px] text-zinc-500 dark:text-zinc-500">{t('teacherClass.assignments.openAtHint')}</p>
                    </div>
                    <div>
                      <label htmlFor={asgCloseAtId} className="text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        {t('teacherClass.assignments.deadlineLabel')}
                      </label>
                      <div className="mt-1.5 rounded-2xl bg-zinc-100 px-2 py-2 dark:bg-zinc-800/80">
                        <KidsDateTimeField
                          id={asgCloseAtId}
                          value={asgCloseAt}
                          onChange={setAsgCloseAt}
                          required
                          placeholder={t('teacherClass.assignments.closeAtPlaceholder')}
                        />
                      </div>
                      <p className="mt-1 text-[10px] text-zinc-500 dark:text-zinc-500">{t('teacherClass.assignments.closeAtHint')}</p>
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      {t('teacherClass.assignments.materialsVisualLabel')}
                    </span>
                    <div className="mt-2 rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50/80 px-3 py-4 dark:border-zinc-600 dark:bg-zinc-800/40">
                      <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                        <Upload className="h-4 w-4 text-violet-500" strokeWidth={2.25} aria-hidden />
                        {t('teacherClass.assignments.materialsVisualHint')}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {asgMaterialTags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 rounded-full bg-fuchsia-100 px-3 py-1 text-xs font-bold text-fuchsia-900 dark:bg-fuchsia-950/50 dark:text-fuchsia-100"
                          >
                            {tag}
                            <button
                              type="button"
                              className="rounded-full p-0.5 hover:bg-fuchsia-200/80 dark:hover:bg-fuchsia-900/60"
                              onClick={() => setAsgMaterialTags((prev) => prev.filter((x) => x !== tag))}
                              aria-label={t('teacherClass.assignments.removeMaterial')}
                            >
                              <X className="h-3.5 w-3.5" aria-hidden />
                            </button>
                          </span>
                        ))}
                        <input
                          value={asgMaterialDraft}
                          onChange={(e) => setAsgMaterialDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key !== 'Enter') return;
                            e.preventDefault();
                            const v = asgMaterialDraft.trim();
                            if (!v || asgMaterialTags.length >= 24) return;
                            if (asgMaterialTags.includes(v)) return;
                            setAsgMaterialTags((p) => [...p, v]);
                            setAsgMaterialDraft('');
                          }}
                          className="min-w-32 flex-1 rounded-xl border-0 bg-white/80 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-violet-400/30 dark:bg-zinc-900/60 dark:text-white sm:max-w-[200px]"
                          placeholder={t('teacherClass.assignments.materialTagPlaceholder')}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const v = asgMaterialDraft.trim();
                            if (!v || asgMaterialTags.length >= 24) return;
                            if (asgMaterialTags.includes(v)) return;
                            setAsgMaterialTags((p) => [...p, v]);
                            setAsgMaterialDraft('');
                          }}
                          className="inline-flex items-center gap-1 rounded-full border border-dashed border-violet-300 bg-violet-50/80 px-3 py-2 text-xs font-bold text-violet-700 transition hover:bg-violet-100 dark:border-violet-600 dark:bg-violet-950/40 dark:text-violet-300"
                        >
                          <Plus className="h-4 w-4" aria-hidden />
                          {t('teacherClass.assignments.addMaterialItem')}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      {t('teacherClass.assignments.categoryIconLabel')}
                    </span>
                    <div className="mt-2 flex flex-wrap gap-3">
                      {CHALLENGE_FORM_THEMES.map(({ id, icon: Icon }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setAsgChallengeTheme(id)}
                          className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition ${
                            asgChallengeTheme === id
                              ? 'border-violet-500 bg-violet-100 text-violet-800 shadow-md dark:border-violet-400 dark:bg-violet-950/60 dark:text-violet-200'
                              : 'border-zinc-200 bg-zinc-100 text-zinc-500 hover:border-violet-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                          }`}
                          aria-pressed={asgChallengeTheme === id}
                          aria-label={t(`teacherClass.assignments.theme.${id}`)}
                        >
                          <Icon className="h-5 w-5" strokeWidth={2.25} aria-hidden />
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                      {t('teacherClass.assignments.categoryIconHint')}
                    </p>
                  </div>
                  <fieldset className="rounded-2xl border-2 border-violet-100 bg-violet-50/40 p-4 dark:border-violet-900/40 dark:bg-violet-950/25">
                    <legend className="px-2 text-sm font-bold text-violet-900 dark:text-violet-100">
                      {t('teacherClass.assignments.rules')}
                    </legend>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{t('teacherClass.assignments.rulesHint')}</p>
                    <div className={`mt-3 grid gap-3 ${assignmentVideoEnabled ? 'sm:grid-cols-2' : 'sm:grid-cols-1'}`}>
                      <button
                        type="button"
                        onClick={() => setAsgMediaType('image')}
                        className={`rounded-2xl border-2 p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 ${
                          asgMediaType === 'image'
                            ? 'border-violet-500 bg-white shadow-md ring-2 ring-violet-300/60 dark:border-violet-400 dark:bg-violet-950/40 dark:ring-violet-600/40'
                            : 'border-violet-200/80 bg-white/70 hover:border-violet-300 dark:border-violet-800/60 dark:bg-zinc-900/50'
                        }`}
                      >
                        <span className="text-2xl" aria-hidden>
                          🖼️
                        </span>
                        <span className="mt-2 block font-logo text-base font-bold text-slate-900 dark:text-white">
                          {t('teacherClass.assignments.imageMode')}
                        </span>
                        <span className="mt-1 block text-xs text-zinc-600 dark:text-zinc-400">{t('teacherClass.assignments.imageModeHint')}</span>
                      </button>
                      {assignmentVideoEnabled ? (
                        <button
                          type="button"
                          onClick={() => setAsgMediaType('video')}
                          className={`rounded-2xl border-2 p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 ${
                            asgMediaType === 'video'
                              ? 'border-violet-500 bg-white shadow-md ring-2 ring-violet-300/60 dark:border-violet-400 dark:bg-violet-950/40 dark:ring-violet-600/40'
                              : 'border-violet-200/80 bg-white/70 hover:border-violet-300 dark:border-violet-800/60 dark:bg-zinc-900/50'
                          }`}
                        >
                          <span className="text-2xl" aria-hidden>
                            🎬
                          </span>
                          <span className="mt-2 block font-logo text-base font-bold text-slate-900 dark:text-white">
                            {t('teacherClass.assignments.videoMode')}
                          </span>
                          <span className="mt-1 block text-xs text-zinc-600 dark:text-zinc-400">{t('teacherClass.assignments.videoModeHint')}</span>
                        </button>
                      ) : null}
                    </div>
                    {asgMediaType === 'video' ? (
                      <div className="mt-4">
                        <label htmlFor="asg-video-duration" className={`${kidsLabelClass} block`}>
                          {t('teacherClass.assignments.videoLimit')}
                        </label>
                        <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">{t('teacherClass.assignments.videoLimitHint')}</p>
                        <KidsSelect
                          id="asg-video-duration"
                          value={String(asgVideoSec)}
                          onChange={(v) => setAsgVideoSec(Number(v) as 60 | 120 | 180)}
                          options={videoDurationOptions}
                        />
                      </div>
                    ) : null}
                    <div className="mt-4">
                      <label htmlFor="asg-submission-rounds" className={`${kidsLabelClass} block`}>
                        {t('teacherClass.assignments.roundCount')}
                      </label>
                      <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">{t('teacherClass.assignments.roundCountHint')}</p>
                      <KidsSelect
                        id="asg-submission-rounds"
                        value={String(asgSubmissionRounds)}
                        onChange={(v) => setAsgSubmissionRounds(Number(v) as 1 | 2 | 3 | 4 | 5)}
                        options={submissionRoundsOptions}
                      />
                    </div>
                  </fieldset>
                  <button
                    type="submit"
                    disabled={asgSaving}
                    className="flex w-full min-h-[52px] items-center justify-center rounded-full bg-linear-to-r from-violet-600 via-violet-500 to-fuchsia-600 px-6 text-sm font-black text-white shadow-lg shadow-violet-500/30 transition hover:from-violet-500 hover:via-violet-400 hover:to-fuchsia-500 disabled:opacity-50"
                  >
                    {asgSaving ? t('profile.saving') : t('teacherClass.assignments.publishCtaShort')}
                  </button>
                </form>
              </div>
            </section>

            <div className="order-1 flex flex-col gap-5 lg:order-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-logo text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
                    {t('teacherClass.assignments.listHomeworkTitle')}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {t('teacherClass.assignments.listHomeworkSubtitle')
                      .replace('{shown}', String(displayedAdventureAssignments.length))
                      .replace('{total}', String(adventureAssignments.length))}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div
                    className="flex rounded-full border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-600 dark:bg-zinc-800"
                    role="group"
                    aria-label={t('teacherClass.assignments.filterAria')}
                  >
                    <button
                      type="button"
                      aria-pressed={assignmentsListFilter === 'all'}
                      onClick={() => setAssignmentsListFilter('all')}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold transition sm:text-sm ${
                        assignmentsListFilter === 'all'
                          ? 'bg-white text-violet-700 shadow-sm dark:bg-zinc-900 dark:text-violet-300'
                          : 'text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      {t('teacherClass.assignments.filterAll')}
                    </button>
                    <button
                      type="button"
                      aria-pressed={assignmentsListFilter === 'active'}
                      onClick={() => setAssignmentsListFilter('active')}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold transition sm:text-sm ${
                        assignmentsListFilter === 'active'
                          ? 'bg-violet-100 text-violet-800 shadow-sm dark:bg-violet-950/50 dark:text-violet-200'
                          : 'text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      {t('teacherClass.assignments.filterActive')}
                    </button>
                  </div>
                  <div className="flex rounded-xl border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-600 dark:bg-zinc-800">
                    <button
                      type="button"
                      aria-pressed={assignmentsViewMode === 'grid'}
                      onClick={() => setAssignmentsViewMode('grid')}
                      className={`rounded-lg p-2 transition ${assignmentsViewMode === 'grid' ? 'bg-white text-violet-700 shadow-sm dark:bg-zinc-900 dark:text-violet-300' : 'text-zinc-500'}`}
                      title={t('teacherClass.assignments.viewGrid')}
                    >
                      <LayoutGrid className="h-5 w-5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      aria-pressed={assignmentsViewMode === 'list'}
                      onClick={() => setAssignmentsViewMode('list')}
                      className={`rounded-lg p-2 transition ${assignmentsViewMode === 'list' ? 'bg-white text-violet-700 shadow-sm dark:bg-zinc-900 dark:text-violet-300' : 'text-zinc-500'}`}
                      title={t('teacherClass.assignments.viewList')}
                    >
                      <LucideList className="h-5 w-5" aria-hidden />
                    </button>
                  </div>
                </div>
              </div>

              {assignments.length === 0 ? (
                <p className="rounded-2xl border border-zinc-100 bg-white p-6 text-sm text-zinc-500 shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                  {t('teacherClass.assignments.empty')}
                </p>
              ) : displayedAdventureAssignments.length === 0 ? (
                <p className="rounded-2xl border border-zinc-100 bg-white p-6 text-sm text-zinc-500 shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                  {t('teacherClass.assignments.emptyFiltered')}
                </p>
              ) : (
                <ul
                  className={
                    assignmentsViewMode === 'grid'
                      ? 'grid grid-cols-1 gap-4 sm:grid-cols-2'
                      : 'flex flex-col gap-4'
                  }
                >
                  {displayedAdventureAssignments.map((a) => {
                    const nowMs = Date.now();
                    const badge = assignmentBadgeKind(a, nowMs);
                    const themeId = assignmentCardTheme(a);
                    const headerGrad = challengeCardHeaderGradient(themeId);
                    const subN = a.submission_count ?? 0;
                    const enr = Math.max(1, a.enrolled_student_count ?? students.length);
                    const closeRaw = a.submission_closes_at;
                    const dateStr = closeRaw
                      ? new Date(closeRaw).toLocaleDateString(
                          language === 'tr' ? 'tr-TR' : language === 'ge' ? 'de-DE' : 'en-US',
                        )
                      : '—';
                    const badgeCls =
                      badge === 'planned'
                        ? 'bg-amber-100/95 text-amber-950 ring-amber-200 dark:bg-amber-950/70 dark:text-amber-100 dark:ring-amber-800'
                        : badge === 'endsSoon'
                          ? 'bg-amber-100/95 text-amber-900 ring-amber-300 dark:bg-amber-950/50 dark:text-amber-50 dark:ring-amber-700'
                          : badge === 'active'
                            ? 'bg-emerald-100/95 text-emerald-900 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-100 dark:ring-emerald-800'
                            : badge === 'draft'
                              ? 'bg-white/90 text-zinc-700 ring-zinc-200 dark:bg-zinc-900/90 dark:text-zinc-200'
                              : 'bg-white/90 text-zinc-600 ring-zinc-200 dark:bg-zinc-900/90 dark:text-zinc-400';
                    const badgeLabel =
                      badge === 'planned'
                        ? t('teacherClass.assignments.badgePlanned')
                        : badge === 'endsSoon'
                          ? t('teacherClass.assignments.badgeEndsSoon')
                          : badge === 'active'
                            ? t('teacherClass.assignments.badgeActive')
                            : badge === 'draft'
                              ? t('teacherClass.assignments.badgeDraft')
                              : t('teacherClass.assignments.badgeEnded');
                    const deadlinePill = assignmentDeadlinePillText(a, nowMs, t);
                    return (
                      <li
                        key={a.id}
                        className={`flex overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-md ring-1 ring-black/3 dark:border-zinc-800 dark:bg-zinc-900 dark:ring-white/5 ${
                          assignmentsViewMode === 'list' ? 'flex-col sm:flex-row sm:items-stretch' : 'flex-col'
                        }`}
                      >
                        <div
                          className={`relative shrink-0 bg-linear-to-br ${headerGrad} ${
                            assignmentsViewMode === 'list'
                              ? 'aspect-[16/10] sm:aspect-auto sm:h-auto sm:min-h-0 sm:w-44 sm:max-w-[11rem]'
                              : 'aspect-[16/10] w-full'
                          }`}
                        >
                          <span className="absolute left-3 top-3 max-w-[85%] truncate rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-900 shadow-sm dark:bg-black/55 dark:text-white">
                            {t(`teacherClass.assignments.themeSubject.${themeId}`)}
                          </span>
                          <span
                            className={`absolute right-3 top-3 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ring-1 ${badgeCls}`}
                          >
                            {badgeLabel}
                          </span>
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col p-4">
                          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                            <p className="min-w-0 flex-1 font-logo text-lg font-bold leading-snug text-slate-900 dark:text-white">
                              {a.title}
                            </p>
                            <p className="shrink-0 text-xs font-semibold text-zinc-400 dark:text-zinc-500">{dateStr}</p>
                          </div>
                          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                            {(a.purpose || '').trim() || t('teacherClass.assignments.noPurposeFallback')}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1.5 text-xs font-bold text-violet-900 dark:bg-violet-950/50 dark:text-violet-100">
                              <Users className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                              {t('teacherClass.assignments.cardDeliveryPill')
                                .replace('{sub}', String(subN))
                                .replace('{enr}', String(enr))}
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-100 px-3 py-1.5 text-xs font-bold text-pink-950 dark:bg-pink-950/40 dark:text-pink-100">
                              <Clock className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                              {deadlinePill}
                            </span>
                          </div>
                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => openAssignmentEdit(a)}
                              className="flex min-h-10 items-center justify-center rounded-full bg-zinc-100 px-3 text-xs font-bold text-zinc-800 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 sm:text-sm"
                            >
                              {t('teacherClass.assignments.card.edit')}
                            </button>
                            <Link
                              href={`${pathPrefix}/ogretmen/sinif/${classId}/proje/${a.id}`}
                              className="flex min-h-10 items-center justify-center rounded-full bg-violet-100 px-3 text-xs font-bold text-violet-800 transition hover:bg-violet-200 dark:bg-violet-950/50 dark:text-violet-100 dark:hover:bg-violet-900/40 sm:text-sm"
                            >
                              {t('teacherClass.assignments.cardSubmissions')}
                            </Link>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                  <li className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50/50 p-6 text-center dark:border-zinc-600 dark:bg-zinc-900/30">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-violet-300 text-violet-600 dark:border-violet-700 dark:text-violet-400">
                      <Plus className="h-7 w-7" strokeWidth={2} aria-hidden />
                    </span>
                    <p className="max-w-xs text-sm font-medium text-zinc-600 dark:text-zinc-400">{t('teacherClass.assignments.draftPlaceholder')}</p>
                  </li>
                </ul>
              )}

              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex flex-col justify-between rounded-2xl bg-linear-to-br from-violet-600 to-violet-700 p-5 text-white shadow-md shadow-violet-500/20">
                  <div className="flex items-center gap-2 text-violet-100">
                    <TrendingUp className="h-5 w-5 shrink-0" strokeWidth={2.25} aria-hidden />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{t('teacherClass.assignments.kpiPerformanceTitle')}</span>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-violet-100/90">{t('teacherClass.assignments.kpiSubmissionRate')}</p>
                    <p className="mt-1 font-logo text-3xl font-black tabular-nums">%{classChallengeKpis.submissionRatePct}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-zinc-100 border-l-4 border-l-rose-500 bg-white p-5 shadow-md dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                    <Clock className="h-5 w-5 shrink-0" strokeWidth={2.25} aria-hidden />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      {t('teacherClass.assignments.kpiPendingTitle')}
                    </span>
                  </div>
                  <p className="mt-3 font-logo text-3xl font-black text-slate-900 tabular-nums dark:text-white">
                    {classChallengeKpis.pendingSubmissions}
                  </p>
                  <p className="mt-1 text-sm font-medium text-zinc-600 dark:text-zinc-400">{t('teacherClass.assignments.kpiPendingBody')}</p>
                </div>
                <div className="rounded-2xl border border-violet-200/80 bg-linear-to-br from-pink-50 to-violet-50 p-5 shadow-md dark:border-violet-900/40 dark:from-pink-950/30 dark:to-violet-950/20">
                  <div className="flex items-center gap-2 text-violet-600 dark:text-violet-300">
                    <Star className="h-5 w-5 shrink-0" strokeWidth={2.25} aria-hidden />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      {t('teacherClass.assignments.kpiSuccessTitle')}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-zinc-600 dark:text-zinc-400">{t('teacherClass.assignments.kpiClassOfMonth')}</p>
                  <p className="mt-1 font-logo text-xl font-black text-violet-700 dark:text-violet-300">{cls.name}</p>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{t('teacherClass.assignments.kpiSuccessFoot')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'peer' && (
        <section className="rounded-3xl border border-zinc-100 border-l-4 border-l-violet-500 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="font-logo text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
                {t('teacherClass.peer.title')}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {t('teacherClass.peer.subtitle')}
              </p>
            </div>
            <button
              type="button"
              disabled={peerLoading}
              onClick={() => void loadPeerChallenges()}
              className="inline-flex shrink-0 items-center justify-center rounded-2xl border border-violet-200/80 bg-violet-50/60 px-4 py-2.5 text-sm font-bold text-violet-900 shadow-sm transition hover:bg-violet-100/80 disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-800/50 dark:bg-violet-950/30 dark:text-violet-100 dark:hover:bg-violet-950/50"
            >
              {peerLoading ? t('common.loading') : t('teacherClass.peer.refresh')}
            </button>
          </div>
          {peerLoading && peerChallenges.length === 0 ? (
            <p className="mt-8 text-sm text-zinc-600 dark:text-zinc-400">{t('common.loading')}</p>
          ) : peerChallenges.length === 0 ? (
            <div className="mt-8 flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50/60 px-6 py-12 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
              <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-violet-300 text-violet-600 dark:border-violet-700 dark:text-violet-400">
                <Trophy className="h-7 w-7" strokeWidth={2} aria-hidden />
              </span>
              <p className="max-w-sm text-sm font-medium text-zinc-600 dark:text-zinc-400">{t('teacherClass.peer.empty')}</p>
            </div>
          ) : (
            <div className="mt-8 space-y-10">
              {(() => {
                const pending = peerChallenges.filter(
                  (c) => c.status === 'pending_teacher' && c.source === 'student',
                );
                const pendingIds = new Set(pending.map((c) => c.id));
                const other = peerChallenges.filter((c) => !pendingIds.has(c.id));
                return (
                  <>
                    {pending.length > 0 ? (
                      <div className="space-y-4">
                        <h3 className="text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                          {t('teacherClass.peer.pendingTitle').replace('{count}', String(pending.length))}
                        </h3>
                        <ul className="space-y-4">
                          {pending.map((ch) => (
                            <li
                              key={ch.id}
                              className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-md dark:border-zinc-700 dark:bg-zinc-900/60 dark:shadow-none"
                            >
                              <div className="flex flex-wrap items-start gap-3">
                                <div
                                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300"
                                  aria-hidden
                                >
                                  <Trophy className="h-5 w-5" strokeWidth={2.25} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span
                                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${peerStatusBadgeClass('pending_teacher')}`}
                                    >
                                      {t('teacherClass.peer.status.pending')}
                                    </span>
                                  </div>
                                  <p className="mt-2 font-logo text-lg font-bold text-slate-900 dark:text-white">{ch.title}</p>
                                  <p className="mt-1 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                                    {t('teacherClass.peer.starter')}: {peerStarterLabel(ch)}
                                  </p>
                                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                                    {t('teacherClass.peer.roundCount')}: {Math.max(1, ch.submission_rounds ?? 1)}
                                  </p>
                                  {ch.starts_at || ch.ends_at ? (
                                    <p className="mt-1 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                                      {ch.starts_at
                                        ? `${t('competitions.start')}: ${new Date(ch.starts_at).toLocaleString(language)}`
                                        : null}
                                      {ch.starts_at && ch.ends_at ? ' · ' : null}
                                      {ch.ends_at
                                        ? `${t('competitions.end')}: ${new Date(ch.ends_at).toLocaleString(language)}`
                                        : null}
                                    </p>
                                  ) : null}
                                  {ch.description ? (
                                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                                      {ch.description}
                                    </p>
                                  ) : null}
                                  {ch.rules_or_goal ? (
                                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                                      <span className="font-bold text-zinc-800 dark:text-zinc-200">
                                        {t('competitions.rulesOptional')}:
                                      </span>{' '}
                                      {ch.rules_or_goal}
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                              <label className="mt-4 block text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                {t('teacherClass.peer.rejectNote')}
                                <textarea
                                  value={rejectNoteById[ch.id] ?? ''}
                                  onChange={(e) =>
                                    setRejectNoteById((prev) => ({ ...prev, [ch.id]: e.target.value }))
                                  }
                                  className={`${kidsTextareaClass} mt-1.5 min-h-[72px]`}
                                  maxLength={600}
                                  placeholder={t('teacherClass.peer.rejectNotePlaceholder')}
                                />
                              </label>
                              <div className="mt-4 flex flex-wrap gap-2">
                                <KidsPrimaryButton type="button" onClick={() => void reviewPeerChallengeRow(ch.id, 'approve')}>
                                  {t('teacherClass.peer.approve')}
                                </KidsPrimaryButton>
                                <KidsSecondaryButton type="button" onClick={() => void reviewPeerChallengeRow(ch.id, 'reject')}>
                                  {t('teacherClass.peer.reject')}
                                </KidsSecondaryButton>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {other.length > 0 ? (
                      <div className="space-y-4">
                        <h3 className="text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                          {t('teacherClass.peer.other')}
                        </h3>
                        <ul className="grid gap-3 sm:grid-cols-2">
                          {other.map((ch) => (
                            <li
                              key={ch.id}
                              className="flex gap-3 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/50 dark:shadow-none"
                            >
                              <div
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-violet-600 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-800 dark:text-violet-400 dark:ring-zinc-700"
                                aria-hidden
                              >
                                <Trophy className="h-5 w-5" strokeWidth={2.25} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-logo text-base font-bold leading-snug text-slate-900 dark:text-white">{ch.title}</p>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <span
                                    className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${peerStatusBadgeClass(ch.status)}`}
                                  >
                                    {peerRowStatusTr(ch.status, t)}
                                  </span>
                                  {ch.source === 'teacher' ? (
                                    <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                      {t('teacherClass.peer.byTeacher')}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </>
                );
              })()}
            </div>
          )}
        </section>
      )}

      {tab === 'stars' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="font-logo text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
                {t('teacherClass.stars.title')}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {t('teacherClass.stars.heroSubtitle')}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => toast(t('teacherClass.stars.pastStarsHint'))}
                className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-zinc-100/90 px-4 py-2.5 text-sm font-bold text-zinc-800 shadow-sm transition hover:bg-zinc-200/90 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
              >
                {t('teacherClass.stars.pastStars')}
              </button>
              <button
                type="button"
                disabled={starsLoading}
                onClick={() => void loadChampion()}
                className="inline-flex items-center justify-center rounded-full bg-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/30 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-violet-500 dark:hover:bg-violet-400"
              >
                {starsLoading ? t('common.loading') : t('teacherClass.stars.primaryCta')}
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-zinc-100 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="grid gap-0 lg:grid-cols-2 lg:items-stretch">
              <div className="relative flex min-h-[220px] flex-col justify-end bg-linear-to-br from-violet-600 via-violet-500 to-amber-300 p-6 sm:min-h-[280px] lg:min-h-[320px]">
                <div className="pointer-events-none absolute inset-0 opacity-30">
                  <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
                  <div className="absolute bottom-12 left-1/4 h-32 w-32 rounded-full bg-amber-200/40 blur-2xl" />
                </div>
                <div className="relative flex flex-1 flex-col items-center justify-center gap-2 pb-10 pt-6">
                  <Trophy className="h-20 w-20 text-white drop-shadow-lg sm:h-24 sm:w-24" strokeWidth={1.75} aria-hidden />
                  <p className="text-center font-logo text-lg font-black tracking-wide text-white/95 drop-shadow-sm">
                    {t('teacherClass.stars.visualTagline')}
                  </p>
                </div>
                <div className="relative z-10 flex flex-wrap gap-2">
                  {champion?.week_start ? (
                    <span className="rounded-full bg-black/45 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-sm">
                      {formatStarWeekRangeLabel(champion.week_start, language)}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-300 px-3 py-1.5 text-xs font-black text-amber-950 shadow-md">
                    <Star className="h-3.5 w-3.5 fill-amber-950 text-amber-950" aria-hidden />
                    {t('teacherClass.stars.weekWinnerBadge')}
                  </span>
                </div>
              </div>

              <div className="flex flex-col justify-center p-6 sm:p-8">
                {starsLoading && !champion ? (
                  <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{t('common.loading')}</p>
                ) : champion && champion.top.length > 0 ? (
                  (() => {
                    const row = champion.top[0]!;
                    const u = row.student;
                    const pic = u.profile_picture;
                    const name = starStudentDisplayName(u);
                    const helpPct = Math.min(100, Math.round((row.submission_count / starsMaxSubmission) * 100));
                    const gp = u.growth_points ?? 0;
                    const createPct = Math.min(100, Math.round((gp / Math.max(starsMaxGrowthPoints, 1)) * 100));
                    return (
                      <>
                        <div className="flex gap-4">
                          {pic ? (
                            <img
                              src={pic}
                              alt=""
                              className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-violet-200 dark:ring-violet-800"
                            />
                          ) : (
                            <div
                              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-violet-100 font-logo text-lg font-black text-violet-800 dark:bg-violet-950/60 dark:text-violet-200"
                              aria-hidden
                            >
                              {starStudentInitials(u)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-logo text-xl font-bold text-slate-900 dark:text-white">{name}</p>
                            <p className="mt-0.5 text-sm font-semibold text-violet-600 dark:text-violet-400">
                              {cls.name} · {t('teacherClass.stars.studentRole')}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                              {row.submission_count} {t('teacherClass.stars.submissions')} · {t('roadmap.growthPoints')}: {gp}
                              {u.growth_stage ? (
                                <span>
                                  {' '}
                                  · {u.growth_stage.title}
                                </span>
                              ) : null}
                            </p>
                          </div>
                        </div>
                        <h3 className="mt-6 text-sm font-black uppercase tracking-wide text-zinc-800 dark:text-zinc-200">
                          {t('teacherClass.stars.whyChosenTitle')}
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                          {t('teacherClass.stars.whyChosenBody')
                            .replace('{name}', name)
                            .replace('{count}', String(row.submission_count))}
                        </p>
                        <div className="mt-6 grid gap-4 sm:grid-cols-2">
                          <div className="rounded-2xl border border-zinc-100 bg-zinc-50/90 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
                            <p className="text-[10px] font-black uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                              {t('teacherClass.stars.skillHelpfulness')}
                            </p>
                            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-600">
                              <div
                                className="h-full rounded-full bg-violet-600 transition-all dark:bg-violet-400"
                                style={{ width: `${helpPct}%` }}
                              />
                            </div>
                          </div>
                          <div className="rounded-2xl border border-zinc-100 bg-zinc-50/90 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
                            <p className="text-[10px] font-black uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                              {t('teacherClass.stars.skillCreativity')}
                            </p>
                            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-600">
                              <div
                                className="h-full rounded-full bg-pink-600 transition-all dark:bg-pink-400"
                                style={{ width: `${createPct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()
                ) : champion && champion.top.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-zinc-300 text-zinc-400 dark:border-zinc-600">
                      <Star className="h-7 w-7" strokeWidth={2} aria-hidden />
                    </span>
                    <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{t('teacherClass.stars.emptyWeek')}</p>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">{t('teacherClass.stars.loadHint')}</p>
                )}
              </div>
            </div>
          </div>

          {champion && champion.top.length > 1 ? (
            <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/40 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900/40">
              <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {t('teacherClass.stars.leaderboardTitle')}
              </p>
              <ul className="mt-3 space-y-2">
                {champion.top.slice(1).map((row, i) => (
                  <li
                    key={row.student.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-100 bg-white px-3 py-2.5 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-800/80"
                  >
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {i + 2}. {starStudentDisplayName(row.student)}
                    </span>
                    <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-bold text-violet-800 dark:bg-violet-950/50 dark:text-violet-200">
                      {row.submission_count} {t('teacherClass.stars.submissions')}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-3xl border border-zinc-100 bg-white p-5 shadow-lg dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-logo text-lg font-bold text-slate-900 dark:text-white">
                  {t('teacherClass.stars.nomineesTitle')}
                </h3>
                <button
                  type="button"
                  onClick={() => toast(t('teacherClass.stars.seeAllHint'))}
                  className="text-sm font-bold text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
                >
                  {t('teacherClass.stars.seeAll')}
                </button>
              </div>
              {starNominees.length === 0 ? (
                <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">{t('teacherClass.stars.nomineesEmpty')}</p>
              ) : (
                <ul className="mt-5 space-y-3">
                  {starNominees.map((row) => {
                    const u = row.student;
                    const pic = u.profile_picture;
                    const sub =
                      u.growth_stage?.title ||
                      t('teacherClass.stars.nomineeSubline').replace('{n}', String(row.submission_count));
                    return (
                      <li
                        key={u.id}
                        className="relative flex items-center gap-3 rounded-2xl border border-zinc-100 bg-zinc-50/80 px-3 py-3 dark:border-zinc-700 dark:bg-zinc-800/40"
                      >
                        {pic ? (
                          <img src={pic} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
                        ) : (
                          <div
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-100 font-logo text-sm font-bold text-violet-800 dark:bg-violet-950/50 dark:text-violet-200"
                            aria-hidden
                          >
                            {starStudentInitials(u)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold text-slate-900 dark:text-white">{starStudentDisplayName(u)}</p>
                          <p className="truncate text-xs font-medium text-zinc-500 dark:text-zinc-400">{sub}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5 text-violet-500 dark:text-violet-400">
                          <Heart className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                          <Medal className="h-4 w-4 text-pink-500 dark:text-pink-400" strokeWidth={2.25} aria-hidden />
                        </div>
                        <details className="relative shrink-0">
                          <summary className="flex cursor-pointer list-none items-center justify-center rounded-full p-1.5 text-zinc-500 hover:bg-zinc-200/80 dark:text-zinc-400 dark:hover:bg-zinc-700 [&::-webkit-details-marker]:hidden">
                            <span className="sr-only">{t('teacherClass.students.menuAria')}</span>
                            <MoreVertical className="h-5 w-5" strokeWidth={2.25} aria-hidden />
                          </summary>
                          <div
                            className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
                            role="menu"
                          >
                            <button
                              type="button"
                              role="menuitem"
                              className="flex w-full px-4 py-2.5 text-left text-sm font-medium text-slate-800 hover:bg-zinc-50 dark:text-gray-100 dark:hover:bg-zinc-800"
                              onClick={(e) => {
                                void navigator.clipboard?.writeText(u.email).then(
                                  () => {
                                    toast.success(t('teacherClass.students.emailCopied'));
                                    (e.currentTarget.closest('details') as HTMLDetailsElement | null)?.removeAttribute(
                                      'open',
                                    );
                                  },
                                  () => toast.error(t('teacherClass.invite.copyFailed')),
                                );
                              }}
                            >
                              {t('teacherClass.students.menuCopyEmail')}
                            </button>
                          </div>
                        </details>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="flex flex-col justify-between rounded-3xl bg-linear-to-br from-fuchsia-900 via-purple-900 to-violet-950 p-6 text-white shadow-xl sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
                  <Trophy className="h-6 w-6 text-white" strokeWidth={2} aria-hidden />
                </div>
                <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white ring-1 ring-white/25">
                  {t('teacherClass.stars.monthReportBadge')}
                </span>
              </div>
              <div className="mt-8">
                <p className="font-logo text-3xl font-black leading-tight sm:text-4xl">
                  {t('teacherClass.stars.monthReportMain').replace('{count}', String(classStarActiveCount))}
                </p>
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/85">
                  {t('teacherClass.stars.monthReportFooter')}
                </p>
              </div>
            </section>
          </div>
        </div>
      )}

      {deleteClassModalOpen && cls ? (
        <KidsCenteredModal
          variant="danger"
          title={t('teacherClass.general.deleteClass')}
          onClose={() => {
            if (!deletingClass) setDeleteClassModalOpen(false);
          }}
          maxWidthClass="max-w-md"
          footer={
            <div className="flex flex-wrap justify-end gap-2">
              <KidsSecondaryButton type="button" disabled={deletingClass} onClick={() => setDeleteClassModalOpen(false)}>
                {t('common.cancel')}
              </KidsSecondaryButton>
              <button
                type="button"
                disabled={deletingClass}
                onClick={() => void executeDeleteClass()}
                className="inline-flex min-h-11 items-center justify-center rounded-full border-2 border-transparent bg-rose-600 px-6 text-sm font-bold text-white shadow-md transition hover:bg-rose-500 disabled:pointer-events-none disabled:opacity-50 dark:bg-rose-600 dark:hover:bg-rose-500"
              >
                {deletingClass ? t('teacherClass.general.deleting') : t('teacherClass.general.deleteClass')}
              </button>
            </div>
          }
        >
          <p className="text-sm leading-relaxed text-slate-700 dark:text-gray-300">
            {t('teacherClass.general.deleteConfirm').replace('{name}', cls.name)}
          </p>
        </KidsCenteredModal>
      ) : null}

      {editAssignment ? (
        <KidsCenteredModal
          title={t('teacherClass.assignments.editTitle')}
          onClose={() => {
            if (!editSaving) {
              setEditAssignment(null);
              setEditAssignmentError(null);
            }
          }}
          maxWidthClass="max-w-2xl"
          panelClassName="max-h-[90dvh]"
        >
          {(() => {
            const editFullyFree = isAssignmentEditFullyFree(editAssignment);
            return (
              <>
                <p className="mb-4 text-sm text-slate-600 dark:text-gray-400">
                  {editFullyFree
                    ? t('teacherClass.assignments.editFreeHint')
                    : t('teacherClass.assignments.editLockedHint')}
                </p>
                {editAssignmentError ? (
                  <div
                    role="alert"
                    className="mb-4 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-100"
                  >
                    {editAssignmentError}
                  </div>
                ) : null}
                <form className="space-y-4" onSubmit={saveAssignmentEdit}>
                  <KidsFormField id={editAsgTitleId} label={t('teacherClass.assignments.title')} required>
                    <input
                      id={editAsgTitleId}
                      required
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className={kidsInputClass}
                    />
                  </KidsFormField>
                  <KidsFormField id="edit-asg-purpose" label={t('teacherClass.assignments.purpose')}>
                    <textarea
                      id="edit-asg-purpose"
                      value={editPurpose}
                      onChange={(e) => setEditPurpose(e.target.value)}
                      rows={2}
                      className={kidsTextareaClass}
                    />
                  </KidsFormField>
                  <KidsFormField id="edit-asg-mat" label={t('teacherClass.assignments.materials')}>
                    <textarea
                      id="edit-asg-mat"
                      value={editMaterials}
                      onChange={(e) => setEditMaterials(e.target.value)}
                      rows={2}
                      className={kidsTextareaClass}
                    />
                  </KidsFormField>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      {t('teacherClass.assignments.categoryIconLabel')}
                    </span>
                    <div className="mt-2 flex flex-wrap gap-3">
                      {CHALLENGE_FORM_THEMES.map(({ id, icon: Icon }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setEditChallengeTheme(id)}
                          className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition ${
                            editChallengeTheme === id
                              ? 'border-violet-500 bg-violet-100 text-violet-800 shadow-md dark:border-violet-400 dark:bg-violet-950/60 dark:text-violet-200'
                              : 'border-zinc-200 bg-zinc-100 text-zinc-500 hover:border-violet-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                          }`}
                          aria-pressed={editChallengeTheme === id}
                          aria-label={t(`teacherClass.assignments.theme.${id}`)}
                        >
                          <Icon className="h-5 w-5" strokeWidth={2.25} aria-hidden />
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                      {t('teacherClass.assignments.categoryIconHint')}
                    </p>
                  </div>
                  <KidsFormField
                    id={editAsgOpenAtId}
                    label={t('teacherClass.assignments.openAt')}
                    required={editFullyFree}
                    hint={
                      editFullyFree
                        ? t('teacherClass.assignments.editOpenAtHintFree')
                        : t('teacherClass.assignments.editOpenAtHintLocked')
                    }
                  >
                    <KidsDateTimeField
                      id={editAsgOpenAtId}
                      value={editOpenAt}
                      onChange={setEditOpenAt}
                      disabled={!editFullyFree}
                      required={editFullyFree}
                      placeholder={
                        editFullyFree ? t('teacherClass.assignments.openAtPlaceholder') : t('teacherClass.assignments.editOpenAtLockedPlaceholder')
                      }
                    />
                  </KidsFormField>
                  <KidsFormField
                    id={editAsgCloseAtId}
                    label={t('teacherClass.assignments.closeAt')}
                    required
                    hint={t('teacherClass.assignments.closeAtHint')}
                  >
                    <KidsDateTimeField
                      id={editAsgCloseAtId}
                      value={editCloseAt}
                      onChange={setEditCloseAt}
                      required
                      placeholder={t('teacherClass.assignments.closeAtPlaceholder')}
                    />
                  </KidsFormField>
                  <fieldset className="rounded-2xl border-2 border-violet-100 bg-violet-50/50 p-4 dark:border-violet-900/40 dark:bg-violet-950/30">
                    <legend className="px-2 text-sm font-bold text-violet-900 dark:text-violet-100">
                      {t('teacherClass.assignments.rules')}
                    </legend>
                    <p className="mt-2 text-sm text-slate-600 dark:text-gray-400">
                      {t('teacherClass.assignments.rulesHint')}
                    </p>
                    <div
                      className={`mt-3 grid gap-3 ${assignmentVideoEnabled ? 'sm:grid-cols-2' : 'sm:grid-cols-1'}`}
                    >
                      <button
                        type="button"
                        onClick={() => setEditMediaType('image')}
                        className={`rounded-2xl border-2 p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 ${
                          editMediaType === 'image'
                            ? 'border-violet-500 bg-white shadow-md shadow-violet-500/15 ring-2 ring-violet-300/60 dark:border-violet-400 dark:bg-violet-950/40 dark:ring-violet-600/40'
                            : 'border-violet-200/80 bg-white/60 hover:border-violet-300 dark:border-violet-800/60 dark:bg-gray-900/40 dark:hover:border-violet-700'
                        }`}
                      >
                        <span className="text-2xl" aria-hidden>
                          🖼️
                        </span>
                        <span className="mt-2 block font-logo text-base font-bold text-slate-900 dark:text-white">
                          {t('teacherClass.assignments.imageMode')}
                        </span>
                        <span className="mt-1 block text-xs text-slate-600 dark:text-gray-400">
                          {t('teacherClass.assignments.imageModeHint')}
                        </span>
                      </button>
                      {assignmentVideoEnabled ? (
                        <button
                          type="button"
                          onClick={() => setEditMediaType('video')}
                          className={`rounded-2xl border-2 p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 ${
                            editMediaType === 'video'
                              ? 'border-violet-500 bg-white shadow-md shadow-violet-500/15 ring-2 ring-violet-300/60 dark:border-violet-400 dark:bg-violet-950/40 dark:ring-violet-600/40'
                              : 'border-violet-200/80 bg-white/60 hover:border-violet-300 dark:border-violet-800/60 dark:bg-gray-900/40 dark:hover:border-violet-700'
                          }`}
                        >
                          <span className="text-2xl" aria-hidden>
                            🎬
                          </span>
                          <span className="mt-2 block font-logo text-base font-bold text-slate-900 dark:text-white">
                            {t('teacherClass.assignments.videoMode')}
                          </span>
                          <span className="mt-1 block text-xs text-slate-600 dark:text-gray-400">
                            {t('teacherClass.assignments.videoModeHint')}
                          </span>
                        </button>
                      ) : null}
                    </div>
                    {editMediaType === 'video' ? (
                      <div className="mt-4">
                        <label htmlFor="edit-asg-video-duration" className={`${kidsLabelClass} block`}>
                          {t('teacherClass.assignments.videoLimit')}
                        </label>
                        <p className="mb-2 text-xs text-slate-500 dark:text-gray-400">
                          {t('teacherClass.assignments.videoLimitHint')}
                        </p>
                        <KidsSelect
                          id="edit-asg-video-duration"
                          value={String(editVideoSec)}
                          onChange={(v) => setEditVideoSec(Number(v) as 60 | 120 | 180)}
                          options={videoDurationOptions}
                        />
                      </div>
                    ) : null}
                    <div className="mt-4">
                      <label htmlFor="edit-asg-submission-rounds" className={`${kidsLabelClass} block`}>
                        {t('teacherClass.assignments.roundCount')}
                      </label>
                      <p className="mb-2 text-xs text-slate-500 dark:text-gray-400">
                        {editFullyFree
                          ? t('teacherClass.assignments.roundCountHint')
                          : t('teacherClass.assignments.editRoundLockedHint')}
                      </p>
                      <KidsSelect
                        id="edit-asg-submission-rounds"
                        value={String(editSubmissionRounds)}
                        onChange={(v) => setEditSubmissionRounds(Number(v) as 1 | 2 | 3 | 4 | 5)}
                        options={submissionRoundsOptions}
                        disabled={!editFullyFree}
                      />
                    </div>
                  </fieldset>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <KidsPrimaryButton type="submit" disabled={editSaving}>
                      {editSaving ? t('profile.saving') : t('profile.save')}
                    </KidsPrimaryButton>
                    <KidsSecondaryButton
                      type="button"
                      disabled={editSaving}
                      onClick={() => {
                        setEditAssignment(null);
                        setEditAssignmentError(null);
                      }}
                    >
                      {t('common.cancel')}
                    </KidsSecondaryButton>
                  </div>
                </form>
              </>
            );
          })()}
        </KidsCenteredModal>
      ) : null}
    </KidsPanelMax>
  );
}

export default function KidsTeacherClassPage() {
  return (
    <Suspense fallback={<p className="text-center text-sm text-violet-800 dark:text-violet-200">{'Loading...'}</p>}>
      <KidsTeacherClassPageContent />
    </Suspense>
  );
}
