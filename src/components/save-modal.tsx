'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { type SavedCollection } from '@/src/lib/api';
import toast from 'react-hot-toast';

interface SaveModalProps {
  questionId: number;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function SaveModal({ questionId, isOpen, onClose, onSaved }: SaveModalProps) {
  const [newCollectionName, setNewCollectionName] = useState('');
  const queryClient = useQueryClient();

  const { data: collections, isLoading } = useQuery({
    queryKey: ['saved-collections'],
    queryFn: () => api.getSavedCollections().then((r) => r.data),
    enabled: isOpen,
  });

  const { data: savedInfo } = useQuery({
    queryKey: ['saved-check', questionId],
    queryFn: () => api.checkSaved(questionId).then((r) => r.data),
    enabled: isOpen,
  });

  const collectionArray: SavedCollection[] = Array.isArray(collections)
    ? (collections as SavedCollection[])
    : ((collections as { results?: SavedCollection[] } | undefined)?.results ?? []);
  const defaultCollection = collectionArray.find((c) => c.is_default);
  const defaultCollectionId = defaultCollection?.id;
  const savedCollectionIds = new Set<number>(
    (savedInfo?.collections ?? []).map((c: SavedCollection) => c.id)
  );

  const saveMutation = useMutation({
    mutationFn: (collectionId?: number) => api.saveQuestion(questionId, collectionId),
    onSuccess: (data) => {
      toast.success(data.data.message || 'Kaydedildi');
      queryClient.invalidateQueries({ queryKey: ['saved-collections'] });
      queryClient.invalidateQueries({ queryKey: ['saved-check', questionId] });
      onSaved?.();
      onClose();
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toast.error(err?.response?.data?.detail || 'Kaydetme başarısız.');
    },
  });

  const createAndSaveMutation = useMutation({
    mutationFn: (name: string) => api.saveQuestionToNewCollection(questionId, name),
    onSuccess: () => {
      toast.success('Kaydedildi');
      queryClient.invalidateQueries({ queryKey: ['saved-collections'] });
      queryClient.invalidateQueries({ queryKey: ['saved-check', questionId] });
      onSaved?.();
      onClose();
      setNewCollectionName('');
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toast.error(err?.response?.data?.detail || 'Kaydetme başarısız.');
    },
  });

  const handleSaveToCollection = (collectionId?: number) => {
    // Aynı gönderiyi aynı koleksiyona tekrar eklemeyi engelle
    const targetId = collectionId ?? defaultCollectionId;
    if (targetId && savedCollectionIds.has(targetId)) {
      toast.error('Bu gönderi zaten bu koleksiyonda.');
      return;
    }
    saveMutation.mutate(collectionId);
  };

  const handleCreateAndSave = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCollectionName.trim();
    if (!name) {
      toast.error('Koleksiyon adı girin');
      return;
    }
    createAndSaveMutation.mutate(name);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Gönderiyi Kaydet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Bir koleksiyon seçin veya yeni oluşturun</p>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="py-8 text-center text-gray-500">Yükleniyor...</div>
          ) : (
            <div className="space-y-1">
              <button
                onClick={() => handleSaveToCollection(undefined)}
                disabled={saveMutation.isPending || (defaultCollectionId != null && savedCollectionIds.has(defaultCollectionId))}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                  defaultCollectionId != null && savedCollectionIds.has(defaultCollectionId)
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <span className="font-medium text-gray-900 dark:text-gray-100">Kaydettiklerim</span>
                <span className="text-xs text-gray-500">
                  {defaultCollectionId != null && savedCollectionIds.has(defaultCollectionId)
                    ? 'Zaten kayıtlı'
                    : 'Varsayılan liste'}
                </span>
              </button>
              {collectionArray.filter((c) => !c.is_default).map((c) => {
                const alreadyIn = savedCollectionIds.has(c.id);
                return (
                <button
                  key={c.id}
                  onClick={() => handleSaveToCollection(c.id)}
                  disabled={saveMutation.isPending || alreadyIn}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                    alreadyIn ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <span className="font-medium text-gray-900 dark:text-gray-100">{c.name}</span>
                  <span className="text-xs text-gray-500">
                    {alreadyIn ? 'Bu koleksiyonda kayıtlı' : `${c.item_count} gönderi`}
                  </span>
                </button>
              );})}
            </div>
          )}
          <form onSubmit={handleCreateAndSave} className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Yeni koleksiyon oluştur</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="Örn: Sonra oku, Örgü desenleri..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
              <button
                type="submit"
                disabled={createAndSaveMutation.isPending || !newCollectionName.trim()}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50"
              >
                Oluştur
              </button>
            </div>
          </form>
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
