'use client';

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GraduationCap, MapPin, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import {
  KIDS_CLASS_NUMERIC_GRADE_OPTIONS,
  KIDS_CLASS_SECTION_OPTIONS,
  KIDS_CLASS_SPECIAL_GRADE,
  kidsBuildTeacherPanelClassName,
  kidsCreateClass,
  kidsListClasses,
  kidsListSchoolClassDirectory,
  kidsListSchools,
  kidsSchoolLocationLine,
  kidsSelfJoinClass,
  type KidsClass,
  type KidsClassKind,
  type KidsSchoolDirectoryClassRow,
  type KidsSchool,
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
  kidsInputClass,
  kidsTextareaClass,
} from '@/src/components/kids/kids-ui';

/** Öğretmenler topluluğu kartı — sıcak sınıf / öğretmen–öğrenci görseli */
const TEACHER_COMMUNITY_COVER_IMG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCFnOXm9kEFF34c6_z-4bBwOxMHyZWrw-7cgpQcakfBcrw26kG8--kOi_uwQpvr_0tWLzBYSldQvDEv9mQLcr_Gx0dVBPWxit6XU1uinge1I_m4tiazIb0_yEeMlVDAkubhp-KBnl61_dtIX6MMAyIwf7YNGPehGwstnvhHzZmzwquSb86WNd5RY2HHWsJ1-l4wDL8ORBv68YUTuth7054mk8EKt18dIVDm-uSLW6AJc9Cjpp3o7ooNW15guyFSIvDRwLZ2uAbD78Pi';

/** Kartta okul adı ayrı; konum satırı: il + ilçe veya mahalle/ilçe/il parçaları. */
function kidsSchoolCityDistrictLine(
  s: Pick<KidsSchool, 'province' | 'district' | 'neighborhood'> | null | undefined,
): string | null {
  if (!s) return null;
  const il = (s.province || '').trim();
  const ilce = (s.district || '').trim();
  const mahalle = (s.neighborhood || '').trim();
  if (il && ilce) return `${il}, ${ilce}`;
  if (mahalle && ilce) return `${ilce}, ${mahalle}`;
  return il || ilce || mahalle || null;
}

export default function KidsTeacherPanelPage() {
  const router = useRouter();
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();
  const { t } = useKidsI18n();
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
  const [createClassModalOpen, setCreateClassModalOpen] = useState(false);
  const classGradeId = useId();
  const classSectionId = useId();
  const descId = useId();
  const academicYearId = useId();
  const schoolSelectId = useId();

  const classGradeOptions = useMemo(
    () => [
      { value: KIDS_CLASS_SPECIAL_GRADE.PRE_PRIMARY, label: t('teacher.panel.programPrePrimary') },
      ...KIDS_CLASS_NUMERIC_GRADE_OPTIONS,
    ],
    [t],
  );

  const load = useCallback(async () => {
    try {
      const [list, sch] = await Promise.all([kidsListClasses(), kidsListSchools()]);
      setClasses(list);
      setSchools([...sch].sort((a, b) => a.name.localeCompare(b.name, 'tr')));
    } catch {
      toast.error(t('teacher.panel.dataLoadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

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
    const syncHash = () => {
      if (typeof window === 'undefined') return;
      if (window.location.hash === '#create-class') {
        setCreateClassModalOpen(true);
      }
    };
    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, []);

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
        if (!cancelled) toast.error(e instanceof Error ? e.message : t('teacher.panel.schoolClassesLoadError'));
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
      toast.error(t('teacher.panel.schoolRequired'));
      return;
    }
    if (!classGrade || !classSection) {
      toast.error(t('teacher.panel.gradeSectionRequired'));
      return;
    }
    const selectedSchool = schools.find((s) => String(s.id) === schoolId) ?? null;
    const academicYearLabel = (selectedSchool?.default_academic_year_label || '').trim();
    if (!academicYearLabel) {
      toast.error(t('teacher.panel.academicYearRequired'));
      return;
    }
    const composedName = kidsBuildTeacherPanelClassName(classGrade, classSection);
    let classKind: KidsClassKind = 'standard';
    if (classGrade === KIDS_CLASS_SPECIAL_GRADE.PRE_PRIMARY) classKind = 'anasinifi';
    setCreating(true);
    try {
      const c = await kidsCreateClass({
        name: composedName,
        description: description.trim(),
        school_id: sid,
        academic_year_label: academicYearLabel,
        class_kind: classKind,
      });
      setClasses((prev) => [c, ...prev]);
      setClassGrade('4');
      setClassSection('A');
      setDescription('');
      toast.success(t('teacher.panel.createSuccess'));
      setCreateClassModalOpen(false);
      if (typeof window !== 'undefined' && window.location.hash === '#create-class') {
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
      }
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : t('teacher.panel.createFailed');
      const duplicateClassMessage =
        'Bu okulda ayn\u0131 s\u0131n\u0131f ad\u0131 bu e\u011fitim-\u00f6\u011fretim y\u0131l\u0131 i\u00e7in zaten var. Yeni s\u0131n\u0131f a\u00e7mak yerine mevcut s\u0131n\u0131fa \u00f6\u011fretmen atamas\u0131 yap\u0131n.';
      if (rawMessage.includes(duplicateClassMessage)) {
        toast.error(t('teacher.panel.duplicateClass'));
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
      toast.success(t('teacher.panel.joinSuccess').replace('{name}', row.name));
      await load();
      const sid = Number(schoolId || 0);
      if (sid) {
        const rows = await kidsListSchoolClassDirectory(sid);
        setSchoolClasses(rows);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('teacher.panel.joinFailed'));
    } finally {
      setJoiningClassId(null);
    }
  }

  if (authLoading) {
    return (
      <KidsPanelMax>
        <p className="text-center text-violet-800 dark:text-violet-200">{t('common.loading')}</p>
      </KidsPanelMax>
    );
  }
  if (!user) {
    return (
      <KidsPanelMax>
        <p className="text-center text-violet-800 dark:text-violet-200">{t('common.redirecting')}</p>
      </KidsPanelMax>
    );
  }
  if (user.role !== 'teacher' && user.role !== 'admin') {
    return (
      <KidsPanelMax>
        <p className="text-center text-violet-800 dark:text-violet-200">{t('common.redirecting')}</p>
      </KidsPanelMax>
    );
  }

  const firstName = user.first_name?.trim() || t('teacher.panel.defaultName');
  const selectedSchool = schools.find((s) => String(s.id) === schoolId) ?? null;
  const lockedAcademicYearLabel = (selectedSchool?.default_academic_year_label || '').trim();

  const closeCreateClassModal = () => {
    setCreateClassModalOpen(false);
    if (typeof window !== 'undefined' && window.location.hash === '#create-class') {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    }
  };

  const createClassFormContent = (() => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
          <span
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-2xl"
            aria-hidden
          >
            ⏳
          </span>
          <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">{t('teacher.panel.schoolClassLoading')}</p>
        </div>
      );
    }
    if (schools.length === 0) {
      return (
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
                {t('teacher.panel.needSchoolFirst')}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-emerald-900/85 dark:text-emerald-100/85">
                {t('teacher.panel.needSchoolFirstBody')}
              </p>
            </div>
          </div>

          <ol className="mb-6 space-y-3 rounded-2xl border-2 border-emerald-200/80 bg-emerald-50/60 p-4 text-sm text-emerald-950 dark:border-emerald-800/50 dark:bg-emerald-950/25 dark:text-emerald-50">
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-black text-white">
                1
              </span>
              <span>{t('teacher.panel.needSchoolStep1')}</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-black text-white">
                2
              </span>
              <span>{t('teacher.panel.needSchoolStep2')}</span>
            </li>
          </ol>

          <p className="text-center text-xs text-emerald-800/75 dark:text-emerald-200/75">{t('teacher.panel.needSchoolFooter')}</p>
        </>
      );
    }
    return (
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
              {t('teacher.panel.createNewClassTitle')}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-emerald-900/80 dark:text-emerald-100/80">
              {t('teacher.panel.createNewClassBody')}
            </p>
          </div>
        </div>

        <div className="mb-6 border-t border-emerald-200/70 pt-5 dark:border-emerald-800/40">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-800/90 dark:text-emerald-200/90">
            {t('teacher.panel.currentClassesInSchool')}
          </p>
          {schoolClassesLoading ? (
            <p className="mt-2 text-sm text-emerald-900/80 dark:text-emerald-100/80">{t('common.loading')}</p>
          ) : schoolClasses.length === 0 ? (
            <p className="mt-2 text-sm text-emerald-900/80 dark:text-emerald-100/80">
              {t('teacher.panel.noClassInSelectedSchool')}
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {schoolClasses.map((row) => (
                <li
                  key={row.id}
                  className="rounded-xl border border-emerald-200/80 bg-white/80 px-3 py-2 dark:border-emerald-800/50 dark:bg-emerald-950/25"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold text-emerald-950 dark:text-emerald-50">{row.name}</p>
                      <p className="text-xs text-emerald-800/80 dark:text-emerald-200/80">
                        {t('teacher.panel.classTeacher')}: {row.teacher_display}
                      </p>
                    </div>
                    {row.is_assigned ? (
                      <span className="self-start rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100">
                        {t('teacher.panel.alreadyAssigned')}
                      </span>
                    ) : (
                      <KidsSecondaryButton
                        type="button"
                        disabled={joiningClassId === row.id}
                        onClick={() => void onJoinExistingClass(row)}
                        className="w-full border-emerald-300 text-emerald-900 hover:bg-emerald-50 sm:w-auto dark:border-emerald-700 dark:text-emerald-100 dark:hover:bg-emerald-900/30"
                      >
                        {joiningClassId === row.id ? t('teacher.panel.joining') : t('teacher.panel.joinClass')}
                      </KidsSecondaryButton>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form className="space-y-6 sm:space-y-8" onSubmit={onCreate} id="yeni-sinif-form">
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-800/90 dark:text-emerald-200/90">
              {t('teacher.panel.step1')}
            </p>
            <KidsFormField
              id={schoolSelectId}
              label={t('teacher.panel.whichSchool')}
              required
              hint={t('teacher.panel.whichSchoolHint')}
            >
              <KidsSelect
                id={schoolSelectId}
                value={schoolId}
                onChange={setSchoolId}
                disabled={schools.length === 0}
                options={schools.map((s) => ({
                  value: String(s.id),
                  label: s.name,
                }))}
              />
              {selectedSchool ? (
                <p className="text-xs leading-relaxed text-emerald-800/80 dark:text-emerald-200/80">
                  {kidsSchoolLocationLine(selectedSchool) || selectedSchool.name}
                </p>
              ) : null}
            </KidsFormField>
          </div>

          <div className="space-y-4 border-t border-emerald-200/70 pt-6 dark:border-emerald-800/40">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-800/90 dark:text-emerald-200/90">
              {t('teacher.panel.step2')}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <KidsFormField
                id={classGradeId}
                label={t('teacher.panel.classLevel')}
                required
                hint={t('teacher.panel.classLevelHint')}
              >
                <KidsSelect
                  id={classGradeId}
                  value={classGrade}
                  onChange={setClassGrade}
                  options={classGradeOptions}
                  searchable={false}
                />
              </KidsFormField>
              <KidsFormField
                id={classSectionId}
                label={t('teacher.panel.section')}
                required
                hint={t('teacher.panel.sectionHint')}
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
              {t('teacher.panel.generatedName')}{' '}
              <strong className="font-logo text-emerald-950 dark:text-emerald-50">
                {kidsBuildTeacherPanelClassName(classGrade, classSection)}
              </strong>
            </p>

            <KidsFormField
              id={academicYearId}
              label={t('teacher.panel.academicYear')}
              hint={t('teacher.panel.academicYearHint')}
            >
              <input
                id={academicYearId}
                value={lockedAcademicYearLabel || t('teacher.panel.notDefinedYet')}
                readOnly
                disabled
                className={kidsInputClass}
              />
            </KidsFormField>

            <KidsFormField
              id={descId}
              label={t('teacherHomework.description')}
              hint={t('teacher.panel.descriptionHint')}
            >
              <textarea
                id={descId}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={2000}
                className={kidsTextareaClass}
                placeholder={t('teacher.panel.descriptionPlaceholder')}
                aria-describedby={`${descId}-hint`}
              />
            </KidsFormField>
          </div>

          <div className="flex flex-col gap-3 border-t border-emerald-200/70 pt-6 dark:border-emerald-800/40 sm:flex-row sm:items-center sm:justify-between">
            <KidsPrimaryButton type="submit" disabled={creating} className="w-full sm:w-auto">
              {creating ? t('teacher.panel.creating') : t('teacher.panel.createClass')}
            </KidsPrimaryButton>
            <p className="text-center text-xs text-emerald-800/70 dark:text-emerald-200/70 sm:max-w-56 sm:text-left">
              {t('teacher.panel.afterCreateHint')}
            </p>
          </div>
        </form>
      </>
    );
  })();

  return (
    <KidsPanelMax className="max-w-6xl overflow-x-hidden">
      <header className="mb-8 sm:mb-10">
        <h1 className="font-logo text-[2rem] font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          {t('teacher.panel.greeting').replace('{name}', firstName)}
        </h1>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-slate-600 dark:text-gray-300">
          {t('teacher.panel.subtitle')}
        </p>
      </header>

      <section id="siniflarim" className="mb-10 scroll-mt-28">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-logo text-xl font-bold text-slate-900 dark:text-white">{t('teacher.panel.myClasses')}</h2>
            {!loading && classes.length > 0 ? (
              <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
                {classes.length} {t('teacher.panel.classCountSuffix')}
              </p>
            ) : null}
          </div>
          <Link
            href={`${pathPrefix}/ogretmen/okullar`}
            className="text-sm font-semibold text-violet-600 hover:text-violet-500 dark:text-violet-400 dark:hover:text-violet-300"
          >
            {t('teacher.panel.viewAll')}
          </Link>
        </div>

        {loading ? (
          <KidsCard>
            <p className="text-center text-violet-700 dark:text-violet-300">{t('teacher.panel.classesLoading')}</p>
          </KidsCard>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <button
              id="create-class"
              type="button"
              onClick={() => setCreateClassModalOpen(true)}
              className="flex min-h-[188px] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-violet-300 bg-violet-50/50 p-6 text-center text-violet-700 transition hover:border-violet-400 hover:bg-violet-50 dark:border-violet-700 dark:bg-violet-950/25 dark:text-violet-200 dark:hover:border-violet-500"
            >
              <span className="text-4xl font-light leading-none text-violet-500" aria-hidden>
                +
              </span>
              <span className="mt-3 text-sm font-bold">{t('teacher.panel.newClassShortcut')}</span>
            </button>

            {classes.length === 0 ? (
              <div className="flex min-h-[188px] flex-col justify-center rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-5 dark:border-zinc-700 dark:bg-zinc-900/50 sm:col-span-2">
                <KidsEmptyState
                  emoji="🎒"
                  title={t('teacher.panel.noClassYet')}
                  description={
                    schools.length === 0
                      ? t('teacher.panel.noClassWithoutSchool')
                      : t('teacher.panel.noClassWithSchool')
                  }
                />
              </div>
            ) : (
              classes.map((c, idx) => {
                const classHref = `${pathPrefix}/ogretmen/sinif/${c.id}`;
                const schoolName = (c.school?.name || '').trim();
                const cityDistrict = kidsSchoolCityDistrictLine(c.school);
                const yearLabel = (c.academic_year_label || '').trim();
                const studentLine = t('teacher.panel.classStudentCount').replace(
                  '{n}',
                  String(typeof c.student_count === 'number' ? c.student_count : 0),
                );
                const headerGradient =
                  idx % 2 === 0
                    ? 'bg-linear-to-r from-violet-800 via-violet-600 to-fuchsia-500'
                    : 'bg-linear-to-r from-rose-900 via-violet-800 to-violet-600';
                return (
                  <div
                    key={c.id}
                    className="flex flex-col overflow-hidden rounded-[1.75rem] border border-zinc-200/80 bg-white shadow-lg shadow-violet-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-black/30"
                  >
                    <div className={`px-5 pb-5 pt-4 text-white ${headerGradient}`}>
                      {yearLabel ? (
                        <span className="inline-flex rounded-lg bg-white/20 px-2.5 py-1 text-xs font-semibold tracking-wide text-white backdrop-blur-sm">
                          {yearLabel}
                        </span>
                      ) : null}
                      <h3 className="font-logo mt-3 text-xl font-bold leading-tight tracking-tight sm:text-2xl">{c.name}</h3>
                    </div>
                    <div className="flex min-h-0 flex-1 flex-col bg-white px-5 pb-5 pt-4 dark:bg-zinc-900">
                      <div className="flex flex-1 flex-col gap-3.5">
                        {schoolName ? (
                          <div className="flex gap-3">
                            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                              <GraduationCap className="h-5 w-5" aria-hidden strokeWidth={2} />
                            </span>
                            <p className="min-w-0 pt-1 text-sm font-medium leading-snug text-zinc-600 dark:text-zinc-300">{schoolName}</p>
                          </div>
                        ) : null}
                        {cityDistrict ? (
                          <div className="flex gap-3">
                            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                              <MapPin className="h-5 w-5" aria-hidden strokeWidth={2} />
                            </span>
                            <p className="min-w-0 pt-1 text-sm font-medium leading-snug text-zinc-600 dark:text-zinc-300">{cityDistrict}</p>
                          </div>
                        ) : null}
                        <div className="flex gap-3">
                          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300">
                            <Users className="h-5 w-5" aria-hidden strokeWidth={2} />
                          </span>
                          <p className="min-w-0 pt-1 text-sm font-bold text-violet-600 dark:text-violet-400">{studentLine}</p>
                        </div>
                      </div>
                      <div className="mt-5 flex gap-2.5">
                        <Link
                          href={classHref}
                          className="inline-flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-full bg-zinc-100 px-4 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                        >
                          {t('teacher.panel.detail')}
                        </Link>
                        <Link
                          href={classHref}
                          className="inline-flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-full bg-violet-600 px-4 text-sm font-bold text-white shadow-md shadow-violet-600/25 transition hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-400"
                        >
                          {t('teacher.panel.manage')}
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </section>

      <div className="mb-10 grid gap-6 lg:grid-cols-2">
        <KidsCard className="h-full border-zinc-200/80 dark:border-zinc-700">
          <h3 className="font-logo mb-4 text-lg font-bold text-slate-900 dark:text-white">{t('teacher.panel.planTitle')}</h3>
          <ul className="space-y-4">
            {[
              {
                time: t('teacher.panel.planItem1Time'),
                title: t('teacher.panel.planItem1Title'),
                desc: t('teacher.panel.planItem1Desc'),
                circle: 'bg-amber-400 text-amber-950 dark:bg-amber-400 dark:text-amber-950',
              },
              {
                time: t('teacher.panel.planItem2Time'),
                title: t('teacher.panel.planItem2Title'),
                desc: t('teacher.panel.planItem2Desc'),
                circle: 'bg-violet-500 text-white dark:bg-violet-500',
              },
              {
                time: t('teacher.panel.planItem3Time'),
                title: t('teacher.panel.planItem3Title'),
                desc: t('teacher.panel.planItem3Desc'),
                circle: 'bg-amber-400 text-amber-950 dark:bg-amber-400 dark:text-amber-950',
              },
            ].map((row, idx) => (
              <li key={idx} className="flex gap-3">
                <span
                  className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-full text-center text-[10px] font-bold leading-tight ${row.circle}`}
                >
                  {row.time}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-white">{row.title}</p>
                  <p className="mt-0.5 text-sm text-slate-600 dark:text-gray-400">{row.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </KidsCard>

        <div className="relative min-h-[220px] overflow-hidden rounded-2xl shadow-xl">
          <Image
            src={TEACHER_COMMUNITY_COVER_IMG}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
          <div
            className="absolute inset-0 bg-linear-to-br from-violet-900/88 via-fuchsia-900/78 to-violet-950/92"
            aria-hidden
          />
          <div className="relative z-10 p-8 text-white">
            <h3 className="font-logo text-xl font-bold">{t('teacher.panel.communityTitle')}</h3>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-white/90">{t('teacher.panel.communityDesc')}</p>
            <Link
              href={`${pathPrefix}/mesajlar`}
              className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-white px-8 text-sm font-bold text-violet-700 shadow-md transition hover:bg-zinc-50"
            >
              {t('teacher.panel.communityCta')}
            </Link>
          </div>
        </div>
      </div>

      {createClassModalOpen ? (
        <KidsCenteredModal
          title={t('teacher.panel.newClassShortcut')}
          onClose={closeCreateClassModal}
          maxWidthClass="max-w-2xl"
          panelClassName="max-h-[92dvh] sm:max-h-[90dvh]"
        >
          <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/25 p-3 dark:border-emerald-800/50 dark:bg-emerald-950/20 sm:p-4">
            {createClassFormContent}
          </div>
        </KidsCenteredModal>
      ) : null}
    </KidsPanelMax>
  );
}
