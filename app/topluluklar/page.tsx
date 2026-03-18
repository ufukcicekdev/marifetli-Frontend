'use client';

import Link from 'next/link';
import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { type CommunityListItem } from '@/src/lib/api';
import { useAuthStore } from '@/src/stores/auth-store';
import { useAuthModalStore } from '@/src/stores/auth-modal-store';
import { useUIStore } from '@/src/stores/ui-store';

export interface CategoryItem {
  id: number;
  name: string;
  slug: string;
  parent?: number | null;
  order?: number;
  subcategories?: { id: number; name: string; slug: string }[];
}

const INITIAL_SHOW = 12;
const LOAD_MORE = 12;

function CommunityCard({
  community,
  onJoinClick,
}: {
  community: CommunityListItem;
  onJoinClick: (e: React.MouseEvent, c: CommunityListItem) => void;
}) {
  const letter = (community.name || community.slug || 'r').charAt(0).toUpperCase();
  const isMember = community.is_member ?? false;
  const isModOrOwner = community.is_mod_or_owner ?? false;
  const showLeaveButton = isMember && !isModOrOwner;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 h-full flex flex-col hover:border-orange-200 dark:hover:border-orange-800/50 transition-colors">
      <Link href={`/topluluk/${community.slug}`} className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 shrink-0 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-lg overflow-hidden">
            {community.avatar_url ? (
              <img src={community.avatar_url} alt={`${community.name || community.slug} topluluk logosu`} className="w-full h-full object-cover" />
            ) : (
              letter
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{community.name || community.slug}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              r/{community.slug} · {community.member_count > 0 ? `${community.member_count} üye` : 'Yeni topluluk'}
            </p>
          </div>
        </div>
        {community.description ? (
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">{community.description}</p>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-500 italic line-clamp-2 mb-3">Açıklama yok</p>
        )}
      </Link>
      {showLeaveButton ? (
        <button
          type="button"
          onClick={(e) => onJoinClick(e, community)}
          className="mt-auto w-full rounded-full px-4 py-2 text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          Ayrıl
        </button>
      ) : isModOrOwner ? (
        <div className="mt-auto pt-2 text-center">
          <span className="text-xs text-gray-500 dark:text-gray-400">Yönetici</span>
        </div>
      ) : (
        <button
          type="button"
          onClick={(e) => onJoinClick(e, community)}
          className="mt-auto w-full rounded-full px-4 py-2 text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 transition-colors"
        >
          Katılmak
        </button>
      )}
    </div>
  );
}

export default function TopluluklarPage() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const openAuth = useAuthModalStore((s) => s.open);
  const setPageSearchScope = useUIStore((s) => s.setPageSearchScope);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showCount, setShowCount] = useState(INITIAL_SHOW);

  const setCategory = (slug: string | null) => {
    setActiveCategory(slug);
    setShowCount(INITIAL_SHOW);
    setPageSearchScope(slug ? { type: 'category', slug } : null);
  };

  useEffect(() => {
    return () => setPageSearchScope(null);
  }, [setPageSearchScope]);

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.getCategories();
      const raw = res.data;
      const list = Array.isArray(raw) ? raw : (raw as { results?: CategoryItem[] })?.results ?? [];
      return (list as CategoryItem[]).filter((c) => !c.parent) as CategoryItem[];
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

  const categoriesTree = categoriesData ?? [];
  const allCommunities = (communitiesData ?? []) as CommunityListItem[];

  const getCategoryDisplayName = (slug: string) => {
    for (const main of categoriesTree) {
      if (main.slug === slug) return main.name;
      const sub = main.subcategories?.find((s) => s.slug === slug);
      if (sub) return `${main.name} › ${sub.name}`;
    }
    return slug;
  };

  const displayedCommunities = useMemo(
    () => allCommunities.slice(0, showCount),
    [allCommunities, showCount]
  );
  const hasMore = allCommunities.length > showCount;

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

  const sectionTitle = activeCategory
    ? getCategoryDisplayName(activeCategory)
    : 'Sizin için önerilenler';

  return (
    <div className="min-h-screen w-full">
      <main className="w-full min-h-screen px-3 sm:px-4 py-6 sm:py-8 max-w-5xl mx-auto">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
              Toplulukları Keşfedin
            </h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400 text-sm">
              Kategorilere göz atın, topluluklara katılın veya kendi topluluğunuzu oluşturun.
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

        {/* Boş durum: topluluk yoksa hemen başlık altında göster */}
        {!isLoading && !error && allCommunities.length === 0 && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-8 sm:p-12 text-center mb-8">
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {activeCategory
                ? 'Bu kategoride henüz topluluk yok.'
                : 'Henüz topluluk oluşturulmamış.'}
            </p>
            {isAuthenticated && (
              <Link
                href="/topluluklar/olustur"
                className="inline-block rounded-full bg-orange-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-600"
              >
                İlk topluluğu oluştur
              </Link>
            )}
          </div>
        )}

        {/* Kategori sekmeleri - ana kategori altında alt kategoriler */}
        {categoriesTree.length > 0 && (
          <div className="mb-8 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setCategory(null)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeCategory === null
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Tümü
              </button>
            </div>
            <div className="flex flex-col gap-4 sm:gap-3">
              {categoriesTree.map((main) => (
                <div key={main.id}>
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    {main.name}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setCategory(main.slug)}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
                        activeCategory === main.slug
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {main.name}
                    </button>
                    {(main.subcategories || []).map((sub) => (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => setCategory(sub.slug)}
                        className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
                          activeCategory === sub.slug
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                      >
                        {sub.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full" />
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 text-amber-800 dark:text-amber-200">
            Topluluklar yüklenemedi. Lütfen sayfayı yenileyin.
          </div>
        )}

        {!isLoading && !error && allCommunities.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
              {sectionTitle}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedCommunities.map((c) => (
                <CommunityCard key={c.id} community={c} onJoinClick={handleJoinClick} />
              ))}
            </div>
            {hasMore && (
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => setShowCount((n) => n + LOAD_MORE)}
                  className="rounded-full border border-gray-300 dark:border-gray-600 px-6 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Daha fazlasını göster
                </button>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
