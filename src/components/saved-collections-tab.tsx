'use client';

import { useState, useEffect, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import api, { type SavedCollection, type SavedItem } from '@/src/lib/api';
import { PostItem } from './post-item';
import { formatTimeAgo } from '@/src/lib/format-time';

interface SavedCollectionsTabProps {
  isOwnProfile: boolean;
}

export function SavedCollectionsTab({ isOwnProfile }: SavedCollectionsTabProps) {
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);
  const [newName, setNewName] = useState('');
  const [showNewInput, setShowNewInput] = useState(false);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (name: string) => api.createSavedCollection(name),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['saved-collections'] });
      setSelectedCollectionId(res.data.id);
      setNewName('');
      setShowNewInput(false);
      toast.success('Koleksiyon oluşturuldu');
    },
    onError: (err: { response?: { data?: { detail?: string | Record<string, string[]> } } }) => {
      const d = err?.response?.data?.detail;
      const msg = typeof d === 'string' ? d : d?.name?.[0] || 'Oluşturulamadı';
      toast.error(msg);
    },
  });

  const { data: collectionsRaw, isLoading } = useQuery({
    queryKey: ['saved-collections'],
    queryFn: () => api.getSavedCollections().then((r) => r.data),
    enabled: isOwnProfile,
  });
  const collections = Array.isArray(collectionsRaw) ? collectionsRaw : (collectionsRaw as unknown as { results?: SavedCollection[] })?.results ?? [];

  useEffect(() => {
    if (collections.length && selectedCollectionId == null) {
      const def = collections.find((c) => c.is_default) ?? collections[0];
      setSelectedCollectionId(def?.id ?? null);
    }
  }, [collections, selectedCollectionId]);

  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ['saved-collection-items', selectedCollectionId],
    queryFn: () => api.getSavedCollectionItems(selectedCollectionId!).then((r) => r.data),
    enabled: isOwnProfile && selectedCollectionId != null,
  });

  const displayItems: SavedItem[] = useMemo(() => {
    if (!items) return [];
    if (Array.isArray(items)) return items as SavedItem[];
    const maybe = (items as { results?: SavedItem[] }).results;
    return Array.isArray(maybe) ? maybe : [];
  }, [items]);

  const removeMutation = useMutation({
    mutationFn: (questionId: number) => api.removeFromSaved(questionId),
    onSuccess: () => {
      toast.success('Koleksiyondan kaldırıldı');
      queryClient.invalidateQueries({ queryKey: ['saved-collections'] });
      queryClient.invalidateQueries({ queryKey: ['saved-collection-items', selectedCollectionId] });
    },
    onError: () => {
      toast.error('Kaldırma işlemi başarısız.');
    },
  });

  if (!isOwnProfile) {
    return (
      <div className="p-6 sm:p-8">
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Kaydettiklerim yalnızca profil sahibine görünür.
        </p>
      </div>
    );
  }

  const defaultColl = collections?.find((c) => c.is_default);
  const activeId = selectedCollectionId ?? defaultColl?.id ?? null;

  if (isLoading) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">Yükleniyor...</div>
    );
  }

  if (!collections.length) {
    return (
      <div className="p-6 sm:p-8">
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Henüz kaydettiğiniz gönderi yok. Gönderilerde &quot;Kaydet&quot; butonuna tıklayarak kaydedebilirsiniz.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="w-full sm:w-56 shrink-0">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Koleksiyonlar</h3>
          <div className="space-y-0.5">
            {showNewInput ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const n = newName.trim();
                  if (n) createMutation.mutate(n);
                }}
                className="flex gap-1 p-2"
              >
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Koleksiyon adı"
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                  autoFocus
                />
                <button type="submit" disabled={!newName.trim() || createMutation.isPending} className="px-2 py-1 text-xs bg-orange-500 text-white rounded">
                  Ekle
                </button>
                <button type="button" onClick={() => { setShowNewInput(false); setNewName(''); }} className="px-2 py-1 text-xs text-gray-500">
                  İptal
                </button>
              </form>
            ) : (
              <button
                onClick={() => setShowNewInput(true)}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20"
              >
                + Yeni koleksiyon
              </button>
            )}
            {collections.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCollectionId(c.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeId === c.id
                    ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <span className="font-medium">{c.name}</span>
                <span className="ml-2 text-xs text-gray-500">({c.item_count})</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          {activeId && (
            <>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                {collections.find((c) => c.id === activeId)?.name}
              </h3>
              {itemsLoading ? (
                <div className="py-8 text-center text-gray-500">Yükleniyor...</div>
              ) : displayItems.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm py-4">Bu koleksiyonda henüz gönderi yok.</p>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-800">
                  {displayItems.map((item: SavedItem) => {
                    const q = item.question;
                    if (!q) return null;
                    const author = typeof q.author === 'object' ? q.author : null;
                    return (
                      <div key={item.id} className="py-3">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <PostItem
                              id={q.id}
                              slug={q.slug}
                              title={q.title}
                              content={(q as { content?: string }).content}
                              category={undefined}
                              author={author?.username ?? ''}
                              timeAgo={formatTimeAgo(item.created_at)}
                              commentCount={q.answer_count ?? 0}
                              voteCount={q.like_count ?? 0}
                              viewCount={q.view_count}
                              viewMode="compact"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeMutation.mutate(q.id)}
                            className="mt-2 px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                          >
                            Kaldır
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
