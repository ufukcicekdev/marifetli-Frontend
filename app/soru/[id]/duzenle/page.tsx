'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/src/lib/api';
import type { Tag } from '@/src/types';
import { useAuthStore } from '@/src/stores/auth-store';
import { useQuestion } from '@/src/hooks/use-questions';
import { QuestionForm, type QuestionFormPayload, type QuestionFormInitial } from '@/src/components/question-form';
import { questionKeys } from '@/src/hooks/use-questions';

export default function QuestionEditPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const slug = params?.id as string;
  const { user: currentUser } = useAuthStore();
  const { data: question, isLoading, error } = useQuestion(slug ?? '');

  const updateMutation = useMutation({
    mutationFn: (payload: QuestionFormPayload) =>
      api.updateQuestion(slug, { ...payload, status: (question?.status ?? 'open') as 'draft' | 'open' | 'closed' | 'archived' }),
    onSuccess: () => {
      toast.success('Gönderi güncellendi');
      queryClient.invalidateQueries({ queryKey: questionKeys.all });
      router.push(`/soru/${slug}`);
    },
    onError: () => toast.error('Güncelleme başarısız'),
  });

  const author = typeof question?.author === 'object' ? question.author : null;
  const isAuthor = currentUser && author && (currentUser.id === author.id || currentUser.username === author?.username);

  const initialValues: QuestionFormInitial | undefined = question
    ? {
        title: question.title,
        content: (question as { content?: string }).content || question.description || '',
        categoryId: (() => {
          const cat = question as { category?: number | { id?: number } };
          return typeof cat.category === 'object' ? cat.category?.id ?? null : cat.category ?? null;
        })(),
        tagIds: (question.tags ?? []).map((t) => (typeof t === 'object' && t && 'id' in t ? t.id : t as number)),
        tagsFromQuestion: (question.tags ?? [])
          .filter((t): t is Tag => typeof t === 'object' && t != null && 'id' in t && 'name' in t)
          .map((t) => ({ id: t.id, name: t.name })),
      }
    : undefined;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-3xl min-w-0">
          <div className="animate-pulse bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-3xl min-w-0">
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">Soru bulunamadı</p>
            <Link href="/sorular" className="mt-4 inline-block text-orange-500 hover:text-orange-600">Sorulara dön →</Link>
          </div>
        </main>
      </div>
    );
  }

  if (!isAuthor) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-3xl min-w-0">
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">Bu gönderiyi düzenleme yetkiniz yok.</p>
            <Link href={`/soru/${slug}`} className="mt-4 inline-block text-orange-500 hover:text-orange-600">Geri dön →</Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 overflow-x-hidden">
      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-3xl min-w-0">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Gönderiyi Düzenle</h1>
          <Link href={`/soru/${slug}`} className="text-sm text-orange-500 hover:text-orange-600">İptal</Link>
        </div>

        <QuestionForm
          key={slug}
          mode="edit"
          initialValues={initialValues}
          onSubmit={(data) => updateMutation.mutate(data)}
          isSubmitting={updateMutation.isPending}
          showDraftButton={false}
        />
      </main>
    </div>
  );
}
