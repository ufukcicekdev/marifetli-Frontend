import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export const questionKeys = {
  all: ['questions'] as const,
  lists: () => [...questionKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...questionKeys.lists(), filters] as const,
  details: () => [...questionKeys.all, 'detail'] as const,
  detail: (slug: string) => [...questionKeys.details(), slug] as const,
  trending: () => [...questionKeys.all, 'trending'] as const,
  unanswered: () => [...questionKeys.all, 'unanswered'] as const,
};

export function useQuestions(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: questionKeys.list(params || {}),
    queryFn: () => api.getQuestions(params).then((r) => r.data),
  });
}

export function useQuestion(slug: string) {
  return useQuery({
    queryKey: questionKeys.detail(slug),
    queryFn: () => api.getQuestion(slug).then((r) => r.data),
    enabled: !!slug,
  });
}

export function useTrendingQuestions() {
  return useQuery({
    queryKey: questionKeys.trending(),
    queryFn: () => api.getQuestions({ ordering: '-hot_score' }).then((r) => r.data),
  });
}

export function useCreateQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createQuestion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questionKeys.all });
    },
  });
}

export function useLikeQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ questionId }: { questionId: number }) => api.likeQuestion(questionId),
    onSuccess: (_, { questionId }) => {
      queryClient.invalidateQueries({ queryKey: questionKeys.all });
    },
  });
}
