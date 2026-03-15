import axios, { AxiosInstance } from 'axios';
import toast from 'react-hot-toast';
import { User, UserProfile, Question, Answer, Notification, Tag, SiteSettings } from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

class ApiService {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor: add token; for FormData, remove Content-Type so browser sets multipart/form-data
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        if (config.data instanceof FormData) {
          delete config.headers['Content-Type'];
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Public endpoints: 401'de token olmadan tekrar dene, /giris'e yönlendirme
    const PUBLIC_PATHS = ['/questions/', '/categories/', '/questions/tags', '/settings/public', '/settings/stats', '/contact/', '/blog/'];
    const isPublicPath = (url: string) => PUBLIC_PATHS.some((p) => url?.includes(p));

    // Response interceptor: token refresh; public path'te 401'de girişe yönlendirme
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        const url = originalRequest?.url ?? '';

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          if (isPublicPath(url)) {
            delete originalRequest.headers.Authorization;
            return this.axiosInstance(originalRequest);
          }

          try {
            const refreshToken = localStorage.getItem('refresh_token');
            if (!refreshToken) {
              throw new Error('No refresh token available');
            }

            const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
              refresh: refreshToken,
            });

            const { access } = response.data;
            localStorage.setItem('access_token', access);

            originalRequest.headers.Authorization = `Bearer ${access}`;
            return this.axiosInstance(originalRequest);
          } catch (refreshError) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            try {
              const { useAuthStore } = await import('../stores/auth-store');
              useAuthStore.getState().logout();
            } catch { /* store may not be ready */ }
            window.location.href = '/giris';
            return Promise.reject(refreshError);
          }
        }

        if (error.response?.status === 403) {
          const detail = error.response?.data?.detail;
          const code = typeof detail === 'object' && detail?.code;
          const message = typeof detail === 'object' && detail?.message ? detail.message : (typeof detail === 'string' ? detail : null);
          if (code === 'email_not_verified') {
            toast.error(message || 'Bu işlem için e-posta adresinizi doğrulamanız gerekiyor.');
            return Promise.reject(error);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Authentication methods
  register = (userData: { email: string; username: string; password: string }) =>
    this.axiosInstance.post('/auth/register/', userData);

  login = (credentials: { email: string; password: string }) =>
    this.axiosInstance.post('/auth/login/', credentials);

  verifyEmail = (token: string) =>
    this.axiosInstance.post<{ message: string }>('/auth/verify-email/', { token });

  resendVerificationEmail = () =>
    this.axiosInstance.post<{ message: string }>('/auth/resend-verification-email/');

  requestPasswordReset = (email: string) =>
    this.axiosInstance.post<{ message?: string }>('/auth/request-password-reset/', { email });

  confirmPasswordReset = (token: string, newPassword: string) =>
    this.axiosInstance.post<{ message: string }>('/auth/confirm-password-reset/', { token, new_password: newPassword });

  logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  };

  getCurrentUser = () => this.axiosInstance.get<User>('/auth/me/');

  updateUser = (userData: Partial<Pick<User, 'first_name' | 'last_name' | 'bio' | 'gender'>>) =>
    this.axiosInstance.patch('/auth/me/', userData);

  uploadProfilePicture = (file: File) => {
    const formData = new FormData();
    formData.append('profile_picture', file);
    return this.axiosInstance.patch<User>('/auth/me/', formData);
  };

  getMyProfile = () => this.axiosInstance.get<UserProfile>('/auth/profile/');

  updateUserProfile = (profileData: Partial<UserProfile>) =>
    this.axiosInstance.patch('/auth/profile/', profileData);

  // User methods
  getUserProfile = (userId: number) => this.axiosInstance.get<User>(`/users/${userId}/`);

  getUserByUsername = (username: string) => this.axiosInstance.get<{
    id: number; username: string; first_name: string; last_name: string; display_name: string;
    bio: string; profile_picture: string | null; cover_image: string | null;
    followers_count: number; following_count: number; reputation: number; location: string; website: string;
    is_following?: boolean;
    instagram_url?: string; twitter_url?: string; facebook_url?: string; linkedin_url?: string; youtube_url?: string; pinterest_url?: string;
  }>(`/auth/username/${username}/`);

  followUser = (userId: number) => this.axiosInstance.post(`/auth/${userId}/follow/`);

  unfollowUser = (userId: number) => this.axiosInstance.delete(`/auth/${userId}/unfollow/`);

  getUserFollowing = () => this.axiosInstance.get<User[]>('/auth/following/');

  getUserFollowers = () => this.axiosInstance.get<User[]>('/auth/followers/');

  // Question methods
  getQuestions = (params?: Record<string, unknown>) =>
    this.axiosInstance.get<{ results: Question[]; count?: number }>('/questions/', { params });

  getQuestion = (slug: string) => this.axiosInstance.get<Question>(`/questions/${slug}/`);

  createQuestion = (questionData: Omit<Question, 'id' | 'author' | 'created_at' | 'updated_at'>) => 
    this.axiosInstance.post('/questions/', questionData);

  createQuestionRaw = (payload: { title: string; description: string; content: string; category?: number | null; community?: number | null; tags?: number[]; tag_names?: string[]; status?: string }) =>
    this.axiosInstance.post('/questions/', payload);

  updateQuestion = (slug: string, questionData: Partial<Omit<Question, 'id' | 'author' | 'created_at' | 'updated_at' | 'tags'>> & { tags?: number[]; tag_names?: string[] }) =>
    this.axiosInstance.put(`/questions/${slug}/`, questionData);

  deleteQuestion = (slug: string) => this.axiosInstance.delete(`/questions/${slug}/`);

  likeQuestion = (questionId: number) => this.axiosInstance.post(`/questions/${questionId}/like/`);

  unlikeQuestion = (questionId: number) => this.axiosInstance.delete(`/questions/${questionId}/unlike/`);

  getQuestionAnswers = (questionId: number) =>
    this.axiosInstance.get<Answer[]>(`/questions/${questionId}/answers/`);

  reportQuestion = (questionId: number, reportData: { reason: string; description?: string }) =>
    this.axiosInstance.post(`/questions/${questionId}/report/`, reportData);

  getMyQuestions = () => this.axiosInstance.get<{results: Question[]}>('/questions/my-questions/');

  getTags = () => this.axiosInstance.get<Tag[]>('/questions/tags/');

  getCategories = () => this.axiosInstance.get<{ id: number; name: string; slug: string; parent: number | null; subcategories?: unknown[]; is_following?: boolean }[]>('/categories/');

  /** Kategori detayı (slug ile); /t/[slug] ve SEO için */
  getCategoryBySlug = (slug: string) =>
    this.axiosInstance
      .get<{ id: number; name: string; slug: string; description?: string; question_count?: number }>('/categories/' + encodeURIComponent(slug) + '/')
      .then((r) => r.data);

  followCategory = (categoryId: number) => this.axiosInstance.post<{ followed: boolean }>(`/categories/${categoryId}/follow/`);

  unfollowCategory = (categoryId: number) => this.axiosInstance.delete(`/categories/${categoryId}/unfollow/`);

  /** Kullanıcıların oluşturduğu topluluklar (kategoriye göre) */
  getCommunities = (params?: { category?: string }) =>
    this.axiosInstance.get<CommunityListItem[]>('/communities/', { params });

  getMyManagedCommunities = () =>
    this.axiosInstance.get<CommunityListItem[]>('/communities/my-managed/');

  getMyJoinedCommunities = () =>
    this.axiosInstance.get<CommunityListItem[]>('/communities/my-joined/');

  createCommunity = (data: {
    name: string;
    slug?: string;
    description?: string;
    category: number;
    rules?: string[];
    join_type?: 'open' | 'approval';
    avatar?: File;
    cover_image?: File;
  }) => {
    const hasFiles = data.avatar != null || data.cover_image != null;
    if (hasFiles) {
      const form = new FormData();
      form.append('name', data.name.trim());
      form.append('category', String(data.category));
      if (data.description?.trim()) form.append('description', data.description.trim());
      if (data.join_type) form.append('join_type', data.join_type);
      if (data.rules?.length) form.append('rules', JSON.stringify(data.rules));
      if (data.avatar) form.append('avatar', data.avatar);
      if (data.cover_image) form.append('cover_image', data.cover_image);
      return this.axiosInstance.post<CommunityListItem>('/communities/create/', form);
    }
    const payload: Record<string, unknown> = {
      name: data.name.trim(),
      category: data.category,
      description: data.description?.trim() || undefined,
      join_type: data.join_type ?? 'open',
      rules: data.rules ?? [],
    };
    return this.axiosInstance.post<CommunityListItem>('/communities/create/', payload);
  };

  updateCommunity = (slug: string, data: {
    name?: string;
    description?: string;
    rules?: string[];
    join_type?: 'open' | 'approval';
    avatar?: File;
    cover_image?: File;
  }) => {
    const hasFiles = data.avatar != null || data.cover_image != null;
    if (hasFiles) {
      const form = new FormData();
      if (data.name != null) form.append('name', data.name.trim());
      if (data.description != null) form.append('description', data.description.trim());
      if (data.join_type != null) form.append('join_type', data.join_type);
      if (data.rules != null) form.append('rules', JSON.stringify(data.rules));
      if (data.avatar) form.append('avatar', data.avatar);
      if (data.cover_image) form.append('cover_image', data.cover_image);
      return this.axiosInstance.patch<CommunityListItem>(`/communities/${slug}/update/`, form);
    }
    const payload: Record<string, unknown> = {};
    if (data.name != null) payload.name = data.name.trim();
    if (data.description != null) payload.description = data.description.trim();
    if (data.join_type != null) payload.join_type = data.join_type;
    if (data.rules != null) payload.rules = data.rules;
    return this.axiosInstance.patch<CommunityListItem>(`/communities/${slug}/update/`, payload);
  };

  joinCommunity = (slug: string) =>
    this.axiosInstance.post<{ joined: boolean; member_count?: number; request_sent?: boolean }>(`/communities/${slug}/join/`);

  leaveCommunity = (slug: string) =>
    this.axiosInstance.post<{ member_count: number }>(`/communities/${slug}/leave/`);

  getCommunity = (slug: string) =>
    this.axiosInstance.get<CommunityListItem>(`/communities/${slug}/`);

  getCommunityQuestions = (slug: string) =>
    this.axiosInstance.get<Question[]>(`/communities/${slug}/questions/`);

  getCommunityJoinRequests = (slug: string) =>
    this.axiosInstance.get<{ id: number; user_id: number; username: string; created_at: string }[]>(`/communities/${slug}/join-requests/`);

  approveCommunityJoinRequest = (slug: string, requestId: number) =>
    this.axiosInstance.post<{ approved: boolean; member_count: number }>(`/communities/${slug}/join-requests/${requestId}/approve/`);

  rejectCommunityJoinRequest = (slug: string, requestId: number) =>
    this.axiosInstance.post<{ rejected: boolean }>(`/communities/${slug}/join-requests/${requestId}/reject/`);

  banCommunityUser = (slug: string, userId: number, reason?: string) =>
    this.axiosInstance.post<{ banned: boolean; member_count: number }>(`/communities/${slug}/ban/`, { user_id: userId, reason: reason ?? '' });

  unbanCommunityUser = (slug: string, userId: number) =>
    this.axiosInstance.post<{ unbanned: boolean }>(`/communities/${slug}/unban/${userId}/`);

  getCommunityBannedList = (slug: string) =>
    this.axiosInstance.get<{ id: number; user_id: number; username: string; reason: string; banned_at: string }[]>(`/communities/${slug}/banned/`);

  removeQuestionFromCommunity = (slug: string, questionId: number, reason?: string) =>
    this.axiosInstance.post<{ detail: string }>(`/communities/${slug}/questions/remove/`, { question_id: questionId, reason: reason ?? '' });

  /** İletişim, sosyal medya, GA/GSC - admin panelden yönetilir */
  getSiteSettings = () => this.axiosInstance.get<SiteSettings>('/settings/public/');

  /** Anasayfa sidebar: toplam soru, cevap, kullanıcı sayısı */
  getSiteStats = () =>
    this.axiosInstance
      .get<{ question_count: number; answer_count: number; user_count: number }>('/settings/stats/')
      .then((r) => r.data);

  /** İletişim formu gönderimi (giriş gerekmez) */
  submitContactForm = (data: { name: string; email: string; subject: string; message: string }) =>
    this.axiosInstance.post<{ detail: string }>('/contact/', data);

  // Answer methods
  createAnswer = (questionId: number, answerData: { content: string; parent?: number }) =>
    this.axiosInstance.post(`/answers/${questionId}/answers/`, answerData);

  updateAnswer = (questionId: number, answerId: number, answerData: Partial<Omit<Answer, 'id' | 'author' | 'created_at' | 'updated_at'>>) =>
    this.axiosInstance.put(`/answers/${questionId}/answers/${answerId}/`, answerData);

  deleteAnswer = (questionId: number, answerId: number) =>
    this.axiosInstance.delete(`/answers/${questionId}/answers/${answerId}/`);

  likeAnswer = (answerId: number) => this.axiosInstance.post(`/answers/${answerId}/like/`);

  unlikeAnswer = (answerId: number) => this.axiosInstance.delete(`/answers/${answerId}/unlike/`);

  markAsBestAnswer = (answerId: number) =>
    this.axiosInstance.post(`/answers/${answerId}/mark-best/`);

  reportAnswer = (answerId: number, reportData: { reason: string; description?: string }) =>
    this.axiosInstance.post(`/answers/${answerId}/report/`, reportData);

  getUserAnswers = (userId: number) =>
    this.axiosInstance.get<Answer[]>(`/answers/by-user/${userId}/`);

  // Notification methods
  getNotifications = () => this.axiosInstance.get<Notification[]>('/notifications/');

  getNotificationUnreadCount = () =>
    this.axiosInstance.get<{ unread_count: number }>('/notifications/unread-count/');

  registerFCMToken = (token: string, deviceName?: string) =>
    this.axiosInstance.post('/notifications/fcm-register/', { token: token.trim(), device_name: deviceName || '' });

  markNotificationAsRead = (notificationId: number) =>
    this.axiosInstance.patch(`/notifications/${notificationId}/`);

  markAllNotificationsAsRead = () => this.axiosInstance.post('/notifications/mark-all-read/');

  sendTestPush = () =>
    this.axiosInstance.post<{ sent: boolean; devices?: number; message: string }>('/notifications/send-test-push/');

  getNotificationSettings = () => this.axiosInstance.get('/notifications/settings/');

  updateNotificationSettings = (settingsData: Partial<Record<string, unknown>>) =>
    this.axiosInstance.put('/notifications/settings/', settingsData);

  // Onboarding
  getOnboardingSteps = () => this.axiosInstance.get<{ id: number; title: string; description: string; step_type: string; order: number; max_selections: number; choices: { id: number; label: string; value: string; order: number }[] }[]>('/onboarding/steps/');
  getOnboardingStatus = () => this.axiosInstance.get<{ completed: boolean; completed_at: string | null }>('/onboarding/status/');
  getOnboardingMySelections = () =>
    this.axiosInstance.get<{ steps: { step_id: number; step_type: string; choice_ids: number[]; category_ids: number[]; tag_ids: number[] }[] }>('/onboarding/my-selections/');
  submitOnboarding = (data: { step_id: number; category_ids?: number[]; tag_ids?: number[]; choice_ids?: number[] }) =>
    this.axiosInstance.post('/onboarding/submit/', data);
  completeOnboarding = () => this.axiosInstance.post('/onboarding/complete/');
  getOnboardingCategories = (gender?: string) =>
    this.axiosInstance.get<{ id: number; name: string; slug: string; parent_id: number | null; target_gender?: string }[]>(
      '/onboarding/categories/',
      gender ? { params: { gender } } : {}
    );
  getOnboardingTags = () => this.axiosInstance.get<{ id: number; name: string; slug: string }[]>('/onboarding/tags/');

  // Achievements
  getAchievementsByUsername = (username: string) =>
    this.axiosInstance.get<AchievementCategoryResponse[]>(`/achievements/users/${username}/`);

  // Favorites / Saved collections
  getSavedCollections = () =>
    this.axiosInstance.get<SavedCollection[]>('/favorites/collections/');

  createSavedCollection = (name: string) =>
    this.axiosInstance.post<SavedCollection>('/favorites/collections/', { name });

  getSavedCollectionItems = (collectionId: number) =>
    this.axiosInstance.get<SavedItem[]>('/favorites/collections/' + collectionId + '/items/');

  saveQuestion = (questionId: number, collectionId?: number) =>
    this.axiosInstance.post<{ id: number; collection: SavedCollection; message: string }>(
      `/favorites/save/${questionId}/`,
      collectionId ? { collection_id: collectionId } : {}
    );

  saveQuestionToNewCollection = (questionId: number, name: string) =>
    this.axiosInstance.post<{ collection: SavedCollection; message: string }>(
      `/favorites/save/${questionId}/new/`,
      { name }
    );

  removeFromSaved = (questionId: number) =>
    this.axiosInstance.delete(`/favorites/remove/${questionId}/`);

  checkSaved = (questionId: number) =>
    this.axiosInstance.get<{ saved: boolean; collections: SavedCollection[] }>(
      `/favorites/check/${questionId}/`
    );

  saveBlogPost = (blogPostId: number, collectionId?: number) =>
    this.axiosInstance.post<{ id: number; collection: SavedCollection; message: string }>(
      `/favorites/save-blog/${blogPostId}/`,
      collectionId ? { collection_id: collectionId } : {}
    );

  saveBlogPostToNewCollection = (blogPostId: number, name: string) =>
    this.axiosInstance.post<{ collection: SavedCollection; message: string }>(
      `/favorites/save-blog/${blogPostId}/new/`,
      { name }
    );

  checkSavedBlog = (blogPostId: number) =>
    this.axiosInstance.get<{ saved: boolean; collections: SavedCollection[] }>(
      `/favorites/check-blog/${blogPostId}/`
    );

  removeBlogFromSaved = (blogPostId: number) =>
    this.axiosInstance.delete(`/favorites/remove-blog/${blogPostId}/`);

  // Tasarım yükleme (Pinterest tarzı, çoklu görsel)
  uploadDesign = (data: {
    files: File[];
    license: string;
    addWatermark: boolean;
    tags: string;
    description?: string;
    copyrightConfirmed: boolean;
  }) => {
    const form = new FormData();
    data.files.forEach((f) => form.append('files', f));
    form.append('license', data.license);
    form.append('add_watermark', data.addWatermark ? 'true' : 'false');
    form.append('tags', data.tags);
    if (data.description != null) form.append('description', data.description);
    form.append('copyright_confirmed', data.copyrightConfirmed ? 'true' : 'false');
    return this.axiosInstance.post<DesignResponse>(
      '/designs/upload/',
      form,
      { timeout: 120000 }
    );
  };

  getMyDesigns = () =>
    this.axiosInstance.get<{ results: DesignListItem[] }>('/designs/my/');

  getDesigns = (params?: { author?: string; page?: number }) =>
    this.axiosInstance.get<{ results: DesignListItem[]; count?: number }>('/designs/', { params });

  getDesign = (id: number) =>
    this.axiosInstance.get<DesignResponse>(`/designs/${id}/`);

  updateDesign = (id: number, data: { license: string; tags: string; description?: string }) =>
    this.axiosInstance.patch<DesignResponse>(`/designs/${id}/`, data);

  deleteDesign = (id: number) =>
    this.axiosInstance.delete(`/designs/${id}/`);

  // Blog (sadece admin yazar; kullanıcılar okuyup yorum/beğeni yapabilir)
  getBlogPosts = (params?: { page?: number }) =>
    this.axiosInstance.get<{ results: BlogPostListItem[]; count?: number }>('/blog/', { params });

  /** En çok okunan ilk 3 blog yazısı */
  getBlogPopularPosts = () =>
    this.axiosInstance.get<BlogPostListItem[]>('/blog/popular/');

  getBlogPost = (slug: string) =>
    this.axiosInstance.get<BlogPostDetailItem>(`/blog/${slug}/`);

  createBlogComment = (slug: string, content: string) =>
    this.axiosInstance.post<BlogCommentItem>(`/blog/${slug}/comments/`, { content });

  blogLike = (slug: string) =>
    this.axiosInstance.post<{ liked: boolean; like_count: number }>(`/blog/${slug}/like/`);

  blogUnlike = (slug: string) =>
    this.axiosInstance.delete<{ liked: boolean; like_count: number }>(`/blog/${slug}/unlike/`);

  getBlogLikeStatus = (slug: string) =>
    this.axiosInstance.get<{ liked: boolean; like_count: number }>(`/blog/${slug}/like-status/`);
}

export interface CommunityListItem {
  id: number;
  name: string;
  slug: string;
  description: string;
  category: number;
  category_name: string;
  category_slug: string;
  owner: number;
  owner_username: string;
  member_count: number;
  is_member: boolean;
  rules?: string[];
  join_type?: 'open' | 'approval';
  avatar_url?: string | null;
  cover_image_url?: string | null;
  join_request_pending?: boolean;
  is_banned?: boolean;
  is_mod_or_owner?: boolean;
  created_at: string;
}

export interface SavedCollection {
  id: number;
  name: string;
  is_default: boolean;
  item_count: number;
  created_at: string;
}

export interface SavedItem {
  id: number;
  collection: number;
  question: Question | null;
  blog_post: BlogPostListItem | null;
  created_at: string;
}

// Achievements types
export interface AchievementItem {
  id: number;
  name: string;
  description: string;
  code: string;
  icon: string;
  order: number;
  unlocked: boolean;
  unlocked_at: string | null;
  current_progress?: number | null;
  target_progress?: number | null;
}

export interface AchievementCategoryResponse {
  id: number;
  name: string;
  slug: string;
  description: string;
  order: number;
  total_count: number;
  unlocked_count: number;
  achievements: AchievementItem[];
}

// Tasarım (çoklu görsel, slider)
export interface DesignListItem {
  id: number;
  image_url: string | null;
  image_urls: string[];
  license: string;
  add_watermark: boolean;
  tags: string;
  description: string;
  created_at: string;
  author_username: string;
}
export type DesignResponse = DesignListItem;

// Blog types
export interface BlogPostListItem {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  featured_image: string | null;
  author: User;
  published_at: string | null;
  view_count: number;
  like_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
}

export interface BlogCommentItem {
  id: number;
  post: number;
  author: User;
  content: string;
  created_at: string;
  updated_at: string;
  /** 0 = İnceleniyor, 1 = Onaylı, 2 = Reddedildi */
  moderation_status?: number;
}

export interface BlogPostDetailItem extends BlogPostListItem {
  content: string;
  is_published: boolean;
  comments: BlogCommentItem[];
}

export default new ApiService();