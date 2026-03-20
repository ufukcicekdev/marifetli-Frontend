import type { User } from '@/src/types';
import type { AvatarBadgeChip } from '@/src/components/optimized-avatar';

/** Soru listesindeki `author` nesnesinden PostItem prop'ları */
export function postItemAuthorFields(author: unknown): {
  author: string;
  authorAvatar?: string | null;
  authorAvatarBadges?: AvatarBadgeChip[] | null;
  authorLevelTitle?: string | null;
} {
  const a = author && typeof author === 'object' ? (author as User) : null;
  return {
    author: a?.username ?? '',
    authorAvatar: a?.profile_picture,
    authorAvatarBadges: a?.avatar_badges?.length ? a.avatar_badges : undefined,
    authorLevelTitle: a?.current_level_title ?? undefined,
  };
}
