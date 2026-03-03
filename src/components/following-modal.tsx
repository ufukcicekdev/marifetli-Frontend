'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/src/lib/api';

type FollowingUser = {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  profile_picture?: string;
};

interface FollowingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FollowingModal({ isOpen, onClose }: FollowingModalProps) {
  const [search, setSearch] = useState('');

  const { data: response, isLoading } = useQuery({
    queryKey: ['userFollowing'],
    queryFn: () => api.getUserFollowing().then((r) => r.data),
    enabled: isOpen,
  });

  const list: FollowingUser[] = useMemo(() => {
    const raw = Array.isArray(response) ? response : (response as { results?: FollowingUser[] })?.results ?? [];
    if (!search.trim()) return raw;
    const q = search.trim().toLowerCase();
    return raw.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        (u.first_name?.toLowerCase().includes(q)) ||
        (u.last_name?.toLowerCase().includes(q)) ||
        [u.first_name, u.last_name].filter(Boolean).join(' ').toLowerCase().includes(q)
    );
  }, [response, search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[85vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Takip ettiklerim</h3>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:text-gray-400 dark:hover:bg-gray-800"
              aria-label="Kapat"
            >
              ✕
            </button>
          </div>
          <input
            type="text"
            placeholder="İsim veya kullanıcı adıyla ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div className="overflow-y-auto flex-1 min-h-0 p-2">
          {isLoading ? (
            <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">Yükleniyor...</p>
          ) : list.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              {search.trim() ? 'Arama sonucu bulunamadı.' : 'Henüz kimseyi takip etmiyorsunuz.'}
            </p>
          ) : (
            <ul className="space-y-1">
              {list.map((u) => (
                <li key={u.id}>
                  <Link
                    href={`/profil/${u.username}`}
                    onClick={onClose}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden shrink-0">
                      {u.profile_picture ? (
                        <img src={u.profile_picture} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="w-full h-full flex items-center justify-center text-sm font-medium text-gray-500">
                          {(u.first_name || u.username)?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {[u.first_name, u.last_name].filter(Boolean).join(' ') || u.username}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">u/{u.username}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
