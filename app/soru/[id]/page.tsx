'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useQuestion } from '@/src/hooks/use-questions';
import api from '@/src/lib/api';
import type { Answer } from '@/src/types';
import { useAuthStore } from '@/src/stores/auth-store';
import { formatTimeAgo } from '@/src/lib/format-time';
import { extractMediaFromHtml, stripMediaFromHtml } from '@/src/lib/extract-media';
import { MediaSlider } from '@/src/components/media-slider';
import { SaveModal } from '@/src/components/save-modal';

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
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-800 p-4 sm:p-6 mb-6 overflow-hidden">
          <div className="flex items-start gap-3 sm:gap-4 min-w-0">
            <div className="flex flex-col items-center shrink-0 text-gray-500 dark:text-gray-400">
              <span className="font-bold text-lg">{question.like_count ?? 0}</span>
              <span>oy</span>
              <button className="mt-2 text-gray-400 hover:text-orange-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
              </button>
            </div>

            <div className="flex-1 min-w-0">
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

              <div className="flex flex-wrap gap-2 mb-6">
                {question.tags?.map((tag) => (
                  <span key={tag.id} className="bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-sm font-medium px-2.5 py-0.5 rounded">
                    {tag.name}
                  </span>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex items-center gap-3 min-w-0">
                  {currentUser && (
                    <button
                      onClick={() => setSaveModalOpen(true)}
                      className="text-sm font-medium text-orange-500 hover:text-orange-600 shrink-0 flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                      Kaydet
                    </button>
                  )}
                  {isAuthor && (
                    <Link
                      href={`/soru/${slug}/duzenle`}
                      className="text-sm font-medium text-orange-500 hover:text-orange-600 shrink-0"
                    >
                      Düzenle
                    </Link>
                  )}
                  {author?.profile_picture ? (
                    <img src={author.profile_picture} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-lg font-bold text-gray-500">
                      {authorName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="ml-3">
                    <Link href={`/profil/${authorName}`} className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-orange-600">
                      u/{authorName}
                    </Link>
                  </div>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 shrink-0">
                  <span>{question.view_count ?? 0} görüntülenme • {formatTimeAgo(question.created_at)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <SaveModal questionId={question.id} isOpen={saveModalOpen} onClose={() => setSaveModalOpen(false)} />

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-800 p-4 sm:p-6 mb-6 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
              {answers.length} Cevap
            </h2>
            {currentUser && (
              <button
                onClick={() => setAnswerFormOpen((o) => !o)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  answerFormOpen
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    : 'bg-orange-500 hover:bg-orange-600 text-white'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {answerFormOpen ? 'İptal' : 'Cevapla'}
              </button>
            )}
          </div>

          {answerFormOpen && currentUser && (
            <form className="mb-6 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
              <textarea
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 mb-3"
                placeholder="Cevabınızı buraya yazın..."
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-500 text-white rounded-md text-sm font-medium hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  Cevabı Gönder
                </button>
              </div>
            </form>
          )}

          {answersLoading ? (
            <div className="space-y-4">
              <div className="animate-pulse h-24 bg-gray-100 dark:bg-gray-800 rounded-lg" />
              <div className="animate-pulse h-24 bg-gray-100 dark:bg-gray-800 rounded-lg" />
            </div>
          ) : answers.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 py-4">Henüz cevap yok. İlk cevabı siz yazın!</p>
          ) : (
            <div className="space-y-6">
              {answers.map((answer) => {
                const ansAuthor = typeof answer.author === 'object' ? answer.author : null;
                const ansAuthorName = ansAuthor?.username ?? ansAuthor?.first_name ?? 'Anonim';
                return (
                  <div
                    key={answer.id}
                    className={`p-4 rounded-lg ${answer.is_best_answer ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-800/50'}`}
                  >
                    {answer.is_best_answer && (
                      <div className="flex items-center mb-2">
                        <span className="bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 text-xs font-medium px-2 py-1 rounded">
                          ✓ En İyi Cevap
                        </span>
                      </div>
                    )}
                    <div className="flex gap-3 sm:gap-4 min-w-0">
                      <div className="flex flex-col items-center shrink-0 text-gray-500 dark:text-gray-400">
                        <span className="font-bold text-lg">{answer.like_count ?? 0}</span>
                        <span>oy</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300 mb-4"
                          dangerouslySetInnerHTML={{ __html: answer.content }}
                        />
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-gray-200 dark:border-gray-700 pt-4">
                          <div className="flex items-center">
                            {ansAuthor?.profile_picture ? (
                              <img src={ansAuthor.profile_picture} alt="" className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-500">
                                {ansAuthorName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="ml-2">
                              <Link href={`/profil/${ansAuthorName}`} className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-orange-600">
                                u/{ansAuthorName}
                              </Link>
                            </div>
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {formatTimeAgo(answer.created_at)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-12 py-8">
        <div className="container mx-auto px-4 text-center text-gray-600 dark:text-gray-400">
          <p>© 2026 Marifetli. Tüm hakları saklıdır.</p>
        </div>
      </footer>
    </div>
  );
}
