'use client';

import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { type CommunityListItem } from '@/src/lib/api';
import { useAuthStore } from '@/src/stores/auth-store';
import { useAuthModalStore } from '@/src/stores/auth-modal-store';

export default function CommunityDetailPage({ params }: { params: { slug: string } }) {
  const slug = params?.slug as string;
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const openAuth = useAuthModalStore((s) => s.open);

  const { data: community, isLoading, error } = useQuery({
    queryKey: ['community', slug],
    queryFn: () => api.getCommunity(slug).then((r) => r.data),
    enabled: !!slug,
  });

  const joinMutation = useMutation({
    mutationFn: () => api.joinCommunity(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community', slug] });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: () => api.leaveCommunity(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community', slug] });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !community) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Topluluk bulunamadı.</p>
          <Link href="/topluluklar" className="mt-4 inline-block text-orange-500 hover:underline">
            Toplulukları keşfet →
          </Link>
        </div>
      </div>
    );
  }

  const isMember = community.is_member ?? false;
  const letter = (community.name || community.slug).charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-4xl">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="w-16 h-16 shrink-0 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-2xl">
              {letter}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">r/{community.slug}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {community.category_name} · {community.member_count} üye
              </p>
              {community.description && (
                <p className="mt-3 text-gray-600 dark:text-gray-400">{community.description}</p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {isAuthenticated ? (
                  isMember ? (
                    <button
                      type="button"
                      onClick={() => leaveMutation.mutate()}
                      disabled={leaveMutation.isPending}
                      className="rounded-full bg-gray-200 dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                    >
                      Ayrıl
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => joinMutation.mutate()}
                      disabled={joinMutation.isPending}
                      className="rounded-full bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
                    >
                      Katıl
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={() => openAuth('login')}
                    className="rounded-full bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
                  >
                    Katılmak için giriş yapın
                  </button>
                )}
                <Link
                  href="/topluluklar"
                  className="rounded-full border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  ← Topluluklar
                </Link>
              </div>
            </div>
          </div>
        </div>
        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Bu topluluktaki içerikler yakında burada listelenecek.
        </p>
      </main>
    </div>
  );
}
