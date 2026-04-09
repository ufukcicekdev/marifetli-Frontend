'use client';

import { useEffect, useMemo, useState } from 'react';
import { MoreVertical, Paperclip, Pin, Plus, Send, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import {
  kidsCreateAnnouncement,
  kidsDeleteAnnouncement,
  kidsDeleteAnnouncementAttachment,
  kidsListClasses,
  kidsListAnnouncements,
  KIDS_ANNOUNCEMENTS_PAGE_SIZE,
  kidsPatchAnnouncement,
  kidsUploadAnnouncementAttachment,
  type KidsAnnouncement,
  type KidsAnnouncementCategory,
  type KidsClass,
} from '@/src/lib/kids-api';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';
import { KidsPrimaryButton, KidsSelect, kidsInputClass, kidsTextareaClass } from '@/src/components/kids/kids-ui';
import { MediaLightbox } from '@/src/components/media-lightbox';
import { MediaSlider } from '@/src/components/media-slider';
import type { MediaItem } from '@/src/lib/extract-media';
import { useKidsI18n } from '@/src/providers/kids-language-provider';
import { effectiveAnnouncementCategory } from '@/src/lib/kids-announcements-shared';
import { KidsStudentAnnouncementsView } from '@/src/components/kids/kids-student-announcements';

const ANNOUNCEMENT_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const ANNOUNCEMENT_DOCUMENT_MAX_BYTES = 20 * 1024 * 1024;
const ALL_CLASSES_VALUE = '__all_school__';

function styleFromCategory(
  cat: KidsAnnouncementCategory,
  translate: (k: string) => string,
): { label: string; pillClass: string } {
  if (cat === 'event') {
    return {
      label: translate('announcements.catEvent'),
      pillClass: 'bg-pink-100 text-pink-800 ring-pink-200/80 dark:bg-pink-950/50 dark:text-pink-100 dark:ring-pink-800/60',
    };
  }
  if (cat === 'info') {
    return {
      label: translate('announcements.catInfo'),
      pillClass: 'bg-amber-100 text-amber-900 ring-amber-200/80 dark:bg-amber-950/40 dark:text-amber-100 dark:ring-amber-800/50',
    };
  }
  return {
    label: translate('announcements.catGeneral'),
    pillClass: 'bg-violet-100 text-violet-800 ring-violet-200/80 dark:bg-violet-950/50 dark:text-violet-100 dark:ring-violet-800/60',
  };
}

function announcementCategoryStyle(
  a: { id: number; title: string; category?: KidsAnnouncementCategory | null },
  translate: (k: string) => string,
): { label: string; pillClass: string } {
  return styleFromCategory(effectiveAnnouncementCategory(a), translate);
}

function titleInitials(title: string): string[] {
  const parts = (title || '').trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return ['?'];
  if (parts.length === 1) {
    const w = parts[0];
    const a = (w[0] || '?').toUpperCase();
    const b = (w[1] || w[0] || '?').toUpperCase();
    return w.length >= 2 ? [a, b] : [a];
  }
  return parts.map((w) => (w[0] || '?').toUpperCase());
}

function isImageAttachment(contentType: string, fileName: string): boolean {
  const ct = (contentType || '').toLowerCase();
  if (ct.startsWith('image/')) return true;
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(fileName || '');
}

function isImageFile(file: File): boolean {
  return isImageAttachment(file.type, file.name);
}

function filePlaceholderUrl(fileName: string): string {
  const ext = (fileName.split('.').pop() || 'DOSYA').toUpperCase().slice(0, 6);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540"><rect width="960" height="540" fill="#F5F3FF"/><rect x="360" y="120" width="240" height="300" rx="24" fill="#DDD6FE"/><path d="M520 120v76c0 13 11 24 24 24h56" fill="#C4B5FD"/><path d="M520 120l80 100" stroke="#A78BFA" stroke-width="10"/><text x="480" y="300" text-anchor="middle" font-family="Arial, sans-serif" font-size="40" font-weight="700" fill="#5B21B6">${ext}</text><text x="480" y="345" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" fill="#6D28D9">Dosya</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function formatFileSize(sizeBytes: number): string {
  const s = Number(sizeBytes || 0);
  if (s <= 0) return '';
  if (s < 1024) return `${s} B`;
  if (s < 1024 * 1024) return `${(s / 1024).toFixed(1)} KB`;
  return `${(s / (1024 * 1024)).toFixed(1)} MB`;
}

export default function KidsAnnouncementsPage() {
  const router = useRouter();
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();
  const { t, language } = useKidsI18n();
  const [rows, setRows] = useState<KidsAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<KidsAnnouncementCategory>('general');
  const [files, setFiles] = useState<File[]>([]);
  const [classes, setClasses] = useState<KidsClass[]>([]);
  const [classId, setClassId] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editCategory, setEditCategory] = useState<KidsAnnouncementCategory>('general');
  const [editFiles, setEditFiles] = useState<File[]>([]);
  const [editSaving, setEditSaving] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<number | null>(null);
  const [openAnnouncementId, setOpenAnnouncementId] = useState<number | null>(null);
  const [deletingAnnouncementId, setDeletingAnnouncementId] = useState<number | null>(null);
  const [announcementMenuId, setAnnouncementMenuId] = useState<number | null>(null);
  const [announcementEditLightbox, setAnnouncementEditLightbox] = useState<{
    announcementId: number;
    startIndex: number;
  } | null>(null);
  const [listCategoryTab, setListCategoryTab] = useState<'all' | KidsAnnouncementCategory>('all');
  const [announcementsHasMore, setAnnouncementsHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const editLightboxAnn = useMemo(() => {
    if (!announcementEditLightbox) return null;
    return rows.find((r) => r.id === announcementEditLightbox.announcementId) ?? null;
  }, [rows, announcementEditLightbox]);

  const editLightboxImageAttachments = useMemo(() => {
    const list = editLightboxAnn?.attachments ?? [];
    return list.filter((att) => isImageAttachment(att.content_type, att.original_name));
  }, [editLightboxAnn]);

  const editLightboxItems = useMemo<MediaItem[]>(
    () => editLightboxImageAttachments.map((att) => ({ url: att.url, type: 'image' as const })),
    [editLightboxImageAttachments],
  );

  const editLightboxStartIndex =
    announcementEditLightbox && editLightboxItems.length > 0
      ? Math.min(Math.max(0, announcementEditLightbox.startIndex), editLightboxItems.length - 1)
      : 0;

  const categoryOptions = useMemo(
    () => [
      { value: 'event', label: t('announcements.catEvent') },
      { value: 'info', label: t('announcements.catInfo') },
      { value: 'general', label: t('announcements.catGeneral') },
    ],
    [t],
  );

  const canCreate = user?.role === 'teacher' || user?.role === 'admin';
  const selectedClassId = useMemo(() => Number(classId || 0), [classId]);
  const isAllSchoolScope = classId === ALL_CLASSES_VALUE;
  const schoolIdForScope = classes[0]?.school?.id;

  async function load() {
    setLoading(true);
    try {
      const raw = await kidsListAnnouncements({
        limit: KIDS_ANNOUNCEMENTS_PAGE_SIZE,
        offset: 0,
      });
      if (Array.isArray(raw)) {
        setRows(raw);
        setAnnouncementsHasMore(false);
      } else {
        setRows(raw.results);
        setAnnouncementsHasMore(raw.has_more);
      }
      if (canCreate) {
        const classList = await kidsListClasses();
        setClasses(classList);
        if (!classId && classList.length > 0) {
          setClassId(String(classList[0].id));
        }
      } else {
        setClasses([]);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('announcements.loadError'));
    } finally {
      setLoading(false);
    }
  }

  async function loadMoreAnnouncements() {
    if (loadingMore || !announcementsHasMore || loading) return;
    setLoadingMore(true);
    try {
      const raw = await kidsListAnnouncements({
        limit: KIDS_ANNOUNCEMENTS_PAGE_SIZE,
        offset: rows.length,
      });
      if (Array.isArray(raw)) {
        setRows((prev) => {
          const ids = new Set(prev.map((r) => r.id));
          const add = raw.filter((r) => !ids.has(r.id));
          return [...prev, ...add];
        });
        setAnnouncementsHasMore(false);
      } else {
        setRows((prev) => {
          const ids = new Set(prev.map((r) => r.id));
          const add = raw.results.filter((r) => !ids.has(r.id));
          return [...prev, ...add];
        });
        setAnnouncementsHasMore(raw.has_more);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('announcements.loadError'));
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(kidsLoginPortalHref(pathPrefix));
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, router, pathPrefix]);

  useEffect(() => {
    if (announcementMenuId == null) return;
    function onPointerDown(e: PointerEvent) {
      const el = e.target;
      if (!(el instanceof HTMLElement)) return;
      if (el.closest('[data-announcement-card-menu]')) return;
      setAnnouncementMenuId(null);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [announcementMenuId]);

  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
        const at = a.published_at ? new Date(a.published_at).getTime() : 0;
        const bt = b.published_at ? new Date(b.published_at).getTime() : 0;
        if (bt !== at) return bt - at;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }),
    [rows],
  );

  const filteredSorted = useMemo(() => {
    if (listCategoryTab === 'all') return sorted;
    return sorted.filter((a) => effectiveAnnouncementCategory(a) === listCategoryTab);
  }, [sorted, listCategoryTab]);

  const listCategoryTabs = useMemo(
    () =>
      [
        { id: 'all' as const, label: t('announcements.filterAll') },
        { id: 'event' as const, label: t('announcements.catEvent') },
        { id: 'general' as const, label: t('announcements.catGeneral') },
        { id: 'info' as const, label: t('announcements.catInfo') },
      ] as const,
    [t],
  );

  const classNameById = useMemo(() => {
    const m = new Map<number, string>();
    classes.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [classes]);

  const uploadPreviewItems = useMemo<MediaItem[]>(
    () =>
      files.map((f) => ({
        url: isImageFile(f) ? URL.createObjectURL(f) : filePlaceholderUrl(f.name),
        type: 'image',
      })),
    [files],
  );

  useEffect(() => {
    return () => {
      uploadPreviewItems.forEach((i) => {
        if (i.url.startsWith('blob:')) URL.revokeObjectURL(i.url);
      });
    };
  }, [uploadPreviewItems]);

  function filterFilesBySize(next: File[]): { accepted: File[]; rejected: string[] } {
    const accepted: File[] = [];
    const rejected: string[] = [];
    for (const f of next) {
      const isImage = isImageFile(f);
      const maxBytes = isImage ? ANNOUNCEMENT_IMAGE_MAX_BYTES : ANNOUNCEMENT_DOCUMENT_MAX_BYTES;
      if (f.size > maxBytes) {
        const limitText = isImage ? '10 MB' : '20 MB';
        rejected.push(`${f.name} (${t('announcements.max')} ${limitText})`);
        continue;
      }
      accepted.push(f);
    }
    return { accepted, rejected };
  }

  function appendFiles(next: File[]) {
    if (next.length === 0) return;
    const { accepted, rejected } = filterFilesBySize(next);
    if (rejected.length > 0) {
      toast.error(`${t('announcements.sizeLimitExceeded')}: ${rejected.join(', ')}`);
    }
    if (accepted.length > 0) {
      setFiles((prev) => [...prev, ...accepted]);
    }
  }

  function appendEditFiles(next: File[]) {
    if (next.length === 0) return;
    const { accepted, rejected } = filterFilesBySize(next);
    if (rejected.length > 0) {
      toast.error(`${t('announcements.sizeLimitExceeded')}: ${rejected.join(', ')}`);
    }
    if (accepted.length > 0) {
      setEditFiles((prev) => [...prev, ...accepted]);
    }
  }

  function removeEditFile(target: File) {
    setEditFiles((prev) =>
      prev.filter(
        (f) =>
          !(
            f.name === target.name &&
            f.size === target.size &&
            f.lastModified === target.lastModified &&
            f.type === target.type
          ),
      ),
    );
  }

  const editPreviewItems = useMemo<MediaItem[]>(
    () =>
      editFiles.map((f) => ({
        url: isImageFile(f) ? URL.createObjectURL(f) : filePlaceholderUrl(f.name),
        type: 'image',
      })),
    [editFiles],
  );

  useEffect(() => {
    return () => {
      editPreviewItems.forEach((i) => {
        if (i.url.startsWith('blob:')) URL.revokeObjectURL(i.url);
      });
    };
  }, [editPreviewItems]);

  function startEdit(a: KidsAnnouncement) {
    setAnnouncementEditLightbox(null);
    setEditingId(a.id);
    setOpenAnnouncementId(a.id);
    setEditTitle(a.title || '');
    setEditBody(a.body || '');
    setEditCategory(
      a.category === 'event' || a.category === 'info' || a.category === 'general' ? a.category : 'general',
    );
    setEditFiles([]);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle('');
    setEditBody('');
    setEditCategory('general');
    setEditFiles([]);
    setAnnouncementEditLightbox(null);
  }

  async function onSaveEdit() {
    if (!editingId) return;
    const titleText = editTitle.trim();
    const bodyText = editBody.trim();
    if (!titleText || !bodyText) {
      toast.error(t('announcements.titleBodyRequired'));
      return;
    }
    setEditSaving(true);
    try {
      let latest = await kidsPatchAnnouncement(editingId, {
        title: titleText,
        body: bodyText,
        category: editCategory,
      });
      if (editFiles.length > 0) {
        for (const f of editFiles) {
          latest = await kidsUploadAnnouncementAttachment(editingId, f);
        }
      }
      setRows((prev) => prev.map((row) => (row.id === latest.id ? latest : row)));
      toast.success(t('announcements.updated'));
      cancelEdit();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('announcements.updateFailed'));
    } finally {
      setEditSaving(false);
    }
  }

  async function onDeleteAttachment(announcementId: number, attachmentId: number) {
    setDeletingAttachmentId(attachmentId);
    try {
      const latest = await kidsDeleteAnnouncementAttachment(announcementId, attachmentId);
      setRows((prev) => prev.map((row) => (row.id === latest.id ? latest : row)));
      toast.success(t('announcements.attachmentDeleted'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('announcements.attachmentDeleteFailed'));
    } finally {
      setDeletingAttachmentId(null);
    }
  }

  async function onDeleteAnnouncement(announcementId: number) {
    if (!confirm(t('announcements.deleteConfirm'))) return;
    setDeletingAnnouncementId(announcementId);
    try {
      await kidsDeleteAnnouncement(announcementId);
      setRows((prev) => prev.filter((row) => row.id !== announcementId));
      if (openAnnouncementId === announcementId) setOpenAnnouncementId(null);
      if (editingId === announcementId) cancelEdit();
      toast.success(t('announcements.deleted'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('announcements.deleteFailed'));
    } finally {
      setDeletingAnnouncementId(null);
    }
  }

  async function onCreate() {
    const titleText = title.trim();
    const bodyText = body.trim();
    if (!titleText || !bodyText) return;
    if (isAllSchoolScope) {
      if (!schoolIdForScope) {
        toast.error(t('announcements.assignClassFirst'));
        return;
      }
    } else if (!selectedClassId) {
      toast.error(t('announcements.classRequired'));
      return;
    }
    setSaving(true);
    try {
      const created = await kidsCreateAnnouncement(
        isAllSchoolScope
          ? {
              scope: 'school',
              school: schoolIdForScope,
              kids_class: null,
              title: titleText,
              body: bodyText,
              category,
              is_published: true,
              target_role: 'all',
            }
          : {
              scope: 'class',
              kids_class: selectedClassId,
              title: titleText,
              body: bodyText,
              category,
              is_published: true,
              target_role: 'all',
            },
      );
      if (files.length > 0) {
        let latest = created;
        for (const f of files) {
          latest = await kidsUploadAnnouncementAttachment(created.id, f);
        }
        setRows((prev) => [latest, ...prev.filter((x) => x.id !== latest.id)]);
      }
      setTitle('');
      setBody('');
      setCategory('general');
      setFiles([]);
      toast.success(t('announcements.published'));
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('announcements.createFailed'));
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || !user) {
    return <p className="text-center text-sm text-violet-800 dark:text-violet-200">{t('common.loading')}</p>;
  }

  if (user.role === 'student') {
    return <KidsStudentAnnouncementsView pathPrefix={pathPrefix} />;
  }

  if (user.role === 'parent') {
    return (
      <KidsStudentAnnouncementsView
        pathPrefix={pathPrefix}
        backHref={`${pathPrefix}/veli/panel`}
        backLabelKey="nav.parentPanel"
        pageSubtitleKey="parent.announcements.pageSubtitle"
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-2 pb-10 sm:px-4">
      <header>
        <h1 className="font-logo text-3xl font-bold text-slate-900 dark:text-white">{t('announcements.title')}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">{t('announcements.pageSubtitle')}</p>
      </header>

      <div className={`grid gap-8 ${canCreate ? 'lg:grid-cols-3' : 'grid-cols-1'}`}>
        {canCreate ? (
          <div className="lg:col-span-1">
            <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-lg dark:border-zinc-800 dark:bg-zinc-900 lg:sticky lg:top-24">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white shadow-md shadow-violet-500/30">
                  <Plus className="h-6 w-6" strokeWidth={2.5} />
                </span>
                <h2 className="font-logo text-lg font-bold text-slate-900 dark:text-white">{t('announcements.new')}</h2>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('announcements.titleField')}</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t('announcements.titlePlaceholder')}
                    className="mt-1.5 w-full rounded-2xl border-0 bg-zinc-100 px-4 py-3 text-sm text-slate-900 shadow-inner outline-none ring-1 ring-zinc-200/80 transition focus:ring-2 focus:ring-violet-400/40 dark:bg-zinc-800 dark:text-white dark:ring-zinc-700"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('announcements.bodyField')}</label>
                  <textarea
                    rows={4}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder={t('announcements.bodyPlaceholder')}
                    className="mt-1.5 w-full resize-y rounded-2xl border-0 bg-zinc-100 px-4 py-3 text-sm text-slate-900 shadow-inner outline-none ring-1 ring-zinc-200/80 transition focus:ring-2 focus:ring-violet-400/40 dark:bg-zinc-800 dark:text-white dark:ring-zinc-700"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('announcements.categoryField')}</label>
                  <div className="mt-1.5 rounded-2xl bg-zinc-100 px-2 py-2 ring-1 ring-zinc-200/80 dark:bg-zinc-800 dark:ring-zinc-700">
                    <KidsSelect
                      value={category}
                      onChange={(v) => setCategory(v as KidsAnnouncementCategory)}
                      options={categoryOptions}
                      searchable={false}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">{t('announcements.categoryHint')}</p>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('announcements.class')}</label>
                    <div className="mt-1.5 rounded-2xl bg-zinc-100 px-2 py-2 ring-1 ring-zinc-200/80 dark:bg-zinc-800 dark:ring-zinc-700">
                      <KidsSelect
                        value={classId}
                        onChange={setClassId}
                        options={[
                          ...(classes.length > 0
                            ? [{ value: ALL_CLASSES_VALUE, label: t('announcements.allClasses') }]
                            : []),
                          ...classes.map((c) => ({ value: String(c.id), label: c.name })),
                        ]}
                      />
                    </div>
                    {classes.length === 0 ? (
                      <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{t('announcements.assignClassFirst')}</p>
                    ) : null}
                    {isAllSchoolScope ? (
                      <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">{t('announcements.allClassesHint')}</p>
                    ) : null}
                  </div>
                  <div className="shrink-0">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('announcements.fileAddLabel')}</p>
                    <input
                      id="announcement-files"
                      type="file"
                      multiple
                      onChange={(e) => appendFiles(Array.from(e.target.files || []))}
                      className="hidden"
                    />
                    <label
                      htmlFor="announcement-files"
                      className="mt-1.5 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-violet-300/70 bg-violet-50/50 px-4 py-3 text-sm font-bold text-violet-700 transition hover:bg-violet-100/80 dark:border-violet-700 dark:bg-violet-950/30 dark:text-violet-200"
                    >
                      <Upload className="h-4 w-4" />
                      {t('announcements.browseFiles')}
                    </label>
                  </div>
                </div>

                {files.length > 0 ? (
                  <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
                    <MediaSlider
                      items={uploadPreviewItems}
                      className="h-44"
                      alt=""
                      fit="contain"
                      onDeleteAtIndex={(idx) => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                    />
                    <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">{t('teacherHomework.sliderHint')}</p>
                  </div>
                ) : null}

                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{t('announcements.attachmentHintShort')}</p>

                <button
                  type="button"
                  onClick={() => void onCreate()}
                  disabled={
                    saving ||
                    !title.trim() ||
                    !body.trim() ||
                    (isAllSchoolScope ? !schoolIdForScope : !selectedClassId)
                  }
                  className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-violet-600 via-fuchsia-600 to-fuchsia-500 px-6 text-sm font-black text-white shadow-lg shadow-fuchsia-500/25 transition hover:from-violet-500 hover:via-fuchsia-500 disabled:opacity-50"
                >
                  {saving ? (
                    t('announcements.publishing')
                  ) : (
                    <>
                      <Send className="h-4 w-4" strokeWidth={2.5} />
                      {t('announcements.publish')}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <section
          id="onceki-duyurular"
          className={`scroll-mt-24 space-y-4 ${canCreate ? 'lg:col-span-2' : ''}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-logo text-xl font-bold text-slate-900 dark:text-white">{t('announcements.previousTitle')}</h2>
            <a
              href="#onceki-duyurular"
              className="text-sm font-bold text-violet-600 transition hover:text-violet-500 dark:text-violet-400"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('onceki-duyurular')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                if (typeof window !== 'undefined') {
                  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#onceki-duyurular`);
                }
              }}
            >
              {t('announcements.seeAll')}
            </a>
          </div>
          <div
            role="tablist"
            aria-label={t('announcements.categoryFilterAria')}
            className="-mx-1 flex flex-wrap gap-2 overflow-x-auto pb-1"
          >
            {listCategoryTabs.map((tab) => {
              const active = listCategoryTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setListCategoryTab(tab.id)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition ring-1 ${
                    active
                      ? 'bg-violet-600 text-white ring-violet-500 shadow-md shadow-violet-500/20 dark:bg-violet-600 dark:ring-violet-500'
                      : 'bg-zinc-100 text-zinc-600 ring-zinc-200/80 hover:bg-zinc-200/80 dark:bg-zinc-800/80 dark:text-zinc-300 dark:ring-zinc-700 dark:hover:bg-zinc-700/80'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        {loading ? <p className="text-sm text-slate-500">{t('common.loading')}</p> : null}
        {!loading && sorted.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-violet-300 bg-violet-50/50 p-6 text-sm text-violet-900 dark:border-violet-800 dark:bg-violet-950/20 dark:text-violet-100">
            {t('announcements.empty')}
          </div>
        ) : null}
        {!loading && sorted.length > 0 && filteredSorted.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/50 p-6 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300">
            {t('announcements.emptyCategory')}
          </div>
        ) : null}
      <ul className="space-y-4">
        {filteredSorted.map((a) => {
          const cat = announcementCategoryStyle(a, t);
          const locale = language === 'tr' ? 'tr-TR' : language === 'ge' ? 'de-DE' : 'en-US';
          const dateLine = a.published_at
            ? new Date(a.published_at).toLocaleString(locale, { dateStyle: 'long', timeStyle: 'short' })
            : t('announcements.draft');
          const scopeLabel =
            a.scope === 'school'
              ? t('announcements.allClasses')
              : a.kids_class
                ? classNameById.get(a.kids_class) ?? `${t('announcements.class')} #${a.kids_class}`
                : '';
          return (
            <li
              key={a.id}
              className="relative rounded-3xl border border-zinc-200/90 bg-white p-5 shadow-md dark:border-zinc-800 dark:bg-zinc-900/80"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  {a.is_pinned ? (
                    <span
                      className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-900 ring-1 ring-amber-200/80 dark:bg-amber-950/50 dark:text-amber-100 dark:ring-amber-800/60"
                      title={t('announcements.pinnedHint')}
                    >
                      <Pin className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                      {t('announcements.pinned')}
                    </span>
                  ) : null}
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ring-1 ${cat.pillClass}`}
                  >
                    {cat.label}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">{dateLine}</span>
                  {scopeLabel ? (
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">· {scopeLabel}</span>
                  ) : null}
                </div>
                {editingId === a.id ? (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={editSaving}
                    className="shrink-0 rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    {t('common.cancel')}
                  </button>
                ) : canCreate ? (
                  <div className="relative shrink-0" data-announcement-card-menu>
                    <button
                      type="button"
                      aria-expanded={announcementMenuId === a.id}
                      aria-label={t('announcements.cardMenu')}
                      className="rounded-full p-1.5 text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      onClick={() => setAnnouncementMenuId((prev) => (prev === a.id ? null : a.id))}
                    >
                      <MoreVertical className="h-5 w-5" />
                    </button>
                    {announcementMenuId === a.id ? (
                      <div className="absolute right-0 top-full z-20 mt-1 min-w-40 rounded-xl border border-zinc-200 bg-white py-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                        <button
                          type="button"
                          className="block w-full px-4 py-2 text-left text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
                          onClick={() => {
                            setAnnouncementMenuId(null);
                            setOpenAnnouncementId(a.id);
                            startEdit(a);
                          }}
                        >
                          {t('announcements.edit')}
                        </button>
                        {user?.role === 'admin' || a.created_by === user?.id ? (
                          <button
                            type="button"
                            className="block w-full px-4 py-2 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60 dark:text-rose-400 dark:hover:bg-rose-950/40"
                            disabled={deletingAnnouncementId === a.id}
                            onClick={() => {
                              setAnnouncementMenuId(null);
                              void onDeleteAnnouncement(a.id);
                            }}
                          >
                            {deletingAnnouncementId === a.id ? t('announcements.deleting') : t('announcements.delete')}
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {openAnnouncementId === a.id && editingId === a.id ? (
              <div className="mt-3 space-y-2 rounded-xl border border-violet-200/80 bg-violet-50/40 p-3 dark:border-violet-800/60 dark:bg-violet-950/25">
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder={t('announcements.titleField')}
                  className={kidsInputClass}
                />
                <textarea
                  rows={3}
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  placeholder={t('announcements.bodyField')}
                  className={kidsTextareaClass}
                />
                <div>
                  <label className="mb-1 block text-xs font-semibold text-violet-900/90 dark:text-violet-100/90">
                    {t('announcements.categoryField')}
                  </label>
                  <div className="rounded-xl bg-white/80 px-2 py-1.5 ring-1 ring-violet-200/70 dark:bg-slate-900/50 dark:ring-violet-800/60">
                    <KidsSelect
                      value={editCategory}
                      onChange={(v) => setEditCategory(v as KidsAnnouncementCategory)}
                      options={categoryOptions}
                      searchable={false}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-violet-900/90 dark:text-violet-100/90">{t('announcements.newAttachments')}</p>
                  {Array.isArray(a.attachments) && a.attachments.length > 0 ? (
                    (() => {
                      const imageAtts = a.attachments.filter((att) =>
                        isImageAttachment(att.content_type, att.original_name),
                      );
                      const docAtts = a.attachments.filter(
                        (att) => !isImageAttachment(att.content_type, att.original_name),
                      );
                      return (
                        <div className="space-y-3 rounded-lg border border-violet-200/70 bg-white/70 p-2 dark:border-violet-800/50 dark:bg-slate-900/60">
                          {imageAtts.length > 0 ? (
                            <ul className="space-y-2">
                              {imageAtts.map((att, imgIdx) => (
                                <li
                                  key={`edit-att-img-${att.id}`}
                                  className="flex items-stretch gap-3 rounded-xl border border-violet-200/60 bg-white/90 p-2 dark:border-violet-800/40 dark:bg-slate-900/50"
                                >
                                  <button
                                    type="button"
                                    title={t('announcements.openLightbox')}
                                    className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg ring-2 ring-violet-200/80 ring-offset-2 ring-offset-white transition hover:opacity-95 focus:outline-none focus-visible:ring-violet-500 dark:ring-violet-700 dark:ring-offset-slate-900"
                                    onClick={() =>
                                      setAnnouncementEditLightbox({ announcementId: a.id, startIndex: imgIdx })
                                    }
                                  >
                                    <img
                                      src={att.url}
                                      alt=""
                                      className="h-full w-full object-cover"
                                    />
                                  </button>
                                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 text-xs">
                                    <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                                      {att.original_name || t('messageDetail.file')}
                                      {att.size_bytes ? ` (${formatFileSize(att.size_bytes)})` : ''}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => void onDeleteAttachment(a.id, att.id)}
                                      disabled={deletingAttachmentId === att.id || editSaving}
                                      className="w-fit rounded-full border border-rose-300 px-2 py-0.5 text-rose-700 hover:bg-rose-50 disabled:opacity-60 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40"
                                    >
                                      {deletingAttachmentId === att.id
                                        ? t('announcements.deleting')
                                        : t('announcements.deleteCurrentAttachment')}
                                    </button>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          {docAtts.length > 0 ? (
                            <ul className="space-y-2">
                              {docAtts.map((att) => (
                                <li
                                  key={`edit-att-doc-${att.id}`}
                                  className="flex items-center justify-between gap-2 text-xs"
                                >
                                  <span className="truncate text-slate-700 dark:text-slate-200">
                                    {att.original_name || t('messageDetail.file')}
                                    {att.size_bytes ? ` (${formatFileSize(att.size_bytes)})` : ''}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => void onDeleteAttachment(a.id, att.id)}
                                    disabled={deletingAttachmentId === att.id || editSaving}
                                    className="shrink-0 rounded-full border border-rose-300 px-2 py-0.5 text-rose-700 hover:bg-rose-50 disabled:opacity-60 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40"
                                  >
                                    {deletingAttachmentId === att.id
                                      ? t('announcements.deleting')
                                      : t('announcements.deleteCurrentAttachment')}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      );
                    })()
                  ) : editFiles.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t('announcements.noExistingAttachment')}</p>
                  ) : null}
                  {editPreviewItems.length > 0 ? (
                    <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
                      <MediaSlider
                        items={editPreviewItems}
                        className="h-52"
                        alt=""
                        fit="contain"
                        onDeleteAtIndex={(idx) => {
                          const f = editFiles[idx];
                          if (f) removeEditFile(f);
                        }}
                        deleteDisabled={editSaving}
                      />
                      <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">{t('teacherHomework.sliderHint')}</p>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between">
                    <input
                      id={`announcement-edit-files-${a.id}`}
                      type="file"
                      multiple
                      onChange={(e) => appendEditFiles(Array.from(e.target.files || []))}
                      className="hidden"
                    />
                    <label htmlFor={`announcement-edit-files-${a.id}`} className="cursor-pointer text-xs font-semibold text-violet-700 hover:text-violet-500 dark:text-violet-200">
                      {t('announcements.addFile')}
                    </label>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">{t('announcements.attachmentHintShort')}</span>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={editSaving}
                    className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {t('common.cancel')}
                  </button>
                  <KidsPrimaryButton
                    type="button"
                    onClick={() => void onSaveEdit()}
                    disabled={editSaving || !editTitle.trim() || !editBody.trim()}
                  >
                    {editSaving ? t('profile.saving') : t('profile.save')}
                  </KidsPrimaryButton>
                </div>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className="mt-3 w-full text-left"
                  onClick={() => setOpenAnnouncementId((prev) => (prev === a.id ? null : a.id))}
                >
                  <p className="font-bold text-lg text-slate-900 dark:text-white">{a.title}</p>
                  <p
                    className={`mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 ${
                      openAnnouncementId === a.id ? 'whitespace-pre-wrap' : 'line-clamp-2'
                    }`}
                  >
                    {a.body}
                  </p>
                </button>
                <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-800">
                  <div className="flex -space-x-2">
                    {titleInitials(a.title).map((ch, i) => (
                      <span
                        key={`${a.id}-ini-${i}`}
                        className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white shadow-sm dark:border-zinc-900 ${
                          i === 0 ? 'bg-violet-500' : 'bg-fuchsia-500'
                        }`}
                      >
                        {ch}
                      </span>
                    ))}
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    <Paperclip className="h-3.5 w-3.5" />
                    {a.attachments?.length ?? 0}
                  </span>
                </div>
              </>
            )}
            {openAnnouncementId === a.id && editingId !== a.id && Array.isArray(a.attachments) && a.attachments.length > 0 ? (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-semibold text-violet-900/90 dark:text-violet-100/90">{t('announcements.attachments')}</p>
                {(() => {
                  const sliderItems: MediaItem[] = (a.attachments || []).map((att) => ({
                    url: isImageAttachment(att.content_type, att.original_name)
                      ? att.url
                      : filePlaceholderUrl(att.original_name || 'dosya'),
                    type: 'image',
                  }));
                  const docItems = (a.attachments || []).filter(
                    (att) => !isImageAttachment(att.content_type, att.original_name),
                  );
                  return (
                    <>
                      {sliderItems.length > 0 ? (
                        <MediaSlider items={sliderItems} className="h-64" alt={a.title || t('announcements.attachmentAlt')} fit="contain" />
                      ) : null}
                      {docItems.length > 0 ? (
                        <ul className="space-y-2">
                          {docItems.map((att) => (
                            <li key={att.id} className="rounded-xl border border-violet-200/80 bg-violet-50/50 p-2 dark:border-violet-800/60 dark:bg-violet-950/30">
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                                <span className="font-medium text-slate-700 dark:text-slate-200">{att.original_name || t('messageDetail.file')}</span>
                                {att.size_bytes ? (
                                  <span className="text-slate-500 dark:text-slate-400">{formatFileSize(att.size_bytes)}</span>
                                ) : null}
                                <a
                                  href={att.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  download={att.original_name || true}
                                  className="rounded-full border border-violet-300 px-2 py-0.5 font-semibold text-violet-700 hover:bg-violet-100 dark:border-violet-700 dark:text-violet-200 dark:hover:bg-violet-900/40"
                                >
                                  {t('announcements.viewDownload')}
                                </a>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </>
                  );
                })()}
              </div>
            ) : null}
          </li>
          );
        })}
      </ul>
        {announcementsHasMore ? (
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => void loadMoreAnnouncements()}
              disabled={loadingMore || loading}
              className="rounded-full border border-violet-400/80 bg-violet-950/30 px-5 py-2.5 text-sm font-bold text-violet-100 transition hover:bg-violet-900/50 disabled:opacity-50 dark:border-violet-600 dark:bg-violet-950/40 dark:hover:bg-violet-900/60"
            >
              {loadingMore ? t('announcements.loadingMore') : t('announcements.loadMore')}
            </button>
          </div>
        ) : null}
      </section>
      </div>
      {announcementEditLightbox && editLightboxItems.length > 0 ? (
        <MediaLightbox
          items={editLightboxItems}
          currentIndex={editLightboxStartIndex}
          onClose={() => setAnnouncementEditLightbox(null)}
          onDeleteAtIndex={(idx) => {
            const att = editLightboxImageAttachments[idx];
            if (att) void onDeleteAttachment(announcementEditLightbox.announcementId, att.id);
          }}
          deleteDisabled={deletingAttachmentId !== null || editSaving}
        />
      ) : null}
    </div>
  );
}
