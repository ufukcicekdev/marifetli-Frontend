'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';
import {
  kidsDeleteStudentHomeworkSubmissionAttachment,
  kidsListStudentHomeworks,
  kidsMarkHomeworkDone,
  kidsUploadStudentHomeworkSubmissionAttachment,
  type KidsHomeworkSubmission,
} from '@/src/lib/kids-api';
import { KidsCard, KidsPanelMax, KidsPrimaryButton, KidsSecondaryButton } from '@/src/components/kids/kids-ui';
import { MediaSlider } from '@/src/components/media-slider';
import type { MediaItem } from '@/src/lib/extract-media';
import { useKidsI18n } from '@/src/providers/kids-language-provider';

function isImageAttachment(contentType: string, fileName: string): boolean {
  const ct = (contentType || '').toLowerCase();
  if (ct.startsWith('image/')) return true;
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(fileName || '');
}

function filePlaceholderUrl(fileName: string, label: string): string {
  const ext = (fileName.split('.').pop() || 'DOSYA').toUpperCase().slice(0, 6);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540"><rect width="960" height="540" fill="#EFF6FF"/><rect x="360" y="120" width="240" height="300" rx="24" fill="#BFDBFE"/><path d="M520 120v76c0 13 11 24 24 24h56" fill="#93C5FD"/><path d="M520 120l80 100" stroke="#60A5FA" stroke-width="10"/><text x="480" y="300" text-anchor="middle" font-family="Arial, sans-serif" font-size="40" font-weight="700" fill="#1E3A8A">${ext}</text><text x="480" y="345" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" fill="#1D4ED8">${label}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

type HomeworkTab = 'incoming' | 'done';
type PendingUploadItem = {
  id: string;
  file: File;
  previewUrl: string;
};

function byNewestHomework(a: KidsHomeworkSubmission, b: KidsHomeworkSubmission): number {
  const ad = new Date(a.homework.created_at || a.updated_at || '').getTime();
  const bd = new Date(b.homework.created_at || b.updated_at || '').getTime();
  return bd - ad;
}

export default function KidsStudentHomeworksPage() {
  const router = useRouter();
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();
  const { t, language } = useKidsI18n();
  const [items, setItems] = useState<KidsHomeworkSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<number | null>(null);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<number | null>(null);
  const [pendingUploads, setPendingUploads] = useState<Record<number, PendingUploadItem[]>>({});
  const pendingUploadsRef = useRef(pendingUploads);
  pendingUploadsRef.current = pendingUploads;
  const [tab, setTab] = useState<HomeworkTab>('incoming');
  const [openDetailId, setOpenDetailId] = useState<number | null>(null);
  const statusLabel: Record<KidsHomeworkSubmission['status'], string> = {
    published: t('homework.status.published'),
    student_done: t('homework.status.studentDone'),
    parent_approved: t('homework.status.parentApproved'),
    parent_rejected: t('homework.status.parentRejected'),
    teacher_approved: t('homework.status.teacherApproved'),
    teacher_revision: t('homework.status.teacherRevision'),
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await kidsListStudentHomeworks();
      setItems(list);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('homework.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(kidsLoginPortalHref(pathPrefix, 'ogrenci'));
      return;
    }
    if (user.role !== 'student') {
      router.replace(kidsLoginPortalHref(pathPrefix));
      return;
    }
    void load();
  }, [authLoading, user, pathPrefix, router, load]);

  async function markDone(submissionId: number) {
    setMarkingId(submissionId);
    try {
      const pending = pendingUploads[submissionId] ?? [];
      for (const row of pending) {
        await kidsUploadStudentHomeworkSubmissionAttachment(submissionId, row.file);
      }
      await kidsMarkHomeworkDone(submissionId);
      setPendingUploads((prev) => {
        const next = { ...prev };
        const old = next[submissionId] ?? [];
        for (const row of old) URL.revokeObjectURL(row.previewUrl);
        delete next[submissionId];
        return next;
      });
      toast.success(t('homework.markDoneSuccess'));
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('homework.markDoneError'));
    } finally {
      setMarkingId(null);
    }
  }

  async function deleteSubmissionImage(submissionId: number, attachmentId: number) {
    setDeletingAttachmentId(attachmentId);
    try {
      await kidsDeleteStudentHomeworkSubmissionAttachment(submissionId, attachmentId);
      toast.success(t('homework.studentImageDeleted'));
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('homework.studentImageDeleteFailed'));
    } finally {
      setDeletingAttachmentId(null);
    }
  }

  function addPendingFiles(submissionId: number, files: FileList | null) {
    if (!files || files.length === 0) return;
    const additions: PendingUploadItem[] = [];
    for (const file of Array.from(files)) {
      additions.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }
    setPendingUploads((prev) => {
      const next = { ...prev };
      const curr = next[submissionId] ?? [];
      next[submissionId] = [...curr, ...additions];
      return next;
    });
  }

  function removePendingFile(submissionId: number, pendingId: string) {
    setPendingUploads((prev) => {
      const next = { ...prev };
      const curr = next[submissionId] ?? [];
      const target = curr.find((x) => x.id === pendingId);
      if (target) URL.revokeObjectURL(target.previewUrl);
      const filtered = curr.filter((x) => x.id !== pendingId);
      if (filtered.length === 0) delete next[submissionId];
      else next[submissionId] = filtered;
      return next;
    });
  }

  // pendingUploads her değişiminde cleanup çalıştırmayın: önceki listedeki TÜM blob'ları
  // revoke eder ve silinmemiş önizlemeleri de kırar (net::ERR_FILE_NOT_FOUND).
  useEffect(() => {
    return () => {
      for (const rows of Object.values(pendingUploadsRef.current)) {
        for (const row of rows) URL.revokeObjectURL(row.previewUrl);
      }
    };
  }, []);

  const incomingItems = useMemo(
    () =>
      items
        .filter(
          (s) =>
            s.status === 'published' || s.status === 'parent_rejected' || s.status === 'teacher_revision',
        )
        .sort(byNewestHomework),
    [items],
  );

  const doneItems = useMemo(
    () =>
      items
        .filter(
          (s) =>
            s.status === 'student_done' || s.status === 'parent_approved' || s.status === 'teacher_approved',
        )
        .sort((a, b) => {
          const ad = new Date(a.updated_at || a.student_done_at || '').getTime();
          const bd = new Date(b.updated_at || b.student_done_at || '').getTime();
          return bd - ad;
        }),
    [items],
  );

  const visibleItems = tab === 'incoming' ? incomingItems : doneItems;

  if (authLoading || !user) {
    return <p className="text-center text-gray-600 dark:text-gray-400">{t('common.loading')}</p>;
  }

  return (
    <KidsPanelMax>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-logo text-2xl font-bold text-slate-900 dark:text-white">{t('homework.title')}</h1>
        <div className="flex gap-2">
          <KidsSecondaryButton type="button" onClick={() => void load()} disabled={loading}>
            {loading ? t('common.loading') : t('homework.refresh')}
          </KidsSecondaryButton>
          <Link href={`${pathPrefix}/ogrenci/projeler`} className="inline-flex">
            <KidsSecondaryButton type="button">{t('nav.challenges')}</KidsSecondaryButton>
          </Link>
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setTab('incoming')}
          className={`rounded-2xl border px-4 py-3 text-left transition ${
            tab === 'incoming'
              ? 'border-violet-400 bg-violet-50 text-violet-900 dark:border-violet-500 dark:bg-violet-950/40 dark:text-violet-100'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
          }`}
        >
          <p className="text-xs font-bold uppercase tracking-wide">{t('homework.tabIncoming')}</p>
          <p className="mt-1 text-2xl font-black">{incomingItems.length}</p>
        </button>
        <button
          type="button"
          onClick={() => setTab('done')}
          className={`rounded-2xl border px-4 py-3 text-left transition ${
            tab === 'done'
              ? 'border-emerald-400 bg-emerald-50 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-100'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
          }`}
        >
          <p className="text-xs font-bold uppercase tracking-wide">{t('homework.tabDone')}</p>
          <p className="mt-1 text-2xl font-black">{doneItems.length}</p>
        </button>
      </div>

      {items.length === 0 && !loading ? (
        <KidsCard tone="emerald">
          <p className="text-sm text-emerald-900 dark:text-emerald-100">{t('homework.empty')}</p>
        </KidsCard>
      ) : null}

      <div className="space-y-3">
        {visibleItems.map((sub) => {
          const canMarkDone =
            sub.status === 'published' ||
            sub.status === 'parent_rejected' ||
            sub.status === 'teacher_revision';
          const pendingRows = pendingUploads[sub.id] ?? [];
          const hasStudentImage = (Array.isArray(sub.attachments) && sub.attachments.length > 0) || pendingRows.length > 0;
          const isOpen = openDetailId === sub.id;
          const studentMediaEntries = [
            ...(Array.isArray(sub.attachments)
              ? sub.attachments.map((att) => ({
                  kind: 'remote' as const,
                  id: att.id,
                  url: att.url,
                }))
              : []),
            ...pendingRows.map((row) => ({
              kind: 'pending' as const,
              pendingId: row.id,
              url: row.previewUrl,
            })),
          ];
          const studentMediaItems: MediaItem[] = studentMediaEntries.map((row) => ({ url: row.url, type: 'image' as const }));
          return (
            <KidsCard key={sub.id} tone="sky">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{sub.homework.title}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{sub.homework.class_name || t('announcements.class')}</p>
                  {(sub.homework.teacher_display || sub.homework.teacher_subject) ? (
                    <p className="text-xs text-sky-800/80 dark:text-sky-200/80">
                      {sub.homework.teacher_display || t('landing.role.teacher')}{sub.homework.teacher_subject ? ` (${sub.homework.teacher_subject})` : ''}
                    </p>
                  ) : null}
                  {sub.homework.due_at ? (
                    <p className="text-xs text-violet-800/80 dark:text-violet-200/80">
                      {t('homework.dueAt')}: {new Date(sub.homework.due_at).toLocaleString(language, { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-indigo-900/80 dark:text-indigo-100/80">{statusLabel[sub.status]}</p>
                </div>
                <div className="flex items-center gap-2">
                  <KidsSecondaryButton
                    type="button"
                    onClick={() => setOpenDetailId((prev) => (prev === sub.id ? null : sub.id))}
                  >
                    {isOpen ? t('homework.detailClose') : t('homework.detailOpen')}
                  </KidsSecondaryButton>
                </div>
              </div>
              {isOpen ? (
                <div className="mt-3 space-y-3 rounded-xl border border-slate-200/90 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/30">
                  {sub.homework.description ? (
                    <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">
                      {sub.homework.description}
                    </p>
                  ) : null}
                  {Array.isArray(sub.homework.attachments) && sub.homework.attachments.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{t('homework.teacherFiles')}</p>
                      <MediaSlider
                        items={sub.homework.attachments.map<MediaItem>((att) => ({
                          url: isImageAttachment(att.content_type, att.original_name)
                            ? att.url
                            : filePlaceholderUrl(att.original_name || 'dosya', t('homework.attachmentLabel')),
                          type: 'image',
                        }))}
                        className="h-52"
                        alt={sub.homework.title}
                        fit="contain"
                      />
                    </div>
                  ) : null}
                  <div className="rounded-xl border border-sky-200/80 bg-white/70 p-3 dark:border-sky-800/50 dark:bg-sky-950/20">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-sky-900 dark:text-sky-100">{t('homework.studentImages')}</p>
                      {canMarkDone ? (
                        <label className="inline-flex cursor-pointer items-center rounded-full border border-sky-300 px-3 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100 dark:border-sky-700 dark:text-sky-200 dark:hover:bg-sky-900/40">
                          {t('homework.addImage')}
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            disabled={markingId !== null}
                            onChange={(e) => {
                              addPendingFiles(sub.id, e.currentTarget.files);
                              e.currentTarget.value = '';
                            }}
                          />
                        </label>
                      ) : null}
                    </div>
                    {pendingRows.length > 0 ? (
                      <div className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                        {t('homework.imageWillUploadOnDone')}
                      </div>
                    ) : null}
                    {studentMediaItems.length > 0 ? (
                      <div className="mt-2 space-y-2">
                        <MediaSlider
                          key={studentMediaEntries.map((e) => (e.kind === 'remote' ? `r:${e.id}` : `p:${e.pendingId}`)).join('|')}
                          items={studentMediaItems}
                          className="h-52"
                          alt={`${sub.homework.title} ogrenci gorselleri`}
                          fit="contain"
                          deleteDisabled={markingId !== null || deletingAttachmentId !== null}
                          onDeleteAtIndex={(itemIndex) => {
                            const target = studentMediaEntries[itemIndex];
                            if (!target) return;
                            if (target.kind === 'pending') {
                              removePendingFile(sub.id, target.pendingId);
                              return;
                            }
                            if (canMarkDone) {
                              void deleteSubmissionImage(sub.id, target.id);
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{t('homework.noStudentImageYet')}</p>
                    )}
                    {canMarkDone ? (
                      <div className="mt-3 flex items-center justify-end gap-2">
                        {!hasStudentImage ? (
                          <p className="text-xs text-amber-700 dark:text-amber-300">
                            {t('homework.doneRequiresImage')}
                          </p>
                        ) : null}
                        <KidsPrimaryButton
                          type="button"
                          disabled={!hasStudentImage || markingId !== null}
                          onClick={() => void markDone(sub.id)}
                        >
                          {markingId === sub.id ? t('homework.sending') : t('homework.done')}
                        </KidsPrimaryButton>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </KidsCard>
          );
        })}
      </div>
    </KidsPanelMax>
  );
}
