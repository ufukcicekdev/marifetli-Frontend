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
  currentUserId,
  onJoinClick,
}: {
  community: CommunityListItem;
  currentUserId: number | null;
  onJoinClick: (e: React.MouseEvent, c: CommunityListItem) => void;
}) {
  const letter = (community.name || community.slug || 'r').charAt(0).toUpperCase();
  const isMember = community.is_member ?? false;
  const isModOrOwner = community.is_mod_or_owner ?? false;
  const isOwnerUser =
    community.is_owner ?? (currentUserId != null && community.owner === currentUserId);
  const showLeaveButton = isMember && !isOwnerUser;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 h-full flex flex-col hover:border-brand/30/50 transition-colors">
      <Link href={`/topluluk/${community.slug}`} className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 shrink-0 rounded-full bg-brand text-white flex items-center justify-center font-bold text-lg overflow-hidden">
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
      <div className="mt-auto flex flex-col gap-2 w-full">
        {isModOrOwner && (
          <Link
            href={`/topluluk/${community.slug}?modal=yonet`}
            onClick={(e) => e.stopPropagation()}
            className="w-full text-center rounded-full border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Yönet
          </Link>
        )}
        {showLeaveButton && (
          <button
            type="button"
            onClick={(e) => onJoinClick(e, community)}
            className="w-full rounded-full px-4 py-2 text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Ayrıl
          </button>
        )}
        {!isMember && !isModOrOwner && (
          <button
            type="button"
            onClick={(e) => onJoinClick(e, community)}
            className="w-full rounded-full px-4 py-2 text-sm font-medium bg-brand text-white hover:bg-brand-hover transition-colors"
          >
            Katılmak
          </button>
        )}
      </div>
    </div>
  );
}

export default function TopluluklarPage() {
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthStore();
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

  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.getCategories();
      const raw = res.data as { results?: CategoryItem[] } | CategoryItem[] | undefined;
      const list = Array.isArray(raw)
        ? raw
        : raw && typeof raw === 'object' && Array.isArray((raw as { results?: CategoryItem[] }).results)
          ? (raw as { results: CategoryItem[] }).results
          : [];
      return (list as CategoryItem[]).filter((c) => !(c as { parent?: number | null }).parent);
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

  /** Tümü: category_slug → topluluklar (çiplerin hemen altında gösterilir) */
  const communitiesBySlug = useMemo(() => {
    const m = new Map<string, CommunityListItem[]>();
    for (const c of allCommunities) {
      const slug = (c.category_slug || '').trim() || '_none';
      if (!m.has(slug)) m.set(slug, []);
      m.get(slug)!.push(c);
    }
    return m;
  }, [allCommunities]);

  const orphanCommunities = useMemo(() => {
    if (activeCategory != null || categoriesTree.length === 0) return [];
    const known = new Set<string>();
    for (const main of categoriesTree) {
      known.add(main.slug);
      for (const sub of main.subcategories || []) known.add(sub.slug);
    }
    return allCommunities.filter((c) => {
      const s = (c.category_slug || '').trim();
      return !s || !known.has(s);
    });
  }, [activeCategory, allCommunities, categoriesTree]);

  const displayedCommunities = useMemo(
    () => allCommunities.slice(0, showCount),
    [allCommunities, showCount]
  );
  const hasMore = activeCategory != null && allCommunities.length > showCount;

  const showCommunitiesUnderCategories =
    activeCategory === null && !isLoading && !error && allCommunities.length > 0;

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
              className="shrink-0 rounded-full bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-hover"
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
                className="inline-block rounded-full bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-hover"
              >
                İlk topluluğu oluştur
              </Link>
            )}
          </div>
        )}

        {/* Kategoriler + (Tümü iken) o kategorideki topluluklar hemen altında */}
        {categoriesTree.length > 0 && (
          <div className="mb-8 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setCategory(null)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeCategory === null
                    ? 'bg-brand text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Tümü
              </button>
            </div>
            <div className="flex flex-col gap-8 sm:gap-6">
              {categoriesTree.map((main) => {
                const mainItems = communitiesBySlug.get(main.slug) ?? [];
                const subs = main.subcategories || [];
                return (
                  <div key={main.id} className="rounded-xl border border-gray-200/80 dark:border-gray-700/80 bg-gray-50/40 dark:bg-gray-800/20 p-4 sm:p-5">
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                      {main.name}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setCategory(main.slug)}
                        className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
                          activeCategory === main.slug
                            ? 'bg-brand text-white'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        {main.name}
                      </button>
                      {subs.map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => setCategory(sub.slug)}
                          className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
                            activeCategory === sub.slug
                              ? 'bg-brand text-white'
                              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          {sub.name}
                        </button>
                      ))}
                    </div>

                    {showCommunitiesUnderCategories && (
                      <div className="mt-5 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-6">
                        {mainItems.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                              {main.name} — doğrudan bu kategorideki topluluklar
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              {mainItems.map((c) => (
                                <CommunityCard
                                  key={c.id}
                                  community={c}
                                  currentUserId={user?.id ?? null}
                                  onJoinClick={handleJoinClick}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                        {subs.map((sub) => {
                          const subItems = communitiesBySlug.get(sub.slug) ?? [];
                          if (subItems.length === 0) return null;
                          return (
                            <div key={sub.id}>
                              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 pl-3 border-l-4 border-brand">
                                {sub.name}
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {subItems.map((c) => (
                                  <CommunityCard
                                    key={c.id}
                                    community={c}
                                    currentUserId={user?.id ?? null}
                                    onJoinClick={handleJoinClick}
                                  />
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              {showCommunitiesUnderCategories && orphanCommunities.length > 0 && (
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 sm:p-5">
                  <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3">Diğer</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    Ağaçta eşleşmeyen kategori slug’ına sahip topluluklar.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {orphanCommunities.map((c) => (
                      <CommunityCard
                        key={c.id}
                        community={c}
                        currentUserId={user?.id ?? null}
                        onJoinClick={handleJoinClick}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-brand border-t-transparent rounded-full" />
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 text-amber-800 dark:text-amber-200">
            Topluluklar yüklenemedi. Lütfen sayfayı yenileyin.
          </div>
        )}

        {/* Tek kategori seçiliyken: altta tek liste + sayfalama */}
        {!isLoading && !error && allCommunities.length > 0 && activeCategory != null && (
          <section>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
              {sectionTitle}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedCommunities.map((c) => (
                <CommunityCard
                  key={c.id}
                  community={c}
                  currentUserId={user?.id ?? null}
                  onJoinClick={handleJoinClick}
                />
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

        {/* Kategori ağacı gelmediyse ama topluluk var: basit liste */}
        {!isLoading &&
          !error &&
          !categoriesLoading &&
          activeCategory === null &&
          categoriesTree.length === 0 &&
          allCommunities.length > 0 && (
            <section className="mt-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Topluluklar</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {allCommunities.map((c) => (
                  <CommunityCard
                    key={c.id}
                    community={c}
                    currentUserId={user?.id ?? null}
                    onJoinClick={handleJoinClick}
                  />
                ))}
              </div>
            </section>
          )}
      </main>
    </div>
  );
}
