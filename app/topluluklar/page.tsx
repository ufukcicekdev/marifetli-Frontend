'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
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
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [showCount, setShowCount] = useState(INITIAL_SHOW);

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
  const allCommunities = (communitiesData ?? []) as CommunityListItem[];

  const filteredCommunities = useMemo(() => {
    if (!searchInput.trim()) return allCommunities;
    const q = searchInput.trim().toLowerCase();
    return allCommunities.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.slug?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q)
    );
  }, [allCommunities, searchInput]);

  const displayedCommunities = useMemo(
    () => filteredCommunities.slice(0, showCount),
    [filteredCommunities, showCount]
  );
  const hasMore = filteredCommunities.length > showCount;

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
    ? categories.find((c) => c.slug === activeCategory)?.name ?? activeCategory
    : 'Sizin için önerilenler';

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 w-full">
      {/* Reddit gibi tam genişlik: ortalı değil, sol sidebar'dan sağ kenara kadar */}
      <main className="w-full min-h-screen px-3 sm:px-4 py-6 sm:py-8">
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

        {/* Arama - Reddit tarzı geniş arama çubuğu (z-index ile tıklanabilir) */}
        <div className="mb-6 relative z-10">
          <div className="relative w-full max-w-2xl">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Herhangi bir şey bulun"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              autoComplete="off"
              aria-label="Topluluk ara"
            />
          </div>
        </div>

        {/* Kategori sekmeleri - yatay kaydırılabilir */}
        {categories.length > 0 && (
          <div className="mb-8 overflow-x-auto pb-2 -mx-1 scrollbar-thin">
            <div className="flex gap-2 min-w-max">
              <button
                type="button"
                onClick={() => { setActiveCategory(null); setShowCount(INITIAL_SHOW); }}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
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
                  onClick={() => { setActiveCategory(cat.slug); setShowCount(INITIAL_SHOW); }}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
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
          <div className="flex justify-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full" />
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 text-amber-800 dark:text-amber-200">
            Topluluklar yüklenemedi. Lütfen sayfayı yenileyin.
          </div>
        )}

        {!isLoading && !error && filteredCommunities.length === 0 && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {searchInput.trim()
                ? 'Aramanızla eşleşen topluluk bulunamadı.'
                : activeCategory
                  ? 'Bu kategoride henüz topluluk yok.'
                  : 'Henüz topluluk oluşturulmamış.'}
            </p>
            {isAuthenticated && !searchInput.trim() && (
              <Link
                href="/topluluklar/olustur"
                className="inline-block rounded-full bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
              >
                İlk topluluğu oluştur
              </Link>
            )}
          </div>
        )}

        {!isLoading && !error && filteredCommunities.length > 0 && (
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
