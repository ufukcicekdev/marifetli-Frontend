'use client';

import Link from 'next/link';
import { useState } from 'react';
import { OptimizedAvatar } from '@/src/components/optimized-avatar';
import { formatTimeAgo } from '@/src/lib/format-time';
import { useAuthStore } from '@/src/stores/auth-store';
import toast from 'react-hot-toast';
import type { DesignCommentItem } from '@/src/lib/api';

type Props = {
  comment: DesignCommentItem;
  allComments: DesignCommentItem[];
  depth?: number;
  onReplySubmit: (content: string, parentId: number) => void;
  isSubmitting: boolean;
};

export function DesignCommentItem({ comment, allComments, depth = 0, onReplySubmit, isSubmitting }: Props) {
  const { user: currentUser } = useAuthStore();
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const replies = allComments.filter((c) => c.parent === comment.id);

  const handleReply = (e: React.FormEvent) => {
    e.preventDefault();
    const txt = replyText.trim();
    if (!txt) {
      toast.error('Lütfen bir yorum yazın.');
      return;
    }
    onReplySubmit(txt, comment.id);
    setReplyText('');
    setReplyOpen(false);
  };

  return (
    <div className={depth > 0 ? 'ml-4 sm:ml-8 mt-3 border-l-2 border-gray-200 dark:border-gray-700 pl-3' : ''}>
      <div className="rounded-lg p-3 sm:p-4 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {comment.author_profile_picture ? (
            <OptimizedAvatar src={comment.author_profile_picture} size={32} alt="" className="w-8 h-8" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
              {(comment.author_username?.charAt(0) ?? '?').toUpperCase()}
            </div>
          )}
          <Link href={`/profil/${comment.author_username}`} className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-brand">
            u/{comment.author_username}
          </Link>
          <span className="text-sm text-gray-500 dark:text-gray-400">{formatTimeAgo(comment.created_at)}</span>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{comment.content}</p>

        <div className="mt-2 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <button
            type="button"
            onClick={() => {
              if (!currentUser) return toast.error('Yanıtlamak için giriş yapın.');
              setReplyOpen((v) => !v);
            }}
            className="flex items-center gap-1 hover:text-brand transition-colors font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            Yanıtla
          </button>
        </div>

        {replyOpen && (
          <form onSubmit={handleReply} className="mt-3 p-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={`@${comment.author_username} kullanıcısına yanıt verin...`}
              rows={3}
              maxLength={2000}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-y"
            />
            <div className="mt-2 flex justify-end gap-2">
              <button type="button" onClick={() => setReplyOpen(false)} className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400">
                İptal
              </button>
              <button type="submit" disabled={isSubmitting} className="px-3 py-1.5 bg-brand text-white rounded-md text-sm font-medium hover:bg-brand-hover disabled:opacity-70">
                {isSubmitting ? 'Gönderiliyor...' : 'Yanıtla'}
              </button>
            </div>
          </form>
        )}
      </div>

      {replies.length > 0 && (
        <div className="mt-3 space-y-3">
          {replies.map((reply) => (
            <DesignCommentItem
              key={reply.id}
              comment={reply}
              allComments={allComments}
              depth={depth + 1}
              onReplySubmit={onReplySubmit}
              isSubmitting={isSubmitting}
            />
          ))}
        </div>
      )}
    </div>
  );
}

