import type { KidsAssignment, KidsBadgeRoadmap } from '@/src/lib/kids-api';

const PICK_BASELINE = 'marifetli_kids_pick_baseline_done';
const PICK_SEEN_KEYS = 'marifetli_kids_seen_teacher_pick_keys';
const PRAISE_BASELINE = 'marifetli_kids_praise_baseline_done';
const PRAISE_SEEN_IDS = 'marifetli_kids_seen_praise_submission_ids';

function readStringArray(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const p = JSON.parse(raw) as unknown;
    return Array.isArray(p) ? p.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function writeStringArray(key: string, values: string[]) {
  localStorage.setItem(key, JSON.stringify(values));
}

export type NewPickCelebration = { kind: 'pick'; labels: string[] };

/** İlk ziyarette mevcut yıldızları “görüldü” say; yalnızca sonradan eklenenler kutlanır. */
export function detectNewTeacherPicks(roadmap: KidsBadgeRoadmap): NewPickCelebration | null {
  if (typeof window === 'undefined') return null;
  const keys = roadmap.teacher_picks.map((p) => p.key);
  if (!localStorage.getItem(PICK_BASELINE)) {
    writeStringArray(PICK_SEEN_KEYS, keys);
    localStorage.setItem(PICK_BASELINE, '1');
    return null;
  }
  const seen = new Set(readStringArray(PICK_SEEN_KEYS));
  const fresh = roadmap.teacher_picks.filter((p) => !seen.has(p.key));
  if (fresh.length === 0) return null;
  writeStringArray(PICK_SEEN_KEYS, [...new Set([...seen, ...keys])]);
  const labels = fresh.map((p) => p.label || `Proje #${p.assignment_id}`);
  return { kind: 'pick', labels };
}

/** Öğretmen “çok güzel” dediğinde tek seferlik mini kutlama metni. */
export function detectNewPraiseTitles(assignments: KidsAssignment[]): string[] {
  if (typeof window === 'undefined') return [];
  const currentIds: number[] = [];

  for (const a of assignments) {
    const s = a.my_submission;
    if (!s || s.teacher_review_positive !== true) continue;
    currentIds.push(s.id);
  }

  if (!localStorage.getItem(PRAISE_BASELINE)) {
    writeStringArray(
      PRAISE_SEEN_IDS,
      currentIds.map(String),
    );
    localStorage.setItem(PRAISE_BASELINE, '1');
    return [];
  }

  const seen = new Set(readStringArray(PRAISE_SEEN_IDS));
  const newTitles: string[] = [];
  for (const a of assignments) {
    const s = a.my_submission;
    if (!s || s.teacher_review_positive !== true) continue;
    const idStr = String(s.id);
    if (!seen.has(idStr)) {
      newTitles.push(a.title);
      seen.add(idStr);
    }
  }
  if (newTitles.length) {
    writeStringArray(PRAISE_SEEN_IDS, [...seen]);
  }
  return newTitles;
}
