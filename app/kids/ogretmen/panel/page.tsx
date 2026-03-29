'use client';

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import {
  KIDS_CLASS_GRADE_OPTIONS,
  KIDS_CLASS_SECTION_OPTIONS,
  kidsBuildStandardClassName,
  kidsClassLocationLine,
  kidsCreateClass,
  kidsListClasses,
  kidsListSchoolClassDirectory,
  kidsListSchools,
  kidsSchoolLocationLine,
  kidsSelfJoinClass,
  type KidsClass,
  type KidsSchoolDirectoryClassRow,
  type KidsSchool,
} from '@/src/lib/kids-api';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';
import {
  KidsCard,
  KidsEmptyState,
  KidsFormField,
  KidsPageHeader,
  KidsPanelMax,
  KidsPrimaryButton,
  KidsSecondaryButton,
  KidsSelect,
  kidsInputClass,
  kidsTextareaClass,
} from '@/src/components/kids/kids-ui';

export default function KidsTeacherPanelPage() {
  const router = useRouter();
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();
  const [classes, setClasses] = useState<KidsClass[]>([]);
  const [schools, setSchools] = useState<KidsSchool[]>([]);
  const [loading, setLoading] = useState(true);
  const [classGrade, setClassGrade] = useState('4');
  const [classSection, setClassSection] = useState('A');
  const [description, setDescription] = useState('');
  const [schoolId, setSchoolId] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [schoolClasses, setSchoolClasses] = useState<KidsSchoolDirectoryClassRow[]>([]);
  const [schoolClassesLoading, setSchoolClassesLoading] = useState(false);
  const [joiningClassId, setJoiningClassId] = useState<number | null>(null);
  const classGradeId = useId();
  const classSectionId = useId();
  const descId = useId();
  const academicYearId = useId();
  const schoolSelectId = useId();

  const load = useCallback(async () => {
    try {
      const [list, sch] = await Promise.all([kidsListClasses(), kidsListSchools()]);
      setClasses(list);
      setSchools([...sch].sort((a, b) => a.name.localeCompare(b.name, 'tr')));
    } catch {
      toast.error('Veri yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      router.replace(kidsLoginPortalHref(pathPrefix, 'ogretmen'));
      return;
    }
    load();
  }, [authLoading, user, router, pathPrefix, load]);

  useEffect(() => {
    if (schools.length === 0 || schoolId) return;
    setSchoolId(String(schools[0].id));
  }, [schools, schoolId]);

  useEffect(() => {
    const sid = Number(schoolId || 0);
    if (!sid) {
      setSchoolClasses([]);
      return;
    }
    let cancelled = false;
    setSchoolClassesLoading(true);
    (async () => {
      try {
        const rows = await kidsListSchoolClassDirectory(sid);
        if (!cancelled) setSchoolClasses(rows);
      } catch (e) {
        if (!cancelled) toast.error(e instanceof Error ? e.message : 'Okul sınıfları alınamadı');
      } finally {
        if (!cancelled) setSchoolClassesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolId]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const sid = Number(schoolId);
    if (!Number.isFinite(sid) || sid <= 0) {
      toast.error('Önce en az bir okul tanımlayıp listeden seçmelisin.');
      return;
    }
    if (!classGrade || !classSection) {
      toast.error('Sınıf düzeyi ve şube harfini seçmelisin.');
      return;
    }
    const selectedSchool = schools.find((s) => String(s.id) === schoolId) ?? null;
    const academicYearLabel = (selectedSchool?.default_academic_year_label || '').trim();
    if (!academicYearLabel) {
      toast.error('Bu okul için eğitim-öğretim yılı yönetimden tanımlanmalı.');
      return;
    }
    const composedName = kidsBuildStandardClassName(classGrade, classSection);
    setCreating(true);
    try {
      const c = await kidsCreateClass({
        name: composedName,
        description: description.trim(),
        school_id: sid,
        academic_year_label: academicYearLabel,
      });
      setClasses((prev) => [c, ...prev]);
      setClassGrade('4');
      setClassSection('A');
      setDescription('');
      toast.success('Yeni sınıf hazır — öğrenci davetine geçebilirsin.');
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : 'Oluşturulamadı';
      const duplicateClassMessage =
        'Bu okulda aynı sınıf adı bu eğitim-öğretim yılı için zaten var. Yeni sınıf açmak yerine mevcut sınıfa öğretmen ataması yapın.';
      if (rawMessage.includes(duplicateClassMessage)) {
        toast.error('Bu okulda benzer bir sınıf var. "Bu sınıfa katıl" diyerek devam edebilirsiniz.');
      } else {
        toast.error(rawMessage);
      }
    } finally {
      setCreating(false);
    }
  }

  async function onJoinExistingClass(row: KidsSchoolDirectoryClassRow) {
    setJoiningClassId(row.id);
    try {
      await kidsSelfJoinClass(row.id);
      toast.success(`${row.name} sınıfına atandın.`);
      await load();
      const sid = Number(schoolId || 0);
      if (sid) {
        const rows = await kidsListSchoolClassDirectory(sid);
        setSchoolClasses(rows);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sınıfa katılım başarısız');
    } finally {
      setJoiningClassId(null);
    }
  }

  if (authLoading) {
    return (
      <KidsPanelMax>
        <p className="text-center text-violet-800 dark:text-violet-200">Yükleniyor…</p>
      </KidsPanelMax>
    );
  }
  if (!user) {
    return (
      <KidsPanelMax>
        <p className="text-center text-violet-800 dark:text-violet-200">Yönlendiriliyorsun…</p>
      </KidsPanelMax>
    );
  }
  if (user.role !== 'teacher' && user.role !== 'admin') {
    return (
      <KidsPanelMax>
        <p className="text-center text-violet-800 dark:text-violet-200">Yönlendiriliyorsun…</p>
      </KidsPanelMax>
    );
  }

  const firstName = user.first_name?.trim() || 'Öğretmen';
  const selectedSchool = schools.find((s) => String(s.id) === schoolId) ?? null;
  const lockedAcademicYearLabel = (selectedSchool?.default_academic_year_label || '').trim();
  return (
    <KidsPanelMax>
      <KidsPageHeader
        emoji="👩‍🏫"
        title={`Merhaba, ${firstName}!`}
        subtitle="Önce okulunu tanımla, sonra sınıf açarken o okulu seç. Davet ve challenge’lar sınıf sayfasından yönetilir."
        compactOnMobile
      />

      <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-5">
          <KidsCard tone="emerald" className="lg:sticky lg:top-28">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                <span
                  className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-2xl"
                  aria-hidden
                >
                  ⏳
                </span>
                <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">Okul ve sınıf listesi yükleniyor…</p>
              </div>
            ) : schools.length === 0 ? (
              <>
                <div className="mb-6 flex items-start gap-3">
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-2xl text-amber-950 shadow-md"
                    aria-hidden
                  >
                    📍
                  </span>
                  <div>
                    <h2 className="font-logo text-xl font-bold text-emerald-950 dark:text-emerald-50">
                      Önce okul eklemen gerekiyor
                    </h2>
                    <p className="mt-1 text-sm leading-relaxed text-emerald-900/85 dark:text-emerald-100/85">
                      Bu hesap için henüz yönetim tarafından okul ataması yapılmamış görünüyor. Sınıf, mutlaka bir okula
                      bağlıdır.
                    </p>
                  </div>
                </div>

                <ol className="mb-6 space-y-3 rounded-2xl border-2 border-emerald-200/80 bg-emerald-50/60 p-4 text-sm text-emerald-950 dark:border-emerald-800/50 dark:bg-emerald-950/25 dark:text-emerald-50">
                  <li className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-black text-white">
                      1
                    </span>
                    <span>Yönetim panelinden öğretmeni bir okula atayın.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-black text-white">
                      2
                    </span>
                    <span>Atama sonrası bu sayfada okul seçimi açılır ve sınıf oluşturabilirsin.</span>
                  </li>
                </ol>

                <p className="text-center text-xs text-emerald-800/75 dark:text-emerald-200/75">
                  Okul yönetimi geçici olarak yalnızca yönetim panelinden yapılır.
                </p>
              </>
            ) : (
              <>
                <div className="mb-6 flex items-start gap-3">
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-2xl text-white shadow-lg shadow-emerald-600/30"
                    aria-hidden
                  >
                    ➕
                  </span>
                  <div>
                    <h2 className="font-logo text-xl font-bold text-emerald-950 dark:text-emerald-50">
                      Yeni sınıf oluştur
                    </h2>
                    <p className="mt-1 text-sm leading-relaxed text-emerald-900/80 dark:text-emerald-100/80">
                      Okulunu seç, sınıf düzeyi ve şubeyi belirleyip kaydet. Her eğitim-öğretim yılı için
                      ayrı sınıf kaydı açılır.
                    </p>
                  </div>
                </div>

                <div className="mb-6 border-t border-emerald-200/70 pt-5 dark:border-emerald-800/40">
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-800/90 dark:text-emerald-200/90">
                    Bu okuldaki mevcut sınıflar
                  </p>
                  {schoolClassesLoading ? (
                    <p className="mt-2 text-sm text-emerald-900/80 dark:text-emerald-100/80">Yükleniyor…</p>
                  ) : schoolClasses.length === 0 ? (
                    <p className="mt-2 text-sm text-emerald-900/80 dark:text-emerald-100/80">
                      Seçilen okulda henüz sınıf yok.
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {schoolClasses.map((row) => (
                        <li
                          key={row.id}
                          className="rounded-xl border border-emerald-200/80 bg-white/80 px-3 py-2 dark:border-emerald-800/50 dark:bg-emerald-950/25"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold text-emerald-950 dark:text-emerald-50">{row.name}</p>
                              <p className="text-xs text-emerald-800/80 dark:text-emerald-200/80">
                                Sınıf öğretmeni: {row.teacher_display}
                              </p>
                            </div>
                            {row.is_assigned ? (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100">
                                Zaten atandın
                              </span>
                            ) : (
                              <KidsSecondaryButton
                                type="button"
                                disabled={joiningClassId === row.id}
                                onClick={() => void onJoinExistingClass(row)}
                                className="border-emerald-300 text-emerald-900 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-100 dark:hover:bg-emerald-900/30"
                              >
                                {joiningClassId === row.id ? 'Katılıyor…' : 'Bu sınıfa katıl'}
                              </KidsSecondaryButton>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <form className="space-y-8" onSubmit={onCreate} id="yeni-sinif-form">
                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-emerald-800/90 dark:text-emerald-200/90">
                      Adım 1 · Okul seç
                    </p>
                    <KidsFormField
                      id={schoolSelectId}
                      label="Hangi okulda?"
                      required
                      hint="Bu sınıf seçtiğin okula bağlanır."
                    >
                      <KidsSelect
                        id={schoolSelectId}
                        value={schoolId}
                        onChange={setSchoolId}
                        disabled={schools.length === 0}
                        options={schools.map((s) => ({
                          value: String(s.id),
                          label: kidsSchoolLocationLine(s) || s.name,
                        }))}
                      />
                    </KidsFormField>
                  </div>

                  <div className="space-y-4 border-t border-emerald-200/70 pt-6 dark:border-emerald-800/40">
                    <p className="text-xs font-bold uppercase tracking-wide text-emerald-800/90 dark:text-emerald-200/90">
                      Adım 2 · Sınıf bilgileri
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <KidsFormField
                        id={classGradeId}
                        label="Sınıf düzeyi"
                        required
                        hint="1–12 arası."
                      >
                        <KidsSelect
                          id={classGradeId}
                          value={classGrade}
                          onChange={setClassGrade}
                          options={KIDS_CLASS_GRADE_OPTIONS}
                          searchable={false}
                        />
                      </KidsFormField>
                      <KidsFormField
                        id={classSectionId}
                        label="Şube (harf)"
                        required
                        hint="A–Z."
                      >
                        <KidsSelect
                          id={classSectionId}
                          value={classSection}
                          onChange={setClassSection}
                          options={KIDS_CLASS_SECTION_OPTIONS}
                          searchable
                        />
                      </KidsFormField>
                    </div>
                    <p className="-mt-1 text-sm text-emerald-900/75 dark:text-emerald-100/75" id={`${classGradeId}-preview`}>
                      Oluşan ad:{' '}
                      <strong className="font-logo text-emerald-950 dark:text-emerald-50">
                        {kidsBuildStandardClassName(classGrade, classSection)}
                      </strong>
                    </p>

                    <KidsFormField
                      id={academicYearId}
                      label="Eğitim-öğretim yılı"
                      hint="Bu alan yönetim panelindeki okul yılı ayarından otomatik gelir."
                    >
                      <input
                        id={academicYearId}
                        value={lockedAcademicYearLabel || 'Yönetim tarafından henüz tanımlanmadı'}
                        readOnly
                        disabled
                        className={kidsInputClass}
                      />
                    </KidsFormField>

                    <KidsFormField
                      id={descId}
                      label="Açıklama"
                      hint="İsteğe bağlı. Yaş grubu, saat veya odak konusu yazabilirsin."
                    >
                      <textarea
                        id={descId}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        maxLength={2000}
                        className={kidsTextareaClass}
                        placeholder="Bu sınıfta neler yapılacak?"
                        aria-describedby={`${descId}-hint`}
                      />
                    </KidsFormField>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-emerald-200/70 pt-6 dark:border-emerald-800/40 sm:flex-row sm:items-center sm:justify-between">
                    <KidsPrimaryButton type="submit" disabled={creating} className="w-full sm:w-auto">
                      {creating ? 'Oluşturuluyor…' : 'Sınıfı oluştur'}
                    </KidsPrimaryButton>
                    <p className="text-center text-xs text-emerald-800/70 dark:text-emerald-200/70 sm:max-w-[14rem] sm:text-left">
                      Sonra sınıfa tıklayıp veli daveti ve challenge’ları ekleyebilirsin.
                    </p>
                  </div>
                </form>
              </>
            )}
          </KidsCard>
        </div>

        <div className="lg:col-span-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-logo text-xl font-bold text-slate-900 dark:text-white">Sınıflarım</h2>
            {!loading && classes.length > 0 ? (
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-800 dark:bg-violet-900/50 dark:text-violet-200">
                {classes.length} sınıf
              </span>
            ) : null}
          </div>

          {loading ? (
            <KidsCard>
              <p className="text-center text-violet-700 dark:text-violet-300">Sınıflar yükleniyor…</p>
            </KidsCard>
          ) : classes.length === 0 ? (
            <KidsEmptyState
              emoji="🎒"
              title="Henüz sınıf yok"
              description={
                schools.length === 0
                  ? 'Soldaki adımlarla önce okulunu ekle; ardından aynı karttan okul seçerek ilk sınıfını oluştur.'
                  : 'Soldaki kartta okulunu seçip sınıf düzeyi ve şube belirleyerek ilk sınıfını oluştur; sonra veli daveti için sınıf sayfasına geç.'
              }
            />
          ) : (
            <ul className="space-y-3">
              {classes.map((c) => {
                const locLine = kidsClassLocationLine(c);
                return (
                  <li key={c.id}>
                    <Link
                      href={`${pathPrefix}/ogretmen/sinif/${c.id}`}
                      className="group flex items-center justify-between gap-4 rounded-3xl border-2 border-violet-100 bg-white/90 p-5 shadow-md transition hover:border-fuchsia-300 hover:shadow-lg hover:shadow-fuchsia-500/10 dark:border-violet-900/40 dark:bg-gray-900/70 dark:hover:border-fuchsia-700"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-logo text-lg font-bold text-slate-900 dark:text-white">{c.name}</p>
                          {(c.academic_year_label || '').trim() ? (
                            <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-bold text-violet-800 dark:bg-violet-900/60 dark:text-violet-200">
                              {(c.academic_year_label || '').trim()}
                            </span>
                          ) : null}
                        </div>
                        {locLine ? (
                          <p className="mt-1 line-clamp-1 text-sm font-medium text-emerald-800/90 dark:text-emerald-200/90">
                            {locLine}
                          </p>
                        ) : null}
                        {c.description ? (
                          <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-gray-400">
                            {c.description}
                          </p>
                        ) : !locLine ? (
                          <p className="mt-1 text-sm text-slate-400 dark:text-gray-500">Açıklama eklenmemiş</p>
                        ) : null}
                      </div>
                      <span className="shrink-0 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2 text-sm font-bold text-white opacity-90 transition group-hover:opacity-100">
                        Yönet →
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </KidsPanelMax>
  );
}
