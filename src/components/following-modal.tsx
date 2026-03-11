'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { OptimizedAvatar } from '@/src/components/optimized-avatar';
import api from '@/src/lib/api';

type FollowingUser = {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  profile_picture?: string;
};

type FollowingCommunity = {
  id: number;
  name: string;
  slug: string;
  avatar_url?: string | null;
};

interface FollowingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FollowingModal({ isOpen, onClose }: FollowingModalProps) {
  const [search, setSearch] = useState('');

  const { data: usersResponse, isLoading: usersLoading } = useQuery({
    queryKey: ['userFollowing'],
    queryFn: () => api.getUserFollowing().then((r) => r.data),
    enabled: isOpen,
  });

  const { data: joinedResponse, isLoading: joinedLoading } = useQuery({
    queryKey: ['communities', 'my-joined'],
    queryFn: () => api.getMyJoinedCommunities().then((r) => r.data),
    enabled: isOpen,
  });

  const { data: managedResponse } = useQuery({
    queryKey: ['communities', 'my-managed'],
    queryFn: () => api.getMyManagedCommunities().then((r) => r.data),
    enabled: isOpen,
  });

  const users: FollowingUser[] = useMemo(() => {
    const raw = Array.isArray(usersResponse) ? usersResponse : (usersResponse as unknown as { results?: FollowingUser[] })?.results ?? [];
    if (!search.trim()) return raw;
    const q = search.trim().toLowerCase();
    return raw.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        (u.first_name?.toLowerCase().includes(q)) ||
        (u.last_name?.toLowerCase().includes(q)) ||
        [u.first_name, u.last_name].filter(Boolean).join(' ').toLowerCase().includes(q)
    );
  }, [usersResponse, search]);

  const managedSlugs = useMemo(() => {
    const raw = Array.isArray(managedResponse) ? managedResponse : (managedResponse as unknown as { results?: { slug?: string }[] })?.results ?? [];
    return new Set(raw.map((m) => m.slug).filter(Boolean));
  }, [managedResponse]);

  const communities: FollowingCommunity[] = useMemo(() => {
    const raw = Array.isArray(joinedResponse) ? joinedResponse : (joinedResponse as unknown as { results?: FollowingCommunity[] })?.results ?? [];
    const onlyFollowed = raw.filter((c) => !managedSlugs.has(c.slug));
    if (!search.trim()) return onlyFollowed;
    const q = search.trim().toLowerCase();
    return onlyFollowed.filter((c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q));
  }, [joinedResponse, managedSlugs, search]);

  const isLoading = usersLoading || joinedLoading;
  const hasUsers = users.length > 0;
  const hasCommunities = communities.length > 0;
  const isEmpty = !hasUsers && !hasCommunities;

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
            placeholder="İsim, kullanıcı adı veya topluluk adıyla ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div className="overflow-y-auto flex-1 min-h-0 p-2">
          {isLoading ? (
            <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">Yükleniyor...</p>
          ) : isEmpty ? (
            <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              {search.trim() ? 'Arama sonucu bulunamadı.' : 'Henüz kimseyi veya topluluğu takip etmiyorsunuz.'}
            </p>
          ) : (
            <ul className="space-y-1">
              {users.map((u) => (
                <li key={`user-${u.id}`}>
                  <Link
                    href={`/profil/${u.username}`}
                    onClick={onClose}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden shrink-0">
                      {u.profile_picture ? (
                        <OptimizedAvatar src={u.profile_picture} size={40} alt="" className="w-full h-full" />
                      ) : (
                        <span className="w-full h-full flex items-center justify-center text-sm font-medium text-gray-500">
                          {(u.first_name || u.username)?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {[u.first_name, u.last_name].filter(Boolean).join(' ') || u.username}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Kullanıcı · u/{u.username}</p>
                    </div>
                  </Link>
                </li>
              ))}
              {communities.map((c) => (
                <li key={`community-${c.id}`}>
                  <Link
                    href={`/topluluk/${c.slug}`}
                    onClick={onClose}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden shrink-0">
                      {c.avatar_url ? (
                        <OptimizedAvatar src={c.avatar_url} size={40} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="w-full h-full flex items-center justify-center text-sm font-medium text-gray-500">r</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{c.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Topluluk · r/{c.slug}</p>
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
