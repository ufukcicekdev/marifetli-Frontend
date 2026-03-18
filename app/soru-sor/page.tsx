'use client';

import Link from 'next/link';
import toast from 'react-hot-toast';
import { Suspense, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '@/src/lib/api';
import { useAuthStore } from '@/src/stores/auth-store';
import { checkRecentAchievementUnlock } from '@/src/lib/check-achievement-unlock';
import { QuestionForm, type QuestionFormPayload } from '@/src/components/question-form';

function SoruSorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  const communitySlug = searchParams.get('community');

  const { data: community } = useQuery({
    queryKey: ['community', communitySlug],
    queryFn: () => api.getCommunity(communitySlug!).then((r) => r.data),
    enabled: !!communitySlug,
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && !isAuthenticated) {
      router.replace('/giris');
    }
  }, [isAuthenticated, router]);

  const createMutation = useMutation({
    mutationFn: (payload: QuestionFormPayload) => api.createQuestionRaw(payload).then((r) => r.data),
    onSuccess: (data) => {
      toast.success(data?.slug ? 'Gönderi yayınlandı!' : 'Kaydedildi');
      checkRecentAchievementUnlock();
      const slug = data?.slug;
      if (slug) router.push(`/soru/${slug}`);
      else if (communitySlug) router.push(`/topluluk/${communitySlug}`);
      else router.push('/sorular');
    },
    onError: () => toast.error('Gönderi oluşturulamadı'),
  });

  const handleSubmit = (data: QuestionFormPayload, asDraft?: boolean) => {
    createMutation.mutate({ ...data, status: asDraft ? 'draft' : 'open' });
  };

  const initialValues = useMemo(() => {
    if (!community) return undefined;
    return {
      title: '',
      content: '',
      categoryId: community.category ?? null,
      tagIds: [],
    };
  }, [community]);

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen overflow-x-hidden">
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-3xl min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {community ? `r/${community.slug} için gönderi` : 'Gönderi Oluştur'}
          </h1>
          <div className="flex gap-3">
            {community && (
              <Link href={`/topluluk/${communitySlug}`} className="text-sm text-orange-500 hover:text-orange-600">
                ← Topluluğa dön
              </Link>
            )}
            <Link href="/sorular" className="text-sm text-orange-500 hover:text-orange-600">
              Taslaklar
            </Link>
          </div>
        </div>

        <QuestionForm
          mode="create"
          initialValues={initialValues}
          communityId={community?.id ?? undefined}
          onSubmit={handleSubmit}
          isSubmitting={createMutation.isPending}
          showDraftButton
        />
      </main>
    </div>
  );
}

export default function SoruSorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Yükleniyor...</p></div>}>
      <SoruSorContent />
    </Suspense>
  );
}
