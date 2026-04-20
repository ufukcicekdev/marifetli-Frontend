'use client';

import Image from 'next/image';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { KIDS_AVATAR_KEYS, type KidsAvatarKey, kidsAvatarUrl, kidsSetAvatar } from '@/src/lib/kids-api';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';

const AVATAR_LABELS: Record<KidsAvatarKey, string> = {
  owl: '🦉 Baykuş',
  cat: '🐱 Kedi',
  fox: '🦊 Tilki',
  panda: '🐼 Panda',
  lion: '🦁 Aslan',
  bunny: '🐰 Tavşan',
  bear: '🐻 Ayı',
  dragon: '🐲 Ejderha',
};

interface Props {
  currentKey?: string | null;
  onClose: () => void;
}

export function KidsAvatarPicker({ currentKey, onClose }: Props) {
  const { refreshUser } = useKidsAuth();
  const [selected, setSelected] = useState<KidsAvatarKey | null>(
    (currentKey as KidsAvatarKey) ?? null,
  );
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    try {
      await kidsSetAvatar(selected);
      await refreshUser();
      toast.success('Avatar güncellendi! 🎉');
      onClose();
    } catch {
      toast.error('Kaydedilemedi, tekrar dene.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
        <h2 className="mb-4 text-center text-xl font-black text-violet-700 dark:text-violet-300">
          Avatar Seç 🎨
        </h2>
        <div className="grid grid-cols-4 gap-3">
          {KIDS_AVATAR_KEYS.map((key) => {
            const url = kidsAvatarUrl(key);
            const isSelected = selected === key;
            return (
              <button
                key={key}
                onClick={() => setSelected(key)}
                className={`flex flex-col items-center gap-1 rounded-2xl border-2 p-2 transition-all ${
                  isSelected
                    ? 'border-violet-500 bg-violet-50 shadow-md dark:border-violet-400 dark:bg-violet-950'
                    : 'border-transparent bg-zinc-100 hover:border-violet-300 dark:bg-zinc-800'
                }`}
                title={AVATAR_LABELS[key]}
              >
                {url ? (
                  <Image src={url} alt={key} width={56} height={56} className="h-14 w-14" />
                ) : (
                  <span className="text-3xl">{AVATAR_LABELS[key].split(' ')[0]}</span>
                )}
                <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400">
                  {AVATAR_LABELS[key].split(' ')[1]}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl border border-zinc-300 py-2 text-sm font-bold text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
          >
            İptal
          </button>
          <button
            onClick={handleSave}
            disabled={!selected || saving}
            className="flex-1 rounded-2xl bg-violet-600 py-2 text-sm font-black text-white disabled:opacity-50"
          >
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}
