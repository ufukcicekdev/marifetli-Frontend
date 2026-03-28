'use client';

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import {
  kidsCreateSchool,
  kidsDeleteSchool,
  kidsListSchools,
  kidsMebDistricts,
  kidsMebProvinces,
  kidsMebSchoolsPick,
  kidsPatchSchool,
  kidsSchoolLocationLine,
  type KidsSchool,
  type MebSchoolPick,
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
  type KidsSelectOption,
} from '@/src/components/kids/kids-ui';

export default function KidsTeacherSchoolsPage() {
  const router = useRouter();
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();
  const [schools, setSchools] = useState<KidsSchool[]>([]);
  const [loading, setLoading] = useState(true);

  /** MEB’den seçim sonrası kayıt (mahalle gönderilmez). */
  const [pickName, setPickName] = useState('');
  const [pickProvince, setPickProvince] = useState('');
  const [pickDistrict, setPickDistrict] = useState('');
  const [savingPick, setSavingPick] = useState(false);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [modalMebIl, setModalMebIl] = useState('');
  const [modalMebIlce, setModalMebIlce] = useState('');
  const [modalDistricts, setModalDistricts] = useState<string[]>([]);
  const [modalName, setModalName] = useState('');
  const [modalCreating, setModalCreating] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editProvince, setEditProvince] = useState('');
  const [editDistrict, setEditDistrict] = useState('');
  const [editNeighborhood, setEditNeighborhood] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [mebProvinces, setMebProvinces] = useState<string[]>([]);
  const [mebProvincesReady, setMebProvincesReady] = useState(false);
  const [mebDistricts, setMebDistricts] = useState<string[]>([]);
  const [mebSchools, setMebSchools] = useState<MebSchoolPick[]>([]);
  const [mebIl, setMebIl] = useState('');
  const [mebIlce, setMebIlce] = useState('');
  const [mebSchoolYol, setMebSchoolYol] = useState('');
  const [mebSchoolsLoading, setMebSchoolsLoading] = useState(false);

  const pickNameId = useId();
  const mebIlId = useId();
  const mebIlceId = useId();
  const mebSchoolId = useId();
  const modalTitleId = useId();
  const modalIlId = useId();
  const modalIlceId = useId();
  const modalNameId = useId();

  const load = useCallback(async () => {
    try {
      const list = await kidsListSchools();
      setSchools([...list].sort((a, b) => a.name.localeCompare(b.name, 'tr')));
    } catch {
      toast.error('Okullar yüklenemedi');
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
    router.replace(`${pathPrefix}/ogretmen/panel`);
  }, [authLoading, user, router, pathPrefix, load]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) return;
    let cancelled = false;
    (async () => {
      try {
        const p = await kidsMebProvinces();
        if (!cancelled) setMebProvinces(p);
      } catch {
        if (!cancelled) toast.error('MEB il listesi yüklenemedi');
      } finally {
        if (!cancelled) setMebProvincesReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  useEffect(() => {
    if (!mebIl) {
      setMebDistricts([]);
      setMebIlce('');
      setMebSchools([]);
      setMebSchoolYol('');
      setPickName('');
      setPickProvince('');
      setPickDistrict('');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const d = await kidsMebDistricts(mebIl);
        if (!cancelled) setMebDistricts(d);
      } catch {
        if (!cancelled) {
          setMebDistricts([]);
          toast.error('İlçeler yüklenemedi');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mebIl]);

  useEffect(() => {
    if (!mebIl || !mebIlce) {
      setMebSchools([]);
      return;
    }
    let cancelled = false;
    setMebSchoolsLoading(true);
    setMebSchools([]);
    (async () => {
      try {
        const list = await kidsMebSchoolsPick(mebIl, mebIlce, undefined, 150);
        if (!cancelled) setMebSchools(list);
      } catch {
        if (!cancelled) {
          setMebSchools([]);
          toast.error('Okul listesi yüklenemedi');
        }
      } finally {
        if (!cancelled) setMebSchoolsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mebIl, mebIlce]);

  useEffect(() => {
    if (!mebSchoolYol || mebSchoolsLoading) return;
    if (!mebSchools.some((s) => s.yol === mebSchoolYol)) {
      setMebSchoolYol('');
    }
  }, [mebSchoolYol, mebSchools, mebSchoolsLoading]);

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
        if (!cancelled) {
          setModalDistricts([]);
          toast.error('İlçeler yüklenemedi');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [addModalOpen, modalMebIl]);

  useEffect(() => {
    if (!addModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAddModalOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [addModalOpen]);

  function resetMebPickForm() {
    setMebIl('');
    setMebIlce('');
    setMebSchoolYol('');
    setMebSchools([]);
    setPickName('');
    setPickProvince('');
    setPickDistrict('');
  }

  function onMebSchoolPick(yol: string) {
    setMebSchoolYol(yol);
    if (!yol) {
      setPickName('');
      setPickProvince('');
      setPickDistrict('');
      return;
    }
    const row = mebSchools.find((x) => x.yol === yol);
    if (!row) return;
    setPickName(row.name.slice(0, 200));
    setPickProvince((row.province || '').slice(0, 100));
    setPickDistrict((row.district || '').slice(0, 100));
  }

  function openAddSchoolModal() {
    setModalMebIl(mebIl);
    setModalMebIlce(mebIlce);
    setModalName('');
    setAddModalOpen(true);
  }

  function closeAddSchoolModal() {
    setAddModalOpen(false);
    setModalMebIl('');
    setModalMebIlce('');
    setModalDistricts([]);
    setModalName('');
  }

  const provinceOptions = useMemo<KidsSelectOption[]>(
    () => [{ value: '', label: 'İl seçin' }, ...mebProvinces.map((p) => ({ value: p, label: p }))],
    [mebProvinces],
  );

  const districtOptions = useMemo<KidsSelectOption[]>(() => {
    if (!mebIl) return [{ value: '', label: 'Önce il seçin' }];
    return [{ value: '', label: 'İlçe seçin' }, ...mebDistricts.map((d) => ({ value: d, label: d }))];
  }, [mebIl, mebDistricts]);

  const schoolOptions = useMemo<KidsSelectOption[]>(() => {
    if (!mebIl || !mebIlce) {
      return [{ value: '', label: 'Önce il ve ilçe seç' }];
    }
    if (mebSchoolsLoading) {
      return [{ value: '', label: 'Okullar yükleniyor…' }];
    }
    if (mebSchools.length === 0) {
      return [{ value: '', label: 'Bu ilçede kayıt yok' }];
    }
    return [{ value: '', label: 'Okul seçin' }, ...mebSchools.map((s) => ({ value: s.yol, label: s.name }))];
  }, [mebIl, mebIlce, mebSchools, mebSchoolsLoading]);

  const modalProvinceOptions = useMemo<KidsSelectOption[]>(
    () => [{ value: '', label: 'İl seçin' }, ...mebProvinces.map((p) => ({ value: p, label: p }))],
    [mebProvinces],
  );

  const modalDistrictOptions = useMemo<KidsSelectOption[]>(() => {
    if (!modalMebIl) return [{ value: '', label: 'Önce il seçin' }];
    return [{ value: '', label: 'İlçe seçin' }, ...modalDistricts.map((d) => ({ value: d, label: d }))];
  }, [modalMebIl, modalDistricts]);

  async function onSavePickedSchool() {
    if (!pickName.trim() || !pickProvince.trim() || !pickDistrict.trim()) return;
    setSavingPick(true);
    try {
      const s = await kidsCreateSchool({
        name: pickName.trim(),
        province: pickProvince.trim(),
        district: pickDistrict.trim(),
        neighborhood: '',
      });
      setSchools((prev) => [...prev, s].sort((a, b) => a.name.localeCompare(b.name, 'tr')));
      resetMebPickForm();
      toast.success('Okul kaydedildi — sınıf açarken listeden seçebilirsin.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kaydedilemedi');
    } finally {
      setSavingPick(false);
    }
  }

  async function onModalCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!modalName.trim() || !modalMebIl.trim() || !modalMebIlce.trim()) return;
    setModalCreating(true);
    try {
      const s = await kidsCreateSchool({
        name: modalName.trim(),
        province: modalMebIl.trim(),
        district: modalMebIlce.trim(),
        neighborhood: '',
      });
      setSchools((prev) => [...prev, s].sort((a, b) => a.name.localeCompare(b.name, 'tr')));
      closeAddSchoolModal();
      toast.success('Okul kaydedildi — sınıf açarken listeden seçebilirsin.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kaydedilemedi');
    } finally {
      setModalCreating(false);
    }
  }

  function startEdit(s: KidsSchool) {
    setEditingId(s.id);
    setEditName(s.name);
    setEditProvince(s.province || '');
    setEditDistrict(s.district || '');
    setEditNeighborhood(s.neighborhood || '');
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function onSaveEdit(e: React.FormEvent, id: number) {
    e.preventDefault();
    setSavingId(id);
    try {
      const updated = await kidsPatchSchool(id, {
        name: editName.trim(),
        province: editProvince.trim(),
        district: editDistrict.trim(),
        neighborhood: editNeighborhood.trim(),
      });
      setSchools((prev) =>
        prev.map((x) => (x.id === id ? updated : x)).sort((a, b) => a.name.localeCompare(b.name, 'tr')),
      );
      setEditingId(null);
      toast.success('Okul güncellendi');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Güncellenemedi');
    } finally {
      setSavingId(null);
    }
  }

  async function onDelete(id: number) {
    if (!confirm('Bu okulu silmek istediğine emin misin? Bağlı sınıf varsa silinemez.')) return;
    setDeletingId(id);
    try {
      await kidsDeleteSchool(id);
      setSchools((prev) => prev.filter((x) => x.id !== id));
      if (editingId === id) setEditingId(null);
      toast.success('Okul silindi');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Silinemedi');
    } finally {
      setDeletingId(null);
    }
  }

  const canSavePick = Boolean(
    mebSchoolYol && pickName.trim() && pickProvince.trim() && pickDistrict.trim(),
  );

  if (authLoading || !user) {
    return (
      <KidsPanelMax>
        <p className="text-center text-violet-800 dark:text-violet-200">Yükleniyor…</p>
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

  const isTeacherOnly = user.role === 'teacher';

  return (
    <KidsPanelMax>
      <div className="mb-6">
        <Link
          href={`${pathPrefix}/ogretmen/panel`}
          className="inline-flex items-center gap-2 text-sm font-bold text-violet-700 hover:text-fuchsia-600 dark:text-violet-300 dark:hover:text-fuchsia-400"
        >
          <span aria-hidden>←</span> Öğretmen paneli
        </Link>
      </div>

      <KidsPageHeader
        emoji="🏫"
        title="Okullarım"
        subtitle={
          isTeacherOnly
            ? 'Okullar yönetim tarafından tanımlanır ve size atanır. Aşağıda atandığınız okulları görebilir, gerekirse ad ve adres bilgisini düzenleyebilirsiniz; yeni okul eklemek için yönetimle iletişime geçin.'
            : 'MEB dizininden okulunu seçip kaydet; listede yoksa okul ekle ile elle ekleyebilirsin. İl ve ilçe her iki yolda da sistemdeki MEB verisiyle aynı kalır.'
        }
      />

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <KidsCard tone="sky" className="lg:sticky lg:top-28">
            <h2 className="font-logo text-xl font-bold text-sky-950 dark:text-sky-50">
              {isTeacherOnly ? 'Okul ataması' : 'Okul ekle'}
            </h2>
            {isTeacherOnly ? (
              <div className="mt-4 rounded-2xl border border-sky-200/80 bg-white/70 p-4 text-sm text-sky-900 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-100">
                <p>
                  Yeni okul kaydı ve kota yönetimi yalnızca <strong>Yönetim</strong> panelinden yapılır. Size atanmış
                  okullar sağdaki listede görünür.
                </p>
              </div>
            ) : null}
            <div className="mt-4 space-y-4 text-sm text-sky-900/80 dark:text-sky-100/80">
              {!isTeacherOnly ? (
                <>
              <p>
                Önce il ve ilçeyi seç, listeden okulunu bul. Bulamazsan{' '}
                <span className="font-semibold text-sky-950 dark:text-sky-50">Okul ekle</span> ile modalda
                kayıt oluştur.
              </p>
              {mebProvincesReady && mebProvinces.length === 0 ? (
                <p className="rounded-2xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                  Veritabanında MEB okul listesi yok. Sunucuda{' '}
                  <code className="rounded bg-amber-100/80 px-1 font-mono text-xs dark:bg-amber-900/40">
                    python manage.py sync_meb_schools
                  </code>{' '}
                  çalıştırılmalı.
                </p>
              ) : null}
              <KidsFormField id={mebIlId} label="İl">
                <KidsSelect
                  id={mebIlId}
                  value={mebIl}
                  onChange={(v) => {
                    setMebIl(v);
                    setMebIlce('');
                    setMebSchoolYol('');
                    setMebSchools([]);
                    setPickName('');
                    setPickProvince('');
                    setPickDistrict('');
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
                    setPickName('');
                    setPickProvince('');
                    setPickDistrict('');
                  }}
                  options={districtOptions}
                  disabled={!mebIl}
                />
              </KidsFormField>
              <KidsFormField
                id={mebSchoolId}
                label="Okul (MEB listesi)"
                hint="Listeyi açınca üstte arama kutusuyla daraltabilirsin."
              >
                <KidsSelect
                  id={mebSchoolId}
                  value={mebSchoolYol}
                  onChange={onMebSchoolPick}
                  options={schoolOptions}
                  disabled={!mebIl || !mebIlce || mebSchoolsLoading || mebSchools.length === 0}
                />
              </KidsFormField>

              {mebSchoolYol ? (
                <div className="rounded-2xl border border-sky-200/80 bg-white/60 p-4 dark:border-sky-800/50 dark:bg-sky-950/20">
                  <p className="text-xs font-bold uppercase tracking-wide text-sky-700 dark:text-sky-300">
                    Seçilen kayıt
                  </p>
                  <p className="mt-1 text-sm text-sky-950 dark:text-sky-50">
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
                  <KidsPrimaryButton
                    type="button"
                    className="mt-4"
                    disabled={!canSavePick || savingPick}
                    onClick={() => void onSavePickedSchool()}
                  >
                    {savingPick ? 'Kaydediliyor…' : 'Okulu kaydet'}
                  </KidsPrimaryButton>
                </div>
              ) : null}

              {mebIl && mebIlce && !mebSchoolsLoading && mebSchools.length === 0 ? (
                <p className="rounded-2xl border border-violet-200/60 bg-violet-50/50 px-4 py-3 text-violet-900 dark:border-violet-900/40 dark:bg-violet-950/25 dark:text-violet-100">
                  Bu ilçe için MEB listesinde kayıt yok. Okulunu aşağıdaki düğmeyle ekleyebilirsin.
                </p>
              ) : null}

              <div className="border-t border-sky-200/60 pt-4 dark:border-sky-800/40">
                <KidsSecondaryButton type="button" className="w-full sm:w-auto" onClick={openAddSchoolModal}>
                  Okul ekle (listede yok)
                </KidsSecondaryButton>
                <p className="mt-2 text-xs text-sky-800/70 dark:text-sky-200/70">
                  İl ve ilçe yine veritabanındaki MEB listesinden seçilir; sadece okul adını sen yazarsın.
                </p>
              </div>
                </>
              ) : null}
            </div>
          </KidsCard>
        </div>

        <div className="lg:col-span-7">
          <h2 className="mb-4 font-logo text-xl font-bold text-slate-900 dark:text-white">Kayıtlı okullar</h2>
          {loading ? (
            <KidsCard>
              <p className="text-center text-violet-700 dark:text-violet-300">Yükleniyor…</p>
            </KidsCard>
          ) : schools.length === 0 ? (
            <KidsEmptyState
              emoji="📍"
              title="Henüz okul yok"
              description={
                isTeacherOnly
                  ? 'Size atanmış okul görünmüyorsa yönetimle iletişime geçin.'
                  : 'Soldan MEB’den seç veya Okul ekle ile kayıt oluştur; ardından sınıf açarken bu okulu seç.'
              }
            />
          ) : (
            <ul className="space-y-3">
              {schools.map((s) => (
                <li key={s.id}>
                  <KidsCard className="!p-5">
                    {editingId === s.id ? (
                      <form className="space-y-4" onSubmit={(e) => onSaveEdit(e, s.id)}>
                        <KidsFormField id={`edit-school-${s.id}-name`} label="Okul adı" required>
                          <input
                            id={`edit-school-${s.id}-name`}
                            required
                            maxLength={200}
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className={kidsInputClass}
                          />
                        </KidsFormField>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <KidsFormField id={`edit-school-${s.id}-province`} label="İl">
                            <input
                              id={`edit-school-${s.id}-province`}
                              maxLength={100}
                              value={editProvince}
                              onChange={(e) => setEditProvince(e.target.value)}
                              className={kidsInputClass}
                            />
                          </KidsFormField>
                          <KidsFormField id={`edit-school-${s.id}-district`} label="İlçe">
                            <input
                              id={`edit-school-${s.id}-district`}
                              maxLength={100}
                              value={editDistrict}
                              onChange={(e) => setEditDistrict(e.target.value)}
                              className={kidsInputClass}
                            />
                          </KidsFormField>
                        </div>
                        <KidsFormField id={`edit-school-${s.id}-neighborhood`} label="Mahalle">
                          <input
                            id={`edit-school-${s.id}-neighborhood`}
                            maxLength={150}
                            value={editNeighborhood}
                            onChange={(e) => setEditNeighborhood(e.target.value)}
                            className={kidsInputClass}
                          />
                        </KidsFormField>
                        <div className="flex flex-wrap gap-2">
                          <KidsPrimaryButton type="submit" disabled={savingId === s.id}>
                            {savingId === s.id ? 'Kaydediliyor…' : 'Kaydet'}
                          </KidsPrimaryButton>
                          <KidsSecondaryButton type="button" onClick={cancelEdit}>
                            Vazgeç
                          </KidsSecondaryButton>
                        </div>
                      </form>
                    ) : (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="font-logo text-lg font-bold text-slate-900 dark:text-white">{s.name}</p>
                          {kidsSchoolLocationLine(s) ? (
                            <p className="mt-1 text-sm text-slate-600 dark:text-gray-400">
                              {kidsSchoolLocationLine(s)}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <KidsSecondaryButton type="button" onClick={() => startEdit(s)}>
                            Düzenle
                          </KidsSecondaryButton>
                          {!isTeacherOnly ? (
                            <button
                              type="button"
                              onClick={() => onDelete(s.id)}
                              disabled={deletingId === s.id}
                              className="inline-flex min-h-10 items-center justify-center rounded-full border-2 border-red-200 px-4 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
                            >
                              {deletingId === s.id ? '…' : 'Sil'}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </KidsCard>
                </li>
              ))}
            </ul>
          )}
        </div>
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
            <h2
              id={modalTitleId}
              className="font-logo text-xl font-bold text-slate-900 dark:text-white"
            >
              Okul ekle
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-gray-400">
              Okul MEB listesinde yoksa buradan ekleyebilirsin. İl ve ilçe sistemdeki MEB verisinden seçilir.
            </p>
            <form className="mt-6 space-y-4" onSubmit={onModalCreate}>
              <KidsFormField id={modalIlId} label="İl">
                <KidsSelect
                  id={modalIlId}
                  value={modalMebIl}
                  onChange={(v) => {
                    setModalMebIl(v);
                    setModalMebIlce('');
                  }}
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
                  placeholder="Resmî veya kullandığın kısa ad"
                  autoComplete="organization"
                />
              </KidsFormField>
              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <KidsSecondaryButton type="button" onClick={closeAddSchoolModal} disabled={modalCreating}>
                  İptal
                </KidsSecondaryButton>
                <KidsPrimaryButton
                  type="submit"
                  disabled={
                    modalCreating || !modalName.trim() || !modalMebIl.trim() || !modalMebIlce.trim()
                  }
                >
                  {modalCreating ? 'Kaydediliyor…' : 'Kaydet'}
                </KidsPrimaryButton>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </KidsPanelMax>
  );
}
