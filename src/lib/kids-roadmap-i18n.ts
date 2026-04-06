import type { KidsGrowthStage, KidsRoadmapMilestone } from '@/src/lib/kids-api';

/** API Türkçe döndürür; UI dili ile uyum için `code` / milestone `key` üzerinden çeviri. */
export function localizedGrowthStageTitle(
  stage: KidsGrowthStage | null | undefined,
  t: (key: string) => string,
  fallbackKey: string,
): string {
  const code = (stage?.code || '').trim();
  if (!code) return t(fallbackKey);
  const k = `student.growthStage.${code}.title`;
  const out = t(k);
  if (out !== k) return out;
  return (stage?.title || '').trim() || t(fallbackKey);
}

export function localizedMilestoneCopy(
  m: KidsRoadmapMilestone,
  t: (key: string) => string,
): { title: string; subtitle: string } {
  const tk = `roadmap.milestone.${m.key}.title`;
  const sk = `roadmap.milestone.${m.key}.subtitle`;
  const title = t(tk);
  const subtitle = t(sk);
  return {
    title: title !== tk ? title : m.title,
    subtitle: subtitle !== sk ? subtitle : m.subtitle,
  };
}
