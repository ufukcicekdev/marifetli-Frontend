/**
 * Son gezilen sorular, topluluklar ve profiller (localStorage, en fazla 5'er, yenisi üste).
 * Reddit tarzı tek listede gösterim için birleştirilir.
 */

const KEY_QUESTIONS = 'marifetli_recent_questions';
const KEY_COMMUNITIES = 'marifetli_recent_communities';
const KEY_PROFILES = 'marifetli_recent_profiles';
const KEY_BLOGS = 'marifetli_recent_blogs';
const MAX = 5;

export interface RecentQuestion {
  id: number;
  slug: string;
  title: string;
  visitedAt: string;
  categorySlug?: string;
  categoryLabel?: string;
  likeCount?: number;
  commentCount?: number;
  imageUrl?: string;
}

export interface RecentCommunity {
  slug: string;
  label: string;
  visitedAt: string;
}

export interface RecentProfile {
  username: string;
  displayName?: string;
  visitedAt: string;
  profilePicture?: string;
}

export interface RecentBlog {
  slug: string;
  title: string;
  visitedAt: string;
  imageUrl?: string;
}

export type RecentItem =
  | { type: 'question'; id: number; slug: string; title: string; visitedAt: string; categorySlug?: string; categoryLabel?: string; likeCount?: number; commentCount?: number; imageUrl?: string }
  | { type: 'community'; slug: string; label: string; visitedAt: string }
  | { type: 'profile'; username: string; displayName?: string; visitedAt: string; profilePicture?: string }
  | { type: 'blog'; slug: string; title: string; visitedAt: string; imageUrl?: string };

const fallbackDate = () => new Date(0).toISOString();

function getRecentQuestions(): RecentQuestion[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY_QUESTIONS);
    const arr = raw ? JSON.parse(raw) : [];
    return (Array.isArray(arr) ? arr.slice(0, MAX) : []).map((q: Record<string, unknown>) => ({
      ...q,
      visitedAt: (q.visitedAt as string) || fallbackDate(),
    })) as RecentQuestion[];
  } catch {
    return [];
  }
}

function getRecentCommunities(): RecentCommunity[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY_COMMUNITIES);
    const arr = raw ? JSON.parse(raw) : [];
    return (Array.isArray(arr) ? arr.slice(0, MAX) : []).map((c: Record<string, unknown>) => ({
      ...c,
      visitedAt: (c.visitedAt as string) || fallbackDate(),
    })) as RecentCommunity[];
  } catch {
    return [];
  }
}

function getRecentProfiles(): RecentProfile[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY_PROFILES);
    const arr = raw ? JSON.parse(raw) : [];
    return (Array.isArray(arr) ? arr.slice(0, MAX) : []).map((p: Record<string, unknown>) => ({
      ...p,
      visitedAt: (p.visitedAt as string) || fallbackDate(),
    })) as RecentProfile[];
  } catch {
    return [];
  }
}

function getRecentBlogs(): RecentBlog[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY_BLOGS);
    const arr = raw ? JSON.parse(raw) : [];
    return (Array.isArray(arr) ? arr.slice(0, MAX) : []).map((b: Record<string, unknown>) => ({
      ...b,
      visitedAt: (b.visitedAt as string) || fallbackDate(),
    })) as RecentBlog[];
  } catch {
    return [];
  }
}

function uniqByFirst<T>(arr: T[], key: (x: T) => string): T[] {
  const seen = new Set<string>();
  return arr.filter((x) => {
    const k = key(x);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function addRecentQuestion(item: Omit<RecentQuestion, 'visitedAt'> & { visitedAt?: string }): void {
  const withTime = { ...item, visitedAt: item.visitedAt ?? new Date().toISOString() };
  const list = getRecentQuestions();
  const next = uniqByFirst([withTime, ...list.filter((q) => q.id !== item.id)], (q) => String(q.id)).slice(0, MAX);
  try {
    localStorage.setItem(KEY_QUESTIONS, JSON.stringify(next));
  } catch (_) {}
}

export function addRecentCommunity(item: Omit<RecentCommunity, 'visitedAt'> & { visitedAt?: string }): void {
  const withTime = { ...item, visitedAt: item.visitedAt ?? new Date().toISOString() };
  const list = getRecentCommunities();
  const next = uniqByFirst([withTime, ...list.filter((c) => c.slug !== item.slug)], (c) => c.slug).slice(0, MAX);
  try {
    localStorage.setItem(KEY_COMMUNITIES, JSON.stringify(next));
  } catch (_) {}
}

export function addRecentProfile(item: Omit<RecentProfile, 'visitedAt'> & { visitedAt?: string }): void {
  const withTime = { ...item, visitedAt: item.visitedAt ?? new Date().toISOString() };
  const list = getRecentProfiles();
  const key = (item.username || '').toLowerCase();
  const next = uniqByFirst([withTime, ...list.filter((p) => (p.username || '').toLowerCase() !== key)], (p) => (p.username || '').toLowerCase()).slice(0, MAX);
  try {
    localStorage.setItem(KEY_PROFILES, JSON.stringify(next));
  } catch (_) {}
}

export function addRecentBlog(item: Omit<RecentBlog, 'visitedAt'> & { visitedAt?: string }): void {
  const withTime = { ...item, visitedAt: item.visitedAt ?? new Date().toISOString() };
  const list = getRecentBlogs();
  const next = uniqByFirst([withTime, ...list.filter((b) => b.slug !== item.slug)], (b) => b.slug).slice(0, MAX);
  try {
    localStorage.setItem(KEY_BLOGS, JSON.stringify(next));
  } catch (_) {}
}

export function getRecentQuestionsList(): RecentQuestion[] {
  return getRecentQuestions();
}

export function getRecentCommunitiesList(): RecentCommunity[] {
  return getRecentCommunities();
}

/** Son 5 öğeyi ziyaret zamanına göre birleştirir (soru, topluluk, profil, blog karışık). */
export function getRecentActivityList(): RecentItem[] {
  const qs = getRecentQuestions().map((q) => ({ type: 'question' as const, ...q }));
  const cs = getRecentCommunities().map((c) => ({ type: 'community' as const, ...c }));
  const ps = getRecentProfiles().map((p) => ({ type: 'profile' as const, ...p }));
  const bs = getRecentBlogs().map((b) => ({ type: 'blog' as const, ...b }));
  return [...qs, ...cs, ...ps, ...bs].sort((a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime()).slice(0, MAX);
}

export function clearRecentActivity(): void {
  try {
    localStorage.removeItem(KEY_QUESTIONS);
    localStorage.removeItem(KEY_COMMUNITIES);
    localStorage.removeItem(KEY_PROFILES);
    localStorage.removeItem(KEY_BLOGS);
  } catch (_) {}
}
