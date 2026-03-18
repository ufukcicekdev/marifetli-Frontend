'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api, { type CommunityListItem } from '@/src/lib/api';
import toast from 'react-hot-toast';

interface CommunityEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  slug: string;
  community: CommunityListItem | null;
}

export function CommunityEditModal({ isOpen, onClose, slug, community }: CommunityEditModalProps) {
  const queryClient = useQueryClient();
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState<string[]>(['']);
  const [joinType, setJoinType] = useState<'open' | 'approval'>('open');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  useEffect(() => {
    if (community) {
      setDescription(community.description ?? '');
      setRules(Array.isArray(community.rules) && community.rules.length > 0 ? community.rules : ['']);
      setJoinType((community.join_type as 'open' | 'approval') ?? 'open');
    }
  }, [community, isOpen]);

  const updateMutation = useMutation({
    mutationFn: () =>
      api.updateCommunity(slug, {
        description: description.trim() || undefined,
        rules: rules.filter((r) => r.trim()).length ? rules.filter((r) => r.trim()) : undefined,
        join_type: joinType,
        avatar: avatarFile ?? undefined,
        cover_image: coverFile ?? undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community', slug] });
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      toast.success('Topluluk güncellendi.');
      onClose();
    },
    onError: (err: { response?: { data?: { name?: string[]; detail?: string } } }) => {
      const msg = err?.response?.data?.name?.[0] ?? err?.response?.data?.detail ?? 'Güncellenemedi.';
      toast.error(String(msg));
    },
  });

  const addRule = () => setRules((prev) => [...prev, '']);
  const updateRule = (i: number, v: string) =>
    setRules((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
  const removeRule = (i: number) =>
    setRules((prev) => (prev.length > 1 ? prev.filter((_, j) => j !== i) : prev));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">r/{slug} düzenle</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1" aria-label="Kapat">
            ×
          </button>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }}
          className="p-5 space-y-4"
        >
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Açıklama, kurallar, katılım türü ve görselleri güncelleyebilirsiniz.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Açıklama</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Topluluğunuzu kısaca tanımlayın."
              rows={3}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Katılım türü</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="joinType" checked={joinType === 'open'} onChange={() => setJoinType('open')} className="text-brand" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Herkes doğrudan katılabilir</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="joinType" checked={joinType === 'approval'} onChange={() => setJoinType('approval')} className="text-brand" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Yönetici onayı gerekir</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Topluluk kuralları</label>
            <div className="space-y-2">
              {rules.map((rule, i) => (
                <div key={i} className="flex gap-2">
                  <span className="flex items-center text-sm text-gray-500 w-6">{i + 1}.</span>
                  <input
                    type="text"
                    value={rule}
                    onChange={(e) => updateRule(i, e.target.value)}
                    placeholder={`Kural ${i + 1}`}
                    className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
                  />
                  <button type="button" onClick={() => removeRule(i)} className="text-gray-400 hover:text-red-500 px-1" aria-label="Kuralı kaldır">×</button>
                </div>
              ))}
              <button type="button" onClick={addRule} className="text-sm text-brand hover:text-brand-hover">+ Kural ekle</button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Profil resmi</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-gray-600 dark:text-gray-400 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-brand-pink/80 file:text-brand-hover dark:file:bg-brand/10 dark:file:text-brand-hover"
              />
              {community?.avatar_url && !avatarFile && <p className="text-xs text-gray-500 mt-1">Mevcut resim var.</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kapak resmi</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-gray-600 dark:text-gray-400 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-brand-pink/80 file:text-brand-hover dark:file:bg-brand/10 dark:file:text-brand-hover"
              />
              {community?.cover_image_url && !coverFile && <p className="text-xs text-gray-500 mt-1">Mevcut kapak var.</p>}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={updateMutation.isPending} className="rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50">
              {updateMutation.isPending ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
              İptal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
