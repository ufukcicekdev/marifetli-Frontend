'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import { kidsPatchMe, kidsUploadProfilePhoto } from '@/src/lib/kids-api';
import {
  KidsCard,
  KidsFormField,
  KidsPageHeader,
  KidsPanelMax,
  KidsPrimaryButton,
  kidsInputClass,
} from '@/src/components/kids/kids-ui';

export default function KidsProfilPage() {
  const router = useRouter();
  const { user, loading: authLoading, pathPrefix, refreshUser } = useKidsAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fnId = useId();
  const lnId = useId();

  useEffect(() => {
    if (!user) return;
    setFirstName(user.first_name || '');
    setLastName(user.last_name || '');
  }, [user]);

  useEffect(() => {
    return () => {
      if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const onPickPhoto = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      e.target.value = '';
      if (!f) return;
      if (!f.type.match(/^image\/(jpeg|png|webp)$/i)) {
        toast.error('JPEG, PNG veya WebP seçin.');
        return;
      }
      if (f.size > 2 * 1024 * 1024) {
        toast.error('Dosya en fazla 2 MB olabilir.');
        return;
      }
      if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
      setPreview(URL.createObjectURL(f));
      setUploading(true);
      (async () => {
        try {
          await kidsUploadProfilePhoto(f);
          await refreshUser();
          setPreview(null);
          toast.success('Profil fotoğrafı güncellendi.');
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Yüklenemedi');
          setPreview(null);
        } finally {
          setUploading(false);
        }
      })();
    },
    [preview, refreshUser],
  );

  async function onSaveNames(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await kidsPatchMe({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
      await refreshUser();
      toast.success('Bilgilerin kaydedildi.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kaydedilemedi');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(`${pathPrefix}/giris`);
    }
  }, [authLoading, user, router, pathPrefix]);

  if (authLoading || !user) {
    return (
      <KidsPanelMax>
        <p className="text-center text-violet-800 dark:text-violet-200">Yükleniyor…</p>
      </KidsPanelMax>
    );
  }

  const displayPic = preview || user.profile_picture || null;
  const initial = (user.first_name || user.email || '?').charAt(0).toUpperCase();

  return (
    <KidsPanelMax>
      <KidsPageHeader
        emoji="👤"
        title="Profilim"
        subtitle="Adını ve soyadını güncelleyebilir; profil fotoğrafı ekleyebilirsin."
      />

      <div className="mx-auto max-w-lg space-y-8">
        <KidsCard className="space-y-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full bg-violet-100 ring-2 ring-violet-200 dark:bg-violet-950/50 dark:ring-violet-800">
              {displayPic ? (
                <Image
                  src={displayPic}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="112px"
                  unoptimized={displayPic.startsWith('blob:')}
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-3xl font-bold text-violet-700 dark:text-violet-200">
                  {initial}
                </span>
              )}
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-medium text-white">
                  …
                </div>
              )}
            </div>
            <div className="flex w-full flex-col gap-2 text-center sm:text-left">
              <p className="text-sm text-violet-800/90 dark:text-violet-200/90">{user.email}</p>
              <label className="inline-flex cursor-pointer justify-center sm:justify-start">
                <span className="rounded-xl border-2 border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-900 shadow-sm hover:bg-violet-50 dark:border-violet-700 dark:bg-gray-900 dark:text-violet-100 dark:hover:bg-violet-950/50">
                  Fotoğraf seç
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={onPickPhoto}
                  disabled={uploading}
                />
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">JPEG, PNG veya WebP · en fazla 2 MB</p>
            </div>
          </div>
        </KidsCard>

        <KidsCard>
          <form onSubmit={onSaveNames} className="space-y-5">
            <KidsFormField id={fnId} label="Ad">
              <input
                id={fnId}
                className={kidsInputClass}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
              />
            </KidsFormField>
            <KidsFormField id={lnId} label="Soyad">
              <input
                id={lnId}
                className={kidsInputClass}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
              />
            </KidsFormField>
            <KidsPrimaryButton type="submit" disabled={saving}>
              {saving ? 'Kaydediliyor…' : 'Bilgileri kaydet'}
            </KidsPrimaryButton>
          </form>
        </KidsCard>
      </div>
    </KidsPanelMax>
  );
}
