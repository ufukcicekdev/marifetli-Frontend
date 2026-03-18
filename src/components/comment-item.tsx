'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useState } from 'react';
import { OptimizedAvatar } from '@/src/components/optimized-avatar';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const MediaLightbox = dynamic(() => import('@/src/components/media-lightbox').then((m) => ({ default: m.MediaLightbox })), { ssr: false });
import type { Answer } from '@/src/types';
import { CommentEditor } from '@/src/components/comment-editor';
import { useAuthStore } from '@/src/stores/auth-store';
import { formatTimeAgo } from '@/src/lib/format-time';
import toast from 'react-hot-toast';
import api from '@/src/lib/api';
import { questionKeys } from '@/src/hooks/use-questions';
import { ShareButton } from '@/src/components/share-button';
import { sanitizeHtml } from '@/src/lib/sanitize-html';

type CommentItemProps = {
  answer: Answer;
  questionId: number;
  slug?: string;
  depth?: number;
  onCreateReply: (content: string, parentId: number) => void;
  isSubmitting: boolean;
  allAnswers: Answer[];
  /** Soru sahibi mi (sadece soru sahibi en iyi cevap seçebilir) */
  isQuestionAuthor?: boolean;
  /** Paylaşım modalında başlık olarak kullanılır */
  questionTitle?: string;
};

export function CommentItem({
  answer,
  questionId,
  slug = '',
  depth = 0,
  onCreateReply,
  isSubmitting,
  allAnswers,
  isQuestionAuthor = false,
  questionTitle,
}: CommentItemProps) {
  const { user: currentUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [lightboxImages, setLightboxImages] = useState<{ url: string; type: 'image' }[] | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const likeMutation = useMutation({
    mutationFn: () => api.likeAnswer(answer.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['answers', questionId] });
    },
    onError: () => toast.error('İşlem başarısız.'),
  });
  const unlikeMutation = useMutation({
    mutationFn: () => api.unlikeAnswer(answer.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['answers', questionId] });
    },
    onError: () => toast.error('İşlem başarısız.'),
  });
  const markBestMutation = useMutation({
    mutationFn: () => api.markAsBestAnswer(answer.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['answers', questionId] });
      if (slug) queryClient.invalidateQueries({ queryKey: questionKeys.detail(slug) });
      toast.success('En iyi cevap olarak işaretlendi.');
    },
    onError: () => toast.error('İşlem başarısız.'),
  });

  const commentShareUrl = typeof window !== 'undefined' && slug ? `${window.location.origin}/soru/${slug}#comment-${answer.id}` : undefined;
  const author = typeof answer.author === 'object' ? answer.author : null;
  const authorName = author?.username ?? author?.first_name ?? 'Anonim';
  const replies = allAnswers.filter((a) => a.parent === answer.id);

  const hasContent = (html: string) => html.replace(/<[^>]*>/g, '').trim().length > 0;

  const renderContentWithImagesFirst = (html: string) => {
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    const imgs: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = imgRegex.exec(html)) !== null) {
      if (m[1]) imgs.push(m[1]);
    }
    const textHtml = html.replace(/<img[^>]*>/gi, '').replace(/<p>\s*<\/p>/g, '').trim();
    return (
      <>
        {imgs.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {imgs.map((src, i) => (
              <div
                key={i}
                role="button"
                tabIndex={0}
                className="max-w-[200px] max-h-[200px] rounded-lg overflow-hidden shrink-0 cursor-pointer hover:opacity-90 transition-opacity [&>img]:max-w-full [&>img]:max-h-[200px] [&>img]:object-cover"
                onClick={() => {
                  setLightboxImages(imgs.map((u) => ({ url: u, type: 'image' as const })));
                  setLightboxIndex(i);
                }}
                onKeyDown={(e) => e.key === 'Enter' && (setLightboxImages(imgs.map((u) => ({ url: u, type: 'image' as const }))), setLightboxIndex(i))}
              >
                <img src={src} alt="" />
              </div>
            ))}
          </div>
        )}
        {textHtml && (
          <div
            className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300 [&_img]:max-w-[200px] [&_img]:max-h-[200px] [&_img]:rounded-lg [&_img]:object-cover"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(textHtml) }}
          />
        )}
        {lightboxImages && (
          <MediaLightbox
            items={lightboxImages}
            currentIndex={lightboxIndex}
            onClose={() => setLightboxImages(null)}
          />
        )}
      </>
    );
  };

  const handleReplyClick = () => {
    if (!currentUser) {
      toast.error('Yanıtlamak için giriş yapın.');
      return;
    }
    setReplyOpen((o) => !o);
  };

  const handleReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = replyText.trim();
    if (!hasContent(trimmed)) {
      toast.error('Lütfen bir yorum yazın.');
      return;
    }
    onCreateReply(trimmed, answer.id);
    setReplyText('');
    setReplyOpen(false);
  };

  return (
    <div id={`comment-${answer.id}`} className={depth > 0 ? 'ml-4 sm:ml-8 mt-4 border-l-2 border-gray-200 dark:border-gray-700 pl-4' : ''}>
      <div
        className={`rounded-lg p-3 sm:p-4 ${
          answer.is_best_answer ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-800/50'
        }`}
      >
        <div className="flex gap-3 min-w-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {author?.profile_picture ? (
                <OptimizedAvatar src={author.profile_picture} size={32} alt="" className="w-8 h-8" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                  {authorName.charAt(0).toUpperCase()}
                </div>
              )}
              <Link
                href={`/profil/${authorName}`}
                className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-brand"
              >
                u/{authorName}
              </Link>
              <span className="text-sm text-gray-500 dark:text-gray-400">{formatTimeAgo(answer.created_at)}</span>
              {(answer.moderation_status === 0) && (
                <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-xs font-medium px-2 py-0.5 rounded">
                  İnceleniyor
                </span>
              )}
              {answer.is_best_answer && (
                <span className="bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 text-xs font-medium px-2 py-0.5 rounded">
                  ✓ En İyi Cevap
                </span>
              )}
              {isQuestionAuthor && !answer.is_best_answer && depth === 0 && (
                <button
                  type="button"
                  onClick={() => markBestMutation.mutate()}
                  disabled={markBestMutation.isPending}
                  className="text-xs font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:underline disabled:opacity-60"
                  title="Bu cevabı en iyi cevap olarak işaretle"
                >
                  {markBestMutation.isPending ? 'İşleniyor...' : 'En iyi cevap seç'}
                </button>
              )}
            </div>
            <div className="mb-3">
              {renderContentWithImagesFirst(answer.content)}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
              <button
                onClick={() => currentUser ? likeMutation.mutate() : toast.error('Beğenmek için giriş yapın.')}
                className="flex items-center gap-1 hover:text-brand transition-colors"
                title="Beğen"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
                <span>{answer.like_count ?? 0}</span>
              </button>
              <button
                onClick={() => currentUser ? unlikeMutation.mutate() : toast.error('Giriş yapın.')}
                className="flex items-center gap-1 hover:text-brand transition-colors"
                title="Beğenme"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <button
                onClick={handleReplyClick}
                className="flex items-center gap-1 hover:text-brand transition-colors font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                Yanıtla
              </button>
              <ShareButton
                url={commentShareUrl}
                title={questionTitle ?? 'Yorum'}
                className="flex items-center gap-1 hover:text-brand transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Paylaş
              </ShareButton>
            </div>
            {replyOpen && currentUser && (
              <form onSubmit={handleReplySubmit} className="mt-3 p-3 rounded-lg bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700">
                <CommentEditor
                  content={replyText}
                  onChange={setReplyText}
                  placeholder={`@${authorName} kullanıcısına yanıt verin...`}
                  minHeight="80px"
                  disabled={isSubmitting}
                  className="mb-2"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setReplyOpen(false)}
                    className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !hasContent(replyText)}
                    className="px-3 py-1.5 bg-brand text-white rounded-md text-sm font-medium hover:bg-brand-hover disabled:opacity-70"
                  >
                    {isSubmitting ? 'Gönderiliyor...' : 'Yanıtla'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
      {replies.length > 0 && (
        <div className="mt-4 space-y-4">
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              answer={reply}
              questionId={questionId}
              slug={slug}
              depth={depth + 1}
              onCreateReply={onCreateReply}
              isSubmitting={isSubmitting}
              allAnswers={allAnswers}
              isQuestionAuthor={isQuestionAuthor}
              questionTitle={questionTitle}
            />
          ))}
        </div>
      )}
    </div>
  );
}
