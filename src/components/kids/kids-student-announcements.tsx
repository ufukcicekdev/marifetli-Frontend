'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { BookOpen, Megaphone, PartyPopper, Sparkles, X } from 'lucide-react';
import {
  kidsListAnnouncements,
  KIDS_ANNOUNCEMENTS_PAGE_SIZE,
  type KidsAnnouncement,
  type KidsAnnouncementCategory,
} from '@/src/lib/kids-api';
import {
  effectiveAnnouncementCategory,
  sortAnnouncementsForDisplay,
} from '@/src/lib/kids-announcements-shared';
import { MediaSlider } from '@/src/components/media-slider';
import type { MediaItem } from '@/src/lib/extract-media';
import { useKidsI18n } from '@/src/providers/kids-language-provider';

const NEW_BADGE_MS = 7 * 24 * 60 * 60 * 1000;

function isImageAttachment(contentType: string, fileName: string): boolean {
  const ct = (contentType || '').toLowerCase();
  if (ct.startsWith('image/')) return true;
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(fileName || '');
}

function firstImageUrl(a: KidsAnnouncement): string | null {
  for (const att of a.attachments ?? []) {
    if (isImageAttachment(att.content_type, att.original_name)) return att.url;
  }
  return null;
}

function excerptText(body: string, max = 140): string {
  const t = (body || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function formatAnnouncementDate(iso: string | null, lang: string): string {
  if (!iso) return '';
  const loc = lang === 'tr' ? 'tr-TR' : lang === 'ge' ? 'de-DE' : 'en-US';
  try {
    return new Date(iso).toLocaleString(loc, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function isNewAnnouncement(a: KidsAnnouncement): boolean {
  const t = new Date(a.published_at || a.created_at).getTime();
  return Date.now() - t < NEW_BADGE_MS;
}

function categoryIcon(cat: KidsAnnouncementCategory) {
  const box =
    'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300';
  if (cat === 'event')
    return (
      <div className={box} aria-hidden>
        <PartyPopper className="h-6 w-6" strokeWidth={2} />
      </div>
    );
  if (cat === 'info')
    return (
      <div className={box} aria-hidden>
        <Megaphone className="h-6 w-6" strokeWidth={2} />
      </div>
    );
  return (
    <div className={box} aria-hidden>
      <Sparkles className="h-6 w-6" strokeWidth={2} />
    </div>
  );
}

function categoryPillClass(cat: KidsAnnouncementCategory): string {
  if (cat === 'event')
    return 'bg-rose-100 text-rose-800 ring-rose-200/80 dark:bg-rose-950/50 dark:text-rose-100 dark:ring-rose-800/50';
  if (cat === 'info')
    return 'bg-amber-100 text-amber-900 ring-amber-200/80 dark:bg-amber-950/40 dark:text-amber-100 dark:ring-amber-800/50';
  return 'bg-violet-100 text-violet-800 ring-violet-200/80 dark:bg-violet-950/50 dark:text-violet-100 dark:ring-violet-800/60';
}

type FilterTab = 'all' | KidsAnnouncementCategory;

const gradientBtn =
  'inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-pink-500 px-5 py-2.5 text-xs font-black text-white shadow-md shadow-violet-500/25 transition hover:from-violet-500 hover:to-pink-400 sm:text-sm';

type KidsStudentAnnouncementsViewProps = {
  pathPrefix: string;
  /** Varsayılan: öğrenci paneli */
  backHref?: string;
  backLabelKey?: string;
  /** Alt başlık çeviri anahtarı; varsayılan öğrenci metni */
  pageSubtitleKey?: string;
};

export function KidsStudentAnnouncementsView({
  pathPrefix,
  backHref: backHrefProp,
  backLabelKey = 'nav.studentPanel',
  pageSubtitleKey = 'student.announcements.pageSubtitle',
}: KidsStudentAnnouncementsViewProps) {
  const { t, language } = useKidsI18n();
  const backHref = backHrefProp ?? `${pathPrefix}/ogrenci/panel`;
  const [rows, setRows] = useState<KidsAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [detail, setDetail] = useState<KidsAnnouncement | null>(null);

  const filterTabs = useMemo(
    () =>
      [
        { id: 'all' as const, label: t('announcements.filterAll') },
        { id: 'event' as const, label: t('announcements.catEvent') },
        { id: 'info' as const, label: t('announcements.catInfo') },
        { id: 'general' as const, label: t('announcements.catGeneral') },
      ] as const,
    [t],
  );

  const load = useCallback(
    async (offset: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const raw = await kidsListAnnouncements({ limit: KIDS_ANNOUNCEMENTS_PAGE_SIZE, offset });
        const chunk = Array.isArray(raw) ? raw : raw.results;
        const nextHasMore = Array.isArray(raw) ? false : raw.has_more;
        setRows((prev) => (append ? [...prev, ...chunk] : chunk));
        setHasMore(nextHasMore);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t('announcements.loadError'));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [t],
  );

  useEffect(() => {
    void load(0, false);
  }, [load]);

  const filtered = useMemo(() => {
    if (filterTab === 'all') return rows;
    return rows.filter((a) => effectiveAnnouncementCategory(a) === filterTab);
  }, [rows, filterTab]);

  const sorted = useMemo(() => sortAnnouncementsForDisplay(filtered), [filtered]);

  const { featured, others } = useMemo(() => {
    if (sorted.length === 0) return { featured: null as KidsAnnouncement | null, others: [] as KidsAnnouncement[] };
    const pin = sorted.find((a) => a.is_pinned);
    const feat = pin ?? sorted[0]!;
    return { featured: feat, others: sorted.filter((a) => a.id !== feat.id) };
  }, [sorted]);

  const detailSliderItems = useMemo<MediaItem[]>(() => {
    if (!detail?.attachments?.length) return [];
    return detail.attachments
      .filter((att) => isImageAttachment(att.content_type, att.original_name))
      .map((att) => ({ url: att.url, type: 'image' as const }));
  }, [detail]);

  function openDetail(a: KidsAnnouncement) {
    setDetail(a);
  }

  function renderStandardCard(a: KidsAnnouncement) {
    const cat = effectiveAnnouncementCategory(a);
    const when = formatAnnouncementDate(a.published_at || a.created_at, language);
    const showNew = isNewAnnouncement(a) && !a.is_pinned;
    return (
      <article
        key={a.id}
        className="flex flex-col rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-lg shadow-zinc-200/40 dark:border-zinc-700 dark:bg-zinc-900/90 dark:shadow-black/20"
      >
        <div className="flex items-start justify-between gap-3">
          {categoryIcon(cat)}
          <div className="flex flex-wrap justify-end gap-1.5">
            {a.is_pinned ? (
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ring-1 ${categoryPillClass('event')}`}
              >
                {t('student.announcements.badgeImportant')}
              </span>
            ) : null}
            {showNew ? (
              <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-violet-800 ring-1 ring-violet-200/80 dark:bg-violet-950/60 dark:text-violet-200 dark:ring-violet-800/50">
                {t('student.announcements.badgeNew')}
              </span>
            ) : null}
          </div>
        </div>
        <h3 className="mt-4 font-logo text-lg font-black leading-snug text-slate-900 dark:text-white">{a.title}</h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">{excerptText(a.body)}</p>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <time className="text-xs font-bold text-slate-500 dark:text-zinc-500" dateTime={a.published_at || a.created_at}>
            {when}
          </time>
          <button type="button" onClick={() => openDetail(a)} className={gradientBtn}>
            {t('student.announcements.viewDetails')}
          </button>
        </div>
      </article>
    );
  }

  function renderFeaturedCard(a: KidsAnnouncement) {
    const cat = effectiveAnnouncementCategory(a);
    const img = firstImageUrl(a);
    const when = formatAnnouncementDate(a.published_at || a.created_at, language);
    const catLabel =
      cat === 'event'
        ? t('announcements.catEvent')
        : cat === 'info'
          ? t('announcements.catInfo')
          : t('announcements.catGeneral');

    return (
      <article className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-xl shadow-violet-200/30 dark:border-zinc-700 dark:bg-zinc-900/90 dark:shadow-black/30 md:flex md:min-h-[280px]">
        <div className="relative flex min-h-[200px] w-full shrink-0 items-center justify-center bg-gradient-to-br from-violet-100 via-fuchsia-50 to-pink-100 dark:from-violet-950/50 dark:via-fuchsia-950/30 dark:to-zinc-900 md:w-[42%]">
          {img ? (
            <Image src={img} alt="" fill className="object-cover" sizes="(max-width: 768px) 100vw, 40vw" unoptimized />
          ) : (
            <div className="flex flex-col items-center gap-3 p-8 text-violet-700 dark:text-violet-300">
              <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white/80 shadow-inner dark:bg-zinc-800/80">
                <BookOpen className="h-12 w-12" strokeWidth={1.5} aria-hidden />
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col justify-center border-l-0 border-violet-500 bg-white p-6 pl-5 dark:bg-zinc-900/90 md:border-l-[6px] md:pl-8">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-violet-600 dark:text-violet-400">{catLabel}</p>
          <h3 className="mt-2 font-logo text-2xl font-black leading-tight text-slate-900 dark:text-white">{a.title}</h3>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">{excerptText(a.body, 200)}</p>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <time className="text-xs font-bold text-slate-500 dark:text-zinc-500" dateTime={a.published_at || a.created_at}>
              {when}
            </time>
            <button type="button" onClick={() => openDetail(a)} className={`${gradientBtn} px-6 py-3`}>
              {t('student.announcements.viewDetailsLong')}
            </button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-6xl space-y-8 px-3 pb-16 pt-4 sm:px-4">
      <Link
        href={`${pathPrefix}/ogrenci/panel`}
        className="inline-flex text-sm font-bold text-violet-700 hover:underline dark:text-violet-300"
      >
        ← {t('nav.studentPanel')}
      </Link>

      <header className="space-y-2">
        <h1 className="font-logo text-3xl font-black tracking-tight text-slate-900 dark:text-white md:text-4xl">
          {t('announcements.title')}
        </h1>
        <p className="max-w-3xl text-sm font-medium leading-relaxed text-slate-600 dark:text-zinc-400">
          {t(pageSubtitleKey)}
        </p>
        <p className="text-xs font-semibold text-slate-500 dark:text-zinc-500">{t('student.announcements.sortHint')}</p>
      </header>

      <div
        role="tablist"
        aria-label={t('announcements.categoryFilterAria')}
        className="flex flex-wrap gap-2"
      >
        {filterTabs.map((tab) => {
          const active = filterTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilterTab(tab.id)}
              className={`rounded-full px-5 py-2 text-sm font-black transition ${
                active
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30'
                  : 'bg-zinc-100 text-slate-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="text-center text-sm font-semibold text-slate-500 dark:text-zinc-400">{t('common.loading')}</p>
      ) : sorted.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-zinc-300 bg-zinc-50/80 px-6 py-16 text-center text-sm font-semibold text-slate-600 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400">
          {filterTab === 'all' ? t('announcements.empty') : t('announcements.emptyCategory')}
        </p>
      ) : (
        <div className="space-y-8">
          {featured ? renderFeaturedCard(featured) : null}
          {others.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{others.map(renderStandardCard)}</div>
          ) : null}
        </div>
      )}

      {!loading && hasMore ? (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            disabled={loadingMore}
            onClick={() => void load(rows.length, true)}
            className="rounded-full border-2 border-violet-400 bg-white px-8 py-3 text-sm font-black text-violet-700 shadow-sm transition hover:bg-violet-50 disabled:opacity-50 dark:border-violet-600 dark:bg-zinc-900 dark:text-violet-200 dark:hover:bg-violet-950/40"
          >
            {loadingMore ? t('announcements.loadingMore') : t('announcements.loadMore')}
          </button>
        </div>
      ) : null}

      {detail ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="student-announcement-detail-title"
        >
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white shadow-2xl dark:bg-zinc-900 sm:rounded-3xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-100 bg-white/95 px-5 py-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95">
              <p id="student-announcement-detail-title" className="font-logo text-sm font-black text-violet-600 dark:text-violet-400">
                {t('student.announcements.detailTitle')}
              </p>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                aria-label={t('student.announcements.closeDetail')}
              >
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>
            <div className="space-y-4 px-5 py-5">
              <h2 className="font-logo text-xl font-black text-slate-900 dark:text-white">{detail.title}</h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-zinc-300">{detail.body}</p>
              {detailSliderItems.length > 0 ? (
                <div>
                  <p className="mb-2 text-xs font-black uppercase tracking-wide text-violet-600 dark:text-violet-400">
                    {t('student.announcements.attachments')}
                  </p>
                  <MediaSlider items={detailSliderItems} className="h-56" alt="" fit="contain" />
                </div>
              ) : null}
              {(detail.attachments ?? []).some(
                (att) => !isImageAttachment(att.content_type, att.original_name),
              ) ? (
                <ul className="space-y-2">
                  {(detail.attachments ?? [])
                    .filter((att) => !isImageAttachment(att.content_type, att.original_name))
                    .map((att) => (
                      <li key={att.id}>
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-bold text-violet-600 underline-offset-2 hover:underline dark:text-violet-400"
                        >
                          {att.original_name || t('announcements.viewDownload')}
                        </a>
                      </li>
                    ))}
                </ul>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
