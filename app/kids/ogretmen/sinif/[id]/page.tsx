'use client';

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import {
  kidsAuthorizedFetch,
  kidsCreateAssignment,
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
  kidsSchoolLocationLine,
  kidsTeacherAppConfig,
  kidsDatetimeLocalDefaultClose,
  kidsDatetimeLocalToIso,
  kidsFormatAssignmentWindowTr,
  kidsIsoToDatetimeLocal,
  kidsWeeklyChampion,
  type KidsAssignment,
  type KidsClass,
  type KidsEnrollment,
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

const VIDEO_DURATION_OPTIONS: KidsSelectOption[] = [
  { value: '60', label: '1 dakika' },
  { value: '120', label: '2 dakika' },
  { value: '180', label: '3 dakika' },
];

const MAX_STEP_IMAGE_OPTIONS: KidsSelectOption[] = [
  { value: '1', label: 'En fazla 1 görsel' },
  { value: '2', label: 'En fazla 2 görsel' },
  { value: '3', label: 'En fazla 3 görsel' },
];

const INVITE_DAYS_OPTIONS: KidsSelectOption[] = [
  { value: '3', label: '3 gün' },
  { value: '7', label: '7 gün' },
  { value: '14', label: '14 gün' },
  { value: '30', label: '30 gün' },
];

type TabId = 'general' | 'invite' | 'students' | 'assignments' | 'stars';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'general', label: 'Sınıf', icon: '⚙️' },
  { id: 'invite', label: 'Davet', icon: '✉️' },
  { id: 'students', label: 'Öğrenciler', icon: '🧒' },
  { id: 'assignments', label: 'Projeler', icon: '📝' },
  { id: 'stars', label: 'Haftanın yıldızı', icon: '⭐' },
];

export default function KidsTeacherClassPage() {
  const params = useParams();
  const router = useRouter();
  const classId = Number(params.id);
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();
  const [tab, setTab] = useState<TabId>('general');

  const [cls, setCls] = useState<KidsClass | null>(null);
  const [schools, setSchools] = useState<KidsSchool[]>([]);
  const [students, setStudents] = useState<KidsEnrollment[]>([]);
  const [assignments, setAssignments] = useState<KidsAssignment[]>([]);
  const [champion, setChampion] = useState<{
    week_start: string;
    top: { student: KidsUser; submission_count: number }[];
  } | null>(null);

  const [editName, setEditName] = useState('');
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
  /** Sunucu `KIDS_ASSIGNMENT_VIDEO_ENABLED` — kapalıyken projede video teslim seçeneği yok. */
  const [assignmentVideoEnabled, setAssignmentVideoEnabled] = useState(true);

  const [asgTitle, setAsgTitle] = useState('');
  const [asgPurpose, setAsgPurpose] = useState('');
  const [asgMaterials, setAsgMaterials] = useState('');
  const [asgVideoSec, setAsgVideoSec] = useState<60 | 120 | 180>(120);
  /** Görsel teslimde öğrencinin ekleyebileceği en fazla görsel sayısı (1–3). */
  const [asgMaxStepImages, setAsgMaxStepImages] = useState<1 | 2 | 3>(3);
  /** Öğrenci teslim türü: görsel/adım adım veya video (ikisi birden değil). */
  const [asgMediaType, setAsgMediaType] = useState<'image' | 'video'>('image');
  /** Teslime başlangıç (isteğe bağlı), `datetime-local` */
  const [asgOpenAt, setAsgOpenAt] = useState('');
  /** Son teslim (zorunlu), `datetime-local` */
  const [asgCloseAt, setAsgCloseAt] = useState('');
  const [asgSaving, setAsgSaving] = useState(false);
  const [editAssignment, setEditAssignment] = useState<KidsAssignment | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPurpose, setEditPurpose] = useState('');
  const [editMaterials, setEditMaterials] = useState('');
  const [editVideoSec, setEditVideoSec] = useState<60 | 120 | 180>(120);
  const [editMaxStepImages, setEditMaxStepImages] = useState<1 | 2 | 3>(3);
  const [editMediaType, setEditMediaType] = useState<'image' | 'video'>('image');
  const [editOpenAt, setEditOpenAt] = useState('');
  const [editCloseAt, setEditCloseAt] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [deletingClass, setDeletingClass] = useState(false);
  const [removingEnrollmentId, setRemovingEnrollmentId] = useState<number | null>(null);

  const editNameId = useId();
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
      setEditName(c.name);
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

  /** Planlanmış / yayından kalkmış: tüm alanlar. Yayındaki: başlangıç + max görsel kilitli (backend ile aynı mantık). */
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
    setEditTitle(a.title);
    setEditPurpose(a.purpose || '');
    setEditMaterials(a.materials || '');
    setEditVideoSec(a.video_max_seconds);
    if (a.require_video && !a.require_image) setEditMediaType('video');
    else setEditMediaType('image');
    setEditMaxStepImages((a.max_step_images ?? 3) as 1 | 2 | 3);
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
              ? `Görsel veya video · video en fazla ${a.video_max_seconds} sn`
              : a.require_video
                ? `Video teslimi · en fazla ${a.video_max_seconds} sn`
                : a.require_image
                  ? `Görsel teslim · en fazla ${a.max_step_images ?? 3} görsel`
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

  async function saveClass(e: React.FormEvent) {
    e.preventDefault();
    if (!cls) return;
    const sidRaw = editSchoolId.trim();
    const sid = Number(sidRaw);
    if (!sidRaw || !Number.isFinite(sid) || sid <= 0) {
      toast.error('Bu sınıfın bağlı olduğu okulu seçmelisin.');
      return;
    }
    setSavingClass(true);
    try {
      const updated = await kidsPatchClass(cls.id, {
        name: editName.trim(),
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
    if (!asgTitle.trim()) return;
    const closeIso = kidsDatetimeLocalToIso(asgCloseAt);
    if (!closeIso) {
      toast.error('Son teslim tarih ve saatini seçmelisin.');
      return;
    }
    const openIso = kidsDatetimeLocalToIso(asgOpenAt);
    setAsgSaving(true);
    try {
      const a = await kidsCreateAssignment(classId, {
        title: asgTitle.trim(),
        purpose: asgPurpose.trim(),
        materials: asgMaterials.trim(),
        video_max_seconds: asgVideoSec,
        require_image: asgMediaType === 'image',
        require_video: asgMediaType === 'video',
        max_step_images: asgMediaType === 'image' ? asgMaxStepImages : 3,
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
      setAsgMaxStepImages(3);
      setAsgVideoSec(120);
      const openStr = openIso ?? '';
      const openMs = openStr ? new Date(openStr).getTime() : NaN;
      const plannedLater = Boolean(openStr) && !Number.isNaN(openMs) && openMs > Date.now();
      toast.success(
        plannedLater
          ? 'Proje planlandı. Öğrenciler başlangıç saatine kadar görmeyecek; saat gelince kısa süre içinde haberdar edilirler.'
          : 'Proje öğrencilere açıldı; panelde görebilirler.',
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Proje eklenemedi');
    } finally {
      setAsgSaving(false);
    }
  }

  async function saveAssignmentEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editAssignment) return;
    if (!editTitle.trim()) return;
    const closeIso = kidsDatetimeLocalToIso(editCloseAt);
    if (!closeIso) {
      toast.error('Son teslim tarih ve saatini seçmelisin.');
      return;
    }
    const free = isAssignmentEditFullyFree(editAssignment);
    const openIso = free ? kidsDatetimeLocalToIso(editOpenAt) : undefined;
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
        body.submission_opens_at = openIso ?? null;
        body.max_step_images = editMediaType === 'image' ? editMaxStepImages : 3;
      }
      const updated = await kidsPatchAssignment(classId, editAssignment.id, body);
      setAssignments((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      setEditAssignment(null);
      toast.success('Proje güncellendi.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Güncellenemedi');
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

  async function removeStudentFromClass(en: KidsEnrollment) {
    const label = [en.student.first_name, en.student.last_name].filter(Boolean).join(' ').trim() || en.student.email;
    const ok = window.confirm(
      `${label} bu sınıftan çıkarılsın mı? Bu sınıfa ait proje teslimleri de silinir; öğrenci hesabı silinmez.`,
    );
    if (!ok) return;
    setRemovingEnrollmentId(en.id);
    try {
      await kidsRemoveEnrollment(classId, en.id);
      setStudents((prev) => prev.filter((x) => x.id !== en.id));
      try {
        setAssignments(await kidsListAssignments(classId));
      } catch {
        /* proje özetleri güncellenemedi */
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
      `“${cls.name}” sınıfı kalıcı olarak silinsin mi? Öğrenci kayıtları, projeler ve teslimler silinir. Geri alınamaz.`,
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

  return (
    <KidsPanelMax className={tab === 'assignments' ? '!max-w-6xl' : ''}>
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
          <h1 className="font-logo mt-1 text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">
            {cls.name}
          </h1>
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
            📝 {assignments.length} proje
          </span>
        </div>
      </div>

      <KidsTabs tabs={TABS} active={tab} onChange={(id) => setTab(id as TabId)} />

      {tab === 'general' && (
        <KidsCard>
          <h2 className="font-logo text-lg font-bold text-slate-900 dark:text-white">Sınıf bilgileri</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-gray-400">
            Sınıf adı, açıklama ve bağlı okulu güncelle. Yeni okul eklemek için{' '}
            <Link
              href={`${pathPrefix}/ogretmen/okullar`}
              className="font-bold text-violet-700 underline underline-offset-2 hover:text-fuchsia-600 dark:text-violet-300"
            >
              Okullarım
            </Link>{' '}
            sayfasını kullan.
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
            <KidsFormField id={editNameId} label="Sınıf adı" required>
              <input
                id={editNameId}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className={kidsInputClass}
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
              Sınıfı silersen bu sınıfa bağlı tüm öğrenci kayıtları, projeler ve teslimler kalıcı olarak kaldırılır.
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
            WhatsApp, SMS veya sınıf grubunda paylaşabilirsin. Veli linke tıklayınca hangi öğretmenin hangi
            sınıfa davet ettiği görünür; öğrenci e-postası ve ad-soyad kendileri girer.
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
              Her satırda, bu sınıfta yayında kaç proje olduğu ve öğrencinin bunlardan kaçına en az bir teslim gönderdiği gösterilir
              (aynı projeye birden fazla teslim yine tek sayılır).
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
                        Yayınlanan proje: {en.class_published_assignment_count}
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
            Solda yeni proje, sağda özet ve teslim oranı (ör. 3/20). Detay için projeye gir.
          </p>
          <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2 lg:gap-6 lg:overflow-hidden">
            <KidsCard className="flex min-h-[260px] flex-col overflow-hidden lg:min-h-0">
              <div className="shrink-0">
                <h2 className="font-logo text-lg font-bold text-slate-900 dark:text-white">Yeni proje</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-gray-400">
                  Görsel teslimde öğrenci en az bir görsel yükler; üst sınırı sen seçersin.
                  {assignmentVideoEnabled
                    ? ' İstersen video teslimi de seçebilirsin.'
                    : ' Video teslimi bu kurulumda kapalı.'}
                </p>
              </div>
              <div className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 [-webkit-overflow-scrolling:touch]">
                <form className="space-y-4" onSubmit={createAssignment}>
              <KidsFormField id={asgTitleId} label="Proje başlığı" required>
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
                label="Teslime başlangıç (isteğe bağlı)"
                hint="Boş bırakırsan proje hemen öğrencilere açılır. İleri bir tarih seçersen proje planlanmış listede durur; öğrenciler o saate kadar görmez, saat gelince haberdar edilir."
              >
                <input
                  id={asgOpenAtId}
                  type="datetime-local"
                  value={asgOpenAt}
                  onChange={(e) => setAsgOpenAt(e.target.value)}
                  className={kidsInputClass}
                />
              </KidsFormField>
              <KidsFormField
                id={asgCloseAtId}
                label="Son teslim tarihi ve saati"
                required
                hint="Öğrenci yalnızca bu zamana kadar (ve varsa başlangıçtan sonra) teslim edebilir."
              >
                <input
                  id={asgCloseAtId}
                  type="datetime-local"
                  required
                  value={asgCloseAt}
                  onChange={(e) => setAsgCloseAt(e.target.value)}
                  className={kidsInputClass}
                />
              </KidsFormField>
              <fieldset className="rounded-2xl border-2 border-violet-100 bg-violet-50/50 p-4 dark:border-violet-900/40 dark:bg-violet-950/30">
                <legend className="px-2 text-sm font-bold text-violet-900 dark:text-violet-100">
                  Kurallar
                </legend>
                <p className="mt-2 text-sm text-slate-600 dark:text-gray-400">
                  Öğrenci projesini nasıl teslim etsin?
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
                      Metin ve görsellerle teslim; en fazla görsel sayısını aşağıdan seç.
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
                {asgMediaType === 'image' ? (
                  <div className="mt-4">
                    <label htmlFor="asg-max-step-images" className={`${kidsLabelClass} block`}>
                      Öğrenci en fazla kaç görsel ekleyebilir?
                    </label>
                    <p className="mb-2 text-xs text-slate-500 dark:text-gray-400">
                      En az 1 görsel yüklemeleri gerekir; burada üst sınırı belirlersin (1–3).
                    </p>
                    <KidsSelect
                      id="asg-max-step-images"
                      value={String(asgMaxStepImages)}
                      onChange={(v) => setAsgMaxStepImages(Number(v) as 1 | 2 | 3)}
                      options={MAX_STEP_IMAGE_OPTIONS}
                    />
                  </div>
                ) : null}
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
              </fieldset>
              <KidsPrimaryButton type="submit" disabled={asgSaving}>
                {asgSaving ? 'Kaydediliyor…' : 'Projeyi yayınla'}
              </KidsPrimaryButton>
                </form>
              </div>
            </KidsCard>

            <KidsCard className="flex min-h-[280px] flex-col overflow-hidden lg:min-h-0">
              <div className="shrink-0">
                <h2 className="font-logo text-lg font-bold text-slate-900 dark:text-white">Projeler</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
                  <strong className="font-semibold text-slate-700 dark:text-gray-300">Planlanmış</strong> projeler
                  öğrencilere başlangıç saatinde görünür.{' '}
                  <strong className="font-semibold text-slate-700 dark:text-gray-300">Öğrencilere açık</strong> olanlar
                  şu an öğrenci panelinde. Her kartta soldaki sayı teslim eden, sağdaki sayı sınıftaki öğrenci adedi.
                </p>
              </div>
              <div className="mt-3 min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain pr-1 [-webkit-overflow-scrolling:touch]">
                {assignments.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-gray-400">Henüz proje yok.</p>
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
                        <p className="mt-2 text-sm text-slate-500 dark:text-gray-400">Şu an planlanmış proje yok.</p>
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
          title="Projeyi düzenle"
          onClose={() => {
            if (!editSaving) setEditAssignment(null);
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
                    ? 'Planlanmış veya taslak projede tüm alanları değiştirebilirsin.'
                    : 'Öğrencilere açık projede teslim başlangıcı ve en fazla görsel sayısı sabittir; diğer alanları güncelleyebilirsin.'}
                </p>
                <form className="space-y-4" onSubmit={saveAssignmentEdit}>
                  <KidsFormField id={editAsgTitleId} label="Proje başlığı" required>
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
                    label="Teslime başlangıç"
                    hint={
                      editFullyFree
                        ? 'Boş bırakırsan proje hemen öğrencilere açık sayılır (yayındaki projelerde bu alan kilitli).'
                        : 'Bu proje öğrencilere açık; başlangıç tarihini değiştirmek için projenin planlanmış olması gerekir.'
                    }
                  >
                    <input
                      id={editAsgOpenAtId}
                      type="datetime-local"
                      value={editOpenAt}
                      onChange={(e) => setEditOpenAt(e.target.value)}
                      disabled={!editFullyFree}
                      className={`${kidsInputClass} disabled:cursor-not-allowed disabled:opacity-60`}
                    />
                  </KidsFormField>
                  <KidsFormField
                    id={editAsgCloseAtId}
                    label="Son teslim tarihi ve saati"
                    required
                    hint="Öğrenci yalnızca bu zamana kadar (ve varsa başlangıçtan sonra) teslim edebilir."
                  >
                    <input
                      id={editAsgCloseAtId}
                      type="datetime-local"
                      required
                      value={editCloseAt}
                      onChange={(e) => setEditCloseAt(e.target.value)}
                      className={kidsInputClass}
                    />
                  </KidsFormField>
                  <fieldset className="rounded-2xl border-2 border-violet-100 bg-violet-50/50 p-4 dark:border-violet-900/40 dark:bg-violet-950/30">
                    <legend className="px-2 text-sm font-bold text-violet-900 dark:text-violet-100">
                      Kurallar
                    </legend>
                    <p className="mt-2 text-sm text-slate-600 dark:text-gray-400">
                      Öğrenci projesini nasıl teslim etsin?
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
                          Metin ve görsellerle teslim; en fazla görsel sayısını aşağıdan seç.
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
                    {editMediaType === 'image' ? (
                      <div className="mt-4">
                        <label htmlFor="edit-asg-max-step-images" className={`${kidsLabelClass} block`}>
                          Öğrenci en fazla kaç görsel ekleyebilir?
                        </label>
                        <p className="mb-2 text-xs text-slate-500 dark:text-gray-400">
                          {editFullyFree
                            ? 'En az 1 görsel yüklemeleri gerekir; burada üst sınırı belirlersin (1–3).'
                            : 'Yayındaki projede bu üst sınır değiştirilemez.'}
                        </p>
                        <KidsSelect
                          id="edit-asg-max-step-images"
                          value={String(editMaxStepImages)}
                          onChange={(v) => setEditMaxStepImages(Number(v) as 1 | 2 | 3)}
                          options={MAX_STEP_IMAGE_OPTIONS}
                          disabled={!editFullyFree}
                        />
                      </div>
                    ) : null}
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
                  </fieldset>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <KidsPrimaryButton type="submit" disabled={editSaving}>
                      {editSaving ? 'Kaydediliyor…' : 'Kaydet'}
                    </KidsPrimaryButton>
                    <KidsSecondaryButton
                      type="button"
                      disabled={editSaving}
                      onClick={() => setEditAssignment(null)}
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
