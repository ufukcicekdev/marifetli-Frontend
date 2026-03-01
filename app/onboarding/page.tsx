'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/src/lib/api';
import { useAuthStore } from '@/src/stores/auth-store';

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  step_type: string;
  order: number;
  max_selections: number;
  choices: { id: number; label: string; value: string; order: number }[];
}

export default function OnboardingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const [stepIndex, setStepIndex] = useState(0);
  const [selections, setSelections] = useState<Record<number, number[]>>({});
  const [categories, setCategories] = useState<{ id: number; name: string; slug: string }[]>([]);
  const [tags, setTags] = useState<{ id: number; name: string; slug: string }[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !isAuthenticated) {
      router.replace('/giris');
    }
  }, [isAuthenticated, router]);

  const { data: stepsRaw, isLoading } = useQuery({
    queryKey: ['onboardingSteps'],
    queryFn: () => api.getOnboardingSteps().then((r) => r.data),
  });

  const steps = Array.isArray(stepsRaw) ? stepsRaw : ((stepsRaw as unknown as { results?: OnboardingStep[] })?.results ?? []);

  useEffect(() => {
    if (steps.some((s: OnboardingStep) => s.step_type === 'category')) {
      api.getOnboardingCategories().then((r) => setCategories(r.data));
    }
    if (steps.some((s: OnboardingStep) => s.step_type === 'tag')) {
      api.getOnboardingTags().then((r) => setTags(r.data));
    }
  }, [steps]);

  const submitMutation = useMutation({
    mutationFn: (payload: { step_id: number; category_ids?: number[]; tag_ids?: number[]; choice_ids?: number[] }) =>
      api.submitOnboarding(payload),
  });

  const completeMutation = useMutation({
    mutationFn: () => api.completeOnboarding(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboardingStatus'] });
      router.push('/sorular');
    },
  });

  const currentStep = steps[stepIndex] as OnboardingStep | undefined;
  const selectedIds = currentStep ? (selections[currentStep.id] || []) : [];

  const toggleSelection = (id: number) => {
    if (!currentStep) return;
    const max = currentStep.max_selections || 999;
    const prev = selections[currentStep.id] || [];
    const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(-max);
    setSelections((s) => ({ ...s, [currentStep.id]: next }));
  };

  const handleNext = async () => {
    if (!currentStep) return;
    const ids = selections[currentStep.id] || [];
    if (ids.length === 0) return;

    const payload: { step_id: number; category_ids?: number[]; tag_ids?: number[]; choice_ids?: number[] } = {
      step_id: currentStep.id,
    };
    if (currentStep.step_type === 'category') payload.category_ids = ids;
    else if (currentStep.step_type === 'tag') payload.tag_ids = ids;
    else if (currentStep.step_type === 'custom') payload.choice_ids = ids;

    await submitMutation.mutateAsync(payload);

    if (stepIndex >= steps.length - 1) {
      await completeMutation.mutateAsync();
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  const handleSkip = () => {
    if (stepIndex >= steps.length - 1) {
      completeMutation.mutate();
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  if (!isAuthenticated) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Yükleniyor...</div>
      </div>
    );
  }

  if (steps.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Henüz onboarding adımı tanımlanmamış. Admin panelden adımları ekleyebilirsiniz.
          </p>
          <button
            onClick={() => completeMutation.mutate()}
            disabled={completeMutation.isPending}
            className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-50"
          >
            {completeMutation.isPending ? 'Yönlendiriliyor...' : 'Devam Et'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-lg">
        <div className="mb-6">
          <div className="flex gap-1 mb-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full ${
                  i <= stepIndex ? 'bg-orange-500' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-gray-500">
            Adım {stepIndex + 1} / {steps.length}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-lg">
          {currentStep && (
            <>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{currentStep.title}</h2>
              {currentStep.description && (
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">{currentStep.description}</p>
              )}

              <div className="space-y-2 mb-6">
                {currentStep.step_type === 'custom' &&
                  currentStep.choices.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleSelection(c.id)}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                        selectedIds.includes(c.id)
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}

                {currentStep.step_type === 'category' &&
                  categories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleSelection(c.id)}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                        selectedIds.includes(c.id)
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}

                {currentStep.step_type === 'tag' &&
                  tags.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleSelection(t.id)}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                        selectedIds.includes(t.id)
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
              </div>

              {currentStep.max_selections > 0 && (
                <p className="text-xs text-gray-500 mb-4">
                  En fazla {currentStep.max_selections} seçim yapabilirsiniz.
                </p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleSkip}
                  className="flex-1 py-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-400"
                >
                  Atla
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={selectedIds.length === 0 || submitMutation.isPending || completeMutation.isPending}
                  className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg disabled:opacity-50"
                >
                  {stepIndex >= steps.length - 1 ? 'Bitir' : 'İleri'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
