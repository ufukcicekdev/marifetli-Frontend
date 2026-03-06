export interface User {
  id: number;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  bio?: string;
  profile_picture?: string;
  gender?: string;
  followers_count: number;
  following_count: number;
  date_of_birth?: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: number;
  user: number;
  bio?: string;
  location?: string;
  birth_date?: string;
  website?: string;
  instagram_url?: string;
  twitter_url?: string;
  facebook_url?: string;
  linkedin_url?: string;
  youtube_url?: string;
  pinterest_url?: string;
  avatar?: string;
  reputation: number;
  is_private: boolean;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: number;
  name: string;
  description?: string;
  created_at: string;
}

/** Admin panelden yönetilen site ayarları (iletişim, sosyal medya, logo, favicon, GA, GSC) */
export interface SiteSettings {
  contact: {
    email: string;
    phone: string;
    address: string;
    description: string;
  };
  social_links: { platform: string; url: string; label: string; order: number }[];
  google_analytics_id: string;
  google_search_console_meta: string;
  logo_url?: string | null;
  favicon_url?: string | null;
}

export interface Question {
  id: number;
  title: string;
  slug: string;
  description: string;
  author: User;
  tags: Tag[];
  status: 'draft' | 'open' | 'closed' | 'archived';
  view_count: number;
  like_count: number;
  answer_count: number;
  is_resolved: boolean;
  best_answer?: number;
  created_at: string;
  updated_at: string;
}

export interface Answer {
  id: number;
  question: number;
  parent?: number | null;
  author: User;
  content: string;
  is_best_answer: boolean;
  like_count: number;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: number;
  recipient: number;
  sender: User;
  notification_type: 'answer' | 'like_question' | 'like_answer' | 'follow' | 'mention' | 'best_answer' | 'followed_post';
  question?: number;
  answer?: number;
  question_slug?: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface Follow {
  id: number;
  follower: number;
  following: number;
  created_at: string;
}

export interface QuestionLike {
  id: number;
  user: number;
  question_id: number;
  created_at: string;
}

export interface AnswerLike {
  id: number;
  user: number;
  answer_id: number;
  created_at: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next?: string;
  previous?: string;
  results: T[];
}