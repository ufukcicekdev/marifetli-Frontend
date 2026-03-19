'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/src/lib/api';
import { useAuthStore } from '@/src/stores/auth-store';
import toast from 'react-hot-toast';
import { formatTimeAgo } from '@/src/lib/format-time';
import { MediaSlider } from '@/src/components/media-slider';
import { OptimizedAvatar } from '@/src/components/optimized-avatar';
import { DesignCommentItem } from '@/src/components/design-comment-item';
import { CommentEditor } from '@/src/components/comment-editor';

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
  const [commentInput, setCommentInput] = useState('');
  const [commentFormOpen, setCommentFormOpen] = useState(false);
  const [optimisticVote, setOptimisticVote] = useState<'up' | 'down' | null>(null);

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

  const { data: commentsData, isLoading: commentsLoading } = useQuery({
    queryKey: ['design-comments', designId],
    queryFn: () => api.getDesignComments(designId).then((r) => r.data),
    enabled: Number.isInteger(designId) && designId > 0,
  });
  const comments = (Array.isArray(commentsData) ? commentsData : []) as import('@/src/lib/api').DesignCommentItem[];
  const topLevelComments = comments.filter((c) => !c.parent);
  const displayVoteCount = (design?.like_count ?? 0) + (optimisticVote === 'up' ? 1 : optimisticVote === 'down' ? -1 : 0);
  const hasContent = (html: string) => html.replace(/<[^>]*>/g, '').trim().length > 0;

  const likeMutation = useMutation({
    mutationFn: () => api.likeDesign(designId),
    onMutate: () => setOptimisticVote('up'),
    onSuccess: () => {
      setOptimisticVote(null);
      queryClient.invalidateQueries({ queryKey: ['design', designId] });
      queryClient.invalidateQueries({ queryKey: ['designs', 'list'] });
    },
    onError: (err: unknown) => {
      setOptimisticVote(null);
      const msg = err && typeof err === 'object' && 'response' in err
        && typeof (err as { response?: { data?: { detail?: string } } }).response?.data?.detail === 'string'
        ? (err as { response: { data: { detail: string } } }).response.data.detail
        : 'Beğeni işlemi başarısız.';
      toast.error(msg);
    },
  });

  const unlikeMutation = useMutation({
    mutationFn: () => api.unlikeDesign(designId),
    onMutate: () => setOptimisticVote('down'),
    onSuccess: () => {
      setOptimisticVote(null);
      queryClient.invalidateQueries({ queryKey: ['design', designId] });
      queryClient.invalidateQueries({ queryKey: ['designs', 'list'] });
    },
    onError: (err: unknown) => {
      setOptimisticVote(null);
      const msg = err && typeof err === 'object' && 'response' in err
        && typeof (err as { response?: { data?: { detail?: string } } }).response?.data?.detail === 'string'
        ? (err as { response: { data: { detail: string } } }).response.data.detail
        : 'Beğeni işlemi başarısız.';
      toast.error(msg);
    },
  });

  const commentMutation = useMutation({
    mutationFn: ({ content, parentId }: { content: string; parentId?: number }) =>
      api.createDesignComment(designId, content, parentId),
    onSuccess: () => {
      setCommentInput('');
      queryClient.invalidateQueries({ queryKey: ['design-comments', designId] });
      queryClient.invalidateQueries({ queryKey: ['design', designId] });
      queryClient.invalidateQueries({ queryKey: ['designs', 'list'] });
    },
    onError: (err: unknown) => {
      const msg = err && typeof err === 'object' && 'response' in err
        && typeof (err as { response?: { data?: { detail?: string } } }).response?.data?.detail === 'string'
        ? (err as { response: { data: { detail: string } } }).response.data.detail
        : 'Yorum gönderilemedi.';
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
          className="text-sm text-brand hover:text-brand-hover dark:hover:text-brand"
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
              className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-brand"
            >
              u/{design.author_username}
            </Link>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatTimeAgo(design.created_at)}
            </span>
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
            <span>💬 {design.comment_count ?? 0} yorum</span>
            <button
              onClick={() => isAuthenticated ? likeMutation.mutate() : toast.error('Beğenmek için giriş yapın.')}
              className={`flex items-center gap-1.5 transition-colors ${optimisticVote === 'up' ? 'text-brand' : 'text-gray-500 hover:text-brand dark:text-gray-400 dark:hover:text-brand'}`}
              title="Beğen"
            >
              <svg className="w-5 h-5" fill={optimisticVote === 'up' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              <span className="text-sm font-medium">{displayVoteCount}</span>
            </button>
            <button
              onClick={() => isAuthenticated ? unlikeMutation.mutate() : toast.error('Giriş yapın.')}
              className={`transition-colors ${optimisticVote === 'down' ? 'text-brand' : 'text-gray-500 hover:text-brand dark:text-gray-400 dark:hover:text-brand'}`}
              title="Beğenme bırak"
            >
              <svg className="w-5 h-5" fill={optimisticVote === 'down' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
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
                  className="mt-4 px-4 py-2 rounded-xl text-sm font-medium border border-brand text-brand hover:bg-brand-pink/80 dark:hover:bg-brand/10 transition-colors"
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
                  className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-brand hover:bg-brand-hover disabled:opacity-50"
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

      <div className="mt-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Yorumlar</h2>
        {isAuthenticated ? (
          <div className="mb-4">
            {!commentFormOpen ? (
              <button
                type="button"
                onClick={() => setCommentFormOpen(true)}
                className="w-full flex items-center gap-2 text-left px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <svg className="w-5 h-5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="font-medium text-sm">Aa</span>
                <span className="flex-1">Sohbete katıl...</span>
              </button>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const c = commentInput.trim();
                  if (!hasContent(c)) return;
                  commentMutation.mutate({ content: c });
                }}
                className="space-y-3"
              >
                <CommentEditor
                  content={commentInput}
                  onChange={setCommentInput}
                  placeholder="Düşüncenizi paylaşın..."
                  minHeight="100px"
                  disabled={commentMutation.isPending}
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCommentFormOpen(false);
                      setCommentInput('');
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={commentMutation.isPending || !hasContent(commentInput)}
                    className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-hover disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {commentMutation.isPending ? 'Gönderiliyor...' : 'Yorum yap'}
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Yorum yapmak için giriş yapın.</p>
        )}

        {commentsLoading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Yorumlar yükleniyor...</p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Henüz yorum yok. İlk yorumu siz yapın!</p>
        ) : (
          <div className="space-y-3">
            {topLevelComments.map((c) => (
              <DesignCommentItem
                key={c.id}
                comment={c}
                allComments={comments}
                isSubmitting={commentMutation.isPending}
                onReplySubmit={(content, parentId) => commentMutation.mutate({ content, parentId })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
