'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Answer } from '@/src/types';
import { CommentEditor } from '@/src/components/comment-editor';
import { useAuthStore } from '@/src/stores/auth-store';
import { formatTimeAgo } from '@/src/lib/format-time';
import toast from 'react-hot-toast';

type CommentItemProps = {
  answer: Answer;
  questionId: number;
  depth?: number;
  onCreateReply: (content: string, parentId: number) => void;
  isSubmitting: boolean;
  allAnswers: Answer[];
};

export function CommentItem({
  answer,
  questionId,
  depth = 0,
  onCreateReply,
  isSubmitting,
  allAnswers,
}: CommentItemProps) {
  const { user: currentUser } = useAuthStore();
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');

  const author = typeof answer.author === 'object' ? answer.author : null;
  const authorName = author?.username ?? author?.first_name ?? 'Anonim';
  const replies = allAnswers.filter((a) => a.parent === answer.id);

  const hasContent = (html: string) => html.replace(/<[^>]*>/g, '').trim().length > 0;

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
    <div className={depth > 0 ? 'ml-4 sm:ml-8 mt-4 border-l-2 border-gray-200 dark:border-gray-700 pl-4' : ''}>
      <div
        className={`rounded-lg p-3 sm:p-4 ${
          answer.is_best_answer ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-800/50'
        }`}
      >
        <div className="flex gap-3 min-w-0">
          <div className="flex flex-col items-center shrink-0 text-gray-500 dark:text-gray-400">
            <button
              onClick={() => currentUser && toast.success('Oy verildi')}
              className="p-0.5 hover:text-orange-500 transition-colors"
              title="Yukarı oy"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <span className="text-sm font-medium">{answer.like_count ?? 0}</span>
            <button
              onClick={() => currentUser && toast.success('Oy verildi')}
              className="p-0.5 hover:text-orange-500 transition-colors"
              title="Aşağı oy"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {author?.profile_picture ? (
                <img src={author.profile_picture} alt="" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                  {authorName.charAt(0).toUpperCase()}
                </div>
              )}
              <Link
                href={`/profil/${authorName}`}
                className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-orange-600"
              >
                u/{authorName}
              </Link>
              <span className="text-sm text-gray-500 dark:text-gray-400">{formatTimeAgo(answer.created_at)}</span>
              {answer.is_best_answer && (
                <span className="bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 text-xs font-medium px-2 py-0.5 rounded">
                  ✓ En İyi Cevap
                </span>
              )}
            </div>
            <div
              className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300 mb-3"
              dangerouslySetInnerHTML={{ __html: answer.content }}
            />
            <div className="flex items-center gap-3 text-sm">
              {currentUser && (
                <button
                  onClick={() => setReplyOpen((o) => !o)}
                  className="text-gray-500 hover:text-orange-500 dark:text-gray-400 dark:hover:text-orange-500 transition-colors font-medium"
                >
                  Yanıtla
                </button>
              )}
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
                    className="px-3 py-1.5 bg-orange-500 text-white rounded-md text-sm font-medium hover:bg-orange-600 disabled:opacity-70"
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
              depth={depth + 1}
              onCreateReply={onCreateReply}
              isSubmitting={isSubmitting}
              allAnswers={allAnswers}
            />
          ))}
        </div>
      )}
    </div>
  );
}
