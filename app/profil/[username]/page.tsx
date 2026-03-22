'use client';

import { use } from 'react';
import Link from 'next/link';
import { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/src/lib/api';
import { useAuthStore } from '@/src/stores/auth-store';
import { addRecentProfile } from '@/src/lib/recent-activity';
import { PostItem } from '@/src/components/post-item';
import { SavedCollectionsTab } from '@/src/components/saved-collections-tab';
import { FollowingModal } from '@/src/components/following-modal';
import { DesignUploadModal, type DesignUploadFormData } from '@/src/components/design-upload-modal';
import { MediaSlider } from '@/src/components/media-slider';
import { AvatarCornerBadges, OptimizedAvatar } from '@/src/components/optimized-avatar';
import { formatTimeAgo } from '@/src/lib/format-time';
import toast from 'react-hot-toast';
import type { Answer } from '@/src/types';
import { checkRecentAchievementUnlock } from '@/src/lib/check-achievement-unlock';
import { useGamificationRoadmapModalStore } from '@/src/stores/gamification-roadmap-modal-store';
import { postItemAuthorFields } from '@/src/lib/post-item-author';

type ProfileTab = 'gonderiler' | 'yorumlar' | 'kaydettiklerim' | 'tasarimlarim' | 'gecmis';

const TAB_LABELS: Record<ProfileTab, string> = {
  gonderiler: 'Gönderiler',
  yorumlar: 'Yorumlar',
  kaydettiklerim: 'Kaydettiklerim',
  tasarimlarim: 'Tasarımlarım',
  gecmis: 'Geçmiş',
};

export default function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const queryClient = useQueryClient();
  const { user: currentUser, isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<ProfileTab>('gonderiler');
  const [followingModalOpen, setFollowingModalOpen] = useState(false);
  const [deleteConfirmQuestion, setDeleteConfirmQuestion] = useState<{ slug: string; title?: string } | null>(null);
  const [deleteConfirmDesign, setDeleteConfirmDesign] = useState<{ id: number } | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const isOwnProfile = isAuthenticated && !!currentUser?.username && !!username &&
    currentUser.username.toLowerCase() === username.toLowerCase();
  const openGamificationModal = useGamificationRoadmapModalStore((s) => s.openModal);

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['user', username],
    queryFn: () => api.getUserByUsername(username).then((r) => r.data),
    enabled: !!username,
  });

  useEffect(() => {
    if (!username) return;
    addRecentProfile({
      username,
      displayName: profile?.display_name || profile?.first_name ? [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') : undefined,
      profilePicture: (profile as { profile_picture?: string })?.profile_picture ?? undefined,
    });
  }, [username, profile?.display_name, profile?.first_name, profile?.last_name, (profile as { profile_picture?: string })?.profile_picture]);

  const { data: achievementsData } = useQuery({
    queryKey: ['achievements', username],
    queryFn: () => api.getAchievementsByUsername(username).then((r) => r.data),
    enabled: !!username,
  });

  const { data: onboardingStatus } = useQuery({
    queryKey: ['onboardingStatus'],
    queryFn: () => api.getOnboardingStatus().then((r) => r.data),
    enabled: isAuthenticated,
    refetchOnMount: true,
  });
  const showOnboardingCard = isOwnProfile && (onboardingStatus == null || onboardingStatus.completed !== true);

  const { data: questionsData, isLoading: questionsLoading } = useQuery({
    queryKey: ['questions', 'user', profile?.id],
    queryFn: () => api.getQuestions({ author: profile!.id, ordering: '-created_at' }).then((r) => r.data),
    enabled: !!profile?.id,
  });
  const userQuestions = questionsData?.results ?? [];

  const { data: userAnswersData, isLoading: commentsLoading } = useQuery({
    queryKey: ['user-answers', profile?.id],
    queryFn: () => api.getUserAnswers(profile!.id).then((r) => r.data),
    enabled: !!profile?.id && activeTab === 'yorumlar',
  });

  const { data: designsData, isLoading: designsLoading } = useQuery({
    queryKey: ['designs', isOwnProfile ? 'my' : username, username],
    queryFn: () =>
      isOwnProfile
        ? api.getMyDesigns().then((r) => r.data)
        : api.getDesigns({ author: username }).then((r) => r.data),
    enabled: !!username && activeTab === 'tasarimlarim',
  });
  const designsList = useMemo(() => {
    const raw = designsData as { results?: { id: number; image_url: string; license: string; tags: string; created_at: string; author_username: string }[] } | undefined;
    return raw?.results ?? [];
  }, [designsData]);

  const { data: myManagedCommunitiesRaw } = useQuery({
    queryKey: ['communities', 'my-managed'],
    queryFn: () => api.getMyManagedCommunities().then((r) => r.data),
    enabled: isOwnProfile && isAuthenticated,
  });
  const managedList = Array.isArray(myManagedCommunitiesRaw)
    ? myManagedCommunitiesRaw
    : (myManagedCommunitiesRaw as { results?: unknown[] } | undefined)?.results ?? [];

  const userAnswers: Answer[] = useMemo(
    () =>
      Array.isArray(userAnswersData)
        ? userAnswersData
        : ((userAnswersData as unknown as { results?: Answer[] })?.results ?? []),
    [userAnswersData]
  );

  /** Aynı soruya ait yorumları grupla: her soru tek kart, altında o soruya yazılan tüm yorumlar */
  const answersByQuestion = useMemo(() => {
    const map = new Map<number, Answer[]>();
    for (const a of userAnswers) {
      const q = (a as { question?: { id?: number } }).question;
      const qId = typeof q === 'object' && q && q.id != null ? q.id : (a as { question?: number }).question as number;
      if (!map.has(qId)) map.set(qId, []);
      map.get(qId)!.push(a);
    }
    return Array.from(map.entries()).map(([questionId, comments]) => ({
      questionId,
      comments: comments as Answer[],
    }));
  }, [userAnswers]);

  const followMutation = useMutation({
    mutationFn: (userId: number) => api.followUser(userId),
    onSuccess: () => {
      queryClient.setQueryData(['user', username], (old: typeof profile) =>
        old ? { ...old, is_following: true, followers_count: (old.followers_count || 0) + 1 } : old
      );
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: (userId: number) => api.unfollowUser(userId),
    onSuccess: () => {
      queryClient.setQueryData(['user', username], (old: typeof profile) =>
        old ? { ...old, is_following: false, followers_count: Math.max(0, (old.followers_count || 0) - 1) } : old
      );
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: (slug: string) => api.deleteQuestion(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions', 'user', profile?.id] });
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      toast.success('Gönderi silindi.');
      setDeleteConfirmQuestion(null);
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toast.error(err?.response?.data?.detail ?? 'Gönderi silinemedi.');
    },
  });

  const deleteDesignMutation = useMutation({
    mutationFn: (id: number) => api.deleteDesign(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['designs', 'my'] });
      queryClient.invalidateQueries({ queryKey: ['designs', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['design', id] });
      queryClient.invalidateQueries({ queryKey: ['designs', isOwnProfile ? 'my' : username, username] });
      toast.success('Tasarım silindi.');
      setDeleteConfirmDesign(null);
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toast.error(err?.response?.data?.detail ?? 'Tasarım silinemedi.');
    },
  });

  const handleUploadDesign = async (data: DesignUploadFormData) => {
    if (!data.files?.length || !isAuthenticated) {
      toast.error('Tasarım yüklemek için giriş yapın ve en az bir görsel seçin.');
      return;
    }
    setUploading(true);
    try {
      await api.uploadDesign({
        files: data.files,
        license: data.license,
        addWatermark: data.addWatermark,
        tags: data.tags,
        description: data.description ?? '',
        copyrightConfirmed: data.copyrightConfirmed,
      });
      toast.success('Tasarımınız yüklendi.');
      setUploadModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['designs', 'my'] });
      queryClient.invalidateQueries({ queryKey: ['designs', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['designs', isOwnProfile ? 'my' : username, username] });
      void checkRecentAchievementUnlock();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err && typeof (err as { response?: { data?: { detail?: string } } }).response?.data?.detail === 'string'
        ? (err as { response: { data: { detail: string } } }).response.data.detail
        : 'Yükleme başarısız.';
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const unlockedCount = achievementsData?.reduce((s, c) => s + c.unlocked_count, 0) ?? 0;

  // Başka profilde sadece gönderiler + tasarımlar görünür.
  const tabs: ProfileTab[] = isOwnProfile
    ? ['gonderiler', 'tasarimlarim', 'yorumlar', 'kaydettiklerim', 'gecmis']
    : ['gonderiler', 'tasarimlarim'];

  // Profil sahibi değiştiğinde görünmeyen bir sekmede kalınmasını engelle.
  useEffect(() => {
    if (!tabs.includes(activeTab)) setActiveTab('gonderiler');
  }, [tabs, activeTab]);

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-6xl min-w-0 overflow-x-hidden">
          <div className="animate-pulse bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm p-8">
            <div className="h-28 rounded-2xl bg-gray-200 dark:bg-gray-700 w-full" />
            <div className="h-24 w-24 rounded-2xl bg-gray-200 dark:bg-gray-700 -mt-12 ml-4" />
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg mt-4 w-48" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !profile) {
    const ax = error as { response?: { data?: { detail?: string }; status?: number } };
    const errMsg = ax?.response?.data?.detail ?? (error instanceof Error ? error.message : 'Bilinmeyen hata');
    return (
      <div className="min-h-screen">
        <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-4xl min-w-0 overflow-x-hidden">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">Kullanıcı bulunamadı</p>
            {errMsg && (
              <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">API hatası: {String(errMsg)}</p>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-6xl min-w-0 overflow-x-hidden">
        {showOnboardingCard && (
          <Link
            href="/onboarding"
            className="mb-4 flex items-center justify-between gap-4 p-4 rounded-xl border border-brand/30 dark:border-brand/40 bg-brand-pink/50 dark:bg-brand/10 text-gray-900 dark:text-gray-100 hover:bg-brand-pink/70 dark:hover:bg-brand/20 transition-colors"
          >
            <div className="min-w-0">
              <p className="font-medium">Profilini tamamla</p>
              <p className="text-sm text-brand-hover mt-0.5">
                İlgi alanları, cinsiyet ve yaş gibi bilgileri ekleyerek toplulukta daha iyi tanın.
              </p>
            </div>
            <span className="shrink-0 px-4 py-2 text-sm font-medium bg-brand hover:bg-brand-hover text-white rounded-lg">
              Tamamla
            </span>
          </Link>
        )}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sol + Orta: Ana içerik */}
          <div className="flex-1 min-w-0">
            {/* Profil kartı — modern cover + avatar */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg shadow-gray-200/50 dark:shadow-none border border-gray-200/80 dark:border-gray-800 overflow-hidden">
              <div className="h-28 sm:h-36 bg-gradient-to-br from-brand via-brand to-brand-hover dark:from-brand dark:via-brand-hover dark:to-brand-red-dark relative">
                {profile.cover_image ? (
                  <img src={profile.cover_image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_0%,rgba(255,255,255,0.2),transparent)]" aria-hidden />
                )}
              </div>
              <div className="px-4 sm:px-6 pb-5 -mt-12 sm:-mt-14 relative">
                <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                  <div className="relative w-20 h-20 sm:w-28 sm:h-28 shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-xl ring-1 ring-gray-200/50 dark:border-gray-900 dark:bg-gray-800 dark:ring-gray-700">
                    {profile.profile_picture ? (
                      <OptimizedAvatar
                        fill
                        src={profile.profile_picture}
                        size={96}
                        alt=""
                        className="rounded-2xl"
                        badges={(profile as { avatar_badges?: { slug: string; name: string; icon: string }[] }).avatar_badges}
                        levelTitleFallback={(profile as { current_level_title?: string }).current_level_title}
                      />
                    ) : (
                      <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl bg-gray-200 text-2xl font-bold text-gray-500 dark:bg-gray-700 sm:text-3xl">
                        {profile.display_name?.charAt(0) || profile.username?.charAt(0) || '?'}
                        <AvatarCornerBadges
                          badges={(profile as { avatar_badges?: { slug: string; name: string; icon: string }[] }).avatar_badges}
                          size={96}
                          levelTitleFallback={(profile as { current_level_title?: string }).current_level_title}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 break-words">
                        {profile.display_name || profile.username}
                      </h1>
                      {!isOwnProfile && isAuthenticated && profile?.id && (
                        <>
                          {profile.is_following ? (
                            <button
                              type="button"
                              onClick={() => unfollowMutation.mutate(profile.id)}
                              disabled={unfollowMutation.isPending}
                              className="px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
                            >
                              {unfollowMutation.isPending ? '...' : 'Takibi Bırak'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => followMutation.mutate(profile.id)}
                              disabled={followMutation.isPending}
                              className="px-4 py-2 text-sm font-medium bg-brand hover:bg-brand-hover text-white rounded-xl disabled:opacity-50 transition-colors shadow-sm"
                            >
                              {followMutation.isPending ? '...' : 'Takip Et'}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">u/{profile.username}</p>
                  </div>
                </div>
                {profile.bio && (
                  <p className="mt-3 text-gray-700 dark:text-gray-300 text-sm break-words">{profile.bio}</p>
                )}

                {/* Tab'lar — pill / segment tarzı */}
                <div className="mt-5 flex overflow-x-auto overflow-y-hidden gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800/60">
                  {tabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap rounded-lg transition-all ${
                        activeTab === tab
                          ? 'bg-white dark:bg-gray-700 text-brand shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                    >
                      {tab === 'tasarimlarim' && !isOwnProfile ? 'Tasarımları' : TAB_LABELS[tab]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Tab içeriği */}
            <div className="mt-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm overflow-hidden min-h-[200px]">
              {activeTab === 'gonderiler' && (
                <div>
                  {questionsLoading ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">Yükleniyor...</div>
                  ) : userQuestions.length === 0 ? (
                    <div className="p-6 sm:p-8">
                      <p className="text-gray-500 dark:text-gray-400 text-sm">
                        {isOwnProfile
                          ? 'Henüz gönderin yok. Topluluğa katılıp ilk sorunuzu sorduğunuzda burada görünecek.'
                          : `${profile.username} henüz gönderi paylaşmamış.`}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-800">
                      {userQuestions.map((q) => (
                        <PostItem
                          key={q.id}
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
                          viewMode="compact"
                          showEditButton={isOwnProfile}
                          showDeleteButton={isOwnProfile}
                          onDeleteClick={() => setDeleteConfirmQuestion({ slug: q.slug ?? String(q.id), title: q.title })}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'yorumlar' && (
                <div className="p-4 sm:p-6">
                  {!isOwnProfile ? (
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Bu içerik sadece profil sahibi tarafından görüntülenebilir.</p>
                  ) : commentsLoading ? (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">Yükleniyor...</div>
                  ) : userAnswers.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      {isOwnProfile
                        ? 'Henüz bir yorumunuz yok. Sorulara cevap yazdığınızda burada listelenecek.'
                        : 'Bu kullanıcının henüz bir yorumu yok.'}
                    </p>
                  ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-800">
                      {answersByQuestion
                        .filter(({ comments }) => {
                          const first = comments[0];
                          const q = (first as { question?: unknown } | undefined)?.question;
                          return q != null && typeof q === 'object';
                        })
                        .map(({ questionId, comments }) => {
                        const first = comments[0];
                        const q = (first as { question?: unknown }).question as {
                          id: number;
                          slug: string;
                          title: string;
                          content?: string;
                          tags?: { name: string }[];
                          author?: unknown;
                          like_count?: number;
                          answer_count?: number;
                          view_count?: number;
                        };
                        return (
                          <div key={questionId} className="py-3">
                            <PostItem
                              id={q.id}
                              slug={q.slug}
                              title={q.title}
                              content={q.content}
                              category={undefined}
                              {...postItemAuthorFields(q.author)}
                              timeAgo={formatTimeAgo(first.created_at)}
                              commentCount={q.answer_count ?? 0}
                              voteCount={q.like_count ?? 0}
                              viewCount={q.view_count ?? 0}
                              viewMode="compact"
                            />
                            <div className="mt-2 space-y-1.5 pl-0 sm:pl-1">
                              {comments.map((answer) => {
                                const snippet = answer.content.replace(/<[^>]*>/g, '').trim();
                                return (
                                  <p key={answer.id} className="text-xs text-gray-500 dark:text-gray-400">
                                    <span className="text-gray-400 dark:text-gray-500">{formatTimeAgo(answer.created_at)}</span>
                                    {' · '}
                                    {snippet.slice(0, 150) || '—'}
                                    {snippet.length > 150 && '…'}
                                  </p>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'kaydettiklerim' && (
                isOwnProfile ? <SavedCollectionsTab isOwnProfile={isOwnProfile} /> : (
                  <div className="p-4 sm:p-6">
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Bu içerik sadece profil sahibi tarafından görüntülenebilir.</p>
                  </div>
                )
              )}
              {activeTab === 'tasarimlarim' && (
                <div className="p-4 sm:p-6">
                  {isOwnProfile && (
                    <div className="mb-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setUploadModalOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-brand hover:bg-brand-hover transition-colors"
                      >
                        <span className="text-lg leading-none">+</span>
                        Tasarım ekle
                      </button>
                    </div>
                  )}
                  {designsLoading ? (
                    <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">Yükleniyor...</div>
                  ) : designsList.length === 0 ? (
                    <div className="text-center">
                      <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                        {isOwnProfile
                          ? 'Henüz tasarım yüklemediniz.'
                          : 'Bu kullanıcının henüz tasarımı yok.'}
                      </p>
                      {isOwnProfile && (
                        <button
                          type="button"
                          onClick={() => setUploadModalOpen(true)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-brand hover:text-brand-hover border border-brand transition-colors"
                        >
                          <span className="text-lg leading-none">+</span>
                          Tasarım ekle
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {designsList.map((d) => (
                        <div
                          key={d.id}
                          className="group rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-brand transition-colors bg-white dark:bg-gray-900"
                        >
                          <Link href={`/tasarim/${d.id}`} className="block aspect-square relative" onClick={(e) => e.stopPropagation()}>
                            <MediaSlider
                              items={((d as { image_urls?: string[] }).image_urls ?? (d.image_url ? [d.image_url] : [])).map((url) => ({ url, type: 'image' as const }))}
                              className="aspect-square"
                              alt={d.tags || 'Tasarım'}
                            />
                          </Link>
                          <div className="p-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
                            {d.tags && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex-1 min-w-0">
                                {d.tags.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 2).join(', ')}
                              </p>
                            )}
                            {isOwnProfile && (
                              <div className="flex items-center gap-1 shrink-0">
                                <Link
                                  href={`/tasarim/${d.id}`}
                                  className="px-2 py-1 text-xs font-medium text-brand hover:underline"
                                >
                                  Düzenle
                                </Link>
                                <span className="text-gray-300 dark:text-gray-600">·</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setDeleteConfirmDesign({ id: d.id });
                                  }}
                                  className="px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:underline"
                                >
                                  Sil
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'gecmis' && (
                <div className="p-6 sm:p-8">
                  {isOwnProfile ? (
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      Görüntüleme geçmişiniz burada listelenecek.
                    </p>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Bu içerik sadece profil sahibi tarafından görüntülenebilir.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sağ sidebar */}
          <div className="w-full lg:w-80 flex-shrink-0 space-y-4">
            {/* Profil istatistikleri */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">@{profile.username}</h3>
              </div>
              <div className="p-5 space-y-0 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-600 dark:text-gray-400">Takipçi</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{profile.followers_count ?? 0}</span>
                </div>
                {isOwnProfile ? (
                <button
                  type="button"
                  onClick={() => setFollowingModalOpen(true)}
                  className="w-full flex justify-between items-center text-sm rounded-lg py-2 -mx-1 px-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left border-b border-gray-100 dark:border-gray-800"
                >
                  <span className="text-gray-600 dark:text-gray-400">Takip ettiklerim</span>
                  <span className="font-semibold text-brand tabular-nums">{profile.following_count ?? 0}</span>
                </button>
              ) : (
                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-600 dark:text-gray-400">Takip ettiklerim</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{profile.following_count ?? 0}</span>
                </div>
              )}
                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-600 dark:text-gray-400">İtibar</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400 tabular-nums">{profile.reputation ?? 0}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600 dark:text-gray-400">Rütbe</span>
                  <span
                    className="text-xs sm:text-sm font-semibold text-amber-900 dark:text-amber-200 text-right max-w-[60%] leading-tight"
                    title="İtibar puanına göre seviye"
                  >
                    {(profile as { current_level_title?: string }).current_level_title || 'Yeni Zanaatkar'}
                  </span>
                </div>
              </div>
              {(profile.website || profile.instagram_url || profile.twitter_url || profile.facebook_url || profile.linkedin_url || profile.youtube_url || profile.pinterest_url) && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Bağlantılar</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.website && (
                      <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-brand hover:text-brand-hover text-sm truncate max-w-full" title="Web sitesi" aria-label="Web sitesi">
                        🌐
                      </a>
                    )}
                    {profile.instagram_url && (
                      <a href={profile.instagram_url} target="_blank" rel="noopener noreferrer" className="text-brand hover:text-brand-hover" title="Instagram" aria-label="Instagram">📷</a>
                    )}
                    {profile.twitter_url && (
                      <a href={profile.twitter_url} target="_blank" rel="noopener noreferrer" className="text-brand hover:text-brand-hover" title="X" aria-label="X (Twitter)">𝕏</a>
                    )}
                    {profile.facebook_url && (
                      <a href={profile.facebook_url} target="_blank" rel="noopener noreferrer" className="text-brand hover:text-brand-hover" title="Facebook" aria-label="Facebook">f</a>
                    )}
                    {profile.linkedin_url && (
                      <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-brand hover:text-brand-hover" title="LinkedIn" aria-label="LinkedIn">in</a>
                    )}
                    {profile.youtube_url && (
                      <a href={profile.youtube_url} target="_blank" rel="noopener noreferrer" className="text-brand hover:text-brand-hover" title="YouTube" aria-label="YouTube">▶</a>
                    )}
                    {profile.pinterest_url && (
                      <a href={profile.pinterest_url} target="_blank" rel="noopener noreferrer" className="text-brand hover:text-brand-hover" title="Pinterest" aria-label="Pinterest">P</a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Oluşturduğum / yönettiğim topluluklar (sadece kendi profil – her zaman göster) */}
            {isOwnProfile && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Oluşturduğum topluluklar</h3>
                </div>
                <div className="p-5">
                {managedList.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Henüz topluluk oluşturmadınız.</p>
                ) : (
                  <ul className="space-y-2">
                    {(managedList as { id: number; name: string; slug: string; member_count: number }[]).map((c) => (
                      <li key={c.id} className="flex items-center justify-between gap-2">
                        <Link href={`/topluluk/${c.slug}`} className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-brand truncate min-w-0" title={`r/${c.slug}`}>
                          {c.name || `r/${c.slug}`}
                        </Link>
                        <div className="flex gap-1 shrink-0">
                          <Link
                            href={`/topluluk/${c.slug}?modal=manage`}
                            className="text-xs text-brand hover:text-brand-hover"
                          >
                            Yönet
                          </Link>
                          <span className="text-gray-400">·</span>
                          <Link
                            href={`/topluluk/${c.slug}?modal=edit`}
                            className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                          >
                            Düzenle
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  href="/topluluklar/olustur"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:text-brand-hover"
                >
                  {managedList.length === 0 ? 'Topluluk oluştur' : '+ Yeni topluluk'}
                  <span aria-hidden>→</span>
                </Link>
                </div>
              </div>
            )}

            {/* Yol haritası (sadece kendi profilinde) */}
            {isOwnProfile && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-amber-200/70 dark:border-amber-900/40 shadow-sm overflow-hidden">
                <div className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                      Yol haritan
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Rütbe, rozet ilerlemesi ve ödül kurallarını modalda aç.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openGamificationModal({ tab: 'personal' })}
                    className="shrink-0 rounded-xl bg-gradient-to-r from-amber-500 to-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95"
                  >
                    Yol haritasını aç
                  </button>
                </div>
              </div>
            )}

            {/* İtibar rozetleri (herkese açık galeri) */}
            {Array.isArray((profile as { reputation_badges?: unknown[] }).reputation_badges) &&
              (profile as { reputation_badges: { id: number; name: string; description: string; icon: string; earned: boolean }[] })
                .reputation_badges.length > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Rozetler
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Kazanılanlar renkli; kilitliler soluk görünür.
                    </p>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {(profile as { reputation_badges: { id: number; name: string; description: string; icon: string; earned: boolean }[] }).reputation_badges.map((b) => (
                        <div
                          key={b.id}
                          title={b.description || b.name}
                          className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-center transition ${
                            b.earned
                              ? 'border-amber-300/70 bg-amber-50/50 dark:border-amber-600/40 dark:bg-amber-900/20'
                              : 'border-gray-200 dark:border-gray-700 opacity-45 grayscale'
                          }`}
                        >
                          <span className="text-2xl leading-none" aria-hidden>
                            {b.icon || '◆'}
                          </span>
                          <span className="text-[10px] sm:text-xs font-medium text-gray-800 dark:text-gray-200 line-clamp-2 leading-tight">
                            {b.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            {/* Başarılar (sadece kendi profil) */}
            {isOwnProfile && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Başarılar</h3>
                  <Link
                    href={`/profil/${username}/basarilar`}
                    className="text-sm font-medium text-brand hover:text-brand hover:text-brand-hover"
                  >
                    Tümünü gör →
                  </Link>
                </div>
                <div className="p-5">
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{unlockedCount} rozet açıldı</p>
                  <Link
                    href={`/profil/${username}/basarilar`}
                    className="block w-full py-2.5 text-center text-sm font-medium text-brand bg-brand-pink/50 dark:bg-brand/10 hover:bg-brand-pink/70 dark:hover:bg-brand/20 border border-brand/30 dark:border-brand/40 rounded-xl transition-colors"
                  >
                    Başarıları görüntüle
                  </Link>
                </div>
              </div>
            )}

            {/* Ayarlar (sadece kendi profili) — profil/ayarlar sayfası ile aynı modern kart stili */}
            {isOwnProfile && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ayarlar</h3>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  <div className="p-4">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Profil</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Profil bilgilerinizi özelleştirin</p>
                    <Link
                      href="/ayarlar"
                      className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:text-brand-hover"
                    >
                      Güncelle
                      <span aria-hidden>→</span>
                    </Link>
                  </div>
                  {onboardingStatus?.completed && (
                    <div className="p-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">İlgi alanları</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Kategoriler, cinsiyet ve tercihlerinizi güncelleyin</p>
                      <Link
                        href="/onboarding?from=profile"
                        className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:text-brand-hover"
                      >
                        İlgi alanlarını güncelle
                        <span aria-hidden>→</span>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      {isOwnProfile && (
        <FollowingModal isOpen={followingModalOpen} onClose={() => setFollowingModalOpen(false)} />
      )}

      {isOwnProfile && (
        <DesignUploadModal
          isOpen={uploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          onSubmit={handleUploadDesign}
          isSubmitting={uploading}
        />
      )}

      {/* Tasarım silme onayı */}
      {deleteConfirmDesign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setDeleteConfirmDesign(null)}>
          <div
            className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-sm w-full p-6 border border-gray-200 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Tasarımı sil</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Bu tasarımı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setDeleteConfirmDesign(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={() => deleteDesignMutation.mutate(deleteConfirmDesign.id)}
                disabled={deleteDesignMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleteDesignMutation.isPending ? 'Siliniyor…' : 'Sil'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gönderi silme onayı */}
      {deleteConfirmQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setDeleteConfirmQuestion(null)}>
          <div
            className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-sm w-full p-6 border border-gray-200 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Gönderiyi sil</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Bu gönderiyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </p>
            {deleteConfirmQuestion.title && (
              <p className="text-sm text-gray-500 dark:text-gray-500 truncate mb-4" title={deleteConfirmQuestion.title}>
                &ldquo;{deleteConfirmQuestion.title}&rdquo;
              </p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setDeleteConfirmQuestion(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={() => deleteQuestionMutation.mutate(deleteConfirmQuestion.slug)}
                disabled={deleteQuestionMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleteQuestionMutation.isPending ? 'Siliniyor…' : 'Sil'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
