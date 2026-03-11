'use client';

import { useState, useEffect } from 'react';

interface RemoveFromCommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isLoading?: boolean;
  title?: string;
}

export function RemoveFromCommunityModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  title = 'Gönderiyi topluluktan kaldır',
}: RemoveFromCommunityModalProps) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!isOpen) setReason('');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(reason.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full p-5 border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Sebep yazarsanız gönderi sahibine bildirim gider. İsteğe bağlıdır.
        </p>
        <form onSubmit={handleSubmit}>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Sebep (isteğe bağlı)"
            rows={3}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 resize-none"
            disabled={isLoading}
          />
          <div className="flex gap-2 mt-4 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg disabled:opacity-50"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:opacity-50"
            >
              {isLoading ? 'Kaldırılıyor…' : 'Topluluktan kaldır'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
