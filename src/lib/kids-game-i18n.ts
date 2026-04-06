import type { KidsGame } from '@/src/lib/kids-api';

export type KidsGameCopyField = 'title' | 'description' | 'instructions';

/** API Türkçe döner; öğrenci arayüz dili için `slug` + alan anahtarı ile çeviri. */
export function localizedKidsGameCopy(
  game: Pick<KidsGame, 'slug' | 'title' | 'description' | 'instructions'>,
  field: KidsGameCopyField,
  t: (key: string) => string,
): string {
  const k = `gameCenter.games.${game.slug}.${field}`;
  const out = t(k);
  if (out !== k) return out;
  if (field === 'title') return game.title;
  if (field === 'description') return game.description || '';
  return game.instructions || '';
}
