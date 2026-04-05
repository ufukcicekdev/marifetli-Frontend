'use client';

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clock, LayoutGrid, List as LucideList, Plus, Star, TrendingUp, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';
import {
  kidsCreateClassHomework,
  kidsDatetimeLocalToIso,
  kidsDeleteHomeworkAttachment,
  kidsIsoToDatetimeLocal,
  kidsListClassHomeworks,
  kidsListClasses,
  kidsPatchClassHomework,
  kidsUploadHomeworkAttachment,
  type KidsClass,
  type KidsHomework,
} from '@/src/lib/kids-api';
import { KidsDateTimeField } from '@/src/components/kids/kids-datetime-field';
import { MediaSlider } from '@/src/components/media-slider';
import type { MediaItem } from '@/src/lib/extract-media';
import { useKidsI18n } from '@/src/providers/kids-language-provider';
import {
  KidsFormField,
  KidsPanelMax,
  KidsPrimaryButton,
  KidsSecondaryButton,
  KidsSelect,
  kidsInputClass,
  kidsTextareaClass,
} from '@/src/components/kids/kids-ui';

const HOMEWORK_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const HOMEWORK_DOCUMENT_MAX_BYTES = 20 * 1024 * 1024;

function isImageAttachment(contentType: string, fileName: string): boolean {
  const ct = (contentType || '').toLowerCase();
  if (ct.startsWith('image/')) return true;
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(fileName || '');
}

function isImageFile(file: File): boolean {
  return isImageAttachment(file.type, file.name);
}

function isVideoFile(file: File): boolean {
  return isVideoAttachment(file.type, file.name);
}

function isVideoAttachment(contentType: string, fileName: string): boolean {
  const ct = (contentType || '').toLowerCase();
  if (ct.startsWith('video/')) return true;
  return /\.(mp4|webm|mov|m4v)$/i.test(fileName || '');
}

function filePlaceholderUrl(fileName: string, label: string): string {
  const ext = (fileName.split('.').pop() || 'DOSYA').toUpperCase().slice(0, 6);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540"><rect width="960" height="540" fill="#ECFEFF"/><rect x="360" y="120" width="240" height="300" rx="24" fill="#BAE6FD"/><path d="M520 120v76c0 13 11 24 24 24h56" fill="#7DD3FC"/><path d="M520 120l80 100" stroke="#38BDF8" stroke-width="10"/><text x="480" y="300" text-anchor="middle" font-family="Arial, sans-serif" font-size="40" font-weight="700" fill="#0C4A6E">${ext}</text><text x="480" y="345" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" fill="#0369A1">${label}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

type HomeworkListFilter = 'all' | 'open' | 'overdue';

function homeworkCardHeaderGradient(seed: number): string {
  const themes = [
    'from-sky-500 via-blue-600 to-violet-700',
    'from-pink-500 via-rose-400 to-fuchsia-600',
    'from-amber-400 via-orange-500 to-red-500',
    'from-violet-500 via-purple-600 to-indigo-700',
  ];
  return themes[Math.abs(seed) % themes.length]!;
}

function homeworkDueTimestamp(hw: KidsHomework): number | null {
  if (!hw.due_at) return null;
  const t = new Date(hw.due_at).getTime();
  return Number.isFinite(t) ? t : null;
}

function homeworkIsOverdue(hw: KidsHomework, nowMs: number): boolean {
  const t = homeworkDueTimestamp(hw);
  return t !== null && t < nowMs;
}

function homeworkIsOpenWindow(hw: KidsHomework, nowMs: number): boolean {
  const t = homeworkDueTimestamp(hw);
  if (t === null) return true;
  return t >= nowMs;
}

function homeworkDeadlinePillText(dueAt: string | null, nowMs: number, translate: (key: string) => string): string {
  if (!dueAt) return translate('teacherHomework.deadlineNoDue');
  const end = new Date(dueAt).getTime();
  if (!Number.isFinite(end)) return translate('teacherHomework.deadlineNoDue');
  if (end <= nowMs) return translate('teacherHomework.deadlinePassed');
  const dayMs = 86400000;
  const days = Math.ceil((end - nowMs) / dayMs);
  if (days <= 1) return translate('teacherHomework.deadlineTomorrow');
  if (days === 2) return translate('teacherHomework.deadlineTwoDays');
  return translate('teacherHomework.deadlineNDays').replace('{n}', String(days));
}

function homeworkMatchesFilter(hw: KidsHomework, filter: HomeworkListFilter, nowMs: number): boolean {
  if (filter === 'all') return true;
  if (filter === 'open') return homeworkIsOpenWindow(hw, nowMs);
  return homeworkIsOverdue(hw, nowMs);
}

export default function KidsTeacherHomeworksPage() {
  const router = useRouter();
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();
  const { t, language } = useKidsI18n();
  const [classes, setClasses] = useState<KidsClass[]>([]);
  const [classId, setClassId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueAtLocal, setDueAtLocal] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [creating, setCreating] = useState(false);
  const [homeworks, setHomeworks] = useState<KidsHomework[]>([]);
  const [selectedHomeworkId, setSelectedHomeworkId] = useState<number | null>(null);
  const [editingHomeworkId, setEditingHomeworkId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDueAtLocal, setEditDueAtLocal] = useState('');
  const [editFiles, setEditFiles] = useState<File[]>([]);
  const [editSaving, setEditSaving] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const classSelectId = useId();
  const titleId = useId();
  const descriptionId = useId();
  const dueAtId = useId();
  const homeworkFormSectionId = useId();
  const [homeworkListFilter, setHomeworkListFilter] = useState<HomeworkListFilter>('open');
  const [homeworkViewMode, setHomeworkViewMode] = useState<'grid' | 'list'>('grid');
  const [homeworkFormOpen, setHomeworkFormOpen] = useState(false);

  const uploadPreviewItems = useMemo<MediaItem[]>(
    () =>
      files.map((f) => ({
        url:
          isImageFile(f) || isVideoFile(f) ? URL.createObjectURL(f) : filePlaceholderUrl(f.name, t('homework.attachmentLabel')),
        type: isVideoFile(f) ? ('video' as const) : ('image' as const),
      })),
    [files, t],
  );

  useEffect(() => {
    return () => {
      uploadPreviewItems.forEach((i) => {
        if (i.url.startsWith('blob:')) URL.revokeObjectURL(i.url);
      });
    };
  }, [uploadPreviewItems]);

  const editPreviewItems = useMemo<MediaItem[]>(
    () =>
      editFiles.map((f) => ({
        url:
          isImageFile(f) || isVideoFile(f) ? URL.createObjectURL(f) : filePlaceholderUrl(f.name, t('homework.attachmentLabel')),
        type: isVideoFile(f) ? ('video' as const) : ('image' as const),
      })),
    [editFiles, t],
  );

  useEffect(() => {
    return () => {
      editPreviewItems.forEach((i) => {
        if (i.url.startsWith('blob:')) URL.revokeObjectURL(i.url);
      });
    };
  }, [editPreviewItems]);

  const selectedClassId = useMemo(() => Number(classId || 0), [classId]);
  const filteredHomeworks = useMemo(() => {
    const now = Date.now();
    return homeworks.filter((hw) => homeworkMatchesFilter(hw, homeworkListFilter, now));
  }, [homeworks, homeworkListFilter]);

  const selectedClassName = useMemo(
    () => classes.find((c) => c.id === selectedClassId)?.name ?? '',
    [classes, selectedClassId],
  );

  const homeworkKpis = useMemo(() => {
    const now = Date.now();
    let overdue = 0;
    let dueSoon = 0;
    for (const hw of homeworks) {
      const t = homeworkDueTimestamp(hw);
      if (t === null) continue;
      if (t < now) overdue++;
      else if (t - now <= 7 * 86400000) dueSoon++;
    }
    return { overdue, dueSoon, total: homeworks.length };
  }, [homeworks]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const classList = await kidsListClasses();
      setClasses(classList);
      if (!classId && classList.length > 0) {
        setClassId(String(classList[0].id));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('teacherHomework.dataLoadError'));
    } finally {
      setLoading(false);
    }
  }, [classId, t]);

  const loadClassHomeworks = useCallback(async (cid: number) => {
    if (!cid) {
      setHomeworks([]);
      setSelectedHomeworkId(null);
      return;
    }
    try {
      const list = await kidsListClassHomeworks(cid);
      setHomeworks(list);
      setSelectedHomeworkId((prev) => {
        if (prev && list.some((hw) => hw.id === prev)) return prev;
        return list.length > 0 ? list[0].id : null;
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('teacherHomework.classHomeworksLoadError'));
    }
  }, []);


  useEffect(() => {
    if (authLoading) return;
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      router.replace(kidsLoginPortalHref(pathPrefix, 'ogretmen'));
      return;
    }
    void load();
  }, [authLoading, user, pathPrefix, router, load]);

  useEffect(() => {
    if (selectedClassId > 0) {
      void loadClassHomeworks(selectedClassId);
    }
  }, [selectedClassId, loadClassHomeworks]);

  async function createHomework(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClassId) {
      toast.error(t('teacherHomework.selectClassFirst'));
      return;
    }
    if (!title.trim()) {
      toast.error(t('teacherHomework.titleRequired'));
      return;
    }
    setCreating(true);
    try {
      let created = await kidsCreateClassHomework(selectedClassId, {
        title: title.trim(),
        description: description.trim(),
        due_at: kidsDatetimeLocalToIso(dueAtLocal),
      });
      if (files.length > 0) {
        for (const f of files) {
          created = await kidsUploadHomeworkAttachment(selectedClassId, created.id, f);
        }
      }
      setTitle('');
      setDescription('');
      setDueAtLocal('');
      setFiles([]);
      toast.success(t('teacherHomework.published'));
      await loadClassHomeworks(selectedClassId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('teacherHomework.createFailed'));
    } finally {
      setCreating(false);
    }
  }

  function appendFiles(next: File[]) {
    if (next.length === 0) return;
    const accepted: File[] = [];
    const rejected: string[] = [];
    for (const f of next) {
      const maxBytes = isImageFile(f) ? HOMEWORK_IMAGE_MAX_BYTES : HOMEWORK_DOCUMENT_MAX_BYTES;
      if (f.size > maxBytes) {
        rejected.push(`${f.name} (max ${isImageFile(f) ? '10 MB' : '20 MB'})`);
      } else {
        accepted.push(f);
      }
    }
    if (rejected.length > 0) toast.error(`${t('announcements.sizeLimitExceeded')}: ${rejected.join(', ')}`);
    if (accepted.length > 0) setFiles((prev) => [...prev, ...accepted]);
  }

  function appendEditFiles(next: File[]) {
    if (next.length === 0) return;
    const accepted: File[] = [];
    const rejected: string[] = [];
    for (const f of next) {
      const maxBytes = isImageFile(f) ? HOMEWORK_IMAGE_MAX_BYTES : HOMEWORK_DOCUMENT_MAX_BYTES;
      if (f.size > maxBytes) {
        rejected.push(`${f.name} (max ${isImageFile(f) ? '10 MB' : '20 MB'})`);
      } else {
        accepted.push(f);
      }
    }
    if (rejected.length > 0) toast.error(`${t('announcements.sizeLimitExceeded')}: ${rejected.join(', ')}`);
    if (accepted.length > 0) setEditFiles((prev) => [...prev, ...accepted]);
  }

  function startEditHomework(hw: KidsHomework) {
    setEditingHomeworkId(hw.id);
    setEditTitle(hw.title || '');
    setEditDescription(hw.description || '');
    setEditDueAtLocal(kidsIsoToDatetimeLocal(hw.due_at));
    setEditFiles([]);
  }

  function cancelEditHomework() {
    setEditingHomeworkId(null);
    setEditTitle('');
    setEditDescription('');
    setEditDueAtLocal('');
    setEditFiles([]);
  }

  async function saveEditHomework() {
    if (!selectedClassId || !editingHomeworkId) return;
    if (!editTitle.trim()) {
      toast.error(t('teacherHomework.titleRequired'));
      return;
    }
    setEditSaving(true);
    try {
      let latest = await kidsPatchClassHomework(selectedClassId, editingHomeworkId, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        due_at: kidsDatetimeLocalToIso(editDueAtLocal),
      });
      if (editFiles.length > 0) {
        for (const f of editFiles) {
          latest = await kidsUploadHomeworkAttachment(selectedClassId, editingHomeworkId, f);
        }
      }
      setHomeworks((prev) => prev.map((row) => (row.id === latest.id ? latest : row)));
      toast.success(t('teacherHomework.updated'));
      cancelEditHomework();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('teacherHomework.updateFailed'));
    } finally {
      setEditSaving(false);
    }
  }

  async function deleteHomeworkAttachment(homeworkId: number, attachmentId: number) {
    if (!selectedClassId) return;
    setDeletingAttachmentId(attachmentId);
    try {
      const latest = await kidsDeleteHomeworkAttachment(selectedClassId, homeworkId, attachmentId);
      setHomeworks((prev) => prev.map((row) => (row.id === latest.id ? latest : row)));
      toast.success(t('teacherHomework.attachmentDeleted'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('teacherHomework.attachmentDeleteFailed'));
    } finally {
      setDeletingAttachmentId(null);
    }
  }

  const softField =
    'w-full rounded-2xl border-0 bg-zinc-100 px-4 py-3 text-base text-slate-900 shadow-inner shadow-zinc-200/50 outline-none transition placeholder:text-zinc-400 focus:bg-white focus:ring-2 focus:ring-violet-400/35 dark:bg-zinc-800/80 dark:text-white dark:shadow-none dark:placeholder:text-zinc-500 dark:focus:bg-zinc-900 dark:focus:ring-violet-600/40';
  const softTextarea = `${softField} min-h-[120px] resize-y`;

  return (
    <KidsPanelMax className="max-w-6xl px-4 py-6 pb-12 sm:px-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-logo text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">{t('teacherHomework.title')}</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{t('teacherHomework.pageSubtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex shrink-0 items-center justify-center rounded-2xl border border-violet-200/80 bg-violet-50/60 px-4 py-2.5 text-sm font-bold text-violet-900 shadow-sm transition hover:bg-violet-100/80 disabled:opacity-50 dark:border-violet-800/50 dark:bg-violet-950/30 dark:text-violet-100 dark:hover:bg-violet-950/50"
        >
          {loading ? t('common.loading') : t('teacherHomework.refresh')}
        </button>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="flex flex-col justify-between rounded-2xl bg-linear-to-br from-violet-600 to-violet-700 p-5 text-white shadow-md shadow-violet-500/20">
          <div className="flex items-center gap-2 text-violet-100">
            <TrendingUp className="h-5 w-5 shrink-0" strokeWidth={2.25} aria-hidden />
            <span className="text-[10px] font-bold uppercase tracking-wider">{t('teacherHomework.kpiTotalTitle')}</span>
          </div>
          <p className="mt-4 font-logo text-3xl font-black tabular-nums">{homeworkKpis.total}</p>
          <p className="mt-1 text-sm text-violet-100/90">{t('teacherHomework.kpiTotalBody')}</p>
        </div>
        <div className="rounded-2xl border border-zinc-100 border-l-4 border-l-rose-500 bg-white p-5 shadow-md dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <Clock className="h-5 w-5 shrink-0" strokeWidth={2.25} aria-hidden />
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              {t('teacherHomework.kpiOverdueTitle')}
            </span>
          </div>
          <p className="mt-3 font-logo text-3xl font-black text-slate-900 tabular-nums dark:text-white">{homeworkKpis.overdue}</p>
          <p className="mt-1 text-sm font-medium text-zinc-600 dark:text-zinc-400">{t('teacherHomework.kpiDueSoonHint').replace('{n}', String(homeworkKpis.dueSoon))}</p>
        </div>
        <div className="rounded-2xl border border-violet-200/80 bg-linear-to-br from-pink-50 to-violet-50 p-5 shadow-md dark:border-violet-900/40 dark:from-pink-950/30 dark:to-violet-950/20">
          <div className="flex items-center gap-2 text-violet-600 dark:text-violet-300">
            <Star className="h-5 w-5 shrink-0" strokeWidth={2.25} aria-hidden />
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              {t('teacherHomework.kpiSpotlightTitle')}
            </span>
          </div>
          <p className="mt-3 text-sm font-semibold text-zinc-600 dark:text-zinc-400">{t('teacherHomework.kpiSpotlightLabel')}</p>
          <p className="mt-1 font-logo text-xl font-black text-violet-700 dark:text-violet-300">
            {selectedClassName || t('teacherHomework.kpiNoClass')}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{t('teacherHomework.kpiSpotlightFoot')}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(17rem,22rem)_minmax(0,1fr)] lg:items-start lg:gap-8 xl:grid-cols-[minmax(19rem,24rem)_minmax(0,1fr)]">
        <section className="order-1 rounded-3xl border border-zinc-100 bg-white p-5 shadow-lg dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white shadow-md shadow-violet-500/30 dark:bg-violet-500">
              <Plus className="h-6 w-6" strokeWidth={2.5} aria-hidden />
            </span>
            <h2 className="font-logo text-lg font-bold leading-tight text-slate-900 dark:text-white sm:text-xl">{t('teacherHomework.newHomework')}</h2>
          </div>

          <button
            type="button"
            className="mt-4 flex w-full items-center justify-between rounded-2xl border border-violet-200/80 bg-violet-50/60 px-4 py-3 text-left text-sm font-bold text-violet-900 dark:border-violet-800/50 dark:bg-violet-950/30 dark:text-violet-100 lg:hidden"
            onClick={() => setHomeworkFormOpen((v) => !v)}
            aria-expanded={homeworkFormOpen}
            aria-controls={homeworkFormSectionId}
          >
            <span>{t('teacherHomework.newHomework')}</span>
            <span aria-hidden>{homeworkFormOpen ? '▲' : '▼'}</span>
          </button>

          <div id={homeworkFormSectionId} className={`mt-5 ${homeworkFormOpen ? 'block' : 'hidden'} lg:block`}>
            <form className="space-y-4" onSubmit={createHomework}>
              <KidsFormField id={classSelectId} label={t('announcements.class')}>
                <div className="mt-1.5 rounded-2xl bg-zinc-100 px-2 py-2 dark:bg-zinc-800/80">
                  <KidsSelect
                    id={classSelectId}
                    value={classId}
                    onChange={setClassId}
                    options={classes.map((c) => ({ value: String(c.id), label: c.name }))}
                  />
                </div>
              </KidsFormField>
              <KidsFormField id={titleId} label={t('announcements.titleField')}>
                <input
                  id={titleId}
                  className={`${softField} mt-1.5`}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('teacherHomework.titlePlaceholder')}
                />
              </KidsFormField>
              <KidsFormField id={descriptionId} label={t('teacherHomework.description')}>
                <textarea
                  id={descriptionId}
                  className={`${softTextarea} mt-1.5`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('teacherHomework.descriptionPlaceholder')}
                  rows={4}
                />
              </KidsFormField>
              <KidsFormField id={dueAtId} label={t('teacherHomework.dueOptional')}>
                <div className="mt-1.5 rounded-2xl bg-zinc-100 px-2 py-2 dark:bg-zinc-800/80">
                  <KidsDateTimeField id={dueAtId} value={dueAtLocal} onChange={setDueAtLocal} />
                </div>
              </KidsFormField>
              <div className="rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50/80 px-3 py-4 dark:border-zinc-600 dark:bg-zinc-800/40">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  <Upload className="h-4 w-4 text-violet-500" strokeWidth={2.25} aria-hidden />
                  {t('teacherHomework.attachments')}
                </div>
                {uploadPreviewItems.length > 0 ? (
                  <div>
                    <MediaSlider
                      items={uploadPreviewItems}
                      className="h-40"
                      alt=""
                      fit="contain"
                      onDeleteAtIndex={(idx) => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                    />
                    <p className="mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">{t('teacherHomework.sliderHint')}</p>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('teacherHomework.noAttachmentYet')}</p>
                )}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <input
                    id="homework-files"
                    type="file"
                    multiple
                    onChange={(e) => appendFiles(Array.from(e.target.files || []))}
                    className="hidden"
                  />
                  <label
                    htmlFor="homework-files"
                    className="cursor-pointer text-xs font-bold text-violet-700 hover:underline dark:text-violet-300"
                  >
                    {t('announcements.addFile')}
                  </label>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">{t('announcements.attachmentHintShort')}</span>
                </div>
              </div>
              <button
                type="submit"
                disabled={creating}
                className="flex w-full min-h-[52px] items-center justify-center rounded-full bg-linear-to-r from-violet-600 via-violet-500 to-fuchsia-600 px-6 text-sm font-black text-white shadow-lg shadow-violet-500/30 transition hover:from-violet-500 hover:via-violet-400 hover:to-fuchsia-500 disabled:opacity-50"
              >
                {creating ? t('announcements.publishing') : t('teacherHomework.publishCtaShort')}
              </button>
            </form>
          </div>
        </section>

        <div className="order-2 flex flex-col gap-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-logo text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">{t('teacherHomework.selectedClassHomeworks')}</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {selectedClassName
                  ? t('teacherHomework.listSubtitleNamed')
                      .replace('{class}', selectedClassName)
                      .replace('{shown}', String(filteredHomeworks.length))
                      .replace('{total}', String(homeworks.length))
                  : t('teacherHomework.listSubtitlePickClass')}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div
                className="flex rounded-full border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-600 dark:bg-zinc-800"
                role="group"
                aria-label={t('teacherHomework.filterAria')}
              >
                {(['all', 'open', 'overdue'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    aria-pressed={homeworkListFilter === f}
                    onClick={() => setHomeworkListFilter(f)}
                    className={`rounded-full px-2.5 py-1.5 text-xs font-bold transition sm:px-3 sm:text-sm ${
                      homeworkListFilter === f
                        ? f === 'overdue'
                          ? 'bg-rose-100 text-rose-900 shadow-sm dark:bg-rose-950/50 dark:text-rose-100'
                          : 'bg-violet-100 text-violet-900 shadow-sm dark:bg-violet-950/50 dark:text-violet-100'
                        : 'text-zinc-500 dark:text-zinc-400'
                    }`}
                  >
                    {f === 'all'
                      ? t('teacherHomework.filterAll')
                      : f === 'open'
                        ? t('teacherHomework.filterOpen')
                        : t('teacherHomework.filterOverdue')}
                  </button>
                ))}
              </div>
              <div className="flex rounded-xl border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-600 dark:bg-zinc-800">
                <button
                  type="button"
                  aria-pressed={homeworkViewMode === 'grid'}
                  onClick={() => setHomeworkViewMode('grid')}
                  className={`rounded-lg p-2 transition ${homeworkViewMode === 'grid' ? 'bg-white text-violet-700 shadow-sm dark:bg-zinc-900 dark:text-violet-300' : 'text-zinc-500'}`}
                  title={t('teacherClass.assignments.viewGrid')}
                >
                  <LayoutGrid className="h-5 w-5" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-pressed={homeworkViewMode === 'list'}
                  onClick={() => setHomeworkViewMode('list')}
                  className={`rounded-lg p-2 transition ${homeworkViewMode === 'list' ? 'bg-white text-violet-700 shadow-sm dark:bg-zinc-900 dark:text-violet-300' : 'text-zinc-500'}`}
                  title={t('teacherClass.assignments.viewList')}
                >
                  <LucideList className="h-5 w-5" aria-hidden />
                </button>
              </div>
            </div>
          </div>

          {!selectedClassId ? (
            <p className="rounded-2xl border border-zinc-100 bg-white p-6 text-sm text-zinc-500 shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              {t('teacherHomework.selectClassFirst')}
            </p>
          ) : homeworks.length === 0 ? (
            <p className="rounded-2xl border border-zinc-100 bg-white p-6 text-sm text-zinc-500 shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              {t('teacherHomework.noHomeworkClass')}
            </p>
          ) : filteredHomeworks.length === 0 ? (
            <p className="rounded-2xl border border-zinc-100 bg-white p-6 text-sm text-zinc-500 shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              {t('teacherHomework.emptyFiltered')}
            </p>
          ) : (
            <ul
              className={
                homeworkViewMode === 'grid' ? 'grid grid-cols-1 gap-4 sm:grid-cols-2' : 'flex flex-col gap-4'
              }
            >
              {filteredHomeworks.map((hw) => {
                const nowMs = Date.now();
                const grad = homeworkCardHeaderGradient(hw.id);
                const dateStr = hw.due_at
                  ? new Date(hw.due_at).toLocaleDateString(
                      language === 'tr' ? 'tr-TR' : language === 'ge' ? 'de-DE' : 'en-US',
                    )
                  : '—';
                const attCount = hw.attachments?.length ?? 0;
                const overdue = homeworkIsOverdue(hw, nowMs);
                const pubBadge = hw.is_published ? t('teacherHomework.badgePublished') : t('teacherHomework.badgeDraft');
                return (
                  <li
                    key={hw.id}
                    className={`flex overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-md ring-1 ring-black/3 dark:border-zinc-800 dark:bg-zinc-900 dark:ring-white/5 ${
                      homeworkViewMode === 'list' ? 'flex-col sm:flex-row sm:items-stretch' : 'flex-col'
                    } ${selectedHomeworkId === hw.id ? 'ring-2 ring-violet-400/60' : ''}`}
                  >
                    <div
                      className={`relative shrink-0 bg-linear-to-br ${grad} ${
                        homeworkViewMode === 'list'
                          ? 'aspect-16/10 sm:aspect-auto sm:h-auto sm:min-h-0 sm:w-44 sm:max-w-44'
                          : 'aspect-16/10 w-full'
                      }`}
                    >
                      <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-900 shadow-sm dark:bg-black/55 dark:text-white">
                        {t('teacherHomework.cardTypeBadge')}
                      </span>
                      <span
                        className={`absolute right-3 top-3 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ring-1 ${
                          overdue
                            ? 'bg-rose-100 text-rose-900 ring-rose-200 dark:bg-rose-950/60 dark:text-rose-100'
                            : 'bg-white/90 text-zinc-700 ring-zinc-200 dark:bg-zinc-900/90 dark:text-zinc-200'
                        }`}
                      >
                        {pubBadge}
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col p-4">
                      {editingHomeworkId === hw.id ? (
                        <div className="space-y-3 rounded-xl border border-violet-200/80 bg-violet-50/40 p-3 dark:border-violet-800/50 dark:bg-violet-950/20">
                          <input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className={kidsInputClass}
                            placeholder={t('announcements.titleField')}
                          />
                          <textarea
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            className={kidsTextareaClass}
                            rows={3}
                            placeholder={t('teacherHomework.description')}
                          />
                          <div className="rounded-xl bg-white px-2 py-2 dark:bg-zinc-900/80">
                            <KidsDateTimeField id={`edit-due-${hw.id}`} value={editDueAtLocal} onChange={setEditDueAtLocal} />
                          </div>
                          {(() => {
                            const att = hw.attachments ?? [];
                            const sliderAtts = att.filter(
                              (a) =>
                                isImageAttachment(a.content_type, a.original_name) ||
                                isVideoAttachment(a.content_type, a.original_name),
                            );
                            const docAtts = att.filter(
                              (a) =>
                                !isImageAttachment(a.content_type, a.original_name) &&
                                !isVideoAttachment(a.content_type, a.original_name),
                            );
                            const sliderMedia: MediaItem[] = sliderAtts.map((a) => ({
                              url: a.url,
                              type: isImageAttachment(a.content_type, a.original_name) ? ('image' as const) : ('video' as const),
                            }));
                            return (
                              <>
                                {sliderMedia.length > 0 ? (
                                  <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
                                    <p className="px-3 pt-2.5 text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                      {t('teacherHomework.existingMedia')}
                                    </p>
                                    <MediaSlider
                                      items={sliderMedia}
                                      className="h-48 sm:h-56"
                                      alt={hw.title}
                                      fit="contain"
                                      onDeleteAtIndex={(idx) => {
                                        const target = sliderAtts[idx];
                                        if (target) void deleteHomeworkAttachment(hw.id, target.id);
                                      }}
                                      deleteDisabled={deletingAttachmentId !== null}
                                    />
                                    <p className="px-3 pb-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                                      {t('teacherHomework.sliderHint')}
                                    </p>
                                  </div>
                                ) : null}
                                {docAtts.length > 0 ? (
                                  <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/90 p-3 dark:border-zinc-600 dark:bg-zinc-800/50">
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                      {t('teacherHomework.otherFiles')}
                                    </p>
                                    <ul className="mt-2 flex flex-wrap gap-2">
                                      {docAtts.map((at) => (
                                        <li
                                          key={at.id}
                                          className="flex max-w-full items-center gap-2 rounded-xl bg-white px-2.5 py-1.5 text-xs shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-700"
                                        >
                                          <span className="max-w-40 truncate font-semibold text-zinc-800 dark:text-zinc-200" title={at.original_name}>
                                            {at.original_name}
                                          </span>
                                          <button
                                            type="button"
                                            disabled={deletingAttachmentId !== null}
                                            onClick={() => void deleteHomeworkAttachment(hw.id, at.id)}
                                            className="shrink-0 rounded-full border border-rose-300 px-2 py-0.5 text-[11px] font-bold text-rose-700 disabled:opacity-50 dark:border-rose-800 dark:text-rose-300"
                                          >
                                            {t('messageDetail.remove')}
                                          </button>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ) : null}
                              </>
                            );
                          })()}
                          {editPreviewItems.length > 0 ? (
                            <div className="overflow-hidden rounded-2xl border border-violet-200/70 bg-white dark:border-violet-800/40 dark:bg-zinc-900">
                              <p className="px-3 pt-2.5 text-[10px] font-bold uppercase tracking-wide text-violet-600 dark:text-violet-300">
                                {t('teacherHomework.pendingUploads')}
                              </p>
                              <MediaSlider
                                items={editPreviewItems}
                                className="h-44 sm:h-48"
                                alt=""
                                fit="contain"
                                onDeleteAtIndex={(idx) => {
                                  setEditFiles((prev) => prev.filter((_, i) => i !== idx));
                                }}
                              />
                            </div>
                          ) : null}
                          <div className="flex flex-wrap gap-2">
                            <input
                              id={`edit-files-${hw.id}`}
                              type="file"
                              multiple
                              onChange={(e) => appendEditFiles(Array.from(e.target.files || []))}
                              className="hidden"
                            />
                            <label
                              htmlFor={`edit-files-${hw.id}`}
                              className="cursor-pointer text-xs font-bold text-violet-700 dark:text-violet-300"
                            >
                              {t('announcements.addFile')}
                            </label>
                          </div>
                          <div className="flex justify-end gap-2 pt-1">
                            <KidsSecondaryButton type="button" onClick={cancelEditHomework} disabled={editSaving}>
                              {t('common.cancel')}
                            </KidsSecondaryButton>
                            <KidsPrimaryButton
                              type="button"
                              onClick={() => void saveEditHomework()}
                              disabled={editSaving || !editTitle.trim()}
                            >
                              {editSaving ? t('profile.saving') : t('profile.save')}
                            </KidsPrimaryButton>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                            <p className="min-w-0 flex-1 font-logo text-lg font-bold leading-snug text-slate-900 dark:text-white">{hw.title}</p>
                            <p className="shrink-0 text-xs font-semibold text-zinc-400 dark:text-zinc-500">{dateStr}</p>
                          </div>
                          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                            {hw.description || t('teacherHomework.noDescription')}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1.5 text-xs font-bold text-violet-900 dark:bg-violet-950/50 dark:text-violet-100">
                              <Upload className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                              {t('teacherHomework.attachmentCountPill').replace('{n}', String(attCount))}
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-100 px-3 py-1.5 text-xs font-bold text-pink-950 dark:bg-pink-950/40 dark:text-pink-100">
                              <Clock className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                              {homeworkDeadlinePillText(hw.due_at, nowMs, t)}
                            </span>
                          </div>
                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedHomeworkId(hw.id);
                                startEditHomework(hw);
                              }}
                              className="flex min-h-10 items-center justify-center rounded-full bg-zinc-100 px-3 text-xs font-bold text-zinc-800 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 sm:text-sm"
                            >
                              {t('announcements.edit')}
                            </button>
                            <Link
                              href={`${pathPrefix}/ogretmen/odevler/${hw.id}`}
                              onClick={() => setSelectedHomeworkId(hw.id)}
                              className="flex min-h-10 items-center justify-center rounded-full bg-violet-100 px-3 text-xs font-bold text-violet-800 transition hover:bg-violet-200 dark:bg-violet-950/50 dark:text-violet-100 dark:hover:bg-violet-900/40 sm:text-sm"
                            >
                              {t('teacherHomework.openSubmissions')}
                            </Link>
                          </div>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </KidsPanelMax>
  );
}
