'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import {
  kidsCreateSchool,
  kidsDeleteSchool,
  kidsListSchools,
  kidsPatchSchool,
  kidsSchoolLocationLine,
  type KidsSchool,
} from '@/src/lib/kids-api';
import {
  KidsCard,
  KidsEmptyState,
  KidsFormField,
  KidsPageHeader,
  KidsPanelMax,
  KidsPrimaryButton,
  KidsSecondaryButton,
  kidsInputClass,
} from '@/src/components/kids/kids-ui';

export default function KidsTeacherSchoolsPage() {
  const router = useRouter();
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();
  const [schools, setSchools] = useState<KidsSchool[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editProvince, setEditProvince] = useState('');
  const [editDistrict, setEditDistrict] = useState('');
  const [editNeighborhood, setEditNeighborhood] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const nId = useId();
  const pId = useId();
  const dId = useId();
  const mId = useId();

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
      router.replace(`${pathPrefix}/giris`);
      return;
    }
    load();
  }, [authLoading, user, router, pathPrefix, load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const s = await kidsCreateSchool({
        name: name.trim(),
        province: province.trim(),
        district: district.trim(),
        neighborhood: neighborhood.trim(),
      });
      setSchools((prev) => [...prev, s].sort((a, b) => a.name.localeCompare(b.name, 'tr')));
      setName('');
      setProvince('');
      setDistrict('');
      setNeighborhood('');
      toast.success('Okul kaydedildi — sınıf açarken listeden seçebilirsin.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kaydedilemedi');
    } finally {
      setCreating(false);
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
        subtitle="Önce okulunu tanımla; sınıf oluştururken buradaki kayıtlardan birini seçersin. Birden fazla kurumda ders veriyorsan her biri için ayrı kayıt aç."
      />

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <KidsCard tone="sky" className="lg:sticky lg:top-28">
            <h2 className="font-logo text-xl font-bold text-sky-950 dark:text-sky-50">Yeni okul ekle</h2>
            <form className="mt-6 space-y-4" onSubmit={onCreate}>
              <KidsFormField id={nId} label="Okul adı" required hint="Resmî veya tanınan kısa ad.">
                <input
                  id={nId}
                  required
                  maxLength={200}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={kidsInputClass}
                  placeholder="Örn. … İlkokulu"
                />
              </KidsFormField>
              <div className="grid gap-4 sm:grid-cols-2">
                <KidsFormField id={pId} label="İl">
                  <input
                    id={pId}
                    maxLength={100}
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    className={kidsInputClass}
                  />
                </KidsFormField>
                <KidsFormField id={dId} label="İlçe">
                  <input
                    id={dId}
                    maxLength={100}
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className={kidsInputClass}
                  />
                </KidsFormField>
              </div>
              <KidsFormField id={mId} label="Mahalle">
                <input
                  id={mId}
                  maxLength={150}
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  className={kidsInputClass}
                />
              </KidsFormField>
              <KidsPrimaryButton type="submit" disabled={creating}>
                {creating ? 'Kaydediliyor…' : 'Okulu kaydet'}
              </KidsPrimaryButton>
            </form>
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
              description="Soldan ilk okulunu ekle; ardından öğretmen panelinden sınıf açarken bu okulu seç."
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
                          <button
                            type="button"
                            onClick={() => onDelete(s.id)}
                            disabled={deletingId === s.id}
                            className="inline-flex min-h-10 items-center justify-center rounded-full border-2 border-red-200 px-4 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
                          >
                            {deletingId === s.id ? '…' : 'Sil'}
                          </button>
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
    </KidsPanelMax>
  );
}
