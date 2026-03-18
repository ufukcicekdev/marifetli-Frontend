'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { type CommunityListItem } from '@/src/lib/api';
import toast from 'react-hot-toast';

type JoinRequest = { id: number; user_id: number; username: string; created_at: string };
type BannedUser = { id: number; user_id: number; username: string; reason: string; banned_at: string };

type TabId = 'yonet' | 'duzenle';

interface CommunitySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  slug: string;
  community: CommunityListItem | null;
  isModOrOwner: boolean;
  initialTab?: TabId;
}

export function CommunitySettingsModal({
  isOpen,
  onClose,
  slug,
  community,
  isModOrOwner,
  initialTab = 'yonet',
}: CommunitySettingsModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  useEffect(() => {
    if (isOpen) setActiveTab(initialTab);
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">r/{slug}</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1 text-2xl leading-none" aria-label="Kapat">
            ×
          </button>
        </div>
        <div className="flex border-b border-gray-200 dark:border-gray-700 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('yonet')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'yonet'
                ? 'text-brand border-b-2 border-brand'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Yönet
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('duzenle')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'duzenle'
                ? 'text-brand border-b-2 border-brand'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Düzenle
          </button>
        </div>
        <div className="overflow-y-auto flex-1 min-h-0">
          {activeTab === 'yonet' && (
            <ManageTab slug={slug} isModOrOwner={isModOrOwner} onClose={onClose} />
          )}
          {activeTab === 'duzenle' && (
            <EditTab slug={slug} community={community} onClose={onClose} />
          )}
        </div>
      </div>
    </div>
  );
}

function ManageTab({ slug, isModOrOwner, onClose }: { slug: string; isModOrOwner: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: joinRequests = [], refetch: refetchRequests } = useQuery({
    queryKey: ['community', slug, 'join-requests'],
    queryFn: () => api.getCommunityJoinRequests(slug).then((r) => r.data as JoinRequest[]),
    enabled: !!slug && isModOrOwner,
  });
  const { data: bannedList = [], refetch: refetchBanned } = useQuery({
    queryKey: ['community', slug, 'banned'],
    queryFn: () => api.getCommunityBannedList(slug).then((r) => r.data as BannedUser[]),
    enabled: !!slug && isModOrOwner,
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

  return (
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
  );
}

function EditTab({ slug, community, onClose }: { slug: string; community: CommunityListItem | null; onClose: () => void }) {
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
  }, [community]);

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
  const updateRule = (i: number, v: string) => setRules((prev) => { const next = [...prev]; next[i] = v; return next; });
  const removeRule = (i: number) => setRules((prev) => (prev.length > 1 ? prev.filter((_, j) => j !== i) : prev));

  return (
    <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }} className="p-5 space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">Açıklama, kurallar, katılım türü ve görselleri güncelleyebilirsiniz.</p>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Açıklama</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Topluluğunuzu kısaca tanımlayın." rows={3} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 resize-none" />
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
              <input type="text" value={rule} onChange={(e) => updateRule(i, e.target.value)} placeholder={`Kural ${i + 1}`} className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm" />
              <button type="button" onClick={() => removeRule(i)} className="text-gray-400 hover:text-red-500 px-1" aria-label="Kuralı kaldır">×</button>
            </div>
          ))}
          <button type="button" onClick={addRule} className="text-sm text-brand hover:text-brand-hover">+ Kural ekle</button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Profil resmi</label>
          <input type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)} className="w-full text-sm text-gray-600 dark:text-gray-400 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-brand-pink/80 file:text-brand-hover dark:file:bg-brand/10 dark:file:text-brand-hover" />
          {community?.avatar_url && !avatarFile && <p className="text-xs text-gray-500 mt-1">Mevcut resim var.</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kapak resmi</label>
          <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} className="w-full text-sm text-gray-600 dark:text-gray-400 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-brand-pink/80 file:text-brand-hover dark:file:bg-brand/10 dark:file:text-brand-hover" />
          {community?.cover_image_url && !coverFile && <p className="text-xs text-gray-500 mt-1">Mevcut kapak var.</p>}
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={updateMutation.isPending} className="rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50">{updateMutation.isPending ? 'Kaydediliyor…' : 'Kaydet'}</button>
        <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">İptal</button>
      </div>
    </form>
  );
}
