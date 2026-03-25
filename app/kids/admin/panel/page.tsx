'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import {
  kidsAdminCreateTeacher,
  kidsAdminPatchTeacher,
  kidsAdminTeachersList,
  type KidsAdminTeacher,
} from '@/src/lib/kids-api';
import {
  KidsCard,
  KidsFormField,
  KidsPanelMax,
  KidsPrimaryButton,
  KidsSecondaryButton,
  kidsInputClass,
} from '@/src/components/kids/kids-ui';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';

export default function KidsAdminPanelPage() {
  const router = useRouter();
  const { user, loading, pathPrefix } = useKidsAuth();
  const [teachers, setTeachers] = useState<KidsAdminTeacher[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [toggleId, setToggleId] = useState<number | null>(null);

  async function load() {
    setListLoading(true);
    try {
      setTeachers(await kidsAdminTeachersList());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Liste alınamadı');
    } finally {
      setListLoading(false);
    }
  }

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
  }, [user, loading, pathPrefix, router]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await kidsAdminCreateTeacher({
        email: email.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
      setTeachers((prev) => [res.teacher, ...prev]);
      setEmail('');
      setFirstName('');
      setLastName('');
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
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Öğretmen oluşturulamadı');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user || user.role !== 'admin') {
    return (
      <KidsPanelMax>
        <p className="text-center text-violet-800 dark:text-violet-200">Yükleniyor…</p>
      </KidsPanelMax>
    );
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

  return (
    <KidsPanelMax>
      <h1 className="font-logo text-2xl font-bold text-slate-900 dark:text-white">Yönetim — öğretmenler</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-gray-400">
        Kids tarafında ders ve sınıf işlerini yalnızca buradan açtığınız öğretmen hesapları yürütür. Yeni öğretmene
        otomatik geçici şifre gönderilir; pasif öğretmen Kids’e giriş yapamaz.
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
          <KidsSecondaryButton type="button" onClick={() => void load()} disabled={listLoading}>
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
    </KidsPanelMax>
  );
}
