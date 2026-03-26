'use client';

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import {
  kidsAdminAddSchoolYearProfile,
  kidsAdminAssignSchoolTeacher,
  kidsAdminCreateMebSchool,
  kidsAdminCreateSchool,
  kidsAdminCreateTeacher,
  kidsAdminDeleteSchool,
  kidsAdminPatchSchool,
  kidsAdminPatchTeacher,
  kidsAdminRemoveSchoolTeacher,
  kidsAdminSchoolsList,
  kidsAdminTeachersList,
  kidsAcademicYearSelectOptions,
  kidsMebDistricts,
  kidsMebProvinces,
  kidsMebSchoolsPick,
  kidsSuggestedAcademicYearLabel,
  type KidsAdminSchoolDetail,
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

function SchoolAssignPicker({
  schools,
  selectedIds,
  onToggle,
}: {
  schools: KidsAdminSchoolDetail[];
  selectedIds: number[];
  onToggle: (id: number) => void;
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
    <KidsFormField id={searchId} label="Okul ataması (isteğe bağlı)">
      <div className="rounded-xl border border-slate-200/80 bg-white/80 dark:border-slate-700 dark:bg-slate-900/40">
        <div className="border-b border-slate-200/60 p-2 dark:border-slate-700/60">
          <input
            id={searchId}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Okul adı, il veya ilçe ile ara…"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-violet-400 focus:ring-1 focus:ring-violet-400 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-violet-500"
          />
        </div>
        <ul className="max-h-48 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <li className="px-2 py-3 text-center text-sm text-slate-500 dark:text-slate-400">
              {query ? 'Eşleşen okul yok' : 'Henüz okul yok'}
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
              {selectedSchools.length} okul seçili
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
                    aria-label={`${s.name} atamasını kaldır`}
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
  const [teachers, setTeachers] = useState<KidsAdminTeacher[]>([]);
  const [schools, setSchools] = useState<KidsAdminSchoolDetail[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [teacherSchoolIds, setTeacherSchoolIds] = useState<number[]>([]);
  const [toggleId, setToggleId] = useState<number | null>(null);

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

  const load = useCallback(async () => {
    setListLoading(true);
    try {
      setTeachers(await kidsAdminTeachersList());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Liste alınamadı');
    } finally {
      setListLoading(false);
    }
  }, []);

  const loadSchools = useCallback(async () => {
    setSchoolsLoading(true);
    try {
      setSchools(await kidsAdminSchoolsList());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Okul listesi alınamadı');
    } finally {
      setSchoolsLoading(false);
    }
  }, []);

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
  }, [user, loading, pathPrefix, router, load, loadSchools]);

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
    () => [{ value: '', label: 'İl seçin' }, ...mebProvinces.map((p) => ({ value: p, label: p }))],
    [mebProvinces],
  );
  const districtOptions = useMemo<KidsSelectOption[]>(() => {
    if (!mebIl) return [{ value: '', label: 'Önce il seçin' }];
    return [{ value: '', label: 'İlçe seçin' }, ...mebDistricts.map((d) => ({ value: d, label: d }))];
  }, [mebIl, mebDistricts]);
  const schoolPickOptions = useMemo<KidsSelectOption[]>(() => {
    if (!mebIl || !mebIlce) return [{ value: '', label: 'Önce il ve ilçe seçin' }];
    if (mebSchoolsLoading) return [{ value: '', label: 'Okullar yükleniyor…' }];
    if (mebSchools.length === 0) return [{ value: '', label: 'Bu ilçede kayıt yok' }];
    return [{ value: '', label: 'Okul seçin' }, ...mebSchools.map((s) => ({ value: s.yol, label: s.name }))];
  }, [mebIl, mebIlce, mebSchools, mebSchoolsLoading]);
  const academicYearOptions = useMemo<KidsSelectOption[]>(
    () => kidsAcademicYearSelectOptions(),
    [],
  );
  const modalProvinceOptions = useMemo<KidsSelectOption[]>(
    () => [{ value: '', label: 'İl seçin' }, ...mebProvinces.map((p) => ({ value: p, label: p }))],
    [mebProvinces],
  );
  const modalDistrictOptions = useMemo<KidsSelectOption[]>(() => {
    if (!modalMebIl) return [{ value: '', label: 'Önce il seçin' }];
    return [{ value: '', label: 'İlçe seçin' }, ...modalDistricts.map((d) => ({ value: d, label: d }))];
  }, [modalMebIl, modalDistricts]);

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
    setSaving(true);
    try {
      const res = await kidsAdminCreateTeacher({
        email: email.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        school_ids: teacherSchoolIds.length ? teacherSchoolIds : undefined,
      });
      setTeachers((prev) => [res.teacher, ...prev]);
      setEmail('');
      setFirstName('');
      setLastName('');
      setTeacherSchoolIds([]);
      void loadSchools();
      if (res.email_sent) {
        toast.success('Öğretmen eklendi ve giriş bilgileri e-posta ile gönderildi.');
      } else {
        toast.success('Öğretmen hesabı oluşturuldu.');
        const why = res.email_error ? ` ${res.email_error}` : '';
        toast(
          `E-posta gönderilemedi.${why} Geçici şifreyi öğretmenle güvenli kanaldan paylaşın: ${res.temporary_password ?? '-'}`,
          { duration: 14000, icon: '✉️' },
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Öğretmen oluşturulamadı');
    } finally {
      setSaving(false);
    }
  }

  async function onSavePickedSchool() {
    if (!pickName.trim() || !pickProvince.trim() || !pickDistrict.trim()) return;
    if (nsStudentCap <= 0) {
      toast.error('Öğrenci limiti en az 1 olmalı.');
      return;
    }
    if (nsStage === 'demo' && (!!nsDemoStartAt !== !!nsDemoEndAt)) {
      toast.error('Demo için başlangıç ve bitiş tarihi birlikte girilmeli.');
      return;
    }
    if (nsDemoStartAt && nsDemoEndAt && nsDemoEndAt < nsDemoStartAt) {
      toast.error('Demo bitiş tarihi başlangıçtan önce olamaz.');
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
                  notes: 'Satış limitiyle otomatik oluşturuldu.',
                },
              ]
            : [],
      });
      setSchools((prev) => [row, ...prev.filter((s) => s.id !== row.id)]);
      resetMebPickForm();
      toast.success('Okul kaydı oluşturuldu.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Okul oluşturulamadı');
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
      toast.success(
        created
          ? 'Okul MEB listesine eklendi. Şimdi üstten okul seçili; öğrenci limitiyle kaydedebilirsiniz.'
          : 'Bu okul MEB listesinde zaten vardı. Üstte seçili hale getirildi; öğrenci limitiyle kaydedebilirsiniz.',
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'MEB listesine okul eklenemedi');
    } finally {
      setModalCreating(false);
    }
  }

  async function onDeleteSchool(id: number) {
    if (!confirm('Bu okulu silmek istediğinize emin misiniz? Bağlı sınıf varsa silinemez.')) return;
    try {
      await kidsAdminDeleteSchool(id);
      setSchools((prev) => prev.filter((s) => s.id !== id));
      setTeacherSchoolIds((prev) => prev.filter((x) => x !== id));
      toast.success('Okul silindi.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Silinemedi');
    }
  }

  async function onAssignTeacher(schoolId: number) {
    const raw = assignTeacherId[schoolId] || '';
    const tid = parseInt(raw, 10);
    if (!tid) {
      toast.error('Öğretmen seçin.');
      return;
    }
    try {
      const updated = await kidsAdminAssignSchoolTeacher(schoolId, tid);
      setSchools((prev) => prev.map((s) => (s.id === schoolId ? updated : s)));
      setAssignTeacherId((prev) => ({ ...prev, [schoolId]: '' }));
      toast.success('Öğretmen okula atandı.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Atanamadı');
    }
  }

  async function onRemoveTeacher(schoolId: number, teacherUserId: number) {
    try {
      const updated = await kidsAdminRemoveSchoolTeacher(schoolId, teacherUserId);
      setSchools((prev) => prev.map((s) => (s.id === schoolId ? updated : s)));
      toast.success('Öğretmen okuldan çıkarıldı.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Çıkarılamadı');
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
      toast.error('Öğrenci limiti en az 1 olmalı.');
      return;
    }
    if (editStage === 'demo' && (!!editDemoStartAt !== !!editDemoEndAt)) {
      toast.error('Demo için başlangıç ve bitiş tarihi birlikte girilmeli.');
      return;
    }
    if (editDemoStartAt && editDemoEndAt && editDemoEndAt < editDemoStartAt) {
      toast.error('Demo bitiş tarihi başlangıçtan önce olamaz.');
      return;
    }
    if (editStage === 'sales' && !editSalesYear.trim()) {
      toast.error('Satış için eğitim-öğretim yılı seçin.');
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
          notes: 'Satış ayarlarından otomatik oluşturuldu.',
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
      toast.success('Okul ayarları güncellendi.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Okul güncellenemedi');
    } finally {
      setSchoolEditSavingId(null);
    }
  }

  function teacherAssignOptions(s: KidsAdminSchoolDetail): KidsSelectOption[] {
    const taken = new Set(s.teachers.map((t) => t.id));
    const opts: KidsSelectOption[] = [{ value: '', label: 'Öğretmen seç…' }];
    for (const t of teachers) {
      if (!t.is_active || taken.has(t.id)) continue;
      opts.push({
        value: String(t.id),
        label: `${t.email} (${[t.first_name, t.last_name].filter(Boolean).join(' ') || '—'})`,
      });
    }
    return opts;
  }

  async function onToggleActive(t: KidsAdminTeacher) {
    const next = !t.is_active;
    setToggleId(t.id);
    try {
      const updated = await kidsAdminPatchTeacher(t.id, { is_active: next });
      setTeachers((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      toast.success(next ? 'Öğretmen hesabı etkinleştirildi.' : 'Öğretmen pasif: giriş yapamaz.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Durum güncellenemedi');
    } finally {
      setToggleId(null);
    }
  }

  if (loading || !user || user.role !== 'admin') {
    return (
      <KidsPanelMax>
        <p className="text-center text-violet-800 dark:text-violet-200">Yükleniyor…</p>
      </KidsPanelMax>
    );
  }

  return (
    <KidsPanelMax>
      <h1 className="font-logo text-2xl font-bold text-slate-900 dark:text-white">Yönetim — öğretmenler ve okullar</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-gray-400">
        Öğretmen hesaplarını buradan açın; okulları ve öğrenci limitlerini yönetin. Öğretmenler
        yeni okul oluşturamaz — atama yönetimden yapılır.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <KidsCard className="lg:sticky lg:top-28">
          <h2 className="font-logo text-lg font-bold text-slate-900 dark:text-white">Yeni öğretmen ekle</h2>
          <form className="mt-4 space-y-4" onSubmit={onCreate}>
            <KidsFormField id="t-email" label="E-posta" required>
              <input
                id="t-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={kidsInputClass}
                placeholder="ogretmen@okul.k12.tr"
              />
            </KidsFormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <KidsFormField id="t-fn" label="Ad">
                <input
                  id="t-fn"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={kidsInputClass}
                />
              </KidsFormField>
              <KidsFormField id="t-ln" label="Soyad">
                <input
                  id="t-ln"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={kidsInputClass}
                />
              </KidsFormField>
            </div>
            {schools.length > 0 ? (
              <SchoolAssignPicker
                schools={schools}
                selectedIds={teacherSchoolIds}
                onToggle={toggleTeacherSchool}
              />
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Önce aşağıdan okul ekleyin; ardından öğretmeni oluştururken okula bağlayabilirsiniz.
              </p>
            )}
            <KidsPrimaryButton type="submit" disabled={saving}>
              {saving ? 'Oluşturuluyor…' : 'Öğretmeni oluştur ve e-posta gönder'}
            </KidsPrimaryButton>
          </form>
        </KidsCard>

        <KidsCard
          tone="sky"
          className="flex min-h-0 min-w-0 flex-col lg:max-h-[calc(100vh-8.5rem)]"
        >
          <div className="flex shrink-0 items-center justify-between gap-2">
            <h2 className="font-logo text-lg font-bold text-sky-950 dark:text-sky-50">Öğretmenler</h2>
            <KidsSecondaryButton
              type="button"
              onClick={() => {
                void load();
                void loadSchools();
              }}
              disabled={listLoading}
            >
              {listLoading ? 'Yenileniyor…' : 'Yenile'}
            </KidsSecondaryButton>
          </div>
          {teachers.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600 dark:text-gray-300">Henüz öğretmen hesabı yok.</p>
          ) : (
            <ul className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1">
              {teachers.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-col gap-2 rounded-xl border border-sky-200/80 bg-white/90 px-3 py-3 text-sm dark:border-sky-800 dark:bg-sky-950/25 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {t.first_name || '-'} {t.last_name || ''}
                    </span>
                    <span className="mt-0.5 block truncate text-slate-600 dark:text-gray-300">{t.email}</span>
                    <span
                      className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                        t.is_active
                          ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100'
                          : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {t.is_active ? 'Etkin' : 'Pasif'}
                    </span>
                  </div>
                  <KidsSecondaryButton
                    type="button"
                    disabled={toggleId === t.id}
                    onClick={() => void onToggleActive(t)}
                    className="shrink-0 border-amber-200 text-amber-900 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-100 dark:hover:bg-amber-950/50"
                  >
                    {toggleId === t.id
                      ? '…'
                      : t.is_active
                        ? 'Pasifleştir'
                        : 'Etkinleştir'}
                  </KidsSecondaryButton>
                </li>
              ))}
            </ul>
          )}
        </KidsCard>
      </div>

      <div className="mt-10 space-y-6">
        <h2 className="font-logo text-xl font-bold text-slate-900 dark:text-white">Okullar ve öğrenci limiti</h2>
        <p className="text-sm text-slate-600 dark:text-gray-400">
          Demo ve satış okullarında tek kontrol kalemi öğrenci limitidir. Limit dolduğunda yeni öğrenci kaydı açılmaz.
        </p>

        <KidsCard tone="emerald">
          <h3 className="font-logo text-lg font-bold text-emerald-950 dark:text-emerald-50">Yeni okul</h3>
          <p className="mt-1 text-sm text-emerald-900/80 dark:text-emerald-100/80">
            İl ve ilçe seçip MEB listesinden okulu bul. Listede yoksa &quot;Okul ekle&quot; ile manuel kayıt oluştur.
          </p>

          {mebProvincesReady && mebProvinces.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
              Veritabanında MEB okul listesi yok. Sunucuda{' '}
              <code className="rounded bg-amber-100/80 px-1 font-mono text-xs dark:bg-amber-900/40">
                python manage.py sync_meb_schools
              </code>{' '}
              çalıştırılmalı.
            </p>
          ) : null}

          <div className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <KidsFormField id={mebIlId} label="İl">
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
              <KidsFormField id={mebIlceId} label="İlçe">
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
              <KidsFormField id={mebSchoolPickId} label="Okul (MEB listesi)">
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
                  Seçilen okul
                </p>
                <p className="mt-1 text-sm text-emerald-950 dark:text-emerald-50">
                  {[pickDistrict, pickProvince].filter(Boolean).join(' · ') || '—'}
                </p>
                <div className="mt-3">
                  <KidsFormField
                    id={pickNameId}
                    label="Okul adı"
                    required
                    hint="Gerekirse kısalt veya düzelt; kayıtta bu metin kullanılır."
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
                  <KidsFormField id="ns-stage" label="Okul tipi" required>
                    <KidsSelect
                      id="ns-stage"
                      value={nsStage}
                      onChange={(v) => setNsStage((v === 'sales' ? 'sales' : 'demo'))}
                      options={[
                        { value: 'demo', label: 'Demo' },
                        { value: 'sales', label: 'Satış' },
                      ]}
                      searchable={false}
                    />
                  </KidsFormField>
                  <KidsFormField id="ns-cap" label="Öğrenci limiti" required>
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
                    <KidsFormField id="ns-demo-start" label="Demo başlangıç tarihi">
                      <input
                        id="ns-demo-start"
                        type="date"
                        value={nsDemoStartAt}
                        onChange={(e) => setNsDemoStartAt(e.target.value)}
                        className={kidsInputClass}
                      />
                    </KidsFormField>
                    <KidsFormField id="ns-demo-end" label="Demo bitiş tarihi">
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
                    <KidsFormField id="ns-year" label="Eğitim-öğretim yılı (örn. 2025-2026)" required>
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
                  {schoolSaving ? 'Kaydediliyor…' : 'Okulu oluştur'}
                </KidsPrimaryButton>
              </div>
            ) : null}

            {mebIl && mebIlce && !mebSchoolsLoading && mebSchools.length === 0 ? (
              <p className="rounded-2xl border border-violet-200/60 bg-violet-50/50 px-4 py-3 text-sm text-violet-900 dark:border-violet-900/40 dark:bg-violet-950/25 dark:text-violet-100">
                Bu ilçe için MEB listesinde kayıt yok. Aşağıdaki düğmeyle elle okul ekleyebilirsiniz.
              </p>
            ) : null}

            <div className="border-t border-emerald-200/60 pt-4 dark:border-emerald-800/40">
              <KidsSecondaryButton type="button" className="w-full sm:w-auto" onClick={openAddSchoolModal}>
                Okul ekle (listede yok)
              </KidsSecondaryButton>
              <p className="mt-2 text-xs text-emerald-800/70 dark:text-emerald-200/70">
                İl ve ilçe yine MEB listesinden seçilir; sadece okul adını siz yazarsınız.
              </p>
            </div>
          </div>
        </KidsCard>

        <div className="flex items-center justify-between gap-2">
          <h3 className="font-logo text-lg font-bold text-slate-900 dark:text-white">Kayıtlı okullar</h3>
          <KidsSecondaryButton type="button" onClick={() => void loadSchools()} disabled={schoolsLoading}>
            {schoolsLoading ? 'Yenileniyor…' : 'Okul listesini yenile'}
          </KidsSecondaryButton>
        </div>

        {schools.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-gray-400">Henüz okul yok.</p>
        ) : (
          <ul className="space-y-2">
            {schools.map((s) => {
              const isOpen = expandedSchoolId === s.id;
              const stageLabel = s.lifecycle_stage === 'sales' ? 'SATIŞ' : 'DEMO';
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
                          <span className="hidden sm:inline" title="Eğitim-öğretim yılı">{academicYearLine}</span>
                        ) : null}
                        <span title="Öğretmen">{s.teachers.length} öğrt</span>
                        <span className="hidden sm:inline" title="Kullanılan / Limit">{capUsed} / {capTotal} limit</span>
                      </span>
                    </button>

                    {isOpen ? (
                      <div className="border-t border-slate-200/60 px-5 pb-5 pt-4 dark:border-slate-700/60">
                        <div className="mb-4 flex items-center justify-between">
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Okul #{s.id} · Limit: {capUsed}/{capTotal}
                            {academicYearLine ? ` · Eğitim yılı: ${academicYearLine}` : ""}
                            {s.lifecycle_stage === 'demo' && s.demo_start_at && s.demo_end_at
                              ? ` · Demo: ${s.demo_start_at} → ${s.demo_end_at}${s.demo_is_active ? '' : ' (pasif)'}`
                              : ''}
                          </p>
                          <div className="flex items-center gap-2">
                            {editSchoolId !== s.id ? (
                              <KidsSecondaryButton type="button" onClick={() => startEditSchool(s)}>
                                Düzenle
                              </KidsSecondaryButton>
                            ) : (
                              <KidsSecondaryButton type="button" onClick={cancelEditSchool}>
                                Düzenlemeyi kapat
                              </KidsSecondaryButton>
                            )}
                            <button
                              type="button"
                              onClick={() => void onDeleteSchool(s.id)}
                              className="rounded-full border-2 border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
                            >
                              Okulu sil
                            </button>
                          </div>
                        </div>

                        {editSchoolId === s.id ? (
                          <div className="mb-4 rounded-xl border border-violet-200/80 bg-violet-50/40 p-3 dark:border-violet-900/50 dark:bg-violet-950/20">
                            <p className="mb-3 text-sm font-semibold text-violet-900 dark:text-violet-100">Okul ayarları</p>
                            <div className="grid gap-3 md:grid-cols-2">
                              <KidsFormField id={`edit-stage-${s.id}`} label="Okul tipi" required>
                                <KidsSelect
                                  id={`edit-stage-${s.id}`}
                                  value={editStage}
                                  onChange={(v) => setEditStage(v === 'sales' ? 'sales' : 'demo')}
                                  options={[
                                    { value: 'demo', label: 'Demo' },
                                    { value: 'sales', label: 'Satış' },
                                  ]}
                                  searchable={false}
                                />
                              </KidsFormField>
                              <KidsFormField id={`edit-cap-${s.id}`} label="Öğrenci limiti" required>
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
                                <KidsFormField id={`edit-demo-start-${s.id}`} label="Demo başlangıç">
                                  <input
                                    id={`edit-demo-start-${s.id}`}
                                    type="date"
                                    value={editDemoStartAt}
                                    onChange={(e) => setEditDemoStartAt(e.target.value)}
                                    className={kidsInputClass}
                                  />
                                </KidsFormField>
                                <KidsFormField id={`edit-demo-end-${s.id}`} label="Demo bitiş">
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
                                <KidsFormField id={`edit-sales-year-${s.id}`} label="Eğitim-öğretim yılı" required>
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
                                {schoolEditSavingId === s.id ? 'Kaydediliyor…' : 'Ayarları kaydet'}
                              </KidsPrimaryButton>
                              <p className="text-xs text-violet-700/80 dark:text-violet-200/80">
                                Demo → Satış dönüşümü buradan yapılabilir.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
                            Bu okulda kayıtlar tek kalem olan öğrenci limitine göre yönetilir.
                          </p>
                        )}

                        <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-700">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Bu okuldaki öğretmenler</p>
                          <ul className="mt-2 space-y-2">
                            {s.teachers.length === 0 ? (
                              <li className="text-sm text-slate-500">Henüz atanmış öğretmen yok.</li>
                            ) : (
                              s.teachers.map((t) => (
                                <li
                                  key={t.id}
                                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-900/50"
                                >
                                  <span>
                                    {t.first_name} {t.last_name} · {t.email}
                                  </span>
                                  <button
                                    type="button"
                                    className="text-xs font-bold text-amber-700 hover:underline dark:text-amber-300"
                                    onClick={() => void onRemoveTeacher(s.id, t.id)}
                                  >
                                    Çıkar
                                  </button>
                                </li>
                              ))
                            )}
                          </ul>
                          <div className="mt-3 flex flex-wrap items-end gap-2">
                            <div className="min-w-[220px] flex-1">
                              <KidsFormField id={`assign-${s.id}`} label="Öğretmen ata">
                                <KidsSelect
                                  id={`assign-${s.id}`}
                                  value={assignTeacherId[s.id] ?? ''}
                                  onChange={(v) => setAssignTeacherId((prev) => ({ ...prev, [s.id]: v }))}
                                  options={teacherAssignOptions(s)}
                                />
                              </KidsFormField>
                            </div>
                            <KidsPrimaryButton type="button" onClick={() => void onAssignTeacher(s.id)}>
                              Ata
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
              Okul ekle
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-gray-400">
              Okul MEB listesinde yoksa buradan yalnızca il, ilçe ve okul adını ekleyin. Ardından üstteki MEB listesinden
              seçip öğrenci limiti ile okul kaydını oluşturun.
            </p>
            <form className="mt-6 space-y-4" onSubmit={onModalCreate}>
              <KidsFormField id={modalIlId} label="İl">
                <KidsSelect
                  id={modalIlId}
                  value={modalMebIl}
                  onChange={(v) => { setModalMebIl(v); setModalMebIlce(''); }}
                  options={modalProvinceOptions}
                />
              </KidsFormField>
              <KidsFormField id={modalIlceId} label="İlçe">
                <KidsSelect
                  id={modalIlceId}
                  value={modalMebIlce}
                  onChange={setModalMebIlce}
                  options={modalDistrictOptions}
                  disabled={!modalMebIl}
                />
              </KidsFormField>
              <KidsFormField id={modalNameId} label="Okul adı" required>
                <input
                  id={modalNameId}
                  required
                  maxLength={200}
                  value={modalName}
                  onChange={(e) => setModalName(e.target.value)}
                  className={kidsInputClass}
                  placeholder="Resmî veya kullandığınız kısa ad"
                  autoComplete="organization"
                />
              </KidsFormField>
              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <KidsSecondaryButton type="button" onClick={closeAddSchoolModal} disabled={modalCreating}>
                  İptal
                </KidsSecondaryButton>
                <KidsPrimaryButton
                  type="submit"
                  disabled={modalCreating || !modalName.trim() || !modalMebIl.trim() || !modalMebIlce.trim()}
                >
                  {modalCreating ? 'Ekleniyor…' : 'MEB listesine ekle'}
                </KidsPrimaryButton>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </KidsPanelMax>
  );
}
