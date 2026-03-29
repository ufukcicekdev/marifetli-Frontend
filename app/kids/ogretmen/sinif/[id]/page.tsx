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
  KIDS_CLASS_GRADE_OPTIONS,
  KIDS_CLASS_SECTION_OPTIONS,
  kidsAcademicYearSelectOptions,
  kidsBuildStandardClassName,
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
  type KidsAssignment,
  type KidsClass,
  type KidsEnrollment,
  type KidsPeerChallenge,
  type KidsPeerChallengeStatus,
  type KidsSchool,
  type KidsUser,
} from '@/src/lib/kids-api';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';
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

const VIDEO_DURATION_OPTIONS: KidsSelectOption[] = [
  { value: '60', label: '1 dakika' },
  { value: '120', label: '2 dakika' },
  { value: '180', label: '3 dakika' },
];

const SUBMISSION_ROUNDS_OPTIONS: KidsSelectOption[] = [
  { value: '1', label: '1 challenge' },
  { value: '2', label: '2 challenge' },
  { value: '3', label: '3 challenge' },
  { value: '4', label: '4 challenge' },
  { value: '5', label: '5 challenge' },
];

const INVITE_DAYS_OPTIONS: KidsSelectOption[] = [
  { value: '3', label: '3 gün' },
  { value: '7', label: '7 gün' },
  { value: '14', label: '14 gün' },
  { value: '30', label: '30 gün' },
];

type TabId = 'general' | 'invite' | 'students' | 'assignments' | 'peer' | 'stars';

const TAB_IDS: TabId[] = ['general', 'invite', 'students', 'assignments', 'peer', 'stars'];

function tabFromSearchParam(raw: string | null): TabId | null {
  if (!raw) return null;
  return TAB_IDS.includes(raw as TabId) ? (raw as TabId) : null;
}

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'general', label: 'Sınıf', icon: '⚙️' },
  { id: 'invite', label: 'Davet', icon: '✉️' },
  { id: 'students', label: 'Öğrenciler', icon: '🧒' },
  { id: 'assignments', label: 'Challenges', icon: '📝' },
  { id: 'peer', label: 'Yarışmalar', icon: '🏆' },
  { id: 'stars', label: 'Haftanın yıldızı', icon: '⭐' },
];

function peerRowStatusTr(s: KidsPeerChallengeStatus): string {
  switch (s) {
    case 'pending_teacher':
      return 'Onay bekliyor';
    case 'rejected':
      return 'Reddedildi';
    case 'active':
      return 'Devam ediyor';
    case 'ended':
      return 'Sona erdi';
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
  const [editDesc, setEditDesc] = useState('');
  const [editSchoolId, setEditSchoolId] = useState<string>('');
  const [savingClass, setSavingClass] = useState(false);

  const [inviteEmailsText, setInviteEmailsText] = useState('');
  const [inviteDays, setInviteDays] = useState(7);
  const [inviting, setInviting] = useState(false);
  const [classInviteUrl, setClassInviteUrl] = useState('');
  const [creatingClassLink, setCreatingClassLink] = useState(false);
  /** Sunucu `KIDS_INVITE_EMAIL_ENABLED` — kapalıyken e-posta davet formu gösterilmez. */
  const [inviteEmailEnabled, setInviteEmailEnabled] = useState(true);
  /** Sunucu `KIDS_ASSIGNMENT_VIDEO_ENABLED` — kapalıyken challenge’da video teslim seçeneği yok. */
  const [assignmentVideoEnabled, setAssignmentVideoEnabled] = useState(true);

  const [asgTitle, setAsgTitle] = useState('');
  const [asgPurpose, setAsgPurpose] = useState('');
  const [asgMaterials, setAsgMaterials] = useState('');
  const [asgVideoSec, setAsgVideoSec] = useState<60 | 120 | 180>(120);
  /** Aynı konu altında öğrencinin teslim edeceği ayrı challenge sayısı (1–5). */
  const [asgSubmissionRounds, setAsgSubmissionRounds] = useState<1 | 2 | 3 | 4 | 5>(1);
  /** Öğrenci teslim türü: görsel/adım adım veya video (ikisi birden değil). */
  const [asgMediaType, setAsgMediaType] = useState<'image' | 'video'>('image');
  /** Teslime başlangıç (zorunlu), `YYYY-MM-DDTHH:mm` */
  const [asgOpenAt, setAsgOpenAt] = useState('');
  /** Son teslim (zorunlu), `YYYY-MM-DDTHH:mm` */
  const [asgCloseAt, setAsgCloseAt] = useState('');
  const [asgSaving, setAsgSaving] = useState(false);
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
  /** Modal `<dialog>` üst katmanda olduğu için toast görünmez; hata bu metinle gösterilir. */
  const [editAssignmentError, setEditAssignmentError] = useState<string | null>(null);
  const [deletingClass, setDeletingClass] = useState(false);
  const [removingEnrollmentId, setRemovingEnrollmentId] = useState<number | null>(null);

  const editNameId = useId();
  const editClassGradeId = useId();
  const editClassSectionId = useId();
  const editAcademicYearId = useId();
  const editDescId = useId();
  const editSchoolSelectId = useId();
  const inviteEmailsId = useId();
  const classLinkInputId = useId();
  const asgTitleId = useId();
  const asgOpenAtId = useId();
  const asgCloseAtId = useId();
  const editAsgTitleId = useId();
  const editAsgOpenAtId = useId();
  const editAsgCloseAtId = useId();

  useEffect(() => {
    setAsgCloseAt((v) => v || kidsDatetimeLocalDefaultClose(7));
  }, []);

  useEffect(() => {
    const t = tabFromSearchParam(searchParams.get('tab'));
    if (t) setTab(t);
  }, [searchParams]);

  const loadAll = useCallback(async () => {
    if (!Number.isFinite(classId)) return;
    try {
      const res = await kidsAuthorizedFetch(`/classes/${classId}/`, { method: 'GET' });
      if (!res.ok) {
        toast.error('Sınıf bulunamadı');
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
      setEditDesc(c.description || '');
      setEditSchoolId(String(c.school.id));
      setStudents(st);
      setAssignments(as);
    } catch {
      toast.error('Veri yüklenemedi');
    }
  }, [classId, pathPrefix, router]);

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
      toast.error(e instanceof Error ? e.message : 'Yarışmalar yüklenemedi');
    } finally {
      setPeerLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    if (tab !== 'peer' || !cls) return;
    void loadPeerChallenges();
  }, [tab, cls, loadPeerChallenges]);

  /** Planlanmış / yayından kalkmış: tüm alanlar. Yayındaki: başlangıç + challenge tur sayısı kilitli (backend ile aynı mantık). */
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
              Planlanmış — öğrenciler henüz görmüyor
            </p>
          ) : null}
          <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
            {a.require_video && a.require_image
              ? `Görsel veya video · video en fazla ${a.video_max_seconds} sn · ${a.submission_rounds ?? 1} ayrı challenge`
              : a.require_video
                ? `Video teslimi · en fazla ${a.video_max_seconds} sn · ${a.submission_rounds ?? 1} ayrı challenge`
                : a.require_image
                  ? `Görsel teslim · ${a.submission_rounds ?? 1} ayrı challenge`
                  : 'Teslim türü serbest'}
          </p>
          {winLabel ? (
            <p className="mt-1 text-xs font-semibold text-violet-800 dark:text-violet-200">{winLabel}</p>
          ) : null}
          {opensSoon ? (
            <p className="mt-1 text-[11px] text-slate-600 dark:text-gray-400">
              {a.students_notified_at
                ? 'Öğrenciler bilgilendirildi.'
                : 'Başlangıç saatinde öğrencilere haber verilecek.'}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-bold tabular-nums text-violet-900 dark:bg-violet-950/60 dark:text-violet-100">
            {subN}/{enr}
          </span>
          <span className="max-w-[4.5rem] text-center text-[10px] font-medium leading-tight text-slate-400 dark:text-gray-500">
            teslim / öğrenci
          </span>
          <KidsSecondaryButton
            type="button"
            className="min-h-9 w-full px-3 py-1.5 text-xs sm:w-auto"
            onClick={() => openAssignmentEdit(a)}
          >
            Düzenle
          </KidsSecondaryButton>
          <Link
            href={`${pathPrefix}/ogretmen/sinif/${classId}/proje/${a.id}`}
            className="text-xs font-bold text-violet-700 underline underline-offset-2 hover:text-fuchsia-600 dark:text-violet-300 dark:hover:text-fuchsia-400"
          >
            Teslimler →
          </Link>
        </div>
      </div>
    );
  }

  const editAcademicYearOptions = useMemo(() => {
    const base = kidsAcademicYearSelectOptions();
    const v = (editAcademicYear || '').trim();
    if (v && !base.some((o) => o.value === v)) {
      return [{ value: v, label: `${v} (kayıtlı)` }, ...base.filter((o) => o.value !== '')];
    }
    return base;
  }, [editAcademicYear]);

  async function saveClass(e: React.FormEvent) {
    e.preventDefault();
    if (!cls) return;
    const sidRaw = editSchoolId.trim();
    const sid = Number(sidRaw);
    if (!sidRaw || !Number.isFinite(sid) || sid <= 0) {
      toast.error('Bu sınıfın bağlı olduğu okulu seçmelisin.');
      return;
    }
    let nameToSave: string;
    if (!canEditClassIdentity) {
      nameToSave = cls.name;
    } else if (editClassNonStandard) {
      nameToSave = editName.trim();
      if (!nameToSave) {
        toast.error('Sınıf adı zorunludur.');
        return;
      }
    } else {
      if (!editClassGrade || !editClassSection) {
        toast.error('Sınıf düzeyi ve şube harfini seçmelisin.');
        return;
      }
      nameToSave = kidsBuildStandardClassName(editClassGrade, editClassSection);
    }
    setSavingClass(true);
    try {
      const updated = await kidsPatchClass(cls.id, {
        name: nameToSave,
        academic_year_label: canEditClassIdentity ? editAcademicYear.trim() : (cls.academic_year_label || '').trim(),
        description: editDesc.trim(),
        school_id: sid,
      });
      setCls(updated);
      toast.success('Sınıf bilgileri güncellendi');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kaydedilemedi');
    } finally {
      setSavingClass(false);
    }
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    const emails = parseKidsInviteEmails(inviteEmailsText);
    if (emails.length === 0) {
      toast.error('E-posta ile göndermek için en az bir adres yazın veya üstteki davet linkini kullanın.');
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
            ? 'Veliye davet e-postası gönderildi.'
            : `${summary.total} veliye davet e-postası gönderildi.`,
        );
      } else if (summary.emails_sent === 0) {
        const err = invites[0]?.email_error || 'E-posta gönderilemedi; bir süre sonra tekrar deneyin.';
        toast.error(`Davetler kaydedildi ancak e-posta gönderilemedi: ${err}`, { duration: 10_000 });
        const first = invites[0]?.signup_url;
        if (first && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          try {
            await navigator.clipboard.writeText(first);
            toast('İlk davet linki panoya kopyalandı; gerekirse manuel paylaş.', { duration: 6000 });
          } catch {
            /* ignore */
          }
        }
      } else {
        toast.success(
          `${summary.emails_sent} e-posta gönderildi, ${summary.emails_failed} adres için gönderim başarısız.`,
          { duration: 8000 },
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Davet oluşturulamadı');
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
        toast.success('Davet linki oluşturuldu ve panoya kopyalandı.', { duration: 4000 });
      } catch {
        toast.success('Davet linki oluşturuldu. Aşağıdan kopyalayabilirsin.', { duration: 5000 });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Link oluşturulamadı');
    } finally {
      setCreatingClassLink(false);
    }
  }

  async function createAssignment(e: React.FormEvent) {
    e.preventDefault();
    if (!asgTitle.trim()) {
      toast.error('Challenge başlığı zorunludur.');
      return;
    }
    const closeIso = kidsDatetimeLocalToIso(asgCloseAt);
    if (!closeIso) {
      toast.error('Son teslim tarih ve saatini seçmelisin.');
      return;
    }
    const openIso = kidsDatetimeLocalToIso(asgOpenAt);
    if (!openIso) {
      toast.error('Teslime başlangıç tarih ve saatini seçmelisin.');
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
          ? 'Challenge planlandı. Öğrenciler başlangıç saatine kadar görmeyecek; saat gelince kısa süre içinde haberdar edilirler.'
          : 'Challenge öğrencilere açıldı; panelde görebilirler.',
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Challenge eklenemedi');
    } finally {
      setAsgSaving(false);
    }
  }

  async function saveAssignmentEdit(e: React.FormEvent) {
    e.preventDefault();
    setEditAssignmentError(null);
    if (!editAssignment) return;
    if (!editTitle.trim()) {
      setEditAssignmentError('Challenge başlığı zorunludur.');
      return;
    }
    const closeIso = kidsDatetimeLocalToIso(editCloseAt);
    if (!closeIso) {
      setEditAssignmentError('Son teslim tarih ve saatini seçmelisin.');
      return;
    }
    const free = isAssignmentEditFullyFree(editAssignment);
    let openIso: string | undefined;
    if (free) {
      const parsed = kidsDatetimeLocalToIso(editOpenAt);
      if (!parsed) {
        setEditAssignmentError('Teslime başlangıç tarih ve saatini seçmelisin.');
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
      toast.success('Challenge güncellendi.');
    } catch (err) {
      setEditAssignmentError(err instanceof Error ? err.message : 'Güncellenemedi');
    } finally {
      setEditSaving(false);
    }
  }

  async function loadChampion() {
    try {
      const data = await kidsWeeklyChampion(classId);
      setChampion(data);
    } catch {
      toast.error('Liste yüklenemedi');
    }
  }

  async function reviewPeerChallengeRow(chId: number, decision: 'approve' | 'reject') {
    try {
      await kidsTeacherReviewPeerChallenge(classId, chId, {
        decision,
        rejection_note: rejectNoteById[chId] ?? '',
      });
      toast.success(decision === 'approve' ? 'Yarışma onaylandı.' : 'Öneri reddedildi.');
      setRejectNoteById((prev) => {
        const next = { ...prev };
        delete next[chId];
        return next;
      });
      await loadPeerChallenges();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'İşlem yapılamadı');
    }
  }

  async function startParentConversation(en: KidsEnrollment) {
    try {
      const display = `${en.student.first_name} ${en.student.last_name}`.trim() || en.student.email;
      const conv = await kidsCreateConversation({
        student_id: en.student.id,
        kids_class_id: classId,
        topic: `${display} · ${cls?.name || 'Sınıf'}`,
      });
      toast.success('Konuşma açıldı');
      router.push(`${pathPrefix}/mesajlar/${conv.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Konuşma açılamadı');
    }
  }

  function peerStarterLabel(ch: KidsPeerChallenge) {
    if (!ch.created_by_student) return '—';
    const en = students.find((e) => e.student.id === ch.created_by_student);
    if (!en) return `Öğrenci #${ch.created_by_student}`;
    return [en.student.first_name, en.student.last_name].filter(Boolean).join(' ') || en.student.email;
  }

  async function removeStudentFromClass(en: KidsEnrollment) {
    const label = [en.student.first_name, en.student.last_name].filter(Boolean).join(' ').trim() || en.student.email;
    const ok = window.confirm(
      `${label} bu sınıftan çıkarılsın mı? Bu sınıfa ait challenge teslimleri de silinir; öğrenci hesabı silinmez.`,
    );
    if (!ok) return;
    setRemovingEnrollmentId(en.id);
    try {
      await kidsRemoveEnrollment(classId, en.id);
      setStudents((prev) => prev.filter((x) => x.id !== en.id));
      try {
        setAssignments(await kidsListAssignments(classId));
      } catch {
        /* challenge özetleri güncellenemedi */
      }
      toast.success('Öğrenci sınıftan çıkarıldı');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'İşlem başarısız');
    } finally {
      setRemovingEnrollmentId(null);
    }
  }

  async function deleteEntireClass() {
    if (!cls) return;
    const ok = window.confirm(
      `“${cls.name}” sınıfı kalıcı olarak silinsin mi? Öğrenci kayıtları, challenge’lar ve teslimler silinir. Geri alınamaz.`,
    );
    if (!ok) return;
    setDeletingClass(true);
    try {
      await kidsDeleteClass(cls.id);
      toast.success('Sınıf silindi');
      router.replace(`${pathPrefix}/ogretmen/panel`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sınıf silinemedi');
    } finally {
      setDeletingClass(false);
    }
  }

  if (authLoading || !user) {
    return (
      <KidsPanelMax>
        <p className="text-center text-violet-800 dark:text-violet-200">Yükleniyor…</p>
      </KidsPanelMax>
    );
  }

  if (!cls) {
    return (
      <KidsPanelMax>
        <p className="text-center text-violet-800 dark:text-violet-200">Yükleniyor…</p>
      </KidsPanelMax>
    );
  }

  const classLocationLine = kidsClassLocationLine(cls);
  const canEditClassIdentity = user.role === 'admin';

  return (
    <KidsPanelMax className={tab === 'assignments' || tab === 'peer' ? '!max-w-6xl' : ''}>
      <div className="mb-6">
        <Link
          href={`${pathPrefix}/ogretmen/panel`}
          className="inline-flex items-center gap-2 text-sm font-bold text-violet-700 hover:text-fuchsia-600 dark:text-violet-300 dark:hover:text-fuchsia-400"
        >
          <span aria-hidden>←</span> Tüm sınıflarım
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-fuchsia-600 dark:text-fuchsia-400">
            Sınıf paneli
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
            🧒 {students.length} öğrenci
          </span>
          <span className="rounded-2xl bg-amber-100 px-3 py-2 font-bold text-amber-900 dark:bg-amber-950/60 dark:text-amber-100">
            📝 {assignments.length} challenge
          </span>
        </div>
      </div>

      <KidsTabs
        tabs={TABS}
        active={tab}
        onChange={(id) => setTab(id as TabId)}
        ariaLabel="Sınıf bölümleri"
      />

      {tab === 'general' && (
        <KidsCard>
          <h2 className="font-logo text-lg font-bold text-slate-900 dark:text-white">Sınıf bilgileri</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-gray-400">
            Sınıf adı, açıklama ve bağlı okulu güncelle. Okul atamaları yönetim panelinden yapılır.
          </p>
          <form className="mt-6 space-y-5" onSubmit={saveClass}>
            <KidsFormField
              id={editSchoolSelectId}
              label="Okul"
              required
              hint="İl / ilçe / mahalle yalnızca okul kartında; sınıfta tekrar girilmez."
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
                label="Sınıf adı (özel)"
                required
                hint="Kulüp veya özel grup adı gibi durumlarda serbest metin. Standart sınıf için aşağıdaki düğmeyi kullan."
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
                  <KidsFormField id={editClassGradeId} label="Sınıf düzeyi" required hint="1–12.">
                    <KidsSelect
                      id={editClassGradeId}
                      value={editClassGrade}
                      onChange={setEditClassGrade}
                      options={KIDS_CLASS_GRADE_OPTIONS}
                      searchable={false}
                      disabled={!canEditClassIdentity}
                    />
                  </KidsFormField>
                  <KidsFormField id={editClassSectionId} label="Şube (harf)" required hint="A–Z.">
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
                  Önizleme:{' '}
                  <strong className="font-logo text-slate-900 dark:text-white">
                    {kidsBuildStandardClassName(editClassGrade, editClassSection)}
                  </strong>
                </p>
              </>
            )}
            <KidsFormField
              id={editAcademicYearId}
              label="Eğitim-öğretim yılı"
              hint="Bu alan yönetim panelinden belirlenir; öğretmen panelinde sadece görüntülenir."
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
            <KidsFormField id={editDescId} label="Açıklama" hint="Öğrenci ve velilere kısa bilgi.">
              <textarea
                id={editDescId}
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={3}
                className={kidsTextareaClass}
              />
            </KidsFormField>
            <KidsPrimaryButton type="submit" disabled={savingClass}>
              {savingClass ? 'Kaydediliyor…' : 'Değişiklikleri kaydet'}
            </KidsPrimaryButton>
          </form>

          <div className="mt-10 border-t border-rose-200/80 pt-6 dark:border-rose-900/50">
            <h3 className="font-logo text-base font-bold text-rose-900 dark:text-rose-100">Tehlikeli bölge</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-gray-400">
              Sınıfı silersen bu sınıfa bağlı tüm öğrenci kayıtları, challenge’lar ve teslimler kalıcı olarak kaldırılır.
            </p>
            <KidsSecondaryButton
              type="button"
              className="mt-4 border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40"
              disabled={deletingClass}
              onClick={() => void deleteEntireClass()}
            >
              {deletingClass ? 'Siliniyor…' : 'Sınıfı kalıcı olarak sil'}
            </KidsSecondaryButton>
          </div>
        </KidsCard>
      )}

      {tab === 'invite' && (
        <KidsCard tone="sky">
          <h2 className="font-logo text-lg font-bold text-sky-950 dark:text-sky-50">Veli daveti</h2>
          <p className="mt-2 text-sm leading-relaxed text-sky-900/85 dark:text-sky-100/85">
            Velilerden tek tek e-posta istemek yerine <strong>sınıfa özel bir kayıt linki</strong> oluşturup
            WhatsApp, SMS veya sınıf grubunda paylaşabilirsin. Linke tıklayan veli kendi e-postası, adı-soyadı,
            telefonu ve <strong>veli şifresini</strong> girer; ardından çocuğun adı-soyadı ve{' '}
            <strong>çocuk şifresi</strong> tanımlanır. Çocuk paneline kullanıcı adı veya e-posta ile giriş yapılır.
          </p>

          <div className="mt-6 space-y-4 rounded-2xl border-2 border-sky-200/80 bg-white/70 p-5 dark:border-sky-800/50 dark:bg-sky-950/20">
            <KidsFormField id="invite-days" label="Link geçerliliği" hint="Süre dolunca yeni link üretmen gerekir.">
              <KidsSelect
                id="invite-days"
                value={String(inviteDays)}
                onChange={(v) => setInviteDays(Number(v))}
                options={INVITE_DAYS_OPTIONS}
              />
            </KidsFormField>
            <KidsPrimaryButton type="button" disabled={creatingClassLink} onClick={() => void createClassShareLink()}>
              {creatingClassLink ? 'Oluşturuluyor…' : 'Davet linki oluştur'}
            </KidsPrimaryButton>
            {classInviteUrl ? (
              <div className="space-y-2">
                <KidsFormField
                  id={classLinkInputId}
                  label="Paylaşılacak bağlantı"
                  hint="Bu adresi velilerle paylaş. Aynı linki birden fazla aile kullanabilir (süre bitene kadar)."
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
                      () => toast.success('Kopyalandı'),
                      () => toast.error('Panoya kopyalanamadı'),
                    );
                  }}
                >
                  Linki kopyala
                </KidsSecondaryButton>
              </div>
            ) : null}
          </div>

          {inviteEmailEnabled ? (
            <div className="relative mt-10 border-t border-sky-200/70 pt-8 dark:border-sky-800/50">
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-sky-700 dark:text-sky-300">
                İsteğe bağlı
              </p>
              <h3 className="font-logo text-base font-bold text-sky-950 dark:text-sky-50">
                E-posta ile davet gönder
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-sky-900/85 dark:text-sky-100/85">
                Belirli veli adreslerine sistem üzerinden e-posta göndermek istersen adresleri yaz; her adres
                için ayrı tek kullanımlık bağlantı üretilir ve posta ile gider.
              </p>
              <form className="mt-5 space-y-5" onSubmit={sendInvite}>
                <KidsFormField
                  id={inviteEmailsId}
                  label="Veli e-postaları"
                  hint="Virgül, noktalı virgül veya her satıra bir adres. En fazla 40 adres."
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
                  {inviting ? 'Gönderiliyor…' : 'E-posta davetlerini oluştur ve gönder'}
                </KidsPrimaryButton>
              </form>
            </div>
          ) : (
            <p className="mt-8 text-xs text-sky-800/70 dark:text-sky-200/60">
              Toplu e-posta daveti kurum ayarlarıyla kapalı; velilerle yalnızca yukarıdaki davet linkini
              paylaş.
            </p>
          )}
        </KidsCard>
      )}

      {tab === 'students' && (
        <KidsCard tone="amber">
          <h2 className="font-logo text-lg font-bold text-amber-950 dark:text-amber-50">Kayıtlı öğrenciler</h2>
          {students.length > 0 ? (
            <p className="mt-2 text-xs text-amber-900/85 dark:text-amber-100/85">
              Her satırda, bu sınıfta yayında kaç challenge olduğu ve öğrencinin bunlardan kaçına en az bir teslim gönderdiği gösterilir
              (aynı challenge’a birden fazla teslim yine tek sayılır).
            </p>
          ) : null}
          {students.length === 0 ? (
            <div className="mt-6">
              <KidsEmptyState
                emoji="🎈"
                title="Henüz kimse yok"
                description="Öğretmenin paylaştığı davet linki veya e-posta davetiyle kayıt olan öğrenciler burada görünür."
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
                        Yayınlanan challenge: {en.class_published_assignment_count}
                        {' · '}
                        Teslim edilen: {en.assignments_submitted_count ?? 0}
                        <span className="font-black text-fuchsia-700 dark:text-fuchsia-300">
                          {' '}
                          ({en.assignments_submitted_count ?? 0}/{en.class_published_assignment_count})
                        </span>
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                      Kayıt: {new Date(en.created_at).toLocaleDateString('tr-TR')}
                    </span>
                    <KidsSecondaryButton
                      type="button"
                      onClick={() => void startParentConversation(en)}
                    >
                      Veliyle mesaj başlat
                    </KidsSecondaryButton>
                    <KidsSecondaryButton
                      type="button"
                      className="border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/40"
                      disabled={removingEnrollmentId === en.id}
                      onClick={() => void removeStudentFromClass(en)}
                    >
                      {removingEnrollmentId === en.id ? 'Çıkarılıyor…' : 'Sınıftan çıkar'}
                    </KidsSecondaryButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </KidsCard>
      )}

      {tab === 'assignments' && (
        <div className="flex min-h-0 flex-col gap-3 lg:max-h-[min(720px,calc(100dvh-13rem))] lg:min-h-[380px]">
          <p className="text-sm text-slate-600 dark:text-gray-400 lg:hidden">
            Solda yeni challenge, sağda özet ve teslim oranı (ör. 3/20). Detay için challenge’a gir.
          </p>
          <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2 lg:gap-6 lg:overflow-hidden">
            <KidsCard className="flex min-h-[260px] flex-col overflow-hidden lg:min-h-0">
              <div className="shrink-0">
                <h2 className="font-logo text-lg font-bold text-slate-900 dark:text-white">Yeni challenge</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-gray-400">
                  Görsel teslimde öğrenci her tur için 1 görsel yükler.
                  {assignmentVideoEnabled
                    ? ' İstersen video teslimi de seçebilirsin.'
                    : ' Video teslimi bu kurulumda kapalı.'}
                </p>
              </div>
              <div className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 [-webkit-overflow-scrolling:touch]">
                <form className="space-y-4" onSubmit={createAssignment}>
              <KidsFormField id={asgTitleId} label="Başlık" required>
                <input
                  id={asgTitleId}
                  required
                  value={asgTitle}
                  onChange={(e) => setAsgTitle(e.target.value)}
                  className={kidsInputClass}
                  placeholder="Örn. Su döngüsü maketi"
                />
              </KidsFormField>
              <KidsFormField id="asg-purpose" label="Amaç / ne öğrenecekler?">
                <textarea
                  id="asg-purpose"
                  value={asgPurpose}
                  onChange={(e) => setAsgPurpose(e.target.value)}
                  rows={2}
                  className={kidsTextareaClass}
                />
              </KidsFormField>
              <KidsFormField id="asg-mat" label="Malzemeler">
                <textarea
                  id="asg-mat"
                  value={asgMaterials}
                  onChange={(e) => setAsgMaterials(e.target.value)}
                  rows={2}
                  className={kidsTextareaClass}
                  placeholder="Liste halinde yazabilirsin"
                />
              </KidsFormField>
              <KidsFormField
                id={asgOpenAtId}
                label="Teslime başlangıç tarihi ve saati"
                required
                hint="Başlangıç zamanı şu andan sonraysa challenge planlanmış listede durur; öğrenciler o saate kadar görmez, saat gelince haberdar edilir. Şimdiki veya geçmiş bir saat seçersen challenge öğrencilere hemen açık sayılır."
              >
                <KidsDateTimeField
                  id={asgOpenAtId}
                  value={asgOpenAt}
                  onChange={setAsgOpenAt}
                  required
                  placeholder="Başlangıç tarih ve saatini seç"
                />
              </KidsFormField>
              <KidsFormField
                id={asgCloseAtId}
                label="Son teslim tarihi ve saati"
                required
                hint="Öğrenci yalnızca bu zamana kadar (ve varsa başlangıçtan sonra) teslim edebilir."
              >
                <KidsDateTimeField
                  id={asgCloseAtId}
                  value={asgCloseAt}
                  onChange={setAsgCloseAt}
                  required
                  placeholder="Son teslimi seçmek için dokun"
                />
              </KidsFormField>
              <fieldset className="rounded-2xl border-2 border-violet-100 bg-violet-50/50 p-4 dark:border-violet-900/40 dark:bg-violet-950/30">
                <legend className="px-2 text-sm font-bold text-violet-900 dark:text-violet-100">
                  Kurallar
                </legend>
                <p className="mt-2 text-sm text-slate-600 dark:text-gray-400">
                  Öğrenci challenge’ını nasıl teslim etsin?
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
                      Görsel / adım adım
                    </span>
                    <span className="mt-1 block text-xs text-slate-600 dark:text-gray-400">
                      Metin ve görselle teslim; her challenge turunda 1 görsel.
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
                        Video
                      </span>
                      <span className="mt-1 block text-xs text-slate-600 dark:text-gray-400">
                        Öğrenci video bağlantısı ile teslim eder.
                      </span>
                    </button>
                  ) : null}
                </div>
                {asgMediaType === 'video' ? (
                  <div className="mt-4">
                    <label htmlFor="asg-video-duration" className={`${kidsLabelClass} block`}>
                      Video süre limiti
                    </label>
                    <p className="mb-2 text-xs text-slate-500 dark:text-gray-400">
                      Öğrenci yüklediği veya paylaştığı video bu süreyi aşmamalı.
                    </p>
                    <KidsSelect
                      id="asg-video-duration"
                      value={String(asgVideoSec)}
                      onChange={(v) => setAsgVideoSec(Number(v) as 60 | 120 | 180)}
                      options={VIDEO_DURATION_OPTIONS}
                    />
                  </div>
                ) : null}
                <div className="mt-4">
                  <label htmlFor="asg-submission-rounds" className={`${kidsLabelClass} block`}>
                    Bu konu için kaç ayrı challenge teslim edilsin?
                  </label>
                  <p className="mb-2 text-xs text-slate-500 dark:text-gray-400">
                    Öğrenci panelinde &quot;Challenge 1&quot;, &quot;Challenge 2&quot; şeklinde görünür (1–5).
                  </p>
                  <KidsSelect
                    id="asg-submission-rounds"
                    value={String(asgSubmissionRounds)}
                    onChange={(v) => setAsgSubmissionRounds(Number(v) as 1 | 2 | 3 | 4 | 5)}
                    options={SUBMISSION_ROUNDS_OPTIONS}
                  />
                </div>
              </fieldset>
              <KidsPrimaryButton type="submit" disabled={asgSaving}>
                {asgSaving ? 'Kaydediliyor…' : 'Challenge’ı yayınla'}
              </KidsPrimaryButton>
                </form>
              </div>
            </KidsCard>

            <KidsCard className="flex min-h-[280px] flex-col overflow-hidden lg:min-h-0">
              <div className="shrink-0">
                <h2 className="font-logo text-lg font-bold text-slate-900 dark:text-white">Challenges</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
                  <strong className="font-semibold text-slate-700 dark:text-gray-300">Planlanmış</strong> challenge’lar
                  öğrencilere başlangıç saatinde görünür.{' '}
                  <strong className="font-semibold text-slate-700 dark:text-gray-300">Öğrencilere açık</strong> olanlar
                  şu an öğrenci panelinde. Her kartta soldaki sayı teslim eden, sağdaki sayı sınıftaki öğrenci adedi.
                </p>
              </div>
              <div className="mt-3 min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain pr-1 [-webkit-overflow-scrolling:touch]">
                {assignments.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-gray-400">Henüz challenge yok.</p>
                ) : (
                  <>
                    <div>
                      <h3 className="font-logo text-sm font-bold text-amber-900 dark:text-amber-100">
                        Planlanmış <span className="font-sans text-xs font-semibold">({plannedAssignments.length})</span>
                      </h3>
                      <p className="mt-1 text-[11px] text-amber-900/80 dark:text-amber-200/90">
                        Başlangıç saati gelince öğrencilere haber gider; nadiren birkaç dakika gecikebilir.
                      </p>
                      {plannedAssignments.length === 0 ? (
                        <p className="mt-2 text-sm text-slate-500 dark:text-gray-400">Şu an planlanmış challenge yok.</p>
                      ) : (
                        <ul className="mt-2 space-y-3">
                          {plannedAssignments.map((a) => (
                            <li
                              key={a.id}
                              className="rounded-2xl border-2 border-amber-200/90 bg-gradient-to-br from-amber-50/90 to-white px-4 py-3 dark:border-amber-800/60 dark:from-amber-950/40 dark:to-gray-900/50"
                            >
                              {assignmentCardBody(a)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <h3 className="font-logo text-sm font-bold text-violet-900 dark:text-violet-100">
                        Öğrencilere açık <span className="font-sans text-xs font-semibold">({liveAssignments.length})</span>
                      </h3>
                      {liveAssignments.length === 0 ? (
                        <p className="mt-2 text-sm text-slate-500 dark:text-gray-400">Liste boş.</p>
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
                Sınıf yarışmaları
              </h2>
              <p className="mt-1 text-sm text-emerald-900/85 dark:text-emerald-100/85">
                Öğrencilerin arkadaş yarışması önerileri burada. Onaylayınca başlatan sınıf arkadaşlarına davet
                gönderebilir. (Öğretmen ödevleri &quot;Challenges&quot; sekmesinde.)
              </p>
            </div>
            <KidsSecondaryButton type="button" disabled={peerLoading} onClick={() => void loadPeerChallenges()}>
              {peerLoading ? 'Yükleniyor…' : 'Yenile'}
            </KidsSecondaryButton>
          </div>
          {peerLoading && peerChallenges.length === 0 ? (
            <p className="mt-6 text-sm text-emerald-800 dark:text-emerald-200">Yükleniyor…</p>
          ) : peerChallenges.length === 0 ? (
            <p className="mt-6 text-sm text-emerald-800/80 dark:text-emerald-200/90">
              Bu sınıfta henüz yarışma kaydı yok.
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
                          Onay bekleyen öğrenci önerileri ({pending.length})
                        </h3>
                        <ul className="space-y-4">
                          {pending.map((ch) => (
                            <li
                              key={ch.id}
                              className="rounded-2xl border-2 border-amber-200/90 bg-amber-50/90 p-4 dark:border-amber-800 dark:bg-amber-950/40"
                            >
                              <p className="font-logo text-lg font-bold text-amber-950 dark:text-amber-50">{ch.title}</p>
                              <p className="mt-1 text-xs font-semibold text-amber-900 dark:text-amber-200">
                                Başlatan: {peerStarterLabel(ch)}
                              </p>
                              <p className="mt-1 text-xs text-amber-900/90 dark:text-amber-100/85">
                                Challenge adımı sayısı: {Math.max(1, ch.submission_rounds ?? 1)}
                              </p>
                              {ch.starts_at || ch.ends_at ? (
                                <p className="mt-1 text-xs font-semibold text-amber-900 dark:text-amber-100">
                                  {ch.starts_at
                                    ? `Başlangıç: ${new Date(ch.starts_at).toLocaleString('tr-TR')}`
                                    : null}
                                  {ch.starts_at && ch.ends_at ? ' · ' : null}
                                  {ch.ends_at
                                    ? `Bitiş: ${new Date(ch.ends_at).toLocaleString('tr-TR')}`
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
                                  <span className="font-bold">Hedef / kurallar:</span> {ch.rules_or_goal}
                                </p>
                              ) : null}
                              <label className="mt-3 block text-xs font-bold text-amber-900 dark:text-amber-200">
                                Red nedeni (isteğe bağlı)
                                <textarea
                                  value={rejectNoteById[ch.id] ?? ''}
                                  onChange={(e) =>
                                    setRejectNoteById((prev) => ({ ...prev, [ch.id]: e.target.value }))
                                  }
                                  className={`${kidsTextareaClass} mt-1 min-h-[72px]`}
                                  maxLength={600}
                                  placeholder="Öğrenciye görünür kısa not"
                                />
                              </label>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <KidsPrimaryButton type="button" onClick={() => void reviewPeerChallengeRow(ch.id, 'approve')}>
                                  Onayla
                                </KidsPrimaryButton>
                                <KidsSecondaryButton type="button" onClick={() => void reviewPeerChallengeRow(ch.id, 'reject')}>
                                  Reddet
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
                          Diğer kayıtlar
                        </h3>
                        <ul className="space-y-2">
                          {other.map((ch) => (
                            <li
                              key={ch.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200/80 bg-white/80 px-3 py-2 dark:border-emerald-900 dark:bg-emerald-950/20"
                            >
                              <span className="font-semibold text-emerald-950 dark:text-emerald-50">{ch.title}</span>
                              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-200">
                                {peerRowStatusTr(ch.status)}
                                {ch.source === 'teacher' ? ' · Öğretmen' : ''}
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
                Haftanın yıldızı
              </h2>
              <p className="mt-1 text-sm text-amber-900/80 dark:text-amber-100/80">
                Son 7 günde en çok teslim eden öğrenciler; her satırda gelişim puanı ve rozet seviyesi de görünür.
              </p>
            </div>
            <KidsSecondaryButton type="button" onClick={() => loadChampion()}>
              Listeyi yükle
            </KidsSecondaryButton>
          </div>
          {champion ? (
            <ul className="mt-6 space-y-2">
              {champion.top.length === 0 ? (
                <li className="text-sm text-amber-800 dark:text-amber-200">Bu hafta henüz teslim yok.</li>
              ) : (
                champion.top.map((row, i) => (
                  <li
                    key={row.student.id}
                    className="flex flex-col gap-2 rounded-2xl bg-gradient-to-r from-amber-100 to-orange-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:from-amber-950/50 dark:to-orange-950/40"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-amber-950 dark:text-amber-50">
                        {i + 1}. {row.student.first_name} {row.student.last_name || row.student.email}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-amber-900/90 dark:text-amber-100/90">
                        Gelişim puanı: {row.student.growth_points ?? 0}
                        {row.student.growth_stage ? (
                          <span> · Rozet: {row.student.growth_stage.title}</span>
                        ) : null}
                      </p>
                      {row.student.growth_stage?.subtitle ? (
                        <p className="mt-0.5 text-[11px] leading-snug text-amber-800/80 dark:text-amber-200/80">
                          {row.student.growth_stage.subtitle}
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 self-start rounded-full bg-white/80 px-3 py-1 text-sm font-bold text-amber-900 sm:self-center dark:bg-gray-900/80 dark:text-amber-100">
                      {row.submission_count} teslim
                    </span>
                  </li>
                ))
              )}
            </ul>
          ) : (
            <p className="mt-6 text-sm text-amber-800/80 dark:text-amber-200/80">
              Yukarıdaki düğmeye basarak bu haftanın listesini getir.
            </p>
          )}
        </KidsCard>
      )}

      {editAssignment ? (
        <KidsCenteredModal
          title="Challenge’ı düzenle"
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
                    ? 'Planlanmış veya taslak challenge’da tüm alanları değiştirebilirsin.'
                    : 'Öğrencilere açık challenge’da teslim başlangıcı ve challenge (tur) sayısı sabittir; diğer alanları güncelleyebilirsin.'}
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
                  <KidsFormField id={editAsgTitleId} label="Başlık" required>
                    <input
                      id={editAsgTitleId}
                      required
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className={kidsInputClass}
                    />
                  </KidsFormField>
                  <KidsFormField id="edit-asg-purpose" label="Amaç / ne öğrenecekler?">
                    <textarea
                      id="edit-asg-purpose"
                      value={editPurpose}
                      onChange={(e) => setEditPurpose(e.target.value)}
                      rows={2}
                      className={kidsTextareaClass}
                    />
                  </KidsFormField>
                  <KidsFormField id="edit-asg-mat" label="Malzemeler">
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
                    label="Teslime başlangıç tarihi ve saati"
                    required={editFullyFree}
                    hint={
                      editFullyFree
                        ? 'Planlanmış challenge’da başlangıç ve son teslim zorunludur; başlangıç, son teslimden önce olmalıdır.'
                        : 'Bu challenge öğrencilere açık; başlangıç tarihini değiştirmek için challenge’ın planlanmış olması gerekir.'
                    }
                  >
                    <KidsDateTimeField
                      id={editAsgOpenAtId}
                      value={editOpenAt}
                      onChange={setEditOpenAt}
                      disabled={!editFullyFree}
                      required={editFullyFree}
                      placeholder={
                        editFullyFree ? 'Başlangıç tarih ve saatini seç' : 'Kilitli — planlanmış challenge’da düzenlenebilir'
                      }
                    />
                  </KidsFormField>
                  <KidsFormField
                    id={editAsgCloseAtId}
                    label="Son teslim tarihi ve saati"
                    required
                    hint="Öğrenci yalnızca bu zamana kadar (ve varsa başlangıçtan sonra) teslim edebilir."
                  >
                    <KidsDateTimeField
                      id={editAsgCloseAtId}
                      value={editCloseAt}
                      onChange={setEditCloseAt}
                      required
                      placeholder="Son teslimi seçmek için dokun"
                    />
                  </KidsFormField>
                  <fieldset className="rounded-2xl border-2 border-violet-100 bg-violet-50/50 p-4 dark:border-violet-900/40 dark:bg-violet-950/30">
                    <legend className="px-2 text-sm font-bold text-violet-900 dark:text-violet-100">
                      Kurallar
                    </legend>
                    <p className="mt-2 text-sm text-slate-600 dark:text-gray-400">
                      Öğrenci challenge’ını nasıl teslim etsin?
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
                          Görsel / adım adım
                        </span>
                        <span className="mt-1 block text-xs text-slate-600 dark:text-gray-400">
                          Metin ve görselle teslim; her turda 1 görsel.
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
                            Video
                          </span>
                          <span className="mt-1 block text-xs text-slate-600 dark:text-gray-400">
                            Öğrenci video bağlantısı ile teslim eder.
                          </span>
                        </button>
                      ) : null}
                    </div>
                    {editMediaType === 'video' ? (
                      <div className="mt-4">
                        <label htmlFor="edit-asg-video-duration" className={`${kidsLabelClass} block`}>
                          Video süre limiti
                        </label>
                        <p className="mb-2 text-xs text-slate-500 dark:text-gray-400">
                          Öğrenci yüklediği veya paylaştığı video bu süreyi aşmamalı.
                        </p>
                        <KidsSelect
                          id="edit-asg-video-duration"
                          value={String(editVideoSec)}
                          onChange={(v) => setEditVideoSec(Number(v) as 60 | 120 | 180)}
                          options={VIDEO_DURATION_OPTIONS}
                        />
                      </div>
                    ) : null}
                    <div className="mt-4">
                      <label htmlFor="edit-asg-submission-rounds" className={`${kidsLabelClass} block`}>
                        Bu konu için kaç ayrı challenge teslim edilsin?
                      </label>
                      <p className="mb-2 text-xs text-slate-500 dark:text-gray-400">
                        {editFullyFree
                          ? 'Öğrenci panelinde Challenge 1, Challenge 2 şeklinde görünür (1–5).'
                          : 'Yayındaki challenge’da bu sayı değiştirilemez.'}
                      </p>
                      <KidsSelect
                        id="edit-asg-submission-rounds"
                        value={String(editSubmissionRounds)}
                        onChange={(v) => setEditSubmissionRounds(Number(v) as 1 | 2 | 3 | 4 | 5)}
                        options={SUBMISSION_ROUNDS_OPTIONS}
                        disabled={!editFullyFree}
                      />
                    </div>
                  </fieldset>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <KidsPrimaryButton type="submit" disabled={editSaving}>
                      {editSaving ? 'Kaydediliyor…' : 'Kaydet'}
                    </KidsPrimaryButton>
                    <KidsSecondaryButton
                      type="button"
                      disabled={editSaving}
                      onClick={() => {
                        setEditAssignment(null);
                        setEditAssignmentError(null);
                      }}
                    >
                      Vazgeç
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
    <Suspense fallback={<p className="text-center text-sm text-violet-800 dark:text-violet-200">Yükleniyor…</p>}>
      <KidsTeacherClassPageContent />
    </Suspense>
  );
}
