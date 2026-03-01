'use client';

import Link from 'next/link';
import toast from 'react-hot-toast';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import api from '@/src/lib/api';
import { useAuthStore } from '@/src/stores/auth-store';
import { QuestionForm, type QuestionFormPayload } from '@/src/components/question-form';

export default function SoruSorPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (typeof window !== 'undefined' && !isAuthenticated) {
      router.replace('/giris');
    }
  }, [isAuthenticated, router]);

  const createMutation = useMutation({
    mutationFn: (payload: QuestionFormPayload) => api.createQuestionRaw(payload).then((r) => r.data),
    onSuccess: (data) => {
      toast.success(data?.slug ? 'Gönderi yayınlandı!' : 'Kaydedildi');
      const slug = data?.slug;
      if (slug) router.push(`/soru/${slug}`);
      else router.push('/sorular');
    },
    onError: () => toast.error('Gönderi oluşturulamadı'),
  });

  const handleSubmit = (data: QuestionFormPayload, asDraft?: boolean) => {
    createMutation.mutate({ ...data, status: asDraft ? 'draft' : 'open' });
  };

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 overflow-x-hidden">
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-3xl min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Gönderi Oluştur</h1>
          <Link href="/sorular" className="text-sm text-orange-500 hover:text-orange-600">
            Taslaklar
          </Link>
        </div>

        <QuestionForm
          mode="create"
          onSubmit={handleSubmit}
          isSubmitting={createMutation.isPending}
          showDraftButton
        />
      </main>
    </div>
  );
}
