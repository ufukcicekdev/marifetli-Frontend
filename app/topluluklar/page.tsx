'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { type CommunityListItem } from '@/src/lib/api';
import { useAuthStore } from '@/src/stores/auth-store';
import { useAuthModalStore } from '@/src/stores/auth-modal-store';

export interface CategoryItem {
  id: number;
  name: string;
  slug: string;
  parent: number | null;
  order?: number;
}

function CommunityCard({
  community,
  onJoinClick,
}: {
  community: CommunityListItem;
  onJoinClick: (e: React.MouseEvent, c: CommunityListItem) => void;
}) {
  const letter = (community.name || community.slug || 'r').charAt(0).toUpperCase();
  const isMember = community.is_member ?? false;

  return (
    <div className="flex items-center gap-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 hover:border-orange-200 dark:hover:border-orange-800/50 transition-colors">
      <Link href={`/topluluk/${community.slug}`} className="flex min-w-0 flex-1 items-center gap-4">
        <div className="w-10 h-10 shrink-0 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-sm">
          {letter}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">r/{community.slug}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {community.member_count > 0 ? `${community.member_count} üye` : 'Yeni topluluk'}
          </p>
          {community.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{community.description}</p>
          )}
        </div>
      </Link>
      <button
        type="button"
        onClick={(e) => onJoinClick(e, community)}
        className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
          isMember
            ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            : 'bg-orange-500 text-white hover:bg-orange-600'
        }`}
      >
        {isMember ? 'Ayrıl' : 'Katıl'}
      </button>
    </div>
  );
}

export default function TopluluklarPage() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const openAuth = useAuthModalStore((s) => s.open);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.getCategories();
      const raw = res.data;
      const list = Array.isArray(raw) ? raw : (raw as { results?: CategoryItem[] })?.results ?? [];
      return (list as CategoryItem[]).filter((c) => !c.parent);
    },
  });

  const { data: communitiesData, isLoading, error } = useQuery({
    queryKey: ['communities', activeCategory],
    queryFn: async () => {
      const res = await api.getCommunities(activeCategory ? { category: activeCategory } : undefined);
      return Array.isArray(res.data) ? res.data : (res.data as { results?: CommunityListItem[] })?.results ?? [];
    },
  });

  const followMutation = useMutation({
    mutationFn: (slug: string) => api.joinCommunity(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: (slug: string) => api.leaveCommunity(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
    },
  });

  const categories = categoriesData ?? [];
  const communities = (communitiesData ?? []) as CommunityListItem[];

  const handleJoinClick = (e: React.MouseEvent, c: CommunityListItem) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      openAuth('login');
      return;
    }
    if (c.is_member) {
      unfollowMutation.mutate(c.slug);
    } else {
      followMutation.mutate(c.slug);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-4xl">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
              Toplulukları Keşfet
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Kategorilere göre topluluklara göz atın. Katıl butonuyla topluluğa üye olun veya kendi topluluğunuzu oluşturun.
            </p>
          </div>
          {isAuthenticated && (
            <Link
              href="/topluluklar/olustur"
              className="shrink-0 rounded-full bg-orange-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-600"
            >
              + Topluluk oluştur
            </Link>
          )}
        </div>

        {categories.length > 0 && (
          <div className="mb-8 overflow-x-auto pb-2 -mx-1">
            <div className="flex gap-1 min-w-0">
              <button
                type="button"
                onClick={() => setActiveCategory(null)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  activeCategory === null
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Tümü
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.slug)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    activeCategory === cat.slug
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full" />
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 text-amber-800 dark:text-amber-200">
            Topluluklar yüklenemedi. Lütfen sayfayı yenileyin.
          </div>
        )}

        {!isLoading && !error && communities.length === 0 && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {activeCategory
                ? 'Bu kategoride henüz topluluk yok.'
                : 'Henüz topluluk oluşturulmamış.'}
            </p>
            {isAuthenticated && (
              <Link
                href="/topluluklar/olustur"
                className="inline-block rounded-full bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
              >
                İlk topluluğu oluştur
              </Link>
            )}
          </div>
        )}

        {!isLoading && !error && communities.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              {activeCategory
                ? `${categories.find((c) => c.slug === activeCategory)?.name ?? activeCategory} altındaki topluluklar`
                : 'Tüm topluluklar'}
            </h2>
            <div className="space-y-3">
              {communities.map((c) => (
                <CommunityCard key={c.id} community={c} onJoinClick={handleJoinClick} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
