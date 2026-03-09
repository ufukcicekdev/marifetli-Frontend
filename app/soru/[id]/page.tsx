'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, useEffect } from 'react';
import { useQuestion, questionKeys } from '@/src/hooks/use-questions';
import { addRecentQuestion } from '@/src/lib/recent-activity';
import api from '@/src/lib/api';
import toast from 'react-hot-toast';
import type { Answer } from '@/src/types';
import { useAuthStore } from '@/src/stores/auth-store';
import { formatTimeAgo } from '@/src/lib/format-time';
import { extractMediaFromHtml, stripMediaFromHtml } from '@/src/lib/extract-media';
import { MediaSlider } from '@/src/components/media-slider';
import { CommentItem } from '@/src/components/comment-item';
import { CommentEditor } from '@/src/components/comment-editor';
import { OptimizedAvatar } from '@/src/components/optimized-avatar';
import { ShareButton } from '@/src/components/share-button';

const SaveModal = dynamic(() => import('@/src/components/save-modal').then((m) => ({ default: m.SaveModal })), { ssr: false });

export default function QuestionDetailPage() {
  const params = useParams();
  const slug = params?.id as string;
  const { user: currentUser } = useAuthStore();
  const { data: question, isLoading, error } = useQuestion(slug ?? '');
  const { data: answersData, isLoading: answersLoading } = useQuery({
    queryKey: ['answers', question?.id],
    queryFn: () => api.getQuestionAnswers(question!.id).then((r) => r.data),
    enabled: !!question?.id,
  });
  const answers: Answer[] = Array.isArray(answersData) ? answersData : ((answersData as unknown as { results?: Answer[] })?.results ?? []);
  const richContent = question ? (question as { content?: string }).content : undefined;
  const mediaItems = useMemo(() => extractMediaFromHtml(richContent), [richContent]);
  const contentWithoutMedia = useMemo(() => stripMediaFromHtml(richContent), [richContent]);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [answerFormOpen, setAnswerFormOpen] = useState(false);
  const [answerText, setAnswerText] = useState('');
  const [optimisticVote, setOptimisticVote] = useState<'up' | 'down' | null>(null);
  const queryClient = useQueryClient();
  const displayVoteCount = (question?.like_count ?? 0) + (optimisticVote === 'up' ? 1 : optimisticVote === 'down' ? -1 : 0);

  useEffect(() => {
    if (!question?.id || !question?.title) return;
    const q = question as { slug?: string; category_slug?: string; category_name?: string; like_count?: number; answer_count?: number; content?: string };
    const slug = q.slug ?? String(question.id);
    const firstMedia = extractMediaFromHtml(q.content)?.[0];
    const imageUrl = firstMedia?.type === 'image' ? firstMedia.url : undefined;
    addRecentQuestion({
      id: question.id,
      slug,
      title: question.title,
      categorySlug: q.category_slug,
      categoryLabel: q.category_name,
      likeCount: q.like_count,
      commentCount: q.answer_count,
      imageUrl,
    });
  }, [question?.id, question?.title, question]);

  const likeMutation = useMutation({
    mutationFn: () => api.likeQuestion(question!.id),
    onMutate: () => setOptimisticVote('up'),
    onSuccess: () => {
      setOptimisticVote(null);
      queryClient.invalidateQueries({ queryKey: questionKeys.all });
      queryClient.invalidateQueries({ queryKey: questionKeys.detail(slug) });
    },
    onError: () => {
      setOptimisticVote(null);
      toast.error('Beğeni işlemi başarısız.');
    },
  });
  const unlikeMutation = useMutation({
    mutationFn: () => api.unlikeQuestion(question!.id),
    onMutate: () => setOptimisticVote('down'),
    onSuccess: () => {
      setOptimisticVote(null);
      queryClient.invalidateQueries({ queryKey: questionKeys.all });
      queryClient.invalidateQueries({ queryKey: questionKeys.detail(slug) });
    },
    onError: () => {
      setOptimisticVote(null);
      toast.error('İşlem başarısız.');
    },
  });

  const createAnswerMutation = useMutation({
    mutationFn: ({ content, parentId }: { content: string; parentId?: number }) =>
      api.createAnswer(question!.id, parentId ? { content, parent: parentId } : { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['answers', question?.id] });
      queryClient.invalidateQueries({ queryKey: questionKeys.all });
      queryClient.invalidateQueries({ queryKey: questionKeys.detail(slug) });
      setAnswerText('');
      setAnswerFormOpen(false);
      toast.success('Cevabınız alındı ve moderasyon sonrasında yayınlanacak.');
    },
    onError: () => toast.error('Cevap gönderilemedi. Lütfen tekrar deneyin.'),
  });

  const hasContent = (html: string) => html.replace(/<[^>]*>/g, '').trim().length > 0;

  const handleAnswerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = answerText.trim();
    if (!hasContent(trimmed)) {
      toast.error('Lütfen bir yorum yazın.');
      return;
    }
    createAnswerMutation.mutate({ content: trimmed });
  };

  const handleReplySubmit = (content: string, parentId: number) => {
    createAnswerMutation.mutate({ content, parentId });
  };

  const topLevelAnswers = useMemo(
    () => answers.filter((a) => !a.parent),
    [answers]
  );
  const totalCommentCount = answers.length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 overflow-x-hidden">
        <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-4xl min-w-0">
          <div className="animate-pulse bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 overflow-x-hidden">
        <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-4xl min-w-0">
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">Soru bulunamadı</p>
            <Link href="/sorular" className="mt-4 inline-block text-orange-500 hover:text-orange-600">
              Sorulara dön →
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const author = typeof question.author === 'object' ? question.author : null;
  const authorName = author?.username ?? author?.first_name ?? 'Anonim';
  const isAuthor = currentUser && author && (currentUser.id === author.id || currentUser.username === authorName);
  const hasHtml = contentWithoutMedia && /<[a-z][\s\S]*>/i.test(contentWithoutMedia);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 overflow-x-hidden">
      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-4xl min-w-0">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-800 overflow-hidden mb-6">
          <div className="min-w-0 p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                {author?.profile_picture ? (
                  <OptimizedAvatar src={author.profile_picture} size={32} alt="" className="w-8 h-8 shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-500 shrink-0">
                    {authorName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <Link href={`/profil/${authorName}`} className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-orange-600 shrink-0">
                    u/{authorName}
                  </Link>
                  <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0">
                    {formatTimeAgo(question.created_at)}
                    {question.view_count != null && ` • ${question.view_count} görüntülenme`}
                  </span>
                  {isAuthor && (
                    <Link
                      href={`/soru/${slug}/duzenle`}
                      className="text-sm font-medium text-orange-500 hover:text-orange-600 shrink-0"
                    >
                      Düzenle
                    </Link>
                  )}
                </div>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 break-words">{question.title}</h1>
              {mediaItems.length > 0 && <MediaSlider items={mediaItems} className="mb-6" />}
              {hasHtml ? (
                <div
                  className="prose max-w-none text-gray-700 dark:text-gray-300 mb-6 prose-invert:prose-p:text-gray-300"
                  dangerouslySetInnerHTML={{ __html: contentWithoutMedia }}
                />
              ) : (
                <p className="text-gray-700 dark:text-gray-300 mb-6 whitespace-pre-wrap">{contentWithoutMedia || question.description}</p>
              )}

              <div className="flex items-center gap-4 py-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => currentUser ? likeMutation.mutate() : toast.error('Beğenmek için giriş yapın.')}
                  className={`flex items-center gap-1.5 transition-colors ${optimisticVote === 'up' ? 'text-orange-500' : 'text-gray-500 hover:text-orange-500 dark:text-gray-400 dark:hover:text-orange-500'}`}
                  title="Beğen"
                >
                  <svg className="w-5 h-5" fill={optimisticVote === 'up' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  <span className="text-sm font-medium">{displayVoteCount}</span>
                </button>
                <button
                  onClick={() => currentUser ? unlikeMutation.mutate() : toast.error('Giriş yapın.')}
                  className={`transition-colors ${optimisticVote === 'down' ? 'text-orange-500' : 'text-gray-500 hover:text-orange-500 dark:text-gray-400 dark:hover:text-orange-500'}`}
                  title="Beğenme bırak"
                >
                  <svg className="w-5 h-5" fill={optimisticVote === 'down' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <a
                  href="#cevaplar"
                  className="flex items-center gap-1.5 text-gray-500 hover:text-orange-500 dark:text-gray-400 dark:hover:text-orange-500 transition-colors"
                  title="Yorumlar"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span className="text-sm">{Math.max(totalCommentCount, question.answer_count ?? 0)} yorum</span>
                </a>
                <ShareButton title={question.title} className="flex items-center gap-1.5 text-gray-500 hover:text-orange-500 dark:text-gray-400 dark:hover:text-orange-500 transition-colors shrink-0" />
                {currentUser && (
                  <button
                    onClick={() => setSaveModalOpen(true)}
                    className="flex items-center gap-1.5 text-gray-500 hover:text-orange-500 dark:text-gray-400 dark:hover:text-orange-500 transition-colors ml-auto"
                    title="Kaydet"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    <span className="text-sm">Kaydet</span>
                  </button>
                )}
              </div>

              {currentUser && (
                <div className="py-3 border-t border-gray-200 dark:border-gray-700">
                  {!answerFormOpen ? (
                    <button
                      type="button"
                      onClick={() => setAnswerFormOpen(true)}
                      className="w-full flex items-center gap-2 text-left px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <svg className="w-5 h-5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="font-medium text-sm">Aa</span>
                      <span className="flex-1">Sohbete katıl...</span>
                    </button>
                  ) : (
                    <form onSubmit={handleAnswerSubmit} className="space-y-3">
                      <CommentEditor
                        content={answerText}
                        onChange={setAnswerText}
                        placeholder="Düşüncenizi paylaşın..."
                        minHeight="100px"
                        disabled={createAnswerMutation.isPending}
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Gönderdiğiniz cevap önce moderasyondan geçer, onaylandıktan sonra herkes tarafından görülebilir.
                      </p>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setAnswerFormOpen(false);
                            setAnswerText('');
                          }}
                          className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                        >
                          İptal
                        </button>
                        <button
                          type="submit"
                          disabled={createAnswerMutation.isPending || !hasContent(answerText)}
                          className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                          {createAnswerMutation.isPending ? 'Gönderiliyor...' : 'Yorum yap'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
          </div>

          <div id="cevaplar" className="border-t border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          {answersLoading ? (
            <div className="space-y-4">
              <div className="animate-pulse h-24 bg-gray-100 dark:bg-gray-800 rounded-lg" />
              <div className="animate-pulse h-24 bg-gray-100 dark:bg-gray-800 rounded-lg" />
            </div>
          ) : answers.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 py-4">Henüz yorum yok. İlk yorumu siz yapın!</p>
          ) : (
            <div className="space-y-4">
              {topLevelAnswers.map((answer) => (
                <CommentItem
                  key={answer.id}
                  answer={answer}
                  questionId={question.id}
                  slug={slug}
                  onCreateReply={handleReplySubmit}
                  isSubmitting={createAnswerMutation.isPending}
                  allAnswers={answers}
                  isQuestionAuthor={!!isAuthor}
                  questionTitle={question.title}
                />
              ))}
            </div>
          )}
          </div>
        </div>
        <SaveModal questionId={question.id} isOpen={saveModalOpen} onClose={() => setSaveModalOpen(false)} />
      </main>

      <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-12 py-8">
        <div className="container mx-auto px-4 text-center text-gray-600 dark:text-gray-400">
          <p>© 2026 Marifetli. Tüm hakları saklıdır.</p>
        </div>
      </footer>
    </div>
  );
}
