'use client';

import { use, useMemo, useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { type CommunityListItem } from '@/src/lib/api';
import type { Question } from '@/src/types';
import { useAuthStore } from '@/src/stores/auth-store';
import { useAuthModalStore } from '@/src/stores/auth-modal-store';
import { PostItem } from '@/src/components/post-item';
import { PostFeedControls, type SortOption, type ViewMode } from '@/src/components/post-feed-controls';
import { RemoveFromCommunityModal } from '@/src/components/remove-from-community-modal';
import { CommunitySettingsModal } from '@/src/components/community-settings-modal';
import { ShareButton } from '@/src/components/share-button';
import { formatTimeAgo } from '@/src/lib/format-time';
import { postItemAuthorFields } from '@/src/lib/post-item-author';
import toast from 'react-hot-toast';
import { useSearchParams, useRouter } from 'next/navigation';

const SORT_TO_KEY: Record<SortOption, keyof Question | 'hot_score'> = {
  best: 'hot_score',
  hot: 'hot_score',
  new: 'created_at',
  top: 'like_count',
};

function CommunityDetailContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthStore();
  const openAuth = useAuthModalStore((s) => s.open);
  const [sort, setSort] = useState<SortOption>('new');
  const [viewMode, setViewMode] = useState<ViewMode>('compact');

  const { data: community, isLoading, error } = useQuery({
    queryKey: ['community', slug],
    queryFn: () => api.getCommunity(slug).then((r) => r.data),
    enabled: !!slug,
  });

  const { data: questionsRaw } = useQuery({
    queryKey: ['community', slug, 'questions'],
    queryFn: async () => {
      const res = await api.getCommunityQuestions(slug);
      const d = res.data as Question[] | { results?: Question[] };
      return Array.isArray(d) ? d : (d?.results ?? []);
    },
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

  const router = useRouter();
  const searchParams = useSearchParams();
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [settingsModalTab, setSettingsModalTab] = useState<'yonet' | 'duzenle'>('yonet');

  const inviteRequested = searchParams.get('invite') === '1';

  useEffect(() => {
    if (!inviteRequested) return;
    if (!isAuthenticated) {
      openAuth('login');
      return;
    }
    router.replace(`/topluluk/${slug}`, { scroll: false });
  }, [inviteRequested, isAuthenticated, openAuth, router, slug]);

  useEffect(() => {
    const m = searchParams.get('modal');
    if (m === 'manage' || m === 'yonet') {
      setSettingsModalOpen(true);
      setSettingsModalTab('yonet');
    }
    if (m === 'edit' || m === 'duzenle') {
      setSettingsModalOpen(true);
      setSettingsModalTab('duzenle');
    }
  }, [searchParams]);

  /** Davet paylaşımı: önce NEXT_PUBLIC_SITE_URL, yoksa istemci origin (modal açılmadan URL hazır olsun) */
  const inviteShareUrl = useMemo(() => {
    if (!slug) return '';
    const envBase =
      typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SITE_URL
        ? process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
        : '';
    const origin = envBase || (typeof window !== 'undefined' ? window.location.origin : '');
    return origin ? `${origin}/topluluk/${slug}?invite=1` : '';
  }, [slug]);

  const openSettingsModal = (tab?: 'yonet' | 'duzenle') => {
    setSettingsModalTab(tab ?? 'yonet');
    setSettingsModalOpen(true);
  };
  const closeSettingsModal = () => {
    setSettingsModalOpen(false);
    const m = searchParams.get('modal');
    if (m) router.replace(`/topluluk/${slug}`, { scroll: false });
  };

  const [removeModalQuestionId, setRemoveModalQuestionId] = useState<number | null>(null);
  const removeFromCommunityMutation = useMutation({
    mutationFn: ({ questionId, reason }: { questionId: number; reason?: string }) =>
      api.removeQuestionFromCommunity(slug, questionId, reason),
    onSuccess: () => {
      toast.success('Gönderi topluluktan kaldırıldı.');
      queryClient.invalidateQueries({ queryKey: ['community', slug, 'questions'] });
      setRemoveModalQuestionId(null);
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toast.error(err?.response?.data?.detail ?? 'Kaldırılamadı.');
    },
  });

  useEffect(() => {
    const stored = localStorage.getItem('feedViewMode') as ViewMode | null;
    if (stored === 'card' || stored === 'compact') setViewMode(stored);
  }, []);
  useEffect(() => {
    localStorage.setItem('feedViewMode', viewMode);
  }, [viewMode]);

  const rawQuestions = (questionsRaw ?? []) as Question[];
  const questions = useMemo(() => {
    const key = SORT_TO_KEY[sort];
    const desc = key === 'created_at' || key === 'hot_score' || key === 'like_count';
    return [...rawQuestions].sort((a, b) => {
      const aVal = key === 'hot_score' ? (a as { hot_score?: number }).hot_score ?? 0 : (a[key] as string | number) ?? (key === 'created_at' ? '' : 0);
      const bVal = key === 'hot_score' ? (b as { hot_score?: number }).hot_score ?? 0 : (b[key] as string | number) ?? (key === 'created_at' ? '' : 0);
      if (key === 'created_at') {
        return desc ? new Date(bVal as string).getTime() - new Date(aVal as string).getTime() : new Date(aVal as string).getTime() - new Date(bVal as string).getTime();
      }
      return desc ? Number(bVal) - Number(aVal) : Number(aVal) - Number(bVal);
    });
  }, [rawQuestions, sort]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-brand border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !community) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Topluluk bulunamadı.</p>
          <Link href="/topluluklar" className="mt-4 inline-block text-brand hover:underline">
            Toplulukları keşfet →
          </Link>
        </div>
      </div>
    );
  }

  const isMember = community.is_member ?? false;
  const isBanned = community.is_banned ?? false;
  const joinRequestPending = community.join_request_pending ?? false;
  const isModOrOwner = community.is_mod_or_owner ?? false;
  const isOwner =
    community.is_owner ?? (!!user && community.owner === user.id);
  const letter = (community.name || community.slug).charAt(0).toUpperCase();
  const createdDate = community.created_at ? new Date(community.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : null;

  const hasCover = !!community.cover_image_url;

  return (
    <div className="min-h-screen w-full">
      {/* Reddit gibi: ortalı değil, tam genişlik — sol sidebar'dan sağ kenara kadar */}
      <main className="w-full min-h-screen overflow-hidden">
          <div className="w-full">
          {/* Reddit tarzı banner: arka plan resmi varsa göster, yoksa boş/minimal */}
          {hasCover ? (
            <div className="w-full h-32 sm:h-40 md:h-52 bg-gray-200 dark:bg-gray-800">
              <img src={community.cover_image_url!} alt={`${community.name || community.slug} kapak görseli`} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-full h-12 sm:h-16 bg-gray-100 dark:bg-gray-800/50" aria-hidden />
          )}
          <div className={`px-3 sm:px-4 pb-6 ${hasCover ? '-mt-10 sm:-mt-12 pt-10 sm:pt-12' : 'pt-4 sm:pt-6'}`}>
            <div className="flex flex-col lg:flex-row gap-4 lg:items-start">
              {/* Sol: topluluk kartı + gönderi listesi */}
              <div className="flex-1 min-w-0">
            <div className={`rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden p-6 ${hasCover ? 'shadow-sm' : ''}`}>
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="w-20 h-20 shrink-0 rounded-full border-4 border-white dark:border-gray-900 bg-brand text-white flex items-center justify-center font-bold text-2xl overflow-hidden">
                {community.avatar_url ? (
                  <img src={community.avatar_url} alt={`${community.name || community.slug} topluluk logosu`} className="w-full h-full object-cover" />
                ) : (
                  letter
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{community.name || community.slug}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  r/{community.slug} · {community.category_name} · {community.member_count} üye
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {isBanned ? (
                    <span className="rounded-full bg-red-100 dark:bg-red-900/30 px-4 py-2 text-sm text-red-700 dark:text-red-300">
                      Bu topluluktan yasaklandınız.
                    </span>
                  ) : isAuthenticated ? (
                    isMember ? (
                      <>
                        <Link
                          href={`/soru-sor?community=${slug}`}
                          className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
                        >
                          Soru sor
                        </Link>
                        {!isOwner && (
                          <button
                            type="button"
                            onClick={() => leaveMutation.mutate()}
                            disabled={leaveMutation.isPending}
                            className="rounded-full bg-gray-200 dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                          >
                            Ayrıl
                          </button>
                        )}
                      </>
                    ) : joinRequestPending ? (
                      <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-4 py-2 text-sm text-amber-800 dark:text-amber-200">
                        Katılım talebiniz beklemede.
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => joinMutation.mutate()}
                        disabled={joinMutation.isPending}
                        className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
                      >
                        {community.join_type === 'approval' ? 'Katılım talebi gönder' : 'Katıl'}
                      </button>
                    )
                  ) : (
                    <button
                      type="button"
                      onClick={() => openAuth('login')}
                      className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
                    >
                      Katılmak için giriş yapın
                    </button>
                  )}
                  {isModOrOwner && (
                    <button
                      type="button"
                      onClick={() => openSettingsModal('yonet')}
                      className="rounded-full border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      Yönet
                    </button>
                  )}
                  <ShareButton
                    url={inviteShareUrl || undefined}
                    title={`${community.name || slug} topluluğuna katıl`}
                    text="Marifetli'de bu topluluğa katılmak için linke tıkla:"
                    className="inline-flex items-center rounded-full border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer select-none"
                  >
                    <span>Davet et</span>
                  </ShareButton>
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

            {/* Gönderiler: filtre + view mode + liste */}
            <div className="mt-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <PostFeedControls
              sort={sort}
              onSortChange={setSort}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              totalCount={questions.length}
            />
            {questions.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                Henüz bu toplulukta soru sorulmamış. {isMember && 'İlk soruyu siz sorun!'}
              </div>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-800">
                {questions.map((q) => (
                  <li key={q.id} className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <PostItem
                        id={q.id}
                        slug={q.slug}
                        title={q.title}
                        content={(q as { content?: string }).content}
                        category={q.tags?.[0]?.name}
                        {...postItemAuthorFields(q.author)}
                        timeAgo={formatTimeAgo(q.created_at)}
                        commentCount={q.answer_count ?? 0}
                        voteCount={q.like_count ?? 0}
                        viewCount={q.view_count ?? 0}
                        viewMode={viewMode}
                      />
                    </div>
                    {isModOrOwner && (
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setRemoveModalQuestionId(q.id); }}
                        className="shrink-0 mt-2 text-xs px-2 py-1.5 rounded-lg border border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                      >
                        Topluluktan kaldır
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            </div>
              </div>

              {/* Sağ sidebar */}
              <aside className="w-full lg:w-[280px] xl:w-[312px] shrink-0">
                <div className="mt-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden p-4 sticky top-20">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">
                    {(community.name || community.slug).toUpperCase()}
                  </h3>
                  {community.description ? (
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-3">{community.description}</p>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-500 italic mb-3">Açıklama yok.</p>
                  )}
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 space-y-0.5 mb-3">
                    <p>Oluşturulma tarihi: {createdDate ?? '—'}</p>
                    <p>{community.join_type === 'approval' ? 'Onay gerekir' : 'Halk'}</p>
                    <p>{community.member_count} üye</p>
                  </div>
                  {community.rules && community.rules.length > 0 && (
                    <>
                      <h4 className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Kurallar</h4>
                      <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-gray-600 dark:text-gray-400 mb-3">
                        {community.rules.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ol>
                    </>
                  )}
                  {isModOrOwner && (
                    <button type="button" onClick={() => openSettingsModal('duzenle')} className="text-xs text-brand hover:text-brand-hover hover:underline">
                      Topluluğu düzenle →
                    </button>
                  )}
                </div>
              </aside>
            </div>
          </div>
          </div>
        </main>

        <RemoveFromCommunityModal
          isOpen={removeModalQuestionId != null}
          onClose={() => setRemoveModalQuestionId(null)}
          onConfirm={(reason) => removeModalQuestionId != null && removeFromCommunityMutation.mutate({ questionId: removeModalQuestionId, reason: reason || undefined })}
          isLoading={removeFromCommunityMutation.isPending}
        />
        <CommunitySettingsModal
          isOpen={settingsModalOpen}
          onClose={closeSettingsModal}
          slug={slug}
          community={community}
          isModOrOwner={isModOrOwner}
          isOwner={isOwner}
          initialTab={settingsModalTab}
        />
    </div>
  );
}

export default function CommunityDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Yükleniyor...</p></div>}>
      <CommunityDetailContent params={params} />
    </Suspense>
  );
}
