import axios, { AxiosInstance } from 'axios';
import { User, UserProfile, Question, Answer, Notification, Tag } from '../types';

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

    // Request interceptor to add token to headers
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle token refresh
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
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

        return Promise.reject(error);
      }
    );
  }

  // Authentication methods
  register = (userData: { email: string; username: string; password: string }) =>
    this.axiosInstance.post('/auth/register/', userData);

  login = (credentials: { email: string; password: string }) =>
    this.axiosInstance.post('/auth/login/', credentials);

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
  getQuestions = (params?: Record<string, unknown>) => this.axiosInstance.get<{results: Question[]}>('/questions/', { params });

  getQuestion = (slug: string) => this.axiosInstance.get<Question>(`/questions/${slug}/`);

  createQuestion = (questionData: Omit<Question, 'id' | 'author' | 'created_at' | 'updated_at'>) => 
    this.axiosInstance.post('/questions/', questionData);

  createQuestionRaw = (payload: { title: string; description: string; content: string; category?: number | null; tags?: number[]; status?: string }) =>
    this.axiosInstance.post('/questions/', payload);

  updateQuestion = (slug: string, questionData: Partial<Omit<Question, 'id' | 'author' | 'created_at' | 'updated_at'>>) =>
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

  getCategories = () => this.axiosInstance.get<{ id: number; name: string; slug: string; parent: number | null; subcategories?: unknown[] }[]>('/categories/');

  // Answer methods
  createAnswer = (questionId: number, answerData: Omit<Answer, 'id' | 'author' | 'created_at' | 'updated_at'>) =>
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

  // Notification methods
  getNotifications = () => this.axiosInstance.get<Notification[]>('/notifications/');

  markNotificationAsRead = (notificationId: number) =>
    this.axiosInstance.patch(`/notifications/${notificationId}/`);

  markAllNotificationsAsRead = () => this.axiosInstance.post('/notifications/mark-all-read/');

  getNotificationSettings = () => this.axiosInstance.get('/notifications/settings/');

  updateNotificationSettings = (settingsData: Partial<Record<string, unknown>>) =>
    this.axiosInstance.put('/notifications/settings/', settingsData);

  // Onboarding
  getOnboardingSteps = () => this.axiosInstance.get<{ id: number; title: string; description: string; step_type: string; order: number; max_selections: number; choices: { id: number; label: string; value: string; order: number }[] }[]>('/onboarding/steps/');
  getOnboardingStatus = () => this.axiosInstance.get<{ completed: boolean; completed_at: string | null }>('/onboarding/status/');
  submitOnboarding = (data: { step_id: number; category_ids?: number[]; tag_ids?: number[]; choice_ids?: number[] }) =>
    this.axiosInstance.post('/onboarding/submit/', data);
  completeOnboarding = () => this.axiosInstance.post('/onboarding/complete/');
  getOnboardingCategories = () => this.axiosInstance.get<{ id: number; name: string; slug: string; parent_id: number | null }[]>('/onboarding/categories/');
  getOnboardingTags = () => this.axiosInstance.get<{ id: number; name: string; slug: string }[]>('/onboarding/tags/');

  // Achievements
  getAchievementsByUsername = (username: string) =>
    this.axiosInstance.get<AchievementCategoryResponse[]>(`/achievements/users/${username}/`);
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

export default new ApiService();