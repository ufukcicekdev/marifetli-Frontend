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
import { useKidsI18n } from '@/src/providers/kids-language-provider';
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
  const [isCreateSectionOpen, setIsCreateSectionOpen] = useState(false);
  const classGradeId = useId();
  const classSectionId = useId();
  const descId = useId();
  const academicYearId = useId();
  const schoolSelectId = useId();
  const createSectionId = useId();

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
      toast.success(t('teacher.panel.createSuccess'));
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
  return (
    <KidsPanelMax className="overflow-x-hidden">
      <KidsPageHeader
        emoji="👩‍🏫"
        title={t('teacher.panel.greeting').replace('{name}', firstName)}
        subtitle={t('teacher.panel.subtitle')}
        compactOnMobile
      />

      <div className="grid gap-5 sm:gap-8 lg:grid-cols-12 lg:gap-10">
        <div className="order-2 lg:order-1 lg:col-span-5">
          <KidsCard tone="emerald" className="lg:sticky lg:top-28">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                <span
                  className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-2xl"
                  aria-hidden
                >
                  ⏳
                </span>
                <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">{t('teacher.panel.schoolClassLoading')}</p>
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

                <p className="text-center text-xs text-emerald-800/75 dark:text-emerald-200/75">
                  {t('teacher.panel.needSchoolFooter')}
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
                      {t('teacher.panel.createNewClassTitle')}
                    </h2>
                    <p className="mt-1 text-sm leading-relaxed text-emerald-900/80 dark:text-emerald-100/80">
                      {t('teacher.panel.createNewClassBody')}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="mb-4 flex w-full items-center justify-between rounded-2xl border border-emerald-200/80 bg-emerald-50/70 px-4 py-3 text-left text-sm font-bold text-emerald-900 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-100 lg:hidden"
                  onClick={() => setIsCreateSectionOpen((v) => !v)}
                  aria-expanded={isCreateSectionOpen}
                  aria-controls={createSectionId}
                >
                  <span>{t('teacher.panel.createClass')}</span>
                  <span aria-hidden>{isCreateSectionOpen ? '▲' : '▼'}</span>
                </button>

                <div id={createSectionId} className={`${isCreateSectionOpen ? 'block' : 'hidden'} lg:block`}>
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
                            options={KIDS_CLASS_GRADE_OPTIONS}
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
                          {kidsBuildStandardClassName(classGrade, classSection)}
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
                </div>
              </>
            )}
          </KidsCard>
        </div>

        <div className="order-1 lg:order-2 lg:col-span-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-logo text-xl font-bold text-slate-900 dark:text-white">{t('teacher.panel.myClasses')}</h2>
            {!loading && classes.length > 0 ? (
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-800 dark:bg-violet-900/50 dark:text-violet-200">
                {classes.length} {t('teacher.panel.classCountSuffix')}
              </span>
            ) : null}
          </div>

          {loading ? (
            <KidsCard>
              <p className="text-center text-violet-700 dark:text-violet-300">{t('teacher.panel.classesLoading')}</p>
            </KidsCard>
          ) : classes.length === 0 ? (
            <KidsEmptyState
              emoji="🎒"
              title={t('teacher.panel.noClassYet')}
              description={
                schools.length === 0
                  ? t('teacher.panel.noClassWithoutSchool')
                  : t('teacher.panel.noClassWithSchool')
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
                      className="group flex flex-col items-start gap-3 rounded-3xl border-2 border-violet-100 bg-white/90 p-5 shadow-md transition hover:border-fuchsia-300 hover:shadow-lg hover:shadow-fuchsia-500/10 sm:flex-row sm:items-center sm:justify-between sm:gap-4 dark:border-violet-900/40 dark:bg-gray-900/70 dark:hover:border-fuchsia-700"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-logo wrap-break-word text-lg font-bold text-slate-900 dark:text-white">{c.name}</p>
                          {(c.academic_year_label || '').trim() ? (
                            <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-bold text-violet-800 dark:bg-violet-900/60 dark:text-violet-200">
                              {(c.academic_year_label || '').trim()}
                            </span>
                          ) : null}
                        </div>
                        {locLine ? (
                          <p className="mt-1 wrap-break-word text-sm font-medium text-emerald-800/90 dark:text-emerald-200/90 sm:line-clamp-1">
                            {locLine}
                          </p>
                        ) : null}
                        {c.description ? (
                          <p className="mt-1 wrap-break-word text-sm text-slate-600 dark:text-gray-400 sm:line-clamp-2">
                            {c.description}
                          </p>
                        ) : !locLine ? (
                          <p className="mt-1 text-sm text-slate-400 dark:text-gray-500">{t('teacher.panel.noDescription')}</p>
                        ) : null}
                      </div>
                      <span className="inline-flex w-full items-center justify-center rounded-full bg-linear-to-r from-violet-500 to-fuchsia-500 px-4 py-2 text-sm font-bold text-white opacity-90 transition group-hover:opacity-100 sm:w-auto">
                        <span className="sm:hidden">{t('teacher.panel.manage')}</span>
                        <span className="hidden sm:inline">{t('teacher.panel.manage')} →</span>
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
