import type { KidsAnnouncement, KidsAnnouncementCategory } from '@/src/lib/kids-api';

/** Rozet ve liste filtresi için aynı kategori (API’de yoksa başlık/id ile legacy). */
export function effectiveAnnouncementCategory(a: {
  id: number;
  title: string;
  category?: KidsAnnouncementCategory | null;
}): KidsAnnouncementCategory {
  const c = a.category;
  if (c === 'event' || c === 'info' || c === 'general') return c;
  const title = a.title || '';
  if (/etkinlik|gösteri|gosteri|konser|yarışma|yarisma|gezi|şenlik|senlik|festival/i.test(title)) {
    return 'event';
  }
  if (/bilgi|hatırlatma|hatirlatma|toplantı|toplanti|açıklama|aciklama|bildiri/i.test(title)) {
    return 'info';
  }
  const m = Math.abs(a.id) % 3;
  if (m === 0) return 'event';
  if (m === 1) return 'info';
  return 'general';
}

/** Sabitlenenler önce, sonra yayın/tarih azalan (en güncel üstte). API sayfaları birleştirildikten sonra da aynı sıra korunur. */
export function sortAnnouncementsForDisplay(list: KidsAnnouncement[]): KidsAnnouncement[] {
  return [...list].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
    const da = new Date(a.published_at || a.created_at).getTime();
    const db = new Date(b.published_at || b.created_at).getTime();
    return db - da;
  });
}
