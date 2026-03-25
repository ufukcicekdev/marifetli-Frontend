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
  /** Ana site Django yönetimi (Kids yönetim girişi için aynı hesap kullanılabilir). */
  is_staff?: boolean;
  is_superuser?: boolean;
  /** Yalnızca kendi `/auth/me/` kaydında; Kids veli/öğretmen — boşsa Kids API ana JWT ile kapalı. */
  kids_portal_role?: string;
  /** İtibar puanına göre rütbe (forum etiketi vb.) */
  current_level_title?: string;
  /** Avatar köşesinde gösterilecek son kazanılan rozetler (en fazla 3) */
  avatar_badges?: { slug: string; name: string; icon: string }[];
  created_at: string;
  updated_at: string;
}

/** /auth/me/gamification/ — seviye ve rozet yol haritası */
export interface GamificationBadgeCue {
  slug: string;
  name: string;
  icon: string;
  current: number;
  target: number;
  hint: string;
  cta_path: string;
  cta_label: string;
}

/** GET /gamification/public/ — giriş gerekmez */
export interface PublicGamificationLevelRow {
  title: string;
  points_min: number;
  points_max: number | null;
}

export interface PublicGamificationBadgeRow {
  slug: string;
  name: string;
  description: string;
  badge_type: string;
  requirement_value: number;
  points_required: number;
  icon: string;
}

export interface PublicGamificationInfo {
  levels: PublicGamificationLevelRow[];
  how_it_works: string[];
  reputation_tips: string[];
  badges: PublicGamificationBadgeRow[];
}

/** GET /category-experts/ */
export interface CategoryExpertsConfig {
  enabled: boolean;
  backend_ready: boolean;
  provider: string;
  max_questions_per_user: number;
  limit_period: string;
  categories: { id: number; name: string; slug: string; expert_display_name: string }[];
  authenticated?: boolean;
  remaining_questions?: number;
  max_questions_for_user?: number;
}

/** POST /category-experts/ask/ */
export interface CategoryExpertAskResponse {
  answer: string;
  remaining_questions: number;
  max_questions_for_user: number;
  main_category: { id: number; name: string; slug: string };
  subcategory: { id: number; name: string; slug: string } | null;
}

export interface CategoryExpertHistoryItem {
  id: number;
  question: string;
  answer: string;
  main_category: string;
  subcategory: string | null;
  created_at: string;
}

export interface GamificationRoadmap {
  reputation: number;
  level_title: string;
  level_band: {
    current_title: string;
    next_title: string | null;
    next_threshold: number | null;
    points_to_next: number;
    progress_percent_in_band: number;
    band_min: number;
    band_max: number | null;
  };
  headline: string;
  subtext: string;
  badge_cues: GamificationBadgeCue[];
  top_badge_cue: GamificationBadgeCue | null;
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

/** Admin panelden yönetilen site ayarları (iletişim, sosyal medya, logo, favicon, GA, GSC, hakkımızda) */
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
  primary_color?: string | null;
  about_summary?: string;
  about_content?: string;
  auth_modal_headline?: string;
  auth_modal_description?: string;
  /** Admin panelden seçilen gövde yazı tipi (Google Fonts ailesi adı). Boş = varsayılan. */
  font_body?: string | null;
  /** Admin panelden seçilen başlık yazı tipi. Boş = font_body kullanılır. */
  font_heading?: string | null;
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
  /** 0 = İnceleniyor, 1 = Onaylı, 2 = Reddedildi */
  moderation_status?: ModerationStatus;
  created_at: string;
  updated_at: string;
  // Soru detayında backend nested olarak cevapları dönebilir
  answers?: Answer[];
}

/** 0 = Beklemede, 1 = Onaylı, 2 = Reddedildi */
export type ModerationStatus = 0 | 1 | 2;

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
  /** 0 = İnceleniyor, 1 = Onaylı (yayında), 2 = Reddedildi (listede gösterilmez) */
  moderation_status?: ModerationStatus;
}

export interface Notification {
  id: number;
  recipient: number;
  sender: User;
  notification_type: 'answer' | 'like_question' | 'like_answer' | 'like_design' | 'comment_design' | 'follow' | 'mention' | 'best_answer' | 'followed_post' | 'community_join_request' | 'community_post_removed' | 'moderation_removed';
  question?: number;
  answer?: number;
  design?: number;
  question_slug?: string | null;
  community_slug?: string | null;
  design_id?: number | null;
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