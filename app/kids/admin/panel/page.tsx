'use client';

import { useCallback, useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import {
  kidsAddClassTeacher,
  kidsAdminGetAchievementSettings,
  kidsAdminPatchAchievementSettings,
  kidsAdminCreateSubject,
  kidsAdminAddSchoolYearProfile,
  kidsAdminAssignSchoolTeacher,
  kidsAdminCreateMebSchool,
  kidsAdminCreateSchool,
  kidsAdminCreateTeacher,
  kidsAdminDeleteSchool,
  kidsAdminPatchSchool,
  kidsAdminPatchSubject,
  kidsAdminPatchTeacher,
  kidsAdminResendTeacherWelcome,
  kidsAdminRemoveSchoolTeacher,
  kidsAdminSchoolsList,
  kidsAdminSubjectsList,
  kidsAdminTeachersList,
  kidsAcademicYearSelectOptions,
  kidsMebDistricts,
  kidsMebProvinces,
  kidsMebSchoolsPick,
  kidsListClasses,
  kidsListClassTeachers,
  kidsRemoveClassTeacher,
  kidsSuggestedAcademicYearLabel,
  type KidsClass,
  type KidsAdminAchievementSettings,
  type KidsAdminSubject,
  type KidsAdminSchoolDetail,
  type KidsClassTeacherAssignment,
  type KidsAdminTeacher,
  type MebSchoolPick,
} from '@/src/lib/kids-api';
import {
  KidsCard,
  KidsFormField,
  KidsPanelMax,
  KidsPrimaryButton,
  KidsSecondaryButton,
  KidsSelect,
  kidsInputClass,
  type KidsSelectOption,
} from '@/src/components/kids/kids-ui';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';
import { useKidsI18n } from '@/src/providers/kids-language-provider';

function SchoolAssignPicker({
  schools,
  selectedIds,
  onToggle,
  t,
}: {
  schools: KidsAdminSchoolDetail[];
  selectedIds: number[];
  onToggle: (id: number) => void;
  t: (key: string) => string;
}) {
  const [query, setQuery] = useState('');
  const searchId = useId();

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr');
    if (!q) return schools;
    return schools.filter(
      (s) =>
        s.name.toLocaleLowerCase('tr').includes(q) ||
        (s.province || '').toLocaleLowerCase('tr').includes(q) ||
        (s.district || '').toLocaleLowerCase('tr').includes(q),
    );
  }, [schools, query]);

  const selectedSchools = schools.filter((s) => selectedIds.includes(s.id));

  return (
    <KidsFormField id={searchId} label={t('admin.schoolAssign.label')}>
      <div className="rounded-xl border border-slate-200/80 bg-white/80 dark:border-slate-700 dark:bg-slate-900/40">
        <div className="border-b border-slate-200/60 p-2 dark:border-slate-700/60">
          <input
            id={searchId}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('admin.schoolAssign.searchPlaceholder')}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-violet-400 focus:ring-1 focus:ring-violet-400 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-violet-500"
          />
        </div>
        <ul className="max-h-48 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <li className="px-2 py-3 text-center text-sm text-slate-500 dark:text-slate-400">
              {query ? t('admin.schoolAssign.noMatch') : t('admin.schoolAssign.noneYet')}
            </li>
          ) : (
            filtered.map((s) => (
              <li key={s.id}>
                <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-2 text-sm text-slate-800 transition hover:bg-violet-50/60 dark:text-slate-200 dark:hover:bg-violet-950/30">
                  <input
                    type="checkbox"
                    className="mt-0.5 accent-violet-600"
                    checked={selectedIds.includes(s.id)}
                    onChange={() => onToggle(s.id)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold">{s.name}</span>
                    <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                      {[s.district, s.province].filter(Boolean).join(' · ') || '—'}
                    </span>
                  </span>
                </label>
              </li>
            ))
          )}
        </ul>
        {selectedSchools.length > 0 ? (
          <div className="border-t border-slate-200/60 px-3 py-2 dark:border-slate-700/60">
            <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">
              {t('admin.schoolAssign.selectedCount').replace('{n}', String(selectedSchools.length))}
            </p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {selectedSchools.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-800 dark:bg-violet-900/40 dark:text-violet-200"
                >
                  {s.name}
                  <button
                    type="button"
                    onClick={() => onToggle(s.id)}
                    className="ml-0.5 text-violet-500 hover:text-violet-800 dark:text-violet-400 dark:hover:text-violet-100"
                    aria-label={t('admin.schoolAssign.removeAria').replace('{name}', s.name)}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </KidsFormField>
  );
}

export default function KidsAdminPanelPage() {
  const router = useRouter();
  const { user, loading, pathPrefix } = useKidsAuth();
  const { t, language } = useKidsI18n();
  const [teachers, setTeachers] = useState<KidsAdminTeacher[]>([]);
  const [schools, setSchools] = useState<KidsAdminSchoolDetail[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [teacherSubject, setTeacherSubject] = useState('');
  const [teacherSchoolIds, setTeacherSchoolIds] = useState<number[]>([]);
  const [toggleId, setToggleId] = useState<number | null>(null);
  const [resendMailId, setResendMailId] = useState<number | null>(null);
  const [subjectUpdateId, setSubjectUpdateId] = useState<number | null>(null);
  const [teacherSubjectDrafts, setTeacherSubjectDrafts] = useState<Record<number, string>>({});

  // MEB cascading dropdown state
  const [mebProvinces, setMebProvinces] = useState<string[]>([]);
  const [mebProvincesReady, setMebProvincesReady] = useState(false);
  const [mebDistricts, setMebDistricts] = useState<string[]>([]);
  const [mebSchools, setMebSchools] = useState<MebSchoolPick[]>([]);
  const [mebIl, setMebIl] = useState('');
  const [mebIlce, setMebIlce] = useState('');
  const [mebSchoolYol, setMebSchoolYol] = useState('');
  const [mebSchoolsLoading, setMebSchoolsLoading] = useState(false);

  // Picked school from MEB list
  const [pickName, setPickName] = useState('');
  const [pickProvince, setPickProvince] = useState('');
  const [pickDistrict, setPickDistrict] = useState('');

  // School commercial/demo fields
  const [nsStage, setNsStage] = useState<'demo' | 'sales'>('demo');
  const [nsDemoStartAt, setNsDemoStartAt] = useState('');
  const [nsDemoEndAt, setNsDemoEndAt] = useState('');
  const [nsStudentCap, setNsStudentCap] = useState(30);
  const [nsYear, setNsYear] = useState(kidsSuggestedAcademicYearLabel());
  const [schoolSaving, setSchoolSaving] = useState(false);

  // Manual add modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [modalMebIl, setModalMebIl] = useState('');
  const [modalMebIlce, setModalMebIlce] = useState('');
  const [modalDistricts, setModalDistricts] = useState<string[]>([]);
  const [modalName, setModalName] = useState('');
  const [modalCreating, setModalCreating] = useState(false);

  // Unique IDs for accessibility
  const mebIlId = useId();
  const mebIlceId = useId();
  const mebSchoolPickId = useId();
  const pickNameId = useId();
  const modalTitleId = useId();
  const modalIlId = useId();
  const modalIlceId = useId();
  const modalNameId = useId();

  const [assignTeacherId, setAssignTeacherId] = useState<Record<number, string>>({});
  const [expandedSchoolId, setExpandedSchoolId] = useState<number | null>(null);
  const [editSchoolId, setEditSchoolId] = useState<number | null>(null);
  const [editStage, setEditStage] = useState<'demo' | 'sales'>('demo');
  const [editStudentCap, setEditStudentCap] = useState(30);
  const [editDemoStartAt, setEditDemoStartAt] = useState('');
  const [editDemoEndAt, setEditDemoEndAt] = useState('');
  const [editSalesYear, setEditSalesYear] = useState(kidsSuggestedAcademicYearLabel());
  const [schoolEditSavingId, setSchoolEditSavingId] = useState<number | null>(null);
  const [classes, setClasses] = useState<KidsClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [classTeachers, setClassTeachers] = useState<KidsClassTeacherAssignment[]>([]);
  const [classTeacherId, setClassTeacherId] = useState<string>('');
  const [classTeacherLoading, setClassTeacherLoading] = useState(false);
  const [classTeacherSaving, setClassTeacherSaving] = useState(false);
  const [subjects, setSubjects] = useState<KidsAdminSubject[]>([]);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [subjectSaving, setSubjectSaving] = useState(false);
  const [showPassiveSubjects, setShowPassiveSubjects] = useState(false);
  const [achievementSettings, setAchievementSettings] = useState<KidsAdminAchievementSettings | null>(null);
  const [weeklyTarget, setWeeklyTarget] = useState(2);
  const [monthlyTarget, setMonthlyTarget] = useState(6);
  const [achievementSaving, setAchievementSaving] = useState(false);

  const load = useCallback(async () => {
    setListLoading(true);
    try {
      setTeachers(await kidsAdminTeachersList());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('admin.errors.listFetch'));
    } finally {
      setListLoading(false);
    }
  }, [t]);

  const loadSchools = useCallback(async () => {
    setSchoolsLoading(true);
    try {
      setSchools(await kidsAdminSchoolsList());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('admin.errors.schoolListFetch'));
    } finally {
      setSchoolsLoading(false);
    }
  }, [t]);

  const loadClasses = useCallback(async () => {
    try {
      const list = await kidsListClasses();
      setClasses(list);
      if (!selectedClassId && list.length > 0) {
        setSelectedClassId(String(list[0].id));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('admin.errors.classListFetch'));
    }
  }, [selectedClassId, t]);

  const loadSubjects = useCallback(async () => {
    try {
      const list = await kidsAdminSubjectsList();
      setSubjects(list);
      if (!teacherSubject) {
        const firstActive = list.find((s) => s.is_active);
        if (firstActive) setTeacherSubject(firstActive.name);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('admin.errors.subjectListFetch'));
    }
  }, [teacherSubject, t]);

  const loadAchievementSettings = useCallback(async () => {
    try {
      const row = await kidsAdminGetAchievementSettings();
      setAchievementSettings(row);
      setWeeklyTarget(Math.max(1, Number(row.weekly_certificate_target || 2)));
      setMonthlyTarget(Math.max(1, Number(row.monthly_certificate_target || 6)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('admin.errors.certificateSettingsFetch'));
    }
  }, [t]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(kidsLoginPortalHref(pathPrefix));
      return;
    }
    if (user.role !== 'admin') {
      router.replace(`${pathPrefix}/panel`);
      return;
    }
    void load();
    void loadSchools();
    void loadClasses();
    void loadSubjects();
    void loadAchievementSettings();
  }, [user, loading, pathPrefix, router, load, loadSchools, loadClasses, loadSubjects, loadAchievementSettings]);

  // Load MEB provinces on mount
  useEffect(() => {
    if (loading || !user || user.role !== 'admin') return;
    let cancelled = false;
    (async () => {
      try {
        const p = await kidsMebProvinces();
        if (!cancelled) setMebProvinces(p);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setMebProvincesReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, [loading, user]);

  // Load districts when province changes
  useEffect(() => {
    if (!mebIl) {
      setMebDistricts([]);
      setMebIlce('');
      setMebSchools([]);
      setMebSchoolYol('');
      setPickName(''); setPickProvince(''); setPickDistrict('');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const d = await kidsMebDistricts(mebIl);
        if (!cancelled) setMebDistricts(d);
      } catch {
        if (!cancelled) setMebDistricts([]);
      }
    })();
    return () => { cancelled = true; };
  }, [mebIl]);

  // Load schools when district changes
  useEffect(() => {
    if (!mebIl || !mebIlce) { setMebSchools([]); return; }
    let cancelled = false;
    setMebSchoolsLoading(true);
    setMebSchools([]);
    (async () => {
      try {
        const list = await kidsMebSchoolsPick(mebIl, mebIlce, undefined, 200);
        if (!cancelled) setMebSchools(list);
      } catch {
        if (!cancelled) setMebSchools([]);
      } finally {
        if (!cancelled) setMebSchoolsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [mebIl, mebIlce]);

  // Load modal districts
  useEffect(() => {
    if (!addModalOpen || !modalMebIl) {
      setModalDistricts([]);
      if (!modalMebIl) setModalMebIlce('');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const d = await kidsMebDistricts(modalMebIl);
        if (!cancelled) setModalDistricts(d);
      } catch {
        if (!cancelled) setModalDistricts([]);
      }
    })();
    return () => { cancelled = true; };
  }, [addModalOpen, modalMebIl]);

  // Close modal on Escape
  useEffect(() => {
    if (!addModalOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAddModalOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [addModalOpen]);

  // Dropdown option memos
  const provinceOptions = useMemo<KidsSelectOption[]>(
    () => [{ value: '', label: t('admin.select.province') }, ...mebProvinces.map((p) => ({ value: p, label: p }))],
    [mebProvinces, t],
  );
  const districtOptions = useMemo<KidsSelectOption[]>(() => {
    if (!mebIl) return [{ value: '', label: t('admin.select.provinceFirst') }];
    return [{ value: '', label: t('admin.select.district') }, ...mebDistricts.map((d) => ({ value: d, label: d }))];
  }, [mebIl, mebDistricts, t]);
  const schoolPickOptions = useMemo<KidsSelectOption[]>(() => {
    if (!mebIl || !mebIlce) return [{ value: '', label: t('admin.select.provinceDistrictFirst') }];
    if (mebSchoolsLoading) return [{ value: '', label: t('admin.select.schoolsLoading') }];
    if (mebSchools.length === 0) return [{ value: '', label: t('admin.select.noRecordsInDistrict') }];
    return [{ value: '', label: t('admin.select.pickSchool') }, ...mebSchools.map((s) => ({ value: s.yol, label: s.name }))];
  }, [mebIl, mebIlce, mebSchools, mebSchoolsLoading, t]);
  const academicYearOptions = useMemo<KidsSelectOption[]>(
    () => kidsAcademicYearSelectOptions(),
    [],
  );
  const modalProvinceOptions = useMemo<KidsSelectOption[]>(
    () => [{ value: '', label: t('admin.select.province') }, ...mebProvinces.map((p) => ({ value: p, label: p }))],
    [mebProvinces, t],
  );
  const modalDistrictOptions = useMemo<KidsSelectOption[]>(() => {
    if (!modalMebIl) return [{ value: '', label: t('admin.select.provinceFirst') }];
    return [{ value: '', label: t('admin.select.district') }, ...modalDistricts.map((d) => ({ value: d, label: d }))];
  }, [modalMebIl, modalDistricts, t]);

  function onMebSchoolPick(yol: string) {
    setMebSchoolYol(yol);
    if (!yol) { setPickName(''); setPickProvince(''); setPickDistrict(''); return; }
    const row = mebSchools.find((x) => x.yol === yol);
    if (!row) return;
    setPickName(row.name.slice(0, 200));
    setPickProvince((row.province || '').slice(0, 100));
    setPickDistrict((row.district || '').slice(0, 100));
  }

  function resetMebPickForm() {
    setMebIl(''); setMebIlce(''); setMebSchoolYol(''); setMebSchools([]);
    setPickName(''); setPickProvince(''); setPickDistrict('');
    setNsStage('demo');
    setNsDemoStartAt('');
    setNsDemoEndAt('');
    setNsStudentCap(30);
    setNsYear(kidsSuggestedAcademicYearLabel());
  }

  function openAddSchoolModal() {
    setModalMebIl(mebIl);
    setModalMebIlce(mebIlce);
    setModalName('');
    setAddModalOpen(true);
  }

  function closeAddSchoolModal() {
    setAddModalOpen(false);
    setModalMebIl(''); setModalMebIlce(''); setModalDistricts([]);
    setModalName('');
  }

  function toggleTeacherSchool(id: number) {
    setTeacherSchoolIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const subject = teacherSubject.trim();
    if (!subject) {
      toast.error(t('admin.errors.selectTeacherSubject'));
      return;
    }
    setSaving(true);
    try {
      const res = await kidsAdminCreateTeacher({
        email: email.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        subject,
        school_ids: teacherSchoolIds.length ? teacherSchoolIds : undefined,
      });
      setTeachers((prev) => [res.teacher, ...prev]);
      setEmail('');
      setFirstName('');
      setLastName('');
      setTeacherSubject(subject);
      setTeacherSchoolIds([]);
      void loadSchools();
      if (res.email_sent) {
        toast.success(t('admin.teacher.createdAndMailed'));
      } else {
        toast.success(t('admin.teacher.created'));
        const why = res.email_error ? ` ${res.email_error}` : '';
        toast(
          t('admin.teacher.emailFailedToast')
            .replace('{detail}', why)
            .replace('{password}', res.temporary_password ?? '-'),
          { duration: 14000, icon: '✉️' },
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('admin.errors.teacherCreateFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function onSavePickedSchool() {
    if (!pickName.trim() || !pickProvince.trim() || !pickDistrict.trim()) return;
    if (nsStudentCap <= 0) {
      toast.error(t('admin.errors.studentCapMinOne'));
      return;
    }
    if (nsStage === 'demo' && (!!nsDemoStartAt !== !!nsDemoEndAt)) {
      toast.error(t('admin.errors.demoDatesRequired'));
      return;
    }
    if (nsDemoStartAt && nsDemoEndAt && nsDemoEndAt < nsDemoStartAt) {
      toast.error(t('admin.errors.demoDateOrder'));
      return;
    }
    setSchoolSaving(true);
    try {
      const row = await kidsAdminCreateSchool({
        name: pickName.trim(),
        province: pickProvince.trim(),
        district: pickDistrict.trim(),
        neighborhood: '',
        lifecycle_stage: nsStage,
        demo_start_at: nsDemoStartAt || null,
        demo_end_at: nsDemoEndAt || null,
        student_user_cap: Math.max(1, Math.floor(Number(nsStudentCap) || 1)),
        year_profiles:
          nsStage === 'sales' && nsYear.trim()
            ? [
                {
                  academic_year: nsYear.trim(),
                  contracted_student_count: Math.max(1, Math.floor(Number(nsStudentCap) || 1)),
                  notes: t('admin.school.notesSalesCapAuto'),
                },
              ]
            : [],
      });
      setSchools((prev) => [row, ...prev.filter((s) => s.id !== row.id)]);
      resetMebPickForm();
      toast.success(t('admin.school.created'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('admin.errors.schoolCreateFailed'));
    } finally {
      setSchoolSaving(false);
    }
  }

  async function onModalCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!modalName.trim() || !modalMebIl.trim() || !modalMebIlce.trim()) return;
    setModalCreating(true);
    try {
      const { school, created } = await kidsAdminCreateMebSchool({
        name: modalName.trim(),
        province: modalMebIl.trim(),
        district: modalMebIlce.trim(),
      });
      const refreshed = await kidsMebSchoolsPick(school.province, school.district, undefined, 200);
      setMebIl(school.province);
      setMebIlce(school.district);
      setMebSchools(refreshed);
      setMebSchoolYol(school.yol);
      setPickName(school.name);
      setPickProvince(school.province);
      setPickDistrict(school.district);
      setMebDistricts((prev) =>
        prev.includes(school.district)
          ? prev
          : [...prev, school.district].sort((a, b) => a.localeCompare(b, 'tr')),
      );
      closeAddSchoolModal();
      toast.success(created ? t('admin.toast.mebSchoolCreated') : t('admin.toast.mebSchoolExisted'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('admin.errors.mebSchoolAddFailed'));
    } finally {
      setModalCreating(false);
    }
  }

  async function onDeleteSchool(id: number) {
    if (!confirm(t('schools.deleteConfirm'))) return;
    try {
      await kidsAdminDeleteSchool(id);
      setSchools((prev) => prev.filter((s) => s.id !== id));
      setTeacherSchoolIds((prev) => prev.filter((x) => x !== id));
      toast.success(t('admin.school.deleted'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.deleteFailed'));
    }
  }

  async function onAssignTeacher(schoolId: number) {
    const raw = assignTeacherId[schoolId] || '';
    const tid = parseInt(raw, 10);
    if (!tid) {
      toast.error(t('admin.errors.selectTeacher'));
      return;
    }
    try {
      const updated = await kidsAdminAssignSchoolTeacher(schoolId, tid);
      setSchools((prev) => prev.map((s) => (s.id === schoolId ? updated : s)));
      setAssignTeacherId((prev) => ({ ...prev, [schoolId]: '' }));
      toast.success(t('admin.school.teacherAssigned'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('admin.errors.assignFailed'));
    }
  }

  async function onRemoveTeacher(schoolId: number, teacherUserId: number) {
    try {
      const updated = await kidsAdminRemoveSchoolTeacher(schoolId, teacherUserId);
      setSchools((prev) => prev.map((s) => (s.id === schoolId ? updated : s)));
      toast.success(t('admin.school.teacherRemoved'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('admin.errors.removeFailed'));
    }
  }

  function startEditSchool(s: KidsAdminSchoolDetail) {
    setEditSchoolId(s.id);
    setEditStage((s.lifecycle_stage as 'demo' | 'sales') || 'demo');
    setEditStudentCap(Math.max(1, Number(s.student_user_cap) || 1));
    setEditDemoStartAt(s.demo_start_at || '');
    setEditDemoEndAt(s.demo_end_at || '');
    const latestYear =
      (s.year_profiles ?? [])
        .map((p) => p.academic_year)
        .filter(Boolean)
        .sort((a, b) => b.localeCompare(a, 'tr'))[0] || kidsSuggestedAcademicYearLabel();
    setEditSalesYear(latestYear);
  }

  function cancelEditSchool() {
    setEditSchoolId(null);
  }

  async function saveSchoolSettings(s: KidsAdminSchoolDetail) {
    if (editStudentCap <= 0) {
      toast.error(t('admin.errors.studentCapMinOne'));
      return;
    }
    if (editStage === 'demo' && (!!editDemoStartAt !== !!editDemoEndAt)) {
      toast.error(t('admin.errors.demoDatesRequired'));
      return;
    }
    if (editDemoStartAt && editDemoEndAt && editDemoEndAt < editDemoStartAt) {
      toast.error(t('admin.errors.demoDateOrder'));
      return;
    }
    if (editStage === 'sales' && !editSalesYear.trim()) {
      toast.error(t('admin.errors.selectSalesYear'));
      return;
    }
    setSchoolEditSavingId(s.id);
    try {
      let updated = await kidsAdminPatchSchool(s.id, {
        lifecycle_stage: editStage,
        student_user_cap: Math.max(1, Math.floor(Number(editStudentCap) || 1)),
        demo_start_at: editStage === 'demo' ? (editDemoStartAt || null) : null,
        demo_end_at: editStage === 'demo' ? (editDemoEndAt || null) : null,
      });
      if (
        editStage === 'sales' &&
        editSalesYear.trim() &&
        !(updated.year_profiles || []).some((p) => p.academic_year === editSalesYear.trim())
      ) {
        const row = await kidsAdminAddSchoolYearProfile(s.id, {
          academic_year: editSalesYear.trim(),
          contracted_student_count: Math.max(1, Math.floor(Number(editStudentCap) || 1)),
          notes: t('admin.school.notesSalesSettingsAuto'),
        });
        updated = {
          ...updated,
          year_profiles: [...(updated.year_profiles || []), row].sort((a, b) =>
            a.academic_year.localeCompare(b.academic_year),
          ),
        };
      }
      setSchools((prev) => prev.map((x) => (x.id === s.id ? updated : x)));
      setEditSchoolId(null);
      toast.success(t('admin.school.settingsUpdated'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('admin.errors.schoolUpdateFailed'));
    } finally {
      setSchoolEditSavingId(null);
    }
  }

  function teacherAssignOptions(s: KidsAdminSchoolDetail): KidsSelectOption[] {
    const taken = new Set(s.teachers.map((x) => x.id));
    const opts: KidsSelectOption[] = [{ value: '', label: t('admin.select.pickTeacherEllipsis') }];
    for (const tm of teachers) {
      if (!tm.is_active || taken.has(tm.id)) continue;
      opts.push({
        value: String(tm.id),
        label: `${tm.email} (${[tm.first_name, tm.last_name].filter(Boolean).join(' ') || '—'})`,
      });
    }
    return opts;
  }

  const selectedClass = useMemo(
    () => classes.find((c) => String(c.id) === selectedClassId) ?? null,
    [classes, selectedClassId],
  );

  const classOptions = useMemo<KidsSelectOption[]>(
    () => [
      { value: '', label: classes.length ? t('admin.select.pickClass') : t('admin.select.noClassYet') },
      ...classes.map((c) => ({
        value: String(c.id),
        label: `${c.name}${c.school?.name ? ` · ${c.school.name}` : ''}`,
      })),
    ],
    [classes, t],
  );

  const classTeacherOptions = useMemo<KidsSelectOption[]>(() => {
    if (!selectedClass) return [{ value: '', label: t('admin.select.selectClassFirst') }];
    const school = schools.find((s) => s.id === selectedClass.school.id);
    const allowed = new Set((school?.teachers || []).map((x) => x.id));
    const already = new Set(classTeachers.map((x) => x.teacher_user_id));
    const rows = teachers.filter((tm) => tm.is_active && allowed.has(tm.id) && !already.has(tm.id));
    return [
      { value: '', label: t('admin.select.pickTeacher') },
      ...rows.map((tm) => ({
        value: String(tm.id),
        label: `${(`${tm.first_name || ''} ${tm.last_name || ''}`.trim() || tm.email)} · ${tm.subject || t('admin.noSubjectShort')}`,
      })),
    ];
  }, [selectedClass, schools, teachers, classTeachers, t]);

  const teacherSubjectOptions = useMemo<KidsSelectOption[]>(() => {
    const activeRows = subjects.filter((s) => s.is_active);
    if (activeRows.length === 0) {
      return [{ value: '', label: t('admin.select.addSubjectFirst') }];
    }
    return [
      { value: '', label: t('admin.select.pickSubject') },
      ...activeRows.map((s) => ({ value: s.name, label: s.name })),
    ];
  }, [subjects, t]);

  const activeTeacherSubjectOptions = useMemo<KidsSelectOption[]>(
    () => subjects.filter((s) => s.is_active).map((s) => ({ value: s.name, label: s.name })),
    [subjects],
  );

  const teacherRowSubjectOptions = useCallback(
    (teacher: KidsAdminTeacher): KidsSelectOption[] => {
      const draft = (teacherSubjectDrafts[teacher.id] ?? teacher.subject ?? '').trim();
      const hasCurrent = draft && activeTeacherSubjectOptions.some((o) => o.value === draft);
      if (hasCurrent) return activeTeacherSubjectOptions;
      if (!draft) return activeTeacherSubjectOptions;
      return [{ value: draft, label: `${draft} ${t('admin.subject.inactiveSuffix')}` }, ...activeTeacherSubjectOptions];
    },
    [activeTeacherSubjectOptions, teacherSubjectDrafts, t],
  );

  const subjectRows = useMemo(() => {
    const sorted = [...subjects].sort(
      (a, b) => Number(b.is_active) - Number(a.is_active) || a.name.localeCompare(b.name, 'tr'),
    );
    if (showPassiveSubjects) return sorted;
    return sorted.filter((s) => s.is_active);
  }, [subjects, showPassiveSubjects]);

  useEffect(() => {
    if (!selectedClassId) {
      setClassTeachers([]);
      return;
    }
    let cancelled = false;
    setClassTeacherLoading(true);
    (async () => {
      try {
        const list = await kidsListClassTeachers(Number(selectedClassId));
        if (!cancelled) setClassTeachers(list);
      } catch (e) {
        if (!cancelled) toast.error(e instanceof Error ? e.message : t('admin.errors.classTeachersFetchFailed'));
      } finally {
        if (!cancelled) setClassTeacherLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedClassId]);

  async function onAssignClassTeacher() {
    const cid = Number(selectedClassId || 0);
    const tid = Number(classTeacherId || 0);
    const teacherRow = teachers.find((t) => t.id === tid) ?? null;
    const subject = (teacherRow?.subject || '').trim();
    if (!cid) {
      toast.error(t('admin.errors.selectClassFirst'));
      return;
    }
    if (!tid) {
      toast.error(t('admin.errors.selectTeacher'));
      return;
    }
    if (!subject) {
      toast.error(t('admin.errors.teacherSubjectMissing'));
      return;
    }
    setClassTeacherSaving(true);
    try {
      const row = await kidsAddClassTeacher(cid, {
        teacher_user_id: tid,
        subject,
        is_active: true,
      });
      setClassTeachers((prev) => [...prev, row]);
      setClassTeacherId('');
      toast.success(t('admin.class.teacherAssignedBySubject'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('admin.errors.classAssignFailed'));
    } finally {
      setClassTeacherSaving(false);
    }
  }

  async function onRemoveClassTeacher(teacherUserId: number) {
    const cid = Number(selectedClassId || 0);
    if (!cid) return;
    try {
      await kidsRemoveClassTeacher(cid, teacherUserId);
      setClassTeachers((prev) => prev.filter((t) => t.teacher_user_id !== teacherUserId));
      toast.success(t('admin.class.teacherRemoved'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('admin.errors.classRemoveFailed'));
    }
  }

  async function onCreateSubject(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = newSubjectName.trim();
    if (!name) {
      toast.error(t('admin.errors.subjectNameRequired'));
      return;
    }
    setSubjectSaving(true);
    try {
      const row = await kidsAdminCreateSubject({ name, is_active: true });
      setSubjects((prev) => {
        const has = prev.some((s) => s.id === row.id);
        if (has) return prev.map((s) => (s.id === row.id ? row : s));
        return [...prev, row];
      });
      setTeacherSubject((curr) => curr || row.name);
      setNewSubjectName('');
      toast.success(t('admin.subject.created'));
    } catch (e2) {
      toast.error(e2 instanceof Error ? e2.message : t('admin.errors.subjectCreateFailed'));
    } finally {
      setSubjectSaving(false);
    }
  }

  async function onToggleSubject(subject: KidsAdminSubject) {
    setSubjectSaving(true);
    try {
      const updated = await kidsAdminPatchSubject(subject.id, { is_active: !subject.is_active });
      setSubjects((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      if (!updated.is_active && teacherSubject === updated.name) {
        setTeacherSubject('');
      }
      toast.success(updated.is_active ? t('admin.subject.activated') : t('admin.subject.deactivated'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('admin.errors.subjectUpdateFailed'));
    } finally {
      setSubjectSaving(false);
    }
  }

  async function onToggleActive(teacher: KidsAdminTeacher) {
    const next = !teacher.is_active;
    setToggleId(teacher.id);
    try {
      const updated = await kidsAdminPatchTeacher(teacher.id, { is_active: next });
      setTeachers((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      toast.success(next ? t('admin.teacher.activated') : t('admin.teacher.deactivated'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('admin.errors.statusUpdateFailed'));
    } finally {
      setToggleId(null);
    }
  }

  async function onResendWelcomeEmail(teacher: KidsAdminTeacher) {
    setResendMailId(teacher.id);
    try {
      const res = await kidsAdminResendTeacherWelcome(teacher.id);
      if (res.email_sent) {
        toast.success(t('admin.teacher.inviteResent'));
      } else {
        const fallback = res.temporary_password
          ? `Mail gonderilemedi. Gecici sifre: ${res.temporary_password}`
          : res.email_error || 'Mail gonderilemedi.';
        toast.error(fallback, { duration: 9000 });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('admin.errors.inviteResendFailed'));
    } finally {
      setResendMailId(null);
    }
  }

  async function onSaveTeacherSubject(teacher: KidsAdminTeacher) {
    const subject = (teacherSubjectDrafts[teacher.id] ?? teacher.subject ?? '').trim();
    if (!subject) {
      toast.error(t('admin.errors.selectSubject'));
      return;
    }
    if (subject === (teacher.subject || '').trim()) return;
    setSubjectUpdateId(teacher.id);
    try {
      const updated = await kidsAdminPatchTeacher(teacher.id, { subject });
      setTeachers((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      setTeacherSubjectDrafts((prev) => {
        const next = { ...prev };
        delete next[teacher.id];
        return next;
      });
      toast.success(t('admin.teacher.subjectUpdated'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('admin.errors.subjectUpdateFailed'));
    } finally {
      setSubjectUpdateId(null);
    }
  }

  async function onSaveAchievementSettings() {
    const w = Math.max(1, Math.floor(Number(weeklyTarget) || 1));
    const m = Math.max(1, Math.floor(Number(monthlyTarget) || 1));
    setAchievementSaving(true);
    try {
      const row = await kidsAdminPatchAchievementSettings({
        weekly_certificate_target: w,
        monthly_certificate_target: m,
      });
      setAchievementSettings(row);
      setWeeklyTarget(Math.max(1, Number(row.weekly_certificate_target || 2)));
      setMonthlyTarget(Math.max(1, Number(row.monthly_certificate_target || 6)));
      toast.success(t('admin.certificate.updated'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('admin.errors.certificateUpdateFailed'));
    } finally {
      setAchievementSaving(false);
    }
  }

  if (loading || !user || user.role !== 'admin') {
    return (
      <KidsPanelMax>
        <p className="text-center text-violet-800 dark:text-violet-200">{t('common.loading')}</p>
      </KidsPanelMax>
    );
  }

  return (
    <KidsPanelMax>
      <h1 className="font-logo text-2xl font-bold text-slate-900 dark:text-white">{t('admin.title')}</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-gray-400">
        {t('admin.subtitle')}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <KidsCard className="lg:sticky lg:top-28">
          <h2 className="font-logo text-lg font-bold text-slate-900 dark:text-white">{t('admin.teacher.newTitle')}</h2>
          <form className="mt-4 space-y-4" onSubmit={onCreate}>
            <KidsFormField id="t-email" label={t('admin.form.email')} required>
              <input
                id="t-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={kidsInputClass}
                placeholder={t('admin.form.teacherEmailPlaceholder')}
              />
            </KidsFormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <KidsFormField id="t-fn" label={t('profile.firstName')}>
                <input
                  id="t-fn"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={kidsInputClass}
                />
              </KidsFormField>
              <KidsFormField id="t-ln" label={t('profile.lastName')}>
                <input
                  id="t-ln"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={kidsInputClass}
                />
              </KidsFormField>
            </div>
            <KidsFormField id="t-subject" label={t('admin.form.subject')} required>
              <KidsSelect
                id="t-subject"
                value={teacherSubject}
                onChange={setTeacherSubject}
                options={teacherSubjectOptions}
                disabled={teacherSubjectOptions.length <= 1}
              />
            </KidsFormField>
            {schools.length > 0 ? (
              <SchoolAssignPicker
                schools={schools}
                selectedIds={teacherSchoolIds}
                onToggle={toggleTeacherSchool}
                t={t}
              />
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('admin.hint.addSchoolBeforeTeacher')}</p>
            )}
            <KidsPrimaryButton type="submit" disabled={saving}>
              {saving ? t('admin.teacher.creating') : t('admin.teacher.createAndMail')}
            </KidsPrimaryButton>
          </form>
        </KidsCard>

        <KidsCard
          tone="sky"
          className="flex min-h-0 min-w-0 flex-col lg:max-h-[calc(100vh-8.5rem)]"
        >
          <div className="flex shrink-0 items-center justify-between gap-2">
            <h2 className="font-logo text-lg font-bold text-sky-950 dark:text-sky-50">{t('admin.teacher.listTitle')}</h2>
            <KidsSecondaryButton
              type="button"
              onClick={() => {
                void load();
                void loadSchools();
                void loadClasses();
                void loadSubjects();
                void loadAchievementSettings();
              }}
              disabled={listLoading}
            >
              {listLoading ? t('common.refreshing') : t('common.refresh')}
            </KidsSecondaryButton>
          </div>
          {teachers.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600 dark:text-gray-300">{t('admin.teacher.none')}</p>
          ) : (
            <ul className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1">
              {teachers.map((teacher) => (
                <li
                  key={teacher.id}
                  className="rounded-xl border border-sky-200/80 bg-white/95 p-3 text-sm shadow-xs dark:border-sky-800 dark:bg-sky-950/25"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {teacher.first_name || '-'} {teacher.last_name || ''}
                        </span>
                        <span className="mt-0.5 block truncate text-slate-600 dark:text-gray-300">{teacher.email}</span>
                      </div>
                      <span
                        className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          teacher.is_active
                            ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100'
                            : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {teacher.is_active ? t('common.statusActive') : t('common.statusInactive')}
                      </span>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                      <KidsSelect
                        id={`teacher-subject-${teacher.id}`}
                        value={teacherSubjectDrafts[teacher.id] ?? teacher.subject ?? ''}
                        onChange={(v) =>
                          setTeacherSubjectDrafts((prev) => ({
                            ...prev,
                            [teacher.id]: v,
                          }))
                        }
                        options={teacherRowSubjectOptions(teacher)}
                        disabled={subjectUpdateId === teacher.id || activeTeacherSubjectOptions.length === 0}
                      />
                      <KidsSecondaryButton
                        type="button"
                        disabled={
                          subjectUpdateId === teacher.id ||
                          !((teacherSubjectDrafts[teacher.id] ?? teacher.subject ?? '').trim()) ||
                          ((teacherSubjectDrafts[teacher.id] ?? teacher.subject ?? '').trim() === (teacher.subject || '').trim())
                        }
                        onClick={() => void onSaveTeacherSubject(teacher)}
                        className="border-sky-200 text-sky-900 hover:bg-sky-50 dark:border-sky-700 dark:text-sky-100 dark:hover:bg-sky-900/30"
                      >
                        {subjectUpdateId === teacher.id ? t('profile.saving') : t('admin.teacher.saveSubject')}
                      </KidsSecondaryButton>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <KidsSecondaryButton
                        type="button"
                        disabled={resendMailId === teacher.id}
                        onClick={() => void onResendWelcomeEmail(teacher)}
                        className="border-sky-200 text-sky-900 hover:bg-sky-50 dark:border-sky-700 dark:text-sky-100 dark:hover:bg-sky-900/30"
                      >
                        {resendMailId === teacher.id ? t('admin.teacher.sendingMail') : t('admin.teacher.resendMail')}
                      </KidsSecondaryButton>
                      <KidsSecondaryButton
                        type="button"
                        disabled={toggleId === teacher.id}
                        onClick={() => void onToggleActive(teacher)}
                        className="border-amber-200 text-amber-900 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-100 dark:hover:bg-amber-950/50"
                      >
                        {toggleId === teacher.id ? '…' : teacher.is_active ? t('admin.teacher.deactivate') : t('admin.teacher.activate')}
                      </KidsSecondaryButton>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </KidsCard>
      </div>

      <div className="mt-10">
        <KidsCard tone="sky">
          <h2 className="font-logo text-xl font-bold text-sky-950 dark:text-sky-50">{t('admin.classAssign.title')}</h2>
          <p className="mt-2 text-sm text-sky-900/80 dark:text-sky-100/80">{t('admin.classAssign.subtitle')}</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <KidsFormField id="class-assign-class" label={t('admin.form.class')} required>
              <KidsSelect
                id="class-assign-class"
                value={selectedClassId}
                onChange={setSelectedClassId}
                options={classOptions}
                disabled={classOptions.length === 0}
              />
            </KidsFormField>
            <KidsFormField id="class-assign-teacher" label={t('admin.form.teacher')} required>
              <KidsSelect
                id="class-assign-teacher"
                value={classTeacherId}
                onChange={setClassTeacherId}
                options={classTeacherOptions}
                disabled={!selectedClassId}
              />
            </KidsFormField>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <KidsPrimaryButton type="button" disabled={classTeacherSaving} onClick={() => void onAssignClassTeacher()}>
              {classTeacherSaving ? t('admin.classAssign.assigning') : t('admin.classAssign.assign')}
            </KidsPrimaryButton>
            <KidsSecondaryButton
              type="button"
              onClick={() => {
                void loadClasses();
                void loadSubjects();
              }}
            >
              {t('admin.classAssign.refreshClasses')}
            </KidsSecondaryButton>
          </div>

          <div className="mt-5 rounded-2xl border border-sky-200/80 bg-white/70 p-4 dark:border-sky-800/50 dark:bg-sky-950/20">
            <p className="text-sm font-semibold text-sky-900 dark:text-sky-100">
              {selectedClass
                ? t('admin.classAssign.assignedHeadingWithClass').replace('{name}', selectedClass.name)
                : t('admin.classAssign.assignedHeading')}
            </p>
            {classTeacherLoading ? (
              <p className="mt-2 text-sm text-slate-600 dark:text-gray-300">{t('common.loading')}</p>
            ) : classTeachers.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600 dark:text-gray-300">{t('admin.classAssign.noAssignments')}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {classTeachers.map((ct) => (
                  <li
                    key={ct.teacher_user_id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sky-200/70 bg-white/90 px-3 py-2 text-sm dark:border-sky-700/70 dark:bg-slate-900/50"
                  >
                    <span>
                      <strong>{ct.teacher_display}</strong> · {ct.subject}
                    </span>
                    <KidsSecondaryButton
                      type="button"
                      className="border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/50"
                      onClick={() => void onRemoveClassTeacher(ct.teacher_user_id)}
                    >
                      {t('common.remove')}
                    </KidsSecondaryButton>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </KidsCard>
      </div>

      <div className="mt-6">
        <KidsCard tone="amber">
          <h3 className="font-logo text-lg font-bold text-amber-950 dark:text-amber-50">{t('admin.subjects.title')}</h3>
          <p className="mt-1 text-sm text-amber-900/80 dark:text-amber-100/80">{t('admin.subjects.subtitle')}</p>
          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="text-xs text-amber-900/70 dark:text-amber-100/70">
              {t('admin.subjects.summary')
                .replace('{total}', String(subjects.length))
                .replace('{shown}', String(subjectRows.length))}
            </p>
            <div className="flex items-center gap-2">
              <KidsSecondaryButton
                type="button"
                onClick={() => setShowPassiveSubjects((v) => !v)}
                disabled={subjectSaving}
              >
                {showPassiveSubjects ? t('admin.subjects.hidePassive') : t('admin.subjects.showPassive')}
              </KidsSecondaryButton>
              <KidsSecondaryButton type="button" onClick={() => void loadSubjects()} disabled={subjectSaving}>
                {t('admin.subjects.refreshList')}
              </KidsSecondaryButton>
            </div>
          </div>
          <form className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={onCreateSubject}>
            <div className="flex-1">
              <KidsFormField id="new-subject-name" label={t('admin.subjects.newName')} required>
                <input
                  id="new-subject-name"
                  type="text"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  className={kidsInputClass}
                  placeholder={t('admin.subjects.newNamePlaceholder')}
                  maxLength={80}
                  required
                />
              </KidsFormField>
            </div>
            <KidsPrimaryButton type="submit" disabled={subjectSaving}>
              {subjectSaving ? t('admin.subjects.adding') : t('admin.subjects.add')}
            </KidsPrimaryButton>
          </form>
          <div className="mt-4 max-h-80 overflow-y-auto pr-1">
            <ul className="space-y-2">
            {subjectRows.length === 0 ? (
              <li className="text-sm text-slate-600 dark:text-gray-300">{t('admin.subjects.noneYet')}</li>
            ) : (
              subjectRows.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-amber-200/70 bg-white/90 px-3 py-2 text-sm dark:border-amber-800/60 dark:bg-slate-900/50"
                >
                  <span className="text-slate-900 dark:text-white">
                    {s.name}{' '}
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      ({s.is_active ? t('common.statusActive') : t('common.statusInactive')} ·{' '}
                      {t('admin.subjects.usageCount').replace('{n}', String(s.usage_count))})
                    </span>
                  </span>
                  <KidsSecondaryButton type="button" disabled={subjectSaving} onClick={() => void onToggleSubject(s)}>
                    {s.is_active ? t('admin.subjects.makeInactive') : t('admin.subjects.makeActive')}
                  </KidsSecondaryButton>
                </li>
              ))
            )}
            </ul>
          </div>
        </KidsCard>
      </div>

      <div className="mt-10 space-y-6">
        <KidsCard>
          <h3 className="font-logo text-lg font-bold text-violet-950 dark:text-violet-50">{t('admin.certificate.title')}</h3>
          <p className="mt-1 text-sm text-violet-900/80 dark:text-violet-100/80">{t('admin.certificate.subtitle')}</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <KidsFormField id="cert-weekly-target" label={t('admin.certificate.weeklyLabel')} required>
              <input
                id="cert-weekly-target"
                type="number"
                min={1}
                max={50}
                required
                value={weeklyTarget}
                onChange={(e) => setWeeklyTarget(parseInt(e.target.value, 10) || 1)}
                className={kidsInputClass}
              />
            </KidsFormField>
            <KidsFormField id="cert-monthly-target" label={t('admin.certificate.monthlyLabel')} required>
              <input
                id="cert-monthly-target"
                type="number"
                min={1}
                max={200}
                required
                value={monthlyTarget}
                onChange={(e) => setMonthlyTarget(parseInt(e.target.value, 10) || 1)}
                className={kidsInputClass}
              />
            </KidsFormField>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <KidsPrimaryButton type="button" disabled={achievementSaving} onClick={() => void onSaveAchievementSettings()}>
              {achievementSaving ? t('profile.saving') : t('admin.certificate.save')}
            </KidsPrimaryButton>
            <KidsSecondaryButton type="button" disabled={achievementSaving} onClick={() => void loadAchievementSettings()}>
              {t('common.refresh')}
            </KidsSecondaryButton>
            {achievementSettings?.updated_at ? (
              <span className="text-xs text-violet-800/80 dark:text-violet-200/80">
                {t('admin.certificate.lastUpdated')}{' '}
                {new Date(achievementSettings.updated_at).toLocaleString(language === 'en' ? 'en-GB' : language === 'ge' ? 'de-DE' : 'tr-TR')}
              </span>
            ) : null}
          </div>
        </KidsCard>

        <h2 className="font-logo text-xl font-bold text-slate-900 dark:text-white">{t('admin.schools.sectionTitle')}</h2>
        <p className="text-sm text-slate-600 dark:text-gray-400">{t('admin.schools.sectionSubtitle')}</p>

        <KidsCard tone="emerald">
          <h3 className="font-logo text-lg font-bold text-emerald-950 dark:text-emerald-50">{t('admin.schools.newSchoolTitle')}</h3>
          <p className="mt-1 text-sm text-emerald-900/80 dark:text-emerald-100/80">{t('admin.schools.newSchoolSubtitle')}</p>

          {mebProvincesReady && mebProvinces.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
              {t('admin.schools.mebListMissingBefore')}{' '}
              <code className="rounded bg-amber-100/80 px-1 font-mono text-xs dark:bg-amber-900/40">
                python manage.py sync_meb_schools
              </code>{' '}
              {t('admin.schools.mebListMissingAfter')}
            </p>
          ) : null}

          <div className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <KidsFormField id={mebIlId} label={t('schools.province')}>
                <KidsSelect
                  id={mebIlId}
                  value={mebIl}
                  onChange={(v) => {
                    setMebIl(v);
                    setMebIlce('');
                    setMebSchoolYol('');
                    setMebSchools([]);
                    setPickName(''); setPickProvince(''); setPickDistrict('');
                  }}
                  options={provinceOptions}
                />
              </KidsFormField>
              <KidsFormField id={mebIlceId} label={t('schools.district')}>
                <KidsSelect
                  id={mebIlceId}
                  value={mebIlce}
                  onChange={(v) => {
                    setMebIlce(v);
                    setMebSchoolYol('');
                    setMebSchools([]);
                    setPickName(''); setPickProvince(''); setPickDistrict('');
                  }}
                  options={districtOptions}
                  disabled={!mebIl}
                />
              </KidsFormField>
              <KidsFormField id={mebSchoolPickId} label={t('schools.mebSchool')}>
                <KidsSelect
                  id={mebSchoolPickId}
                  value={mebSchoolYol}
                  onChange={onMebSchoolPick}
                  options={schoolPickOptions}
                  disabled={!mebIl || !mebIlce || mebSchoolsLoading || mebSchools.length === 0}
                />
              </KidsFormField>
            </div>

            {mebSchoolYol ? (
              <div className="rounded-2xl border border-emerald-200/80 bg-white/60 p-4 dark:border-emerald-800/50 dark:bg-emerald-950/20">
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                  {t('admin.schools.selectedSchool')}
                </p>
                <p className="mt-1 text-sm text-emerald-950 dark:text-emerald-50">
                  {[pickDistrict, pickProvince].filter(Boolean).join(' · ') || '—'}
                </p>
                <div className="mt-3">
                  <KidsFormField
                    id={pickNameId}
                    label={t('schools.schoolName')}
                    required
                    hint={t('schools.schoolNameHint')}
                  >
                    <input
                      id={pickNameId}
                      required
                      maxLength={200}
                      value={pickName}
                      onChange={(e) => setPickName(e.target.value)}
                      className={kidsInputClass}
                    />
                  </KidsFormField>
                </div>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  <KidsFormField id="ns-stage" label={t('admin.schools.schoolType')} required>
                    <KidsSelect
                      id="ns-stage"
                      value={nsStage}
                      onChange={(v) => setNsStage((v === 'sales' ? 'sales' : 'demo'))}
                      options={[
                        { value: 'demo', label: t('admin.stage.demo') },
                        { value: 'sales', label: t('admin.stage.sales') },
                      ]}
                      searchable={false}
                    />
                  </KidsFormField>
                  <KidsFormField id="ns-cap" label={t('admin.schools.studentCap')} required>
                    <input
                      id="ns-cap"
                      type="number"
                      min={1}
                      required
                      value={nsStudentCap}
                      onChange={(e) => setNsStudentCap(parseInt(e.target.value, 10) || 1)}
                      className={kidsInputClass}
                    />
                  </KidsFormField>
                </div>
                {nsStage === 'demo' ? (
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    <KidsFormField id="ns-demo-start" label={t('admin.schools.demoStart')}>
                      <input
                        id="ns-demo-start"
                        type="date"
                        value={nsDemoStartAt}
                        onChange={(e) => setNsDemoStartAt(e.target.value)}
                        className={kidsInputClass}
                      />
                    </KidsFormField>
                    <KidsFormField id="ns-demo-end" label={t('admin.schools.demoEnd')}>
                      <input
                        id="ns-demo-end"
                        type="date"
                        value={nsDemoEndAt}
                        onChange={(e) => setNsDemoEndAt(e.target.value)}
                        className={kidsInputClass}
                      />
                    </KidsFormField>
                  </div>
                ) : null}
                {nsStage === 'sales' ? (
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    <KidsFormField id="ns-year" label={t('admin.schools.academicYearExample')} required>
                      <KidsSelect
                        id="ns-year"
                        value={nsYear}
                        onChange={setNsYear}
                        options={academicYearOptions}
                        searchable={false}
                      />
                    </KidsFormField>
                  </div>
                ) : null}
                <KidsPrimaryButton
                  type="button"
                  className="mt-4"
                  disabled={
                    !pickName.trim() ||
                    !pickProvince.trim() ||
                    !pickDistrict.trim() ||
                    nsStudentCap <= 0 ||
                    (nsStage === 'demo' && (!!nsDemoStartAt !== !!nsDemoEndAt)) ||
                    schoolSaving
                  }
                  onClick={() => void onSavePickedSchool()}
                >
                  {schoolSaving ? t('profile.saving') : t('admin.schools.createSchool')}
                </KidsPrimaryButton>
              </div>
            ) : null}

            {mebIl && mebIlce && !mebSchoolsLoading && mebSchools.length === 0 ? (
              <p className="rounded-2xl border border-violet-200/60 bg-violet-50/50 px-4 py-3 text-sm text-violet-900 dark:border-violet-900/40 dark:bg-violet-950/25 dark:text-violet-100">
                {t('schools.noMebSchoolInDistrict')}
              </p>
            ) : null}

            <div className="border-t border-emerald-200/60 pt-4 dark:border-emerald-800/40">
              <KidsSecondaryButton type="button" className="w-full sm:w-auto" onClick={openAddSchoolModal}>
                {t('schools.addIfNotListed')}
              </KidsSecondaryButton>
              <p className="mt-2 text-xs text-emerald-800/70 dark:text-emerald-200/70">{t('schools.manualAddHint')}</p>
            </div>
          </div>
        </KidsCard>

        <div className="flex items-center justify-between gap-2">
          <h3 className="font-logo text-lg font-bold text-slate-900 dark:text-white">{t('schools.registered')}</h3>
          <KidsSecondaryButton type="button" onClick={() => void loadSchools()} disabled={schoolsLoading}>
            {schoolsLoading ? t('common.refreshing') : t('admin.schools.refreshList')}
          </KidsSecondaryButton>
        </div>

        {schools.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-gray-400">{t('admin.schools.noneYetShort')}</p>
        ) : (
          <ul className="space-y-2">
            {schools.map((s) => {
              const isOpen = expandedSchoolId === s.id;
              const stageLabel = s.lifecycle_stage === 'sales' ? t('admin.stage.salesBadge') : t('admin.stage.demoBadge');
              const stageClass =
                s.lifecycle_stage === 'sales'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200';
              const capUsed = s.enrolled_distinct_student_count ?? 0;
              const capTotal = s.student_user_cap ?? 0;
              const academicYears = (s.year_profiles ?? [])
                .map((p) => p.academic_year)
                .filter(Boolean)
                .sort((a, b) => b.localeCompare(a, 'tr'));
              const academicYearLine = academicYears.length > 0 ? academicYears.join(', ') : null;
              return (
                <li key={s.id}>
                  <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/60">
                    <button
                      type="button"
                      onClick={() => setExpandedSchoolId(isOpen ? null : s.id)}
                      className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                    >
                      <span
                        className={`inline-flex h-6 w-6 shrink-0 items-center justify-center text-sm text-slate-400 transition-transform dark:text-slate-500 ${isOpen ? 'rotate-90' : ''}`}
                        aria-hidden
                      >
                        ▶
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="font-logo text-base font-bold text-slate-900 dark:text-white">{s.name}</span>
                        <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">
                          {[s.district, s.province].filter(Boolean).join(' · ') || '—'}
                        </span>
                        <span className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${stageClass}`}>
                          {stageLabel}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        {academicYearLine ? (
                          <span className="hidden sm:inline" title={t('teacher.panel.academicYear')}>
                            {academicYearLine}
                          </span>
                        ) : null}
                        <span title={t('admin.form.teacher')}>
                          {s.teachers.length} {t('admin.schools.teacherAbbr')}
                        </span>
                        <span className="hidden sm:inline" title={t('admin.schools.capTitle')}>
                          {capUsed} / {capTotal} {t('admin.schools.capSuffix')}
                        </span>
                      </span>
                    </button>

                    {isOpen ? (
                      <div className="border-t border-slate-200/60 px-5 pb-5 pt-4 dark:border-slate-700/60">
                        <div className="mb-4 flex items-center justify-between">
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {t('admin.schools.idAndLimit')
                              .replace('{id}', String(s.id))
                              .replace('{used}', String(capUsed))
                              .replace('{total}', String(capTotal))}
                            {academicYearLine ? ` · ${t('admin.schools.yearShort')}: ${academicYearLine}` : ''}
                            {s.lifecycle_stage === 'demo' && s.demo_start_at && s.demo_end_at
                              ? ` · ${t('admin.schools.demoColon')} ${s.demo_start_at} → ${s.demo_end_at}${
                                  s.demo_is_active ? '' : ` (${t('common.statusInactive')})`
                                }`
                              : ''}
                          </p>
                          <div className="flex items-center gap-2">
                            {editSchoolId !== s.id ? (
                              <KidsSecondaryButton type="button" onClick={() => startEditSchool(s)}>
                                {t('parentControls.edit')}
                              </KidsSecondaryButton>
                            ) : (
                              <KidsSecondaryButton type="button" onClick={cancelEditSchool}>
                                {t('admin.schools.closeEdit')}
                              </KidsSecondaryButton>
                            )}
                            <button
                              type="button"
                              onClick={() => void onDeleteSchool(s.id)}
                              className="rounded-full border-2 border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
                            >
                              {t('admin.schools.deleteSchool')}
                            </button>
                          </div>
                        </div>

                        {editSchoolId === s.id ? (
                          <div className="mb-4 rounded-xl border border-violet-200/80 bg-violet-50/40 p-3 dark:border-violet-900/50 dark:bg-violet-950/20">
                            <p className="mb-3 text-sm font-semibold text-violet-900 dark:text-violet-100">
                              {t('admin.schools.settingsTitle')}
                            </p>
                            <div className="grid gap-3 md:grid-cols-2">
                              <KidsFormField id={`edit-stage-${s.id}`} label={t('admin.schools.schoolType')} required>
                                <KidsSelect
                                  id={`edit-stage-${s.id}`}
                                  value={editStage}
                                  onChange={(v) => setEditStage(v === 'sales' ? 'sales' : 'demo')}
                                  options={[
                                    { value: 'demo', label: t('admin.stage.demo') },
                                    { value: 'sales', label: t('admin.stage.sales') },
                                  ]}
                                  searchable={false}
                                />
                              </KidsFormField>
                              <KidsFormField id={`edit-cap-${s.id}`} label={t('admin.schools.studentCap')} required>
                                <input
                                  id={`edit-cap-${s.id}`}
                                  type="number"
                                  min={1}
                                  required
                                  value={editStudentCap}
                                  onChange={(e) => setEditStudentCap(parseInt(e.target.value, 10) || 1)}
                                  className={kidsInputClass}
                                />
                              </KidsFormField>
                            </div>
                            {editStage === 'demo' ? (
                              <div className="mt-3 grid gap-3 md:grid-cols-2">
                                <KidsFormField id={`edit-demo-start-${s.id}`} label={t('admin.schools.demoStartShort')}>
                                  <input
                                    id={`edit-demo-start-${s.id}`}
                                    type="date"
                                    value={editDemoStartAt}
                                    onChange={(e) => setEditDemoStartAt(e.target.value)}
                                    className={kidsInputClass}
                                  />
                                </KidsFormField>
                                <KidsFormField id={`edit-demo-end-${s.id}`} label={t('admin.schools.demoEndShort')}>
                                  <input
                                    id={`edit-demo-end-${s.id}`}
                                    type="date"
                                    value={editDemoEndAt}
                                    onChange={(e) => setEditDemoEndAt(e.target.value)}
                                    className={kidsInputClass}
                                  />
                                </KidsFormField>
                              </div>
                            ) : (
                              <div className="mt-3 grid gap-3 md:grid-cols-2">
                                <KidsFormField id={`edit-sales-year-${s.id}`} label={t('teacher.panel.academicYear')} required>
                                  <KidsSelect
                                    id={`edit-sales-year-${s.id}`}
                                    value={editSalesYear}
                                    onChange={setEditSalesYear}
                                    options={academicYearOptions}
                                    searchable={false}
                                  />
                                </KidsFormField>
                              </div>
                            )}
                            <div className="mt-3 flex items-center gap-2">
                              <KidsPrimaryButton
                                type="button"
                                disabled={schoolEditSavingId === s.id}
                                onClick={() => void saveSchoolSettings(s)}
                              >
                                {schoolEditSavingId === s.id ? t('profile.saving') : t('admin.schools.saveSettings')}
                              </KidsPrimaryButton>
                              <p className="text-xs text-violet-700/80 dark:text-violet-200/80">{t('admin.schools.demoToSalesHint')}</p>
                            </div>
                          </div>
                        ) : (
                          <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">{t('admin.schools.managedByCap')}</p>
                        )}

                        <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-700">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{t('admin.schools.teachersAtSchool')}</p>
                          <ul className="mt-2 space-y-2">
                            {s.teachers.length === 0 ? (
                              <li className="text-sm text-slate-500">{t('admin.schools.noTeachersYet')}</li>
                            ) : (
                              s.teachers.map((tm) => (
                                <li
                                  key={tm.id}
                                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-900/50"
                                >
                                  <span>
                                    {tm.first_name} {tm.last_name} · {tm.email}
                                  </span>
                                  <button
                                    type="button"
                                    className="text-xs font-bold text-amber-700 hover:underline dark:text-amber-300"
                                    onClick={() => void onRemoveTeacher(s.id, tm.id)}
                                  >
                                    {t('admin.schools.removeTeacher')}
                                  </button>
                                </li>
                              ))
                            )}
                          </ul>
                          <div className="mt-3 flex flex-wrap items-end gap-2">
                            <div className="min-w-[220px] flex-1">
                              <KidsFormField id={`assign-${s.id}`} label={t('admin.schools.assignTeacher')}>
                                <KidsSelect
                                  id={`assign-${s.id}`}
                                  value={assignTeacherId[s.id] ?? ''}
                                  onChange={(v) => setAssignTeacherId((prev) => ({ ...prev, [s.id]: v }))}
                                  options={teacherAssignOptions(s)}
                                />
                              </KidsFormField>
                            </div>
                            <KidsPrimaryButton type="button" onClick={() => void onAssignTeacher(s.id)}>
                              {t('admin.schools.assign')}
                            </KidsPrimaryButton>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {addModalOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          role="presentation"
          onClick={closeAddSchoolModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={modalTitleId}
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border-2 border-violet-200 bg-white p-6 shadow-xl dark:border-violet-800 dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id={modalTitleId} className="font-logo text-xl font-bold text-slate-900 dark:text-white">
              {t('schools.addTitle')}
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-gray-400">{t('admin.schools.addModalBody')}</p>
            <form className="mt-6 space-y-4" onSubmit={onModalCreate}>
              <KidsFormField id={modalIlId} label={t('schools.province')}>
                <KidsSelect
                  id={modalIlId}
                  value={modalMebIl}
                  onChange={(v) => { setModalMebIl(v); setModalMebIlce(''); }}
                  options={modalProvinceOptions}
                />
              </KidsFormField>
              <KidsFormField id={modalIlceId} label={t('schools.district')}>
                <KidsSelect
                  id={modalIlceId}
                  value={modalMebIlce}
                  onChange={setModalMebIlce}
                  options={modalDistrictOptions}
                  disabled={!modalMebIl}
                />
              </KidsFormField>
              <KidsFormField id={modalNameId} label={t('schools.schoolName')} required>
                <input
                  id={modalNameId}
                  required
                  maxLength={200}
                  value={modalName}
                  onChange={(e) => setModalName(e.target.value)}
                  className={kidsInputClass}
                  placeholder={t('admin.schools.modalNamePlaceholder')}
                  autoComplete="organization"
                />
              </KidsFormField>
              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <KidsSecondaryButton type="button" onClick={closeAddSchoolModal} disabled={modalCreating}>
                  {t('common.cancel')}
                </KidsSecondaryButton>
                <KidsPrimaryButton
                  type="submit"
                  disabled={modalCreating || !modalName.trim() || !modalMebIl.trim() || !modalMebIlce.trim()}
                >
                  {modalCreating ? t('admin.schools.addingToMeb') : t('admin.schools.addToMebList')}
                </KidsPrimaryButton>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </KidsPanelMax>
  );
}
