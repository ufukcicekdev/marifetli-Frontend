'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/src/lib/api';
import { useAuthStore } from '@/src/stores/auth-store';
import { addRecentProfile } from '@/src/lib/recent-activity';
import { PostItem } from '@/src/components/post-item';
import { SavedCollectionsTab } from '@/src/components/saved-collections-tab';
import { FollowingModal } from '@/src/components/following-modal';
import { OptimizedAvatar } from '@/src/components/optimized-avatar';
import { formatTimeAgo } from '@/src/lib/format-time';
import type { Answer } from '@/src/types';

type ProfileTab = 'gonderiler' | 'yorumlar' | 'kaydettiklerim' | 'gecmis';

const TAB_LABELS: Record<ProfileTab, string> = {
  gonderiler: 'Gönderiler',
  yorumlar: 'Yorumlar',
  kaydettiklerim: 'Kaydettiklerim',
  gecmis: 'Geçmiş',
};

export default function ProfilePage() {
  const params = useParams();
  const username = params?.username as string;
  const queryClient = useQueryClient();
  const { user: currentUser, isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<ProfileTab>('gonderiler');
  const [followingModalOpen, setFollowingModalOpen] = useState(false);
  const isOwnProfile = isAuthenticated && !!currentUser?.username && !!username &&
    currentUser.username.toLowerCase() === username.toLowerCase();

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

  const unlockedCount = achievementsData?.reduce((s, c) => s + c.unlocked_count, 0) ?? 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-6xl min-w-0 overflow-x-hidden">
          <div className="animate-pulse bg-white dark:bg-gray-900 rounded-lg shadow p-8">
            <div className="h-24 w-24 rounded-xl bg-gray-200 dark:bg-gray-700" />
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mt-4 w-48" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !profile) {
    const ax = error as { response?: { data?: { detail?: string }; status?: number } };
    const errMsg = ax?.response?.data?.detail ?? (error instanceof Error ? error.message : 'Bilinmeyen hata');
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
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

  // Başkasının profilinde yorumlar sekmesi gösterilmez; sadece kendi profilde kullanıcı kendi yorumlarını görsün
const tabs: ProfileTab[] = isOwnProfile
    ? ['gonderiler', 'yorumlar', 'kaydettiklerim', 'gecmis']
    : ['gonderiler'];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-6xl min-w-0 overflow-x-hidden">
        {showOnboardingCard && (
          <Link
            href="/onboarding"
            className="mb-4 flex items-center justify-between gap-4 p-4 rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/40 text-orange-900 dark:text-orange-100 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors"
          >
            <div className="min-w-0">
              <p className="font-medium">Profilini tamamla</p>
              <p className="text-sm text-orange-700 dark:text-orange-300 mt-0.5">
                İlgi alanları, cinsiyet ve yaş gibi bilgileri ekleyerek toplulukta daha iyi tanın.
              </p>
            </div>
            <span className="shrink-0 px-4 py-2 text-sm font-medium bg-orange-500 hover:bg-orange-600 text-white rounded-lg">
              Tamamla
            </span>
          </Link>
        )}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sol + Orta: Ana içerik */}
          <div className="flex-1 min-w-0">
            {/* Profil kartı */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="h-24 sm:h-32 bg-gradient-to-r from-orange-400 to-orange-600 dark:from-orange-600 dark:to-orange-800">
                {profile.cover_image && (
                  <img src={profile.cover_image} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="px-4 sm:px-6 pb-4 -mt-10 sm:-mt-12 relative">
                <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-white dark:bg-gray-800 border-4 border-white dark:border-gray-900 overflow-hidden flex-shrink-0 shadow">
                    {profile.profile_picture ? (
                      <OptimizedAvatar src={profile.profile_picture} size={96} alt="" className="w-full h-full rounded-xl" />
                    ) : (
                      <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-2xl sm:text-3xl font-bold text-gray-500">
                        {profile.display_name?.charAt(0) || profile.username?.charAt(0) || '?'}
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
                              className="px-3 py-1.5 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                            >
                              {unfollowMutation.isPending ? '...' : 'Takibi Bırak'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => followMutation.mutate(profile.id)}
                              disabled={followMutation.isPending}
                              className="px-3 py-1.5 text-sm font-medium bg-orange-500 hover:bg-orange-600 text-white rounded-full disabled:opacity-50"
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

                {/* Tab'lar */}
                <div className="mt-4 flex overflow-x-auto overflow-y-hidden gap-1 border-b border-gray-200 dark:border-gray-800 -mb-px">
                  {tabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                        activeTab === tab
                          ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      {TAB_LABELS[tab]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Tab içeriği */}
            <div className="mt-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden min-h-[200px]">
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
                          author={typeof q.author === 'object' ? q.author?.username ?? '' : ''}
                          timeAgo={formatTimeAgo(q.created_at)}
                          commentCount={q.answer_count ?? 0}
                          voteCount={q.like_count ?? 0}
                          viewCount={q.view_count ?? 0}
                          viewMode="compact"
                          showEditButton={isOwnProfile}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'yorumlar' && (
                <div className="p-4 sm:p-6">
                  {commentsLoading ? (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">Yükleniyor...</div>
                  ) : userAnswers.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      {isOwnProfile
                        ? 'Henüz bir yorumunuz yok. Sorulara cevap yazdığınızda burada listelenecek.'
                        : 'Bu kullanıcının henüz bir yorumu yok.'}
                    </p>
                  ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-800">
                      {answersByQuestion.map(({ questionId, comments }) => {
                        const first = comments[0];
                        const q = (first as { question?: unknown }).question as {
                          id: number;
                          slug: string;
                          title: string;
                          content?: string;
                          tags?: { name: string }[];
                          author?: { username: string };
                          like_count?: number;
                          answer_count?: number;
                          view_count?: number;
                        } | null;
                        if (!q) return null;
                        return (
                          <div key={questionId} className="py-3">
                            <PostItem
                              id={q.id}
                              slug={q.slug}
                              title={q.title}
                              content={q.content}
                              category={undefined}
                              author={q.author?.username ?? ''}
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
                <SavedCollectionsTab isOwnProfile={isOwnProfile} />
              )}
              {activeTab === 'gecmis' && (
                <div className="p-6 sm:p-8">
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Görüntüleme geçmişiniz burada listelenecek.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sağ sidebar */}
          <div className="w-full lg:w-80 flex-shrink-0 space-y-4">
            {/* Profil istatistikleri */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3">{profile.username}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Takipçi</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{profile.followers_count}</span>
                </div>
                {isOwnProfile ? (
                <button
                  type="button"
                  onClick={() => setFollowingModalOpen(true)}
                  className="w-full flex justify-between items-center text-sm rounded-lg py-0.5 -mx-1 px-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                >
                  <span className="text-gray-600 dark:text-gray-400">Takip ettiklerim</span>
                  <span className="font-medium text-orange-600 dark:text-orange-400">{profile.following_count ?? 0}</span>
                </button>
              ) : (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Takip ettiklerim</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{profile.following_count ?? 0}</span>
                </div>
              )}
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">İtibar</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{profile.reputation}</span>
                </div>
              </div>
              {(profile.website || profile.instagram_url || profile.twitter_url || profile.facebook_url || profile.linkedin_url || profile.youtube_url || profile.pinterest_url) && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Bağlantılar</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.website && (
                      <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-600 text-sm truncate max-w-full" title="Web sitesi">
                        🌐
                      </a>
                    )}
                    {profile.instagram_url && (
                      <a href={profile.instagram_url} target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-600" title="Instagram">📷</a>
                    )}
                    {profile.twitter_url && (
                      <a href={profile.twitter_url} target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-600" title="X">𝕏</a>
                    )}
                    {profile.facebook_url && (
                      <a href={profile.facebook_url} target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-600" title="Facebook">f</a>
                    )}
                    {profile.linkedin_url && (
                      <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-600" title="LinkedIn">in</a>
                    )}
                    {profile.youtube_url && (
                      <a href={profile.youtube_url} target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-600" title="YouTube">▶</a>
                    )}
                    {profile.pinterest_url && (
                      <a href={profile.pinterest_url} target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-600" title="Pinterest">P</a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Başarılar */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900 dark:text-gray-100">Başarılar</h3>
                <Link
                  href={`/profil/${username}/basarilar`}
                  className="text-sm text-orange-500 hover:text-orange-600"
                >
                  Tümünü gör
                </Link>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{unlockedCount} açıldı</p>
              <Link
                href={`/profil/${username}/basarilar`}
                className="block w-full py-2 text-center text-sm font-medium text-orange-500 hover:text-orange-600 border border-orange-500 rounded-lg"
              >
                Başarıları görüntüle
              </Link>
            </div>

            {/* Ayarlar (sadece kendi profili) */}
            {isOwnProfile && (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3">Ayarlar</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">Profil</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Profil bilgilerinizi özelleştirin</p>
                    <Link
                      href="/ayarlar"
                      className="mt-1 inline-block text-sm font-medium text-orange-500 hover:text-orange-600"
                    >
                      Güncelle →
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      {isOwnProfile && (
        <FollowingModal isOpen={followingModalOpen} onClose={() => setFollowingModalOpen(false)} />
      )}
    </div>
  );
}
