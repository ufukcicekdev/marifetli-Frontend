const KIDS_PARENT_MESSAGES_UNLOCK_AT_KEY = 'kids_parent_messages_unlock_at';
const KIDS_PARENT_MESSAGES_UNLOCK_TTL_MS = 15 * 60 * 1000;

export function kidsParentMessagesHasRecentUnlock(): boolean {
  if (typeof window === 'undefined') return false;
  const raw = sessionStorage.getItem(KIDS_PARENT_MESSAGES_UNLOCK_AT_KEY);
  const at = Number(raw || '');
  if (!Number.isFinite(at) || at <= 0) return false;
  return Date.now() - at < KIDS_PARENT_MESSAGES_UNLOCK_TTL_MS;
}

export function kidsParentMessagesMarkUnlockedNow(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(KIDS_PARENT_MESSAGES_UNLOCK_AT_KEY, String(Date.now()));
}

