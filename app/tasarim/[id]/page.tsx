'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/src/lib/api';
import { useAuthStore } from '@/src/stores/auth-store';
import toast from 'react-hot-toast';
import { formatTimeAgo } from '@/src/lib/format-time';
import { MediaSlider } from '@/src/components/media-slider';

const LICENSE_OPTIONS = [
  { value: 'commercial', label: 'Ticari Kullanıma İzin Ver' },
  { value: 'cc-by', label: 'Sadece Atıf ile Kullanım (CC BY)' },
  { value: 'cc-by-nc', label: 'Ticari Kullanım Yasak (CC BY-NC)' },
];

export default function TasarimDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const designId = parseInt(id, 10);
  const queryClient = useQueryClient();
  const { user: currentUser, isAuthenticated } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [editLicense, setEditLicense] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const { data: design, isLoading, error } = useQuery({
    queryKey: ['design', designId],
    queryFn: () => api.getDesign(designId).then((r) => r.data),
    enabled: Number.isInteger(designId) && designId > 0,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { license: string; tags: string; description?: string }) =>
      api.updateDesign(designId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['design', designId] });
      setEditing(false);
      toast.success('Tasarım güncellendi.');
    },
    onError: (err: unknown) => {
      const msg = err && typeof err === 'object' && 'response' in err
        && typeof (err as { response?: { data?: { detail?: string } } }).response?.data?.detail === 'string'
        ? (err as { response: { data: { detail: string } } }).response.data.detail
        : 'Güncelleme başarısız.';
      toast.error(msg);
    },
  });

  const isOwner = isAuthenticated && design && currentUser?.username === design.author_username;

  const startEdit = () => {
    if (design) {
      setEditLicense(design.license);
      setEditTags(design.tags || '');
      setEditDescription(design.description || '');
      setEditing(true);
    }
  };

  const saveEdit = () => {
    updateMutation.mutate({ license: editLicense, tags: editTags, description: editDescription });
  };

  if (isLoading || !design) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-8 max-w-4xl">
        {error ? (
          <p className="text-amber-600 dark:text-amber-400">Tasarım bulunamadı.</p>
        ) : (
          <div className="animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800 aspect-square max-w-xl" />
        )}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-4xl">
      <div className="mb-4">
        <Link
          href="/tasarimlar"
          className="text-sm text-orange-500 hover:text-orange-600 dark:hover:text-orange-400"
        >
          ← Tasarımlara dön
        </Link>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
        <div className="relative bg-gray-100 dark:bg-gray-800 min-h-[200px]">
          <MediaSlider
            items={(design.image_urls && design.image_urls.length > 0)
              ? design.image_urls.map((url) => ({ url, type: 'image' as const }))
              : design.image_url
                ? [{ url: design.image_url, type: 'image' as const }]
                : []}
            className="aspect-video max-h-[70vh]"
            alt={design.description?.slice(0, 100) || design.tags || 'Tasarım'}
          />
        </div>
        <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-800">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <Link
              href={`/profil/${design.author_username}`}
              className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-orange-500"
            >
              u/{design.author_username}
            </Link>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatTimeAgo(design.created_at)}
            </span>
          </div>

          {!editing ? (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Lisans: {LICENSE_OPTIONS.find((o) => o.value === design.license)?.label ?? design.license}
              </p>
              {design.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 whitespace-pre-wrap">
                  {design.description}
                </p>
              )}
              {design.tags && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Etiketler: {design.tags}
                </p>
              )}
              {isOwner && (
                <button
                  type="button"
                  onClick={startEdit}
                  className="mt-4 px-4 py-2 rounded-xl text-sm font-medium border border-orange-500 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                >
                  Düzenle
                </button>
              )}
            </>
          ) : (
            <div className="space-y-4 mt-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Lisans
                </label>
                <select
                  value={editLicense}
                  onChange={(e) => setEditLicense(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  {LICENSE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Açıklama
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Tasarım açıklaması (isteğe bağlı)"
                  rows={3}
                  maxLength={2000}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-y"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Etiketler
                </label>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="Örn: Örgü, Ahşap, Kanaviçe"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50"
                >
                  {updateMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  İptal
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
