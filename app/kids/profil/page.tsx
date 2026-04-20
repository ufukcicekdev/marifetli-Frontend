'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import { kidsPatchMe, kidsUploadProfilePhoto, kidsAvatarUrl, KIDS_AVATAR_KEYS, type KidsAvatarKey, kidsSetAvatar, type KidsLanguageCode } from '@/src/lib/kids-api';
import { useKidsI18n } from '@/src/providers/kids-language-provider';
import {
  KidsCard,
  KidsFormField,
  KidsPageHeader,
  KidsPanelMax,
  KidsPrimaryButton,
  KidsSelect,
  kidsInputClass,
} from '@/src/components/kids/kids-ui';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';

export default function KidsProfilPage() {
  const router = useRouter();
  const { user, loading: authLoading, pathPrefix, refreshUser } = useKidsAuth();
  const { t, canChangeLanguage, setLanguageLocal } = useKidsI18n();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState<KidsLanguageCode>('tr');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const fnId = useId();
  const lnId = useId();

  useEffect(() => {
    if (!user) return;
    setFirstName(user.first_name || '');
    setLastName(user.last_name || '');
    setPreferredLanguage((user.preferred_language || user.effective_language || 'tr') as KidsLanguageCode);
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
        toast.error(t('profile.file.typeError'));
        return;
      }
      if (f.size > 2 * 1024 * 1024) {
        toast.error(t('profile.file.sizeError'));
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
          toast.success(t('profile.photo.updated'));
        } catch (err) {
          toast.error(err instanceof Error ? err.message : t('profile.photo.uploadFailed'));
          setPreview(null);
        } finally {
          setUploading(false);
        }
      })();
    },
    [preview, refreshUser, t],
  );

  async function onSaveNames(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await kidsPatchMe({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        ...(canChangeLanguage ? { preferred_language: preferredLanguage } : {}),
      });
      if (canChangeLanguage) {
        setLanguageLocal(preferredLanguage);
      }
      await refreshUser();
      toast.success(t('profile.saved'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('profile.saveError'));
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(kidsLoginPortalHref(pathPrefix));
    }
  }, [authLoading, user, router, pathPrefix]);

  if (authLoading || !user) {
    return (
      <KidsPanelMax>
        <p className="text-center text-violet-800 dark:text-violet-200">{t('common.loading')}</p>
      </KidsPanelMax>
    );
  }

  const isStudent = user.role === 'student';
  const avatarSrc = user.avatar_key ? kidsAvatarUrl(user.avatar_key) : null;
  const displayPic = avatarSrc || preview || user.profile_picture || null;
  const initial = (user.first_name || user.email || '?').charAt(0).toUpperCase();

  const AVATAR_EMOJI: Record<string, string> = {
    owl: '🦉', cat: '🐱', fox: '🦊', panda: '🐼',
    lion: '🦁', bunny: '🐰', bear: '🐻', dragon: '🐲',
  };
  const AVATAR_LABEL: Record<string, string> = {
    owl: 'Baykuş', cat: 'Kedi', fox: 'Tilki', panda: 'Panda',
    lion: 'Aslan', bunny: 'Tavşan', bear: 'Ayı', dragon: 'Ejderha',
  };

  return (
    <>
    {/* Avatar picker modal — KidsPanelMax dışında, tam sayfa overlay */}
    {isStudent && avatarPickerOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
          <h2 className="mb-4 text-center text-xl font-black text-violet-700 dark:text-violet-300">
            Avatar Seç 🎨
          </h2>
          <div className="grid grid-cols-4 gap-3">
            {KIDS_AVATAR_KEYS.map((key) => {
              const url = kidsAvatarUrl(key);
              const isSelected = user.avatar_key === key;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={savingAvatar}
                  onClick={async () => {
                    setSavingAvatar(true);
                    try {
                      await kidsSetAvatar(key as KidsAvatarKey);
                      await refreshUser();
                      toast.success('Avatar güncellendi! 🎉');
                      setAvatarPickerOpen(false);
                    } catch {
                      toast.error('Kaydedilemedi, tekrar dene.');
                    } finally {
                      setSavingAvatar(false);
                    }
                  }}
                  className={`flex flex-col items-center gap-1 rounded-2xl border-2 p-2 transition-all ${
                    isSelected
                      ? 'border-violet-500 bg-violet-50 shadow-md dark:border-violet-400 dark:bg-violet-950'
                      : 'border-transparent bg-zinc-100 hover:border-violet-300 dark:bg-zinc-800'
                  }`}
                  title={`${AVATAR_EMOJI[key]} ${AVATAR_LABEL[key]}`}
                >
                  {url ? (
                    <Image src={url} alt={key} width={56} height={56} className="h-14 w-14" />
                  ) : (
                    <span className="text-3xl">{AVATAR_EMOJI[key]}</span>
                  )}
                  <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400">
                    {AVATAR_LABEL[key]}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setAvatarPickerOpen(false)}
            className="mt-4 w-full rounded-2xl border border-zinc-300 py-2 text-sm font-bold text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
          >
            Kapat
          </button>
        </div>
      </div>
    )}
    <KidsPanelMax>
      <KidsPageHeader
        emoji="👤"
        title={t('profile.title')}
        subtitle={t('profile.subtitle')}
      />

      <div className="mx-auto max-w-lg space-y-8">
        <KidsCard className="space-y-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            {/* Avatar / profil resmi */}
            <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full bg-violet-100 ring-2 ring-violet-200 dark:bg-violet-950/50 dark:ring-violet-800">
              {displayPic ? (
                <Image
                  src={displayPic}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="112px"
                  unoptimized={!avatarSrc && displayPic.startsWith('blob:')}
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-3xl font-bold text-violet-700 dark:text-violet-200">
                  {initial}
                </span>
              )}
              {(uploading || savingAvatar) && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-medium text-white">
                  …
                </div>
              )}
            </div>

            <div className="flex w-full flex-col gap-2 text-center sm:text-left">
              <p className="text-sm text-violet-800/90 dark:text-violet-200/90">{user.student_login_name || user.email}</p>

              {isStudent ? (
                /* ── Öğrenci: avatar seçici ── */
                <>
                  <button
                    type="button"
                    onClick={() => setAvatarPickerOpen(true)}
                    className="inline-flex justify-center rounded-xl border-2 border-violet-300 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-900 shadow-sm hover:bg-violet-100 dark:border-violet-600 dark:bg-violet-950/40 dark:text-violet-100 sm:justify-start"
                  >
                    🎨 Avatar Seç
                  </button>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user.avatar_key ? `Seçili: ${AVATAR_EMOJI[user.avatar_key] ?? ''} ${AVATAR_LABEL[user.avatar_key] ?? user.avatar_key}` : 'Henüz avatar seçilmedi'}
                  </p>
                </>
              ) : (
                /* ── Diğer roller: fotoğraf yükleme ── */
                <>
                  <label className="inline-flex cursor-pointer justify-center sm:justify-start">
                    <span className="rounded-xl border-2 border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-900 shadow-sm hover:bg-violet-50 dark:border-violet-700 dark:bg-gray-900 dark:text-violet-100 dark:hover:bg-violet-950/50">
                      {t('profile.photo.select')}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={onPickPhoto}
                      disabled={uploading}
                    />
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('profile.photo.hint')}</p>
                </>
              )}
            </div>
          </div>

        </KidsCard>

        <KidsCard>
          <form onSubmit={onSaveNames} className="space-y-5">
            <KidsFormField id={fnId} label={t('profile.firstName')}>
              <input
                id={fnId}
                className={kidsInputClass}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
              />
            </KidsFormField>
            <KidsFormField id={lnId} label={t('profile.lastName')}>
              <input
                id={lnId}
                className={kidsInputClass}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
              />
            </KidsFormField>
            <KidsFormField
              id="preferred-language"
              label={t('profile.language')}
              hint={canChangeLanguage ? t('profile.language.hint.free') : t('profile.language.hint.locked')}
            >
              <KidsSelect
                id="preferred-language"
                value={preferredLanguage}
                onChange={(v) => setPreferredLanguage(v as KidsLanguageCode)}
                disabled={!canChangeLanguage}
                options={[
                  { value: 'tr', label: t('profile.language.tr') },
                  { value: 'en', label: t('profile.language.en') },
                  { value: 'ge', label: t('profile.language.ge') },
                ]}
              />
            </KidsFormField>
            <KidsPrimaryButton type="submit" disabled={saving}>
              {saving ? t('profile.saving') : t('profile.save')}
            </KidsPrimaryButton>
          </form>
        </KidsCard>
      </div>
    </KidsPanelMax>
    </>
  );
}
