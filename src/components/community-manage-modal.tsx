'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/src/lib/api';
import toast from 'react-hot-toast';

type JoinRequest = { id: number; user_id: number; username: string; created_at: string };
type BannedUser = { id: number; user_id: number; username: string; reason: string; banned_at: string };

interface CommunityManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  slug: string;
  isModOrOwner: boolean;
}

export function CommunityManageModal({ isOpen, onClose, slug, isModOrOwner }: CommunityManageModalProps) {
  const queryClient = useQueryClient();

  const { data: joinRequests = [], refetch: refetchRequests } = useQuery({
    queryKey: ['community', slug, 'join-requests'],
    queryFn: () => api.getCommunityJoinRequests(slug).then((r) => r.data as JoinRequest[]),
    enabled: !!slug && isOpen && isModOrOwner,
  });

  const { data: bannedList = [], refetch: refetchBanned } = useQuery({
    queryKey: ['community', slug, 'banned'],
    queryFn: () => api.getCommunityBannedList(slug).then((r) => r.data as BannedUser[]),
    enabled: !!slug && isOpen && isModOrOwner,
  });

  const approveMutation = useMutation({
    mutationFn: (requestId: number) => api.approveCommunityJoinRequest(slug, requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community', slug] });
      refetchRequests();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (requestId: number) => api.rejectCommunityJoinRequest(slug, requestId),
    onSuccess: () => refetchRequests(),
  });

  const unbanMutation = useMutation({
    mutationFn: (userId: number) => api.unbanCommunityUser(slug, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community', slug] });
      refetchBanned();
    },
  });

  const [banUsername, setBanUsername] = useState('');
  const [banReason, setBanReason] = useState('');
  const banUserMutation = useMutation({
    mutationFn: async ({ username, reason }: { username: string; reason: string }) => {
      const userRes = await api.getUserByUsername(username.trim());
      const userId = (userRes.data as { id?: number }).id;
      if (!userId) throw new Error('Kullanıcı bulunamadı');
      return api.banCommunityUser(slug, userId, reason || undefined);
    },
    onSuccess: () => {
      toast.success('Kullanıcı yasaklandı.');
      queryClient.invalidateQueries({ queryKey: ['community', slug] });
      refetchBanned();
      setBanUsername('');
      setBanReason('');
    },
    onError: (err: { response?: { data?: { detail?: string } }; message?: string }) => {
      toast.error((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? err?.message ?? 'Yasaklama başarısız.');
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">r/{slug} yönetimi</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1 text-2xl leading-none" aria-label="Kapat">
            ×
          </button>
        </div>
        <div className="p-5 space-y-6">
          <section>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Katılım talepleri</h3>
            {joinRequests.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Bekleyen talep yok.</p>
            ) : (
              <ul className="space-y-2">
                {joinRequests.map((req) => (
                  <li key={req.id} className="flex items-center justify-between gap-2 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">@{req.username}</span>
                      <span className="text-xs text-gray-500 ml-2">{new Date(req.created_at).toLocaleDateString('tr-TR')}</span>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => approveMutation.mutate(req.id)} disabled={approveMutation.isPending} className="text-sm px-3 py-1 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">Onayla</button>
                      <button type="button" onClick={() => rejectMutation.mutate(req.id)} disabled={rejectMutation.isPending} className="text-sm px-3 py-1 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50">Reddet</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Yasaklı kullanıcılar</h3>
            {bannedList.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Yasaklı kullanıcı yok.</p>
            ) : (
              <ul className="space-y-2">
                {bannedList.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-2 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">@{b.username}</span>
                      {b.reason && <p className="text-xs text-gray-500 mt-0.5">{b.reason}</p>}
                    </div>
                    <button type="button" onClick={() => unbanMutation.mutate(b.user_id)} disabled={unbanMutation.isPending} className="text-sm px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">Yasak kaldır</button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Üye yasakla</h4>
              <div className="flex flex-col sm:flex-row gap-2">
                <input type="text" value={banUsername} onChange={(e) => setBanUsername(e.target.value)} placeholder="Kullanıcı adı" className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100" />
                <input type="text" value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder="Sebep (isteğe bağlı)" className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100" />
                <button type="button" onClick={() => banUsername.trim() && banUserMutation.mutate({ username: banUsername.trim(), reason: banReason })} disabled={!banUsername.trim() || banUserMutation.isPending} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">Yasakla</button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
