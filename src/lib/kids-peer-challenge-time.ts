import type { KidsPeerChallenge } from '@/src/lib/kids-api';

/** Öğrenci arkadaş yarışmasında davet / kabul için zaman penceresi açık mı? */
export function isPeerStudentChallengeWindowOpen(ch: KidsPeerChallenge): boolean {
  if (ch.status !== 'active') return false;
  if (ch.source !== 'student') return true;
  const now = Date.now();
  if (ch.starts_at) {
    const s = Date.parse(ch.starts_at);
    if (!Number.isFinite(s) || now < s) return false;
  }
  if (ch.ends_at) {
    const e = Date.parse(ch.ends_at);
    if (!Number.isFinite(e) || now > e) return false;
  }
  return true;
}
