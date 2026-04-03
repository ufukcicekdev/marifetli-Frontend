'use client';

import { Suspense, useCallback, useEffect, useId, useMemo, useState } from 'react';
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
  kidsFormatAssignmentWindowTr,
  kidsIsoToDatetimeLocal,
  kidsWeeklyChampion,
  kidsTeacherClassPeerChallenges,
  kidsTeacherReviewPeerChallenge,
  kidsGetKindergartenDailyBoard,
  kidsPatchKindergartenDailyRecord,
  kidsPostKindergartenBulk,
  kidsPutKindergartenDayPlan,
  kidsSendKindergartenEndOfDay,
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
  KidsCard,
  KidsCenteredModal,
  KidsEmptyState,
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
import { KidsKgSlotsEditor } from '@/src/components/kids/kids-kg-slots-editor';

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

const BASE_TEACHER_TABS: { id: TabId; labelKey: string; icon: string }[] = [
  { id: 'general', labelKey: 'teacherClass.tabs.class', icon: '⚙️' },
  { id: 'invite', labelKey: 'teacherClass.tabs.invite', icon: '✉️' },
  { id: 'students', labelKey: 'teacherClass.tabs.students', icon: '🧒' },
  { id: 'assignments', labelKey: 'teacherClass.tabs.challenges', icon: '📝' },
  { id: 'peer', labelKey: 'teacherClass.tabs.competitions', icon: '🏆' },
  { id: 'stars', labelKey: 'teacherClass.tabs.star', icon: '⭐' },
];

const PRESCHOOL_DAILY_TAB = {
  id: 'kindergarten' as const,
  labelKey: 'teacherClass.tabs.preschoolDaily',
  icon: '📋',
};

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

function kgStudentDisplayName(st: { id: number; first_name: string; last_name: string }): string {
  const n = `${st.first_name} ${st.last_name}`.trim();
  return n || `#${st.id}`;
}

function KidsKgTriToggle({
  value,
  disabled,
  onChange,
  labels,
}: {
  value: boolean | null;
  disabled?: boolean;
  onChange: (v: boolean | null) => void;
  labels: { unset: string; yes: string; no: string };
}) {
  const opts: [boolean | null, string][] = [
    [null, labels.unset],
    [true, labels.yes],
    [false, labels.no],
  ];
  return (
    <div className="flex flex-wrap gap-1">
      {opts.map(([v, lab]) => (
        <button
          key={String(v)}
          type="button"
          disabled={disabled}
          onClick={() => onChange(v)}
          className={`rounded-lg border-2 px-2 py-1 text-xs font-bold transition disabled:opacity-50 ${
            value === v
              ? 'border-violet-500 bg-violet-100 text-violet-900 dark:border-violet-400 dark:bg-violet-950/50 dark:text-violet-100'
              : 'border-slate-200 bg-white text-slate-600 hover:border-violet-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
          }`}
        >
          {lab}
        </button>
      ))}
    </div>
  );
}

function peerRowStatusTr(s: KidsPeerChallengeStatus, t: (key: string) => string): string {
  switch (s) {
    case 'pending_teacher':
      return t('teacherClass.peer.status.pending');
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
  const [creatingClassLink, setCreatingClassLink] = useState(false);
  /** Sunucu `KIDS_INVITE_EMAIL_ENABLED` — kapaliyken e-posta davet formu gosterilmez. */
  const [inviteEmailEnabled, setInviteEmailEnabled] = useState(true);
  /** Sunucu `KIDS_ASSIGNMENT_VIDEO_ENABLED` — kapaliyken challenge’da video teslim secenegi yok. */
  const [assignmentVideoEnabled, setAssignmentVideoEnabled] = useState(true);

  const [asgTitle, setAsgTitle] = useState('');
  const [asgPurpose, setAsgPurpose] = useState('');
  const [asgMaterials, setAsgMaterials] = useState('');
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
  const [editSaving, setEditSaving] = useState(false);
  /** Modal `<dialog>` ust katmanda oldugu icin toast gorunmez; hata bu metinle gosterilir. */
  const [editAssignmentError, setEditAssignmentError] = useState<string | null>(null);
  const [deletingClass, setDeletingClass] = useState(false);
  const [removingEnrollmentId, setRemovingEnrollmentId] = useState<number | null>(null);

  const [kgDate, setKgDate] = useState(() => localDateInputValue());
  const [kgBoard, setKgBoard] = useState<KidsKindergartenDailyBoardResponse | null>(null);
  const [kgPlanDraft, setKgPlanDraft] = useState('');
  const [kgLoading, setKgLoading] = useState(false);
  const [kgSavingPlan, setKgSavingPlan] = useState(false);
  const [kgPatchingStudents, setKgPatchingStudents] = useState<Set<number>>(() => new Set());
  const [kgSendingEodId, setKgSendingEodId] = useState<number | null>(null);
  const [kgSelectedStudentId, setKgSelectedStudentId] = useState<string>('');
  const [kgBulkTarget, setKgBulkTarget] = useState<'all_enrolled' | 'present_only'>('all_enrolled');
  const [kgBulkMealLabel, setKgBulkMealLabel] = useState('');
  const [kgBulkNapLabel, setKgBulkNapLabel] = useState('');
  const [kgBulkMealOk, setKgBulkMealOk] = useState(true);
  const [kgBulkNapOk, setKgBulkNapOk] = useState(true);
  const [kgBulkNote, setKgBulkNote] = useState('');
  const [kgBulkBusy, setKgBulkBusy] = useState(false);

  const editNameId = useId();
  const editClassGradeId = useId();
  const editClassSectionId = useId();
  const editAcademicYearId = useId();
  const editLanguageId = useId();
  const editDescId = useId();
  const editSchoolSelectId = useId();
  const kgStudentSelectId = useId();
  const inviteEmailsId = useId();
  const classLinkInputId = useId();
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

  const kgStudentSelectOptions = useMemo<KidsSelectOption[]>(() => {
    if (!kgBoard?.rows.length) return [];
    return kgBoard.rows.map((row) => ({
      value: String(row.student.id),
      label: kgStudentDisplayName(row.student),
    }));
  }, [kgBoard]);

  const kgActiveRow = useMemo(() => {
    if (!kgBoard?.rows.length || !kgSelectedStudentId) return null;
    return kgBoard.rows.find((r) => String(r.student.id) === kgSelectedStudentId) ?? null;
  }, [kgBoard, kgSelectedStudentId]);

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
      setKgSelectedStudentId((prev) => {
        if (data.rows.length === 0) return '';
        if (prev && data.rows.some((r) => String(r.student.id) === prev)) return prev;
        return String(data.rows[0].student.id);
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('teacherClass.kindergarten.loadError'));
      setKgBoard(null);
      setKgSelectedStudentId('');
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

  const kgSendEndOfDay = useCallback(
    async (studentId: number) => {
      if (!Number.isFinite(classId)) return;
      setKgSendingEodId(studentId);
      try {
        await kidsSendKindergartenEndOfDay(classId, studentId, kgDate);
        toast.success(t('teacherClass.kindergarten.eodSentToast'));
        await loadKgBoard();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t('teacherClass.kindergarten.eodError'));
      } finally {
        setKgSendingEodId(null);
      }
    },
    [classId, kgDate, loadKgBoard, t],
  );

  const kgBulkDefaultMealLabel = useMemo(() => t('teacherClass.kindergarten.bulkPresetLunch'), [t]);
  const kgBulkDefaultNapLabel = useMemo(() => t('teacherClass.kindergarten.bulkPresetNap'), [t]);

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

  useEffect(() => {
    if (tab !== 'peer' || !cls) return;
    void loadPeerChallenges();
  }, [tab, cls, loadPeerChallenges]);

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

  function assignmentCardBody(a: KidsAssignment) {
    const subN = a.submission_count ?? 0;
    const enr = a.enrolled_student_count ?? students.length;
    const winLabel = kidsFormatAssignmentWindowTr(a);
    const opensSoon =
      a.submission_opens_at &&
      !Number.isNaN(new Date(a.submission_opens_at).getTime()) &&
      new Date(a.submission_opens_at).getTime() > Date.now();
    return (
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-bold text-slate-900 dark:text-white">{a.title}</p>
          {opensSoon ? (
            <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">
              {t('teacherClass.assignments.card.plannedHidden')}
            </p>
          ) : null}
          <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
            {a.require_video && a.require_image
              ? t('teacherClass.assignments.card.imageOrVideo').replace('{sec}', String(a.video_max_seconds)).replace('{rounds}', String(a.submission_rounds ?? 1))
              : a.require_video
                ? t('teacherClass.assignments.card.videoOnly').replace('{sec}', String(a.video_max_seconds)).replace('{rounds}', String(a.submission_rounds ?? 1))
                : a.require_image
                  ? t('teacherClass.assignments.card.imageOnly').replace('{rounds}', String(a.submission_rounds ?? 1))
                  : t('teacherClass.assignments.card.flexible')}
          </p>
          {winLabel ? (
            <p className="mt-1 text-xs font-semibold text-violet-800 dark:text-violet-200">{winLabel}</p>
          ) : null}
          {opensSoon ? (
            <p className="mt-1 text-[11px] text-slate-600 dark:text-gray-400">
              {a.students_notified_at
                ? t('teacherClass.assignments.card.studentsNotified')
                : t('teacherClass.assignments.card.studentsWillBeNotified')}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-bold tabular-nums text-violet-900 dark:bg-violet-950/60 dark:text-violet-100">
            {subN}/{enr}
          </span>
          <span className="max-w-18 text-center text-[10px] font-medium leading-tight text-slate-400 dark:text-gray-500">
            {t('teacherClass.assignments.card.submissionRatio')}
          </span>
          <KidsSecondaryButton
            type="button"
            className="min-h-9 w-full px-3 py-1.5 text-xs sm:w-auto"
            onClick={() => openAssignmentEdit(a)}
          >
            {t('teacherClass.assignments.card.edit')}
          </KidsSecondaryButton>
          <Link
            href={`${pathPrefix}/ogretmen/sinif/${classId}/proje/${a.id}`}
            className="text-xs font-bold text-violet-700 underline underline-offset-2 hover:text-fuchsia-600 dark:text-violet-300 dark:hover:text-fuchsia-400"
          >
            {t('teacherClass.assignments.card.submissions')}
          </Link>
        </div>
      </div>
    );
  }

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
        materials: asgMaterials.trim(),
        video_max_seconds: asgVideoSec,
        require_image: asgMediaType === 'image',
        require_video: asgMediaType === 'video',
        submission_rounds: asgSubmissionRounds,
        is_published: true,
        submission_opens_at: openIso,
        submission_closes_at: closeIso,
      });
      setAssignments((prev) => [a, ...prev]);
      setAsgTitle('');
      setAsgPurpose('');
      setAsgMaterials('');
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

  async function loadChampion() {
    try {
      const data = await kidsWeeklyChampion(classId);
      setChampion(data);
    } catch {
      toast.error(t('teacherClass.stars.loadFailed'));
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

  async function deleteEntireClass() {
    if (!cls) return;
    const ok = window.confirm(
      t('teacherClass.general.deleteConfirm').replace('{name}', cls.name),
    );
    if (!ok) return;
    setDeletingClass(true);
    try {
      await kidsDeleteClass(cls.id);
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

  return (
    <KidsPanelMax
      className={tab === 'assignments' || tab === 'peer' || tab === 'kindergarten' ? 'max-w-6xl!' : ''}
    >
      <div className="mb-6">
        <Link
          href={`${pathPrefix}/ogretmen/panel`}
          className="inline-flex items-center gap-2 text-sm font-bold text-violet-700 hover:text-fuchsia-600 dark:text-violet-300 dark:hover:text-fuchsia-400"
        >
          <span aria-hidden>←</span> {t('teacherClass.backAllClasses')}
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-fuchsia-600 dark:text-fuchsia-400">
            {t('teacherClass.panel')}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="font-logo text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">
              {cls.name}
            </h1>
            {(cls.academic_year_label || '').trim() ? (
              <span className="rounded-full bg-violet-100 px-3 py-1 text-sm font-bold text-violet-800 dark:bg-violet-900/60 dark:text-violet-200">
                {(cls.academic_year_label || '').trim()}
              </span>
            ) : null}
          </div>
          {classLocationLine ? (
            <p className="mt-2 max-w-2xl text-sm font-semibold text-emerald-800 dark:text-emerald-200">
              {classLocationLine}
            </p>
          ) : null}
          {cls.description ? (
            <p className="mt-2 max-w-2xl text-slate-600 dark:text-gray-300">{cls.description}</p>
          ) : null}
        </div>
        <div className="flex gap-2 text-sm">
          <span className="rounded-2xl bg-sky-100 px-3 py-2 font-bold text-sky-900 dark:bg-sky-950/60 dark:text-sky-100">
            🧒 {students.length} {t('teacherClass.students')}
          </span>
          <span className="rounded-2xl bg-amber-100 px-3 py-2 font-bold text-amber-900 dark:bg-amber-950/60 dark:text-amber-100">
            📝 {assignments.length} {t('teacherClass.challenges')}
          </span>
        </div>
      </div>

      <KidsTabs
        tabs={teacherTabs.map((row) => ({ id: row.id, label: t(row.labelKey), icon: row.icon }))}
        active={tab}
        onChange={(id) => setTab(id as TabId)}
        ariaLabel={t('teacherClass.tabs.aria')}
      />

      {tab === 'general' && (
        <KidsCard>
          <h2 className="font-logo text-lg font-bold text-slate-900 dark:text-white">{t('teacherClass.general.title')}</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-gray-400">
            {t('teacherClass.general.subtitle')}
          </p>
          <form className="mt-6 space-y-5" onSubmit={saveClass}>
            <KidsFormField
              id={editSchoolSelectId}
              label={t('schools.title')}
              required
              hint={t('teacherClass.general.schoolHint')}
            >
              <KidsSelect
                id={editSchoolSelectId}
                value={editSchoolId}
                onChange={setEditSchoolId}
                disabled={schools.length === 0}
                options={schools.map((s) => ({
                  value: String(s.id),
                  label: kidsSchoolLocationLine(s) || s.name,
                }))}
              />
            </KidsFormField>
            {editClassNonStandard ? (
              <KidsFormField
                id={editNameId}
                label={t('teacherClass.general.customClassName')}
                required
                hint={t('teacherClass.general.customClassNameHint')}
              >
                <input
                  id={editNameId}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className={kidsInputClass}
                  maxLength={200}
                  disabled={!canEditClassIdentity}
                />
              </KidsFormField>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <KidsFormField id={editClassGradeId} label={t('teacher.panel.classLevel')} required hint={t('teacherClass.general.gradeHint')}>
                    <KidsSelect
                      id={editClassGradeId}
                      value={editClassGrade}
                      onChange={setEditClassGrade}
                      options={editClassGradeOptions}
                      searchable={false}
                      disabled={!canEditClassIdentity}
                    />
                  </KidsFormField>
                  <KidsFormField id={editClassSectionId} label={t('teacher.panel.section')} required hint={t('teacherClass.general.sectionHint')}>
                    <KidsSelect
                      id={editClassSectionId}
                      value={editClassSection}
                      onChange={setEditClassSection}
                      options={KIDS_CLASS_SECTION_OPTIONS}
                      searchable
                      disabled={!canEditClassIdentity}
                    />
                  </KidsFormField>
                </div>
                <p className="text-sm text-slate-600 dark:text-gray-400">
                  {t('teacherClass.general.preview')}:{' '}
                  <strong className="font-logo text-slate-900 dark:text-white">
                    {kidsBuildTeacherPanelClassName(editClassGrade, editClassSection)}
                  </strong>
                </p>
              </>
            )}
            <KidsFormField
              id={editAcademicYearId}
              label={t('teacher.panel.academicYear')}
              hint={t('teacherClass.general.academicYearHint')}
            >
              <KidsSelect
                id={editAcademicYearId}
                value={editAcademicYear}
                onChange={setEditAcademicYear}
                options={editAcademicYearOptions}
                searchable={false}
                disabled
              />
            </KidsFormField>
            <KidsFormField id={editLanguageId} label={t('teacherClass.general.language')} hint={t('teacherClass.general.languageHint')}>
              <KidsSelect
                id={editLanguageId}
                value={editLanguage}
                onChange={(next) => setEditLanguage(next as 'tr' | 'en' | 'ge')}
                options={classLanguageOptions}
                searchable={false}
              />
            </KidsFormField>
            <KidsFormField id={editDescId} label={t('teacherHomework.description')} hint={t('teacherClass.general.descriptionHint')}>
              <textarea
                id={editDescId}
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={3}
                className={kidsTextareaClass}
              />
            </KidsFormField>
            <KidsPrimaryButton type="submit" disabled={savingClass}>
              {savingClass ? t('profile.saving') : t('profile.save')}
            </KidsPrimaryButton>
          </form>

          <div className="mt-10 border-t border-rose-200/80 pt-6 dark:border-rose-900/50">
            <h3 className="font-logo text-base font-bold text-rose-900 dark:text-rose-100">{t('teacherClass.general.dangerTitle')}</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-gray-400">
              {t('teacherClass.general.dangerHint')}
            </p>
            <KidsSecondaryButton
              type="button"
              className="mt-4 border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40"
              disabled={deletingClass}
              onClick={() => void deleteEntireClass()}
            >
              {deletingClass ? t('teacherClass.general.deleting') : t('teacherClass.general.deleteClass')}
            </KidsSecondaryButton>
          </div>
        </KidsCard>
      )}

      {tab === 'invite' && (
        <KidsCard tone="sky">
          <h2 className="font-logo text-lg font-bold text-sky-950 dark:text-sky-50">{t('teacherClass.invite.title')}</h2>
          <p className="mt-2 text-sm leading-relaxed text-sky-900/85 dark:text-sky-100/85">
            {t('teacherClass.invite.subtitle')}
          </p>

          <div className="mt-6 space-y-4 rounded-2xl border-2 border-sky-200/80 bg-white/70 p-5 dark:border-sky-800/50 dark:bg-sky-950/20">
            <KidsFormField id="invite-days" label={t('teacherClass.invite.linkValidity')} hint={t('teacherClass.invite.linkValidityHint')}>
              <KidsSelect
                id="invite-days"
                value={String(inviteDays)}
                onChange={(v) => setInviteDays(Number(v))}
                options={inviteDaysOptions}
              />
            </KidsFormField>
            <KidsPrimaryButton type="button" disabled={creatingClassLink} onClick={() => void createClassShareLink()}>
              {creatingClassLink ? t('teacherClass.invite.creatingLink') : t('teacherClass.invite.createLink')}
            </KidsPrimaryButton>
            {classInviteUrl ? (
              <div className="space-y-2">
                <KidsFormField
                  id={classLinkInputId}
                  label={t('teacherClass.invite.shareableLink')}
                  hint={t('teacherClass.invite.shareableLinkHint')}
                >
                  <input
                    id={classLinkInputId}
                    readOnly
                    value={classInviteUrl}
                    className={kidsInputClass}
                    onFocus={(e) => e.target.select()}
                  />
                </KidsFormField>
                <KidsSecondaryButton
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(classInviteUrl).then(
                      () => toast.success(t('teacherClass.invite.copied')),
                      () => toast.error(t('teacherClass.invite.copyFailed')),
                    );
                  }}
                >
                  {t('teacherClass.invite.copyLink')}
                </KidsSecondaryButton>
              </div>
            ) : null}
          </div>

          {inviteEmailEnabled ? (
            <div className="relative mt-10 border-t border-sky-200/70 pt-8 dark:border-sky-800/50">
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-sky-700 dark:text-sky-300">
                {t('teacherClass.invite.optional')}
              </p>
              <h3 className="font-logo text-base font-bold text-sky-950 dark:text-sky-50">
                {t('teacherClass.invite.emailTitle')}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-sky-900/85 dark:text-sky-100/85">
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
            <p className="mt-8 text-xs text-sky-800/70 dark:text-sky-200/60">
              {t('teacherClass.invite.emailDisabled')}
            </p>
          )}
        </KidsCard>
      )}

      {tab === 'students' && (
        <KidsCard tone="amber">
          <h2 className="font-logo text-lg font-bold text-amber-950 dark:text-amber-50">{t('teacherClass.students.title')}</h2>
          {students.length > 0 ? (
            <p className="mt-2 text-xs text-amber-900/85 dark:text-amber-100/85">
              {t('teacherClass.students.subtitle')}
            </p>
          ) : null}
          {students.length === 0 ? (
            <div className="mt-6">
              <KidsEmptyState
                emoji="🎈"
                title={t('teacherClass.students.emptyTitle')}
                description={t('teacherClass.students.emptyDesc')}
              />
            </div>
          ) : (
            <ul className="mt-6 divide-y divide-amber-200/60 dark:divide-amber-900/40">
              {students.map((en) => (
                <li
                  key={en.id}
                  className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {en.student.first_name} {en.student.last_name}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-gray-400">{en.student.email}</p>
                    {typeof en.class_published_assignment_count === 'number' ? (
                      <p className="mt-2 text-xs font-semibold text-violet-800 dark:text-violet-200">
                        {t('teacherClass.students.publishedChallenges')}: {en.class_published_assignment_count}
                        {' · '}
                        {t('teacherClass.students.submitted')}: {en.assignments_submitted_count ?? 0}
                        <span className="font-black text-fuchsia-700 dark:text-fuchsia-300">
                          {' '}
                          ({en.assignments_submitted_count ?? 0}/{en.class_published_assignment_count})
                        </span>
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                      {t('teacherClass.students.registered')}: {new Date(en.created_at).toLocaleDateString(language)}
                    </span>
                    <KidsSecondaryButton
                      type="button"
                      onClick={() => void startParentConversation(en)}
                    >
                      {t('teacherClass.students.messageParent')}
                    </KidsSecondaryButton>
                    <KidsSecondaryButton
                      type="button"
                      className="border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/40"
                      disabled={removingEnrollmentId === en.id}
                      onClick={() => void removeStudentFromClass(en)}
                    >
                      {removingEnrollmentId === en.id ? t('teacherClass.students.removing') : t('teacherClass.students.removeFromClass')}
                    </KidsSecondaryButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </KidsCard>
      )}

      {tab === 'kindergarten' && isKidsPreschoolClass(cls) && (
        <KidsCard tone="emerald">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-logo text-lg font-bold text-emerald-950 dark:text-emerald-50">
                {t('teacherClass.kindergarten.title')}
              </h2>
              <p className="mt-2 text-sm text-emerald-900/85 dark:text-emerald-100/85">
                {t('teacherClass.kindergarten.subtitle')}
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <KidsFormField id="kg-date" label={t('teacherClass.kindergarten.date')} hint={t('teacherClass.kindergarten.dateHint')}>
                <input
                  id="kg-date"
                  type="date"
                  value={kgDate}
                  onChange={(e) => setKgDate(e.target.value)}
                  className={kidsInputClass}
                />
              </KidsFormField>
              <KidsSecondaryButton type="button" disabled={kgLoading} onClick={() => void loadKgBoard()}>
                {kgLoading ? t('common.loading') : t('teacherClass.kindergarten.refresh')}
              </KidsSecondaryButton>
            </div>
          </div>

          <div className="mt-6 space-y-3 rounded-2xl border-2 border-emerald-200/80 bg-white/70 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <KidsFormField
              id="kg-plan"
              label={t('teacherClass.kindergarten.planTitle')}
              hint={t('teacherClass.kindergarten.planHint')}
            >
              <textarea
                id="kg-plan"
                value={kgPlanDraft}
                onChange={(e) => setKgPlanDraft(e.target.value)}
                rows={4}
                className={kidsTextareaClass}
                placeholder={t('teacherClass.kindergarten.planPlaceholder')}
              />
            </KidsFormField>
            <KidsPrimaryButton type="button" disabled={kgSavingPlan} onClick={() => void kgSavePlan()}>
              {kgSavingPlan ? t('profile.saving') : t('teacherClass.kindergarten.savePlan')}
            </KidsPrimaryButton>
          </div>

          {kgBoard && kgBoard.rows.length > 0 ? (
            <div className="mt-6 space-y-4 rounded-2xl border-2 border-violet-200/90 bg-violet-50/50 p-4 dark:border-violet-900/50 dark:bg-violet-950/25">
              <div>
                <h3 className="font-logo text-base font-bold text-violet-950 dark:text-violet-50">
                  {t('teacherClass.kindergarten.bulkEventsTitle')}
                </h3>
                <p className="mt-1 text-xs font-semibold text-violet-900/80 dark:text-violet-100/80">
                  {t('teacherClass.kindergarten.bulkEventsHint')}
                </p>
              </div>
              <fieldset className="flex flex-wrap gap-3 text-sm">
                <legend className={`${kidsLabelClass} mb-2 w-full`}>{t('teacherClass.kindergarten.bulkTargetLabel')}</legend>
                <label className="flex cursor-pointer items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
                  <input
                    type="radio"
                    name="kg-bulk-target"
                    checked={kgBulkTarget === 'all_enrolled'}
                    onChange={() => setKgBulkTarget('all_enrolled')}
                    className="h-4 w-4 accent-violet-600"
                  />
                  {t('teacherClass.kindergarten.bulkTargetAll')}
                </label>
                <label className="flex cursor-pointer items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
                  <input
                    type="radio"
                    name="kg-bulk-target"
                    checked={kgBulkTarget === 'present_only'}
                    onChange={() => setKgBulkTarget('present_only')}
                    className="h-4 w-4 accent-violet-600"
                  />
                  {t('teacherClass.kindergarten.bulkTargetPresentOnly')}
                </label>
              </fieldset>
              <div className="flex flex-wrap gap-2">
                <KidsPrimaryButton
                  type="button"
                  disabled={kgBulkBusy || kgLoading}
                  className="bg-violet-600 hover:bg-violet-700 dark:bg-violet-700 dark:hover:bg-violet-600"
                  onClick={() => void kgRunBulk({ action: 'mark_present', present: true })}
                >
                  {kgBulkBusy ? t('teacherClass.kindergarten.bulkWorking') : t('teacherClass.kindergarten.bulkMarkAllPresent')}
                </KidsPrimaryButton>
                <p className="w-full text-xs text-violet-900/75 dark:text-violet-200/75">
                  {t('teacherClass.kindergarten.bulkMarkPresentNote')}
                </p>
              </div>
              <div className="grid gap-4 border-t border-violet-200/70 pt-4 dark:border-violet-800/50 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className={kidsLabelClass} htmlFor="kg-bulk-meal">
                    {t('teacherClass.kindergarten.bulkMealTitle')}
                  </label>
                  <input
                    id="kg-bulk-meal"
                    type="text"
                    value={kgBulkMealLabel}
                    onChange={(e) => setKgBulkMealLabel(e.target.value)}
                    placeholder={kgBulkDefaultMealLabel}
                    className={kidsInputClass}
                  />
                  <div className="flex flex-wrap gap-2">
                    <KidsSecondaryButton
                      type="button"
                      className={`min-h-9 px-3 py-1.5 text-xs ${kgBulkMealOk ? 'border-emerald-400 bg-emerald-100/80 dark:bg-emerald-950/50' : ''}`}
                      disabled={kgBulkBusy || kgLoading}
                      onClick={() => setKgBulkMealOk(true)}
                    >
                      {t('teacherClass.kindergarten.bulkSlotOkYes')}
                    </KidsSecondaryButton>
                    <KidsSecondaryButton
                      type="button"
                      className={`min-h-9 px-3 py-1.5 text-xs ${!kgBulkMealOk ? 'border-rose-400 bg-rose-100/80 dark:bg-rose-950/40' : ''}`}
                      disabled={kgBulkBusy || kgLoading}
                      onClick={() => setKgBulkMealOk(false)}
                    >
                      {t('teacherClass.kindergarten.bulkSlotOkNo')}
                    </KidsSecondaryButton>
                    <KidsPrimaryButton
                      type="button"
                      disabled={kgBulkBusy || kgLoading}
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => {
                        const label = kgBulkMealLabel.trim() || kgBulkDefaultMealLabel;
                        void kgRunBulk({ action: 'meal_slot', slot_label: label, ok: kgBulkMealOk });
                      }}
                    >
                      {t('teacherClass.kindergarten.bulkApplyMeal')}
                    </KidsPrimaryButton>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className={kidsLabelClass} htmlFor="kg-bulk-nap">
                    {t('teacherClass.kindergarten.bulkNapTitle')}
                  </label>
                  <input
                    id="kg-bulk-nap"
                    type="text"
                    value={kgBulkNapLabel}
                    onChange={(e) => setKgBulkNapLabel(e.target.value)}
                    placeholder={kgBulkDefaultNapLabel}
                    className={kidsInputClass}
                  />
                  <div className="flex flex-wrap gap-2">
                    <KidsSecondaryButton
                      type="button"
                      className={`min-h-9 px-3 py-1.5 text-xs ${kgBulkNapOk ? 'border-emerald-400 bg-emerald-100/80 dark:bg-emerald-950/50' : ''}`}
                      disabled={kgBulkBusy || kgLoading}
                      onClick={() => setKgBulkNapOk(true)}
                    >
                      {t('teacherClass.kindergarten.bulkSlotOkYes')}
                    </KidsSecondaryButton>
                    <KidsSecondaryButton
                      type="button"
                      className={`min-h-9 px-3 py-1.5 text-xs ${!kgBulkNapOk ? 'border-rose-400 bg-rose-100/80 dark:bg-rose-950/40' : ''}`}
                      disabled={kgBulkBusy || kgLoading}
                      onClick={() => setKgBulkNapOk(false)}
                    >
                      {t('teacherClass.kindergarten.bulkSlotOkNo')}
                    </KidsSecondaryButton>
                    <KidsPrimaryButton
                      type="button"
                      disabled={kgBulkBusy || kgLoading}
                      className="bg-sky-600 hover:bg-sky-700 dark:bg-sky-700 dark:hover:bg-sky-600"
                      onClick={() => {
                        const label = kgBulkNapLabel.trim() || kgBulkDefaultNapLabel;
                        void kgRunBulk({ action: 'nap_slot', slot_label: label, ok: kgBulkNapOk });
                      }}
                    >
                      {t('teacherClass.kindergarten.bulkApplyNap')}
                    </KidsPrimaryButton>
                  </div>
                </div>
              </div>
              <div className="space-y-2 border-t border-violet-200/70 pt-4 dark:border-violet-800/50">
                <label className={kidsLabelClass} htmlFor="kg-bulk-note">
                  {t('teacherClass.kindergarten.bulkSharedNote')}
                </label>
                <textarea
                  id="kg-bulk-note"
                  value={kgBulkNote}
                  onChange={(e) => setKgBulkNote(e.target.value)}
                  rows={3}
                  className={kidsTextareaClass}
                  placeholder={t('teacherClass.kindergarten.notePlaceholder')}
                />
                <KidsPrimaryButton
                  type="button"
                  disabled={kgBulkBusy || kgLoading}
                  onClick={() => void kgRunBulk({ action: 'set_note', note: kgBulkNote.trim() })}
                >
                  {t('teacherClass.kindergarten.bulkApplyNote')}
                </KidsPrimaryButton>
              </div>
              <div className="border-t border-violet-200/70 pt-4 dark:border-violet-800/50">
                <KidsSecondaryButton
                  type="button"
                  disabled={kgBulkBusy || kgLoading}
                  className="border-amber-400 text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-100 dark:hover:bg-amber-950/50"
                  onClick={() => {
                    if (typeof window !== 'undefined' && !window.confirm(t('teacherClass.kindergarten.bulkDigestConfirm'))) {
                      return;
                    }
                    void kgRunBulk({ action: 'send_digest' });
                  }}
                >
                  {kgBulkBusy ? t('teacherClass.kindergarten.bulkWorking') : t('teacherClass.kindergarten.bulkSendDigest')}
                </KidsSecondaryButton>
                <p className="mt-2 text-xs font-semibold text-violet-900/80 dark:text-violet-200/75">
                  {t('teacherClass.kindergarten.bulkDigestHint')}
                </p>
              </div>
            </div>
          ) : null}

          <p className="mt-4 rounded-xl border border-emerald-300/60 bg-emerald-50/90 px-3 py-2.5 text-xs font-semibold leading-relaxed text-emerald-950 dark:border-emerald-800/50 dark:bg-emerald-950/35 dark:text-emerald-100">
            {t('teacherClass.kindergarten.boardHint')}
          </p>

          {kgLoading && !kgBoard ? (
            <p className="mt-6 text-sm font-semibold text-slate-600 dark:text-gray-400">{t('common.loading')}</p>
          ) : null}

          {kgBoard && kgBoard.rows.length === 0 ? (
            <div className="mt-6">
              <KidsEmptyState
                emoji="🧒"
                title={t('teacherClass.kindergarten.emptyStudentsTitle')}
                description={t('teacherClass.kindergarten.emptyStudentsDesc')}
              />
            </div>
          ) : null}

          {kgBoard && kgBoard.rows.length > 0 ? (
            <div className="mt-6 space-y-5">
              <KidsFormField
                id={kgStudentSelectId}
                label={t('teacherClass.kindergarten.pickStudent')}
                hint={t('teacherClass.kindergarten.pickStudentHint')}
                required
              >
                <KidsSelect
                  id={kgStudentSelectId}
                  value={kgSelectedStudentId}
                  onChange={setKgSelectedStudentId}
                  options={kgStudentSelectOptions}
                  searchable={kgStudentSelectOptions.length > 8}
                />
              </KidsFormField>

              {kgActiveRow ? (
                (() => {
                  const st = kgActiveRow.student;
                  const rec = kgActiveRow.record;
                  const busy = kgPatchingStudents.has(st.id);
                  const displayName = kgStudentDisplayName(st);
                  const triLabels = {
                    unset: t('teacherClass.kindergarten.triUnset'),
                    yes: t('teacherClass.kindergarten.triYes'),
                    no: t('teacherClass.kindergarten.triNo'),
                  };
                  const sendLabel = t('teacherClass.kindergarten.sendEodForNamed').replace('{name}', displayName);
                  const sentLabel = t('teacherClass.kindergarten.eodSentForNamed').replace('{name}', displayName);
                  return (
                    <div
                      key={st.id}
                      className="rounded-2xl border-2 border-emerald-200/85 bg-white/95 p-4 shadow-sm sm:p-6 dark:border-emerald-800/55 dark:bg-emerald-950/25"
                    >
                      <h3 className="font-logo text-xl font-bold text-slate-900 dark:text-white">{displayName}</h3>
                      <p className="mt-1 text-xs font-semibold text-emerald-800 dark:text-emerald-200/90">
                        {t('teacherClass.kindergarten.cardRowHint')}
                      </p>
                      <div className="mt-5 space-y-5">
                        <div>
                          <p className={`${kidsLabelClass} mb-1.5`}>{t('teacherClass.kindergarten.fieldPresent')}</p>
                          <KidsKgTriToggle
                            value={rec?.present ?? null}
                            disabled={busy}
                            labels={triLabels}
                            onChange={(v) => void kgPatchField(st.id, { present: v })}
                          />
                        </div>
                        <div>
                          <p className={`${kidsLabelClass} mb-1.5`}>{t('teacherClass.kindergarten.colMealsMulti')}</p>
                          <KidsKgSlotsEditor
                            kind="meal"
                            initialSlots={rec?.meal_slots != null ? rec.meal_slots : null}
                            syncKey={`m-${st.id}-${kgDate}-${rec?.id ?? 0}-${rec?.updated_at ?? ''}`}
                            disabled={busy}
                            t={t}
                            onCommit={(slots) => void kgPatchField(st.id, { meal_slots: slots })}
                          />
                        </div>
                        <div>
                          <p className={`${kidsLabelClass} mb-1.5`}>{t('teacherClass.kindergarten.colNapsMulti')}</p>
                          <KidsKgSlotsEditor
                            kind="nap"
                            initialSlots={rec?.nap_slots != null ? rec.nap_slots : null}
                            syncKey={`n-${st.id}-${kgDate}-${rec?.id ?? 0}-${rec?.updated_at ?? ''}`}
                            disabled={busy}
                            t={t}
                            onCommit={(slots) => void kgPatchField(st.id, { nap_slots: slots })}
                          />
                        </div>
                        <div>
                          <label className={`${kidsLabelClass} mb-1.5 block`} htmlFor={`kg-note-${st.id}`}>
                            {t('teacherClass.kindergarten.colNote')}
                          </label>
                          <textarea
                            id={`kg-note-${st.id}`}
                            defaultValue={rec?.teacher_day_note ?? ''}
                            key={`note-${st.id}-${kgDate}-${rec?.updated_at ?? 'new'}`}
                            disabled={busy}
                            rows={4}
                            className={`${kidsTextareaClass} min-h-[88px] text-sm`}
                            placeholder={t('teacherClass.kindergarten.notePlaceholder')}
                            onBlur={(e) => {
                              const next = e.target.value.trim();
                              const prev = (rec?.teacher_day_note ?? '').trim();
                              if (next === prev) return;
                              void kgPatchField(st.id, { teacher_day_note: next });
                            }}
                          />
                        </div>
                        <div className="border-t border-emerald-200/70 pt-5 dark:border-emerald-800/50">
                          {rec?.digest_sent_at ? (
                            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{sentLabel}</p>
                          ) : (
                            <KidsPrimaryButton
                              type="button"
                              className="w-full max-w-md text-sm leading-snug sm:w-auto"
                              disabled={busy || kgSendingEodId === st.id}
                              title={sendLabel}
                              onClick={() => void kgSendEndOfDay(st.id)}
                            >
                              {kgSendingEodId === st.id ? t('common.loading') : sendLabel}
                            </KidsPrimaryButton>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : null}

              <div className="max-h-48 overflow-y-auto rounded-xl border border-emerald-200/70 bg-emerald-50/40 p-3 dark:border-emerald-900/45 dark:bg-emerald-950/20">
                <p className="mb-2 text-xs font-bold text-emerald-900 dark:text-emerald-100">
                  {t('teacherClass.kindergarten.quickRosterTitle')}
                </p>
                <ul className="space-y-1.5 text-sm">
                  {kgBoard.rows.map((row) => {
                    const name = kgStudentDisplayName(row.student);
                    const sent = Boolean(row.record?.digest_sent_at);
                    const active = String(row.student.id) === kgSelectedStudentId;
                    return (
                      <li key={row.student.id}>
                        <button
                          type="button"
                          onClick={() => setKgSelectedStudentId(String(row.student.id))}
                          className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left transition ${
                            active
                              ? 'bg-violet-200/90 font-bold text-violet-950 dark:bg-violet-900/50 dark:text-violet-50'
                              : 'hover:bg-white/80 dark:hover:bg-emerald-950/40'
                          }`}
                        >
                          <span className="text-slate-900 dark:text-white">{name}</span>
                          <span className="shrink-0 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                            {sent ? t('teacherClass.kindergarten.rosterEodSent') : t('teacherClass.kindergarten.rosterEodPending')}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          ) : null}
        </KidsCard>
      )}

      {tab === 'assignments' && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-slate-600 dark:text-gray-400 lg:hidden">
            {t('teacherClass.assignments.mobileHint')}
          </p>
          <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
            <KidsCard className="order-2 flex min-h-[260px] flex-col lg:order-1 lg:min-h-0">
              <div className="shrink-0">
                <h2 className="font-logo text-lg font-bold text-slate-900 dark:text-white">{t('teacherClass.assignments.newTitle')}</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-gray-400">
                  {t('teacherClass.assignments.newSubtitle')}
                  {assignmentVideoEnabled
                    ? ` ${t('teacherClass.assignments.videoEnabled')}`
                    : ` ${t('teacherClass.assignments.videoDisabled')}`}
                </p>
              </div>

              <button
                type="button"
                className="mt-4 flex w-full items-center justify-between rounded-2xl border border-violet-200/80 bg-violet-50/60 px-4 py-3 text-left text-sm font-bold text-violet-900 dark:border-violet-800/50 dark:bg-violet-950/30 dark:text-violet-100 lg:hidden"
                onClick={() => setIsNewChallengeOpen((v) => !v)}
                aria-expanded={isNewChallengeOpen}
                aria-controls={newChallengeSectionId}
              >
                <span>{t('teacherClass.assignments.newTitle')}</span>
                <span aria-hidden>{isNewChallengeOpen ? '▲' : '▼'}</span>
              </button>

              <div id={newChallengeSectionId} className={`mt-4 ${isNewChallengeOpen ? 'block' : 'hidden'} lg:block`}>
                <form className="space-y-4" onSubmit={createAssignment}>
                  <KidsFormField id={asgTitleId} label={t('teacherClass.assignments.title')} required>
                    <input
                      id={asgTitleId}
                      required
                      value={asgTitle}
                      onChange={(e) => setAsgTitle(e.target.value)}
                      className={kidsInputClass}
                      placeholder={t('teacherClass.assignments.titlePlaceholder')}
                    />
                  </KidsFormField>
                  <KidsFormField id="asg-purpose" label={t('teacherClass.assignments.purpose')}>
                    <textarea
                      id="asg-purpose"
                      value={asgPurpose}
                      onChange={(e) => setAsgPurpose(e.target.value)}
                      rows={2}
                      className={kidsTextareaClass}
                    />
                  </KidsFormField>
                  <KidsFormField id="asg-mat" label={t('teacherClass.assignments.materials')}>
                    <textarea
                      id="asg-mat"
                      value={asgMaterials}
                      onChange={(e) => setAsgMaterials(e.target.value)}
                      rows={2}
                      className={kidsTextareaClass}
                      placeholder={t('teacherClass.assignments.materialsPlaceholder')}
                    />
                  </KidsFormField>
                  <KidsFormField
                    id={asgOpenAtId}
                    label={t('teacherClass.assignments.openAt')}
                    required
                    hint={t('teacherClass.assignments.openAtHint')}
                  >
                    <KidsDateTimeField
                      id={asgOpenAtId}
                      value={asgOpenAt}
                      onChange={setAsgOpenAt}
                      required
                      placeholder={t('teacherClass.assignments.openAtPlaceholder')}
                    />
                  </KidsFormField>
                  <KidsFormField
                    id={asgCloseAtId}
                    label={t('teacherClass.assignments.closeAt')}
                    required
                    hint={t('teacherClass.assignments.closeAtHint')}
                  >
                    <KidsDateTimeField
                      id={asgCloseAtId}
                      value={asgCloseAt}
                      onChange={setAsgCloseAt}
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
                        onClick={() => setAsgMediaType('image')}
                        className={`rounded-2xl border-2 p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 ${
                          asgMediaType === 'image'
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
                          onClick={() => setAsgMediaType('video')}
                          className={`rounded-2xl border-2 p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 ${
                            asgMediaType === 'video'
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
                    {asgMediaType === 'video' ? (
                      <div className="mt-4">
                        <label htmlFor="asg-video-duration" className={`${kidsLabelClass} block`}>
                          {t('teacherClass.assignments.videoLimit')}
                        </label>
                        <p className="mb-2 text-xs text-slate-500 dark:text-gray-400">
                          {t('teacherClass.assignments.videoLimitHint')}
                        </p>
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
                      <p className="mb-2 text-xs text-slate-500 dark:text-gray-400">
                        {t('teacherClass.assignments.roundCountHint')}
                      </p>
                      <KidsSelect
                        id="asg-submission-rounds"
                        value={String(asgSubmissionRounds)}
                        onChange={(v) => setAsgSubmissionRounds(Number(v) as 1 | 2 | 3 | 4 | 5)}
                        options={submissionRoundsOptions}
                      />
                    </div>
                  </fieldset>
                  <KidsPrimaryButton type="submit" disabled={asgSaving}>
                    {asgSaving ? t('profile.saving') : t('teacherClass.assignments.publish')}
                  </KidsPrimaryButton>
                </form>
              </div>
            </KidsCard>

            <KidsCard className="order-1 flex min-h-[280px] flex-col lg:order-2 lg:min-h-0">
              <div className="shrink-0">
                <h2 className="font-logo text-lg font-bold text-slate-900 dark:text-white">{t('teacherClass.assignments.listTitle')}</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
                  {t('teacherClass.assignments.listHint')}
                </p>
              </div>
              <div className="mt-3 space-y-6">
                {assignments.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-gray-400">{t('teacherClass.assignments.empty')}</p>
                ) : (
                  <>
                    <div>
                      <h3 className="font-logo text-sm font-bold text-amber-900 dark:text-amber-100">
                        {t('teacherClass.assignments.planned')} <span className="font-sans text-xs font-semibold">({plannedAssignments.length})</span>
                      </h3>
                      <p className="mt-1 text-[11px] text-amber-900/80 dark:text-amber-200/90">
                        {t('teacherClass.assignments.plannedHint')}
                      </p>
                      {plannedAssignments.length === 0 ? (
                        <p className="mt-2 text-sm text-slate-500 dark:text-gray-400">{t('teacherClass.assignments.noPlanned')}</p>
                      ) : (
                        <ul className="mt-2 space-y-3">
                          {plannedAssignments.map((a) => (
                            <li
                              key={a.id}
                              className="rounded-2xl border-2 border-amber-200/90 bg-linear-to-br from-amber-50/90 to-white px-4 py-3 dark:border-amber-800/60 dark:from-amber-950/40 dark:to-gray-900/50"
                            >
                              {assignmentCardBody(a)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <h3 className="font-logo text-sm font-bold text-violet-900 dark:text-violet-100">
                        {t('teacherClass.assignments.live')} <span className="font-sans text-xs font-semibold">({liveAssignments.length})</span>
                      </h3>
                      {liveAssignments.length === 0 ? (
                        <p className="mt-2 text-sm text-slate-500 dark:text-gray-400">{t('teacherClass.assignments.listEmpty')}</p>
                      ) : (
                        <ul className="mt-2 space-y-3">
                          {liveAssignments.map((a) => (
                            <li
                              key={a.id}
                              className="rounded-2xl border-2 border-violet-100 bg-white/80 px-4 py-3 dark:border-violet-900/40 dark:bg-gray-800/50"
                            >
                              {assignmentCardBody(a)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </>
                )}
              </div>
            </KidsCard>
          </div>
        </div>
      )}

      {tab === 'peer' && (
        <KidsCard tone="emerald">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-logo text-lg font-bold text-emerald-950 dark:text-emerald-50">
                {t('teacherClass.peer.title')}
              </h2>
              <p className="mt-1 text-sm text-emerald-900/85 dark:text-emerald-100/85">
                {t('teacherClass.peer.subtitle')}
              </p>
            </div>
            <KidsSecondaryButton type="button" disabled={peerLoading} onClick={() => void loadPeerChallenges()}>
              {peerLoading ? t('common.loading') : t('teacherClass.peer.refresh')}
            </KidsSecondaryButton>
          </div>
          {peerLoading && peerChallenges.length === 0 ? (
            <p className="mt-6 text-sm text-emerald-800 dark:text-emerald-200">{t('common.loading')}</p>
          ) : peerChallenges.length === 0 ? (
            <p className="mt-6 text-sm text-emerald-800/80 dark:text-emerald-200/90">
              {t('teacherClass.peer.empty')}
            </p>
          ) : (
            <div className="mt-6 space-y-8">
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
                        <h3 className="text-xs font-black uppercase tracking-wide text-amber-800 dark:text-amber-200">
                          {t('teacherClass.peer.pendingTitle').replace('{count}', String(pending.length))}
                        </h3>
                        <ul className="space-y-4">
                          {pending.map((ch) => (
                            <li
                              key={ch.id}
                              className="rounded-2xl border-2 border-amber-200/90 bg-amber-50/90 p-4 dark:border-amber-800 dark:bg-amber-950/40"
                            >
                              <p className="font-logo text-lg font-bold text-amber-950 dark:text-amber-50">{ch.title}</p>
                              <p className="mt-1 text-xs font-semibold text-amber-900 dark:text-amber-200">
                                {t('teacherClass.peer.starter')}: {peerStarterLabel(ch)}
                              </p>
                              <p className="mt-1 text-xs text-amber-900/90 dark:text-amber-100/85">
                                {t('teacherClass.peer.roundCount')}: {Math.max(1, ch.submission_rounds ?? 1)}
                              </p>
                              {ch.starts_at || ch.ends_at ? (
                                <p className="mt-1 text-xs font-semibold text-amber-900 dark:text-amber-100">
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
                                <p className="mt-2 whitespace-pre-wrap text-sm text-amber-950/90 dark:text-amber-100/90">
                                  {ch.description}
                                </p>
                              ) : null}
                              {ch.rules_or_goal ? (
                                <p className="mt-2 whitespace-pre-wrap text-sm text-amber-900/85 dark:text-amber-100/85">
                                  <span className="font-bold">{t('competitions.rulesOptional')}:</span> {ch.rules_or_goal}
                                </p>
                              ) : null}
                              <label className="mt-3 block text-xs font-bold text-amber-900 dark:text-amber-200">
                                {t('teacherClass.peer.rejectNote')}
                                <textarea
                                  value={rejectNoteById[ch.id] ?? ''}
                                  onChange={(e) =>
                                    setRejectNoteById((prev) => ({ ...prev, [ch.id]: e.target.value }))
                                  }
                                  className={`${kidsTextareaClass} mt-1 min-h-[72px]`}
                                  maxLength={600}
                                  placeholder={t('teacherClass.peer.rejectNotePlaceholder')}
                                />
                              </label>
                              <div className="mt-3 flex flex-wrap gap-2">
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
                      <div className="space-y-3">
                        <h3 className="text-xs font-black uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
                          {t('teacherClass.peer.other')}
                        </h3>
                        <ul className="space-y-2">
                          {other.map((ch) => (
                            <li
                              key={ch.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200/80 bg-white/80 px-3 py-2 dark:border-emerald-900 dark:bg-emerald-950/20"
                            >
                              <span className="font-semibold text-emerald-950 dark:text-emerald-50">{ch.title}</span>
                              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-200">
                                {peerRowStatusTr(ch.status, t)}
                                {ch.source === 'teacher' ? ` · ${t('teacherClass.peer.byTeacher')}` : ''}
                              </span>
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
        </KidsCard>
      )}

      {tab === 'stars' && (
        <KidsCard tone="amber">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-logo text-lg font-bold text-amber-950 dark:text-amber-50">
                {t('teacherClass.stars.title')}
              </h2>
              <p className="mt-1 text-sm text-amber-900/80 dark:text-amber-100/80">
                {t('teacherClass.stars.subtitle')}
              </p>
            </div>
            <KidsSecondaryButton type="button" onClick={() => loadChampion()}>
              {t('teacherClass.stars.load')}
            </KidsSecondaryButton>
          </div>
          {champion ? (
            <ul className="mt-6 space-y-2">
              {champion.top.length === 0 ? (
                <li className="text-sm text-amber-800 dark:text-amber-200">{t('teacherClass.stars.emptyWeek')}</li>
              ) : (
                champion.top.map((row, i) => (
                  <li
                    key={row.student.id}
                    className="flex flex-col gap-2 rounded-2xl bg-linear-to-r from-amber-100 to-orange-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:from-amber-950/50 dark:to-orange-950/40"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-amber-950 dark:text-amber-50">
                        {i + 1}. {row.student.first_name} {row.student.last_name || row.student.email}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-amber-900/90 dark:text-amber-100/90">
                        {t('roadmap.growthPoints')}: {row.student.growth_points ?? 0}
                        {row.student.growth_stage ? (
                          <span> · {t('roadmap.title')}: {row.student.growth_stage.title}</span>
                        ) : null}
                      </p>
                      {row.student.growth_stage?.subtitle ? (
                        <p className="mt-0.5 text-[11px] leading-snug text-amber-800/80 dark:text-amber-200/80">
                          {row.student.growth_stage.subtitle}
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 self-start rounded-full bg-white/80 px-3 py-1 text-sm font-bold text-amber-900 sm:self-center dark:bg-gray-900/80 dark:text-amber-100">
                      {row.submission_count} {t('teacherClass.stars.submissions')}
                    </span>
                  </li>
                ))
              )}
            </ul>
          ) : (
            <p className="mt-6 text-sm text-amber-800/80 dark:text-amber-200/80">
              {t('teacherClass.stars.loadHint')}
            </p>
          )}
        </KidsCard>
      )}

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
