'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import {
  kidsAuthorizedFetch,
  kidsCreateAssignment,
  kidsCreateInvite,
  kidsDeleteClass,
  kidsListAssignments,
  parseKidsInviteEmails,
  kidsListStudents,
  kidsClassLocationLine,
  kidsListSchools,
  kidsPatchClass,
  kidsRemoveEnrollment,
  kidsSchoolLocationLine,
  kidsWeeklyChampion,
  type KidsAssignment,
  type KidsClass,
  type KidsEnrollment,
  type KidsSchool,
} from '@/src/lib/kids-api';
import {
  KidsCard,
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
  { id: 'assignments', label: 'Ödevler', icon: '📝' },
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
    top: { student: { first_name: string; last_name: string; email: string }; submission_count: number }[];
  } | null>(null);

  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editSchoolId, setEditSchoolId] = useState<string>('');
  const [savingClass, setSavingClass] = useState(false);

  const [inviteEmailsText, setInviteEmailsText] = useState('');
  const [inviteDays, setInviteDays] = useState(7);
  const [inviting, setInviting] = useState(false);

  const [asgTitle, setAsgTitle] = useState('');
  const [asgPurpose, setAsgPurpose] = useState('');
  const [asgMaterials, setAsgMaterials] = useState('');
  const [asgVideoSec, setAsgVideoSec] = useState<60 | 120 | 180>(120);
  /** Öğrenci teslim türü: görsel/adım adım veya video (ikisi birden değil). */
  const [asgMediaType, setAsgMediaType] = useState<'image' | 'video'>('image');
  const [asgSaving, setAsgSaving] = useState(false);
  const [deletingClass, setDeletingClass] = useState(false);
  const [removingEnrollmentId, setRemovingEnrollmentId] = useState<number | null>(null);

  const editNameId = useId();
  const editDescId = useId();
  const editSchoolSelectId = useId();
  const inviteEmailsId = useId();
  const asgTitleId = useId();

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
      router.replace(`${pathPrefix}/giris`);
      return;
    }
    loadAll();
  }, [authLoading, user, router, pathPrefix, loadAll]);

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
      toast.error('En az bir veli e-postası yazın (virgül veya satır ile ayırabilirsin).');
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

  async function createAssignment(e: React.FormEvent) {
    e.preventDefault();
    if (!asgTitle.trim()) return;
    setAsgSaving(true);
    try {
      const a = await kidsCreateAssignment(classId, {
        title: asgTitle.trim(),
        purpose: asgPurpose.trim(),
        materials: asgMaterials.trim(),
        video_max_seconds: asgVideoSec,
        require_image: asgMediaType === 'image',
        require_video: asgMediaType === 'video',
        is_published: true,
      });
      setAssignments((prev) => [a, ...prev]);
      setAsgTitle('');
      setAsgPurpose('');
      setAsgMaterials('');
      setAsgMediaType('image');
      setAsgVideoSec(120);
      toast.success('Ödev yayında — öğrenciler panelinde görecek.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ödev eklenemedi');
    } finally {
      setAsgSaving(false);
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
      `${label} bu sınıftan çıkarılsın mı? Bu sınıfa ait ödev teslimleri de silinir; öğrenci hesabı silinmez.`,
    );
    if (!ok) return;
    setRemovingEnrollmentId(en.id);
    try {
      await kidsRemoveEnrollment(classId, en.id);
      setStudents((prev) => prev.filter((x) => x.id !== en.id));
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
      `“${cls.name}” sınıfı kalıcı olarak silinsin mi? Öğrenci kayıtları, ödevler ve teslimler silinir. Geri alınamaz.`,
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
    <KidsPanelMax>
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
            📝 {assignments.length} ödev
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
              Sınıfı silersen bu sınıfa bağlı tüm öğrenci kayıtları, ödevler ve teslimler kalıcı olarak kaldırılır.
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
            Veli e-posta adreslerini yaz; sistem her adres için davet kaydı oluşturur ve{' '}
            <strong>Marifetli üzerinden e-posta gönderir</strong> (kayıt bağlantısı ile). Birden fazla adres
            ekleyebilirsin — virgül, noktalı virgül veya her satıra bir adres. Öğrenci hesabı bu e-posta ile
            açılır veya mevcut öğrenci bu davetle sınıfa katılır. Süre dolunca yeni davet göndermen gerekir.
          </p>
          <form className="mt-6 space-y-5" onSubmit={sendInvite}>
            <KidsFormField
              id={inviteEmailsId}
              label="Veli e-postaları"
              required
              hint="Örnek: a@mail.com, b@mail.com veya her satıra bir adres. Tek seferde en fazla 40 adres."
            >
              <textarea
                id={inviteEmailsId}
                required
                rows={5}
                value={inviteEmailsText}
                onChange={(e) => setInviteEmailsText(e.target.value)}
                className={kidsTextareaClass}
                placeholder={'anne@ornek.com\nbaba@ornek.com'}
                aria-describedby={`${inviteEmailsId}-hint`}
              />
            </KidsFormField>
            <KidsFormField id="invite-days" label="Davet geçerliliği">
              <KidsSelect
                id="invite-days"
                value={String(inviteDays)}
                onChange={(v) => setInviteDays(Number(v))}
                options={INVITE_DAYS_OPTIONS}
              />
            </KidsFormField>
            <KidsPrimaryButton type="submit" disabled={inviting}>
              {inviting ? 'Gönderiliyor…' : 'Davetleri oluştur ve e-postayla gönder'}
            </KidsPrimaryButton>
          </form>
        </KidsCard>
      )}

      {tab === 'students' && (
        <KidsCard tone="amber">
          <h2 className="font-logo text-lg font-bold text-amber-950 dark:text-amber-50">Kayıtlı öğrenciler</h2>
          {students.length === 0 ? (
            <div className="mt-6">
              <KidsEmptyState
                emoji="🎈"
                title="Henüz kimse yok"
                description="Davet sekmesinden veli e-postalarına sistem üzerinden davet gönder; kayıt olanlar burada listelenir."
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
        <div className="space-y-8">
          <KidsCard>
            <h2 className="font-logo text-lg font-bold text-slate-900 dark:text-white">Yeni ödev</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-gray-400">
              Başlık zorunlu; amaç ve malzemeler öğrenciye rehber olur. Kurallarda teslim türünü seç: görsel
              (adım adım) veya video — video ise süre limiti belirlenir.
            </p>
            <form className="mt-6 space-y-5" onSubmit={createAssignment}>
              <KidsFormField id={asgTitleId} label="Ödev başlığı" required>
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
                  rows={3}
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
              <fieldset className="rounded-2xl border-2 border-violet-100 bg-violet-50/50 p-4 dark:border-violet-900/40 dark:bg-violet-950/30">
                <legend className="px-2 text-sm font-bold text-violet-900 dark:text-violet-100">
                  Kurallar
                </legend>
                <p className="mt-2 text-sm text-slate-600 dark:text-gray-400">
                  Öğrenci ödevi nasıl teslim etsin?
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
                      Metin ve görsellerle teslim; video istenmez.
                    </span>
                  </button>
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
              </fieldset>
              <KidsPrimaryButton type="submit" disabled={asgSaving}>
                {asgSaving ? 'Kaydediliyor…' : 'Ödevi yayınla'}
              </KidsPrimaryButton>
            </form>
          </KidsCard>

          <KidsCard>
            <h2 className="font-logo text-lg font-bold text-slate-900 dark:text-white">Yayındaki ödevler</h2>
            {assignments.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500 dark:text-gray-400">Henüz ödev yok.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {assignments.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-2xl border-2 border-violet-100 bg-white/80 px-4 py-4 dark:border-violet-900/40 dark:bg-gray-800/50"
                  >
                    <p className="font-bold text-slate-900 dark:text-white">{a.title}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
                      {a.require_video && a.require_image
                        ? `Görsel veya video · video en fazla ${a.video_max_seconds} sn`
                        : a.require_video
                          ? `Video teslimi · en fazla ${a.video_max_seconds} sn`
                          : a.require_image
                            ? 'Görsel / adım adım teslim'
                            : 'Teslim türü serbest'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </KidsCard>
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
                Son 7 günde en çok teslim eden öğrenciler — sınıf içi motivasyon için.
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
                    key={row.student.email}
                    className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-amber-100 to-orange-100 px-4 py-3 dark:from-amber-950/50 dark:to-orange-950/40"
                  >
                    <span className="font-bold text-amber-950 dark:text-amber-50">
                      {i + 1}. {row.student.first_name} {row.student.last_name || row.student.email}
                    </span>
                    <span className="rounded-full bg-white/80 px-3 py-1 text-sm font-bold text-amber-900 dark:bg-gray-900/80 dark:text-amber-100">
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
    </KidsPanelMax>
  );
}
