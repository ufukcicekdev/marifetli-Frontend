'use client';

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  kidsTeacherHomeworkInbox,
  kidsTeacherReviewHomeworkSubmission,
  kidsUploadHomeworkAttachment,
  type KidsClass,
  type KidsHomework,
  type KidsHomeworkSubmission,
} from '@/src/lib/kids-api';
import { KidsDateTimeField } from '@/src/components/kids/kids-datetime-field';
import { MediaSlider } from '@/src/components/media-slider';
import type { MediaItem } from '@/src/lib/extract-media';
import {
  KidsCard,
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

function filePlaceholderUrl(fileName: string): string {
  const ext = (fileName.split('.').pop() || 'DOSYA').toUpperCase().slice(0, 6);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540"><rect width="960" height="540" fill="#ECFEFF"/><rect x="360" y="120" width="240" height="300" rx="24" fill="#BAE6FD"/><path d="M520 120v76c0 13 11 24 24 24h56" fill="#7DD3FC"/><path d="M520 120l80 100" stroke="#38BDF8" stroke-width="10"/><text x="480" y="300" text-anchor="middle" font-family="Arial, sans-serif" font-size="40" font-weight="700" fill="#0C4A6E">${ext}</text><text x="480" y="345" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" fill="#0369A1">Ödev eki</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function formatFileSize(sizeBytes: number): string {
  const s = Number(sizeBytes || 0);
  if (s <= 0) return '';
  if (s < 1024) return `${s} B`;
  if (s < 1024 * 1024) return `${(s / 1024).toFixed(1)} KB`;
  return `${(s / (1024 * 1024)).toFixed(1)} MB`;
}

export default function KidsTeacherHomeworksPage() {
  const router = useRouter();
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();
  const [classes, setClasses] = useState<KidsClass[]>([]);
  const [classId, setClassId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueAtLocal, setDueAtLocal] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [creating, setCreating] = useState(false);
  const [homeworks, setHomeworks] = useState<KidsHomework[]>([]);
  const [editingHomeworkId, setEditingHomeworkId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDueAtLocal, setEditDueAtLocal] = useState('');
  const [editFiles, setEditFiles] = useState<File[]>([]);
  const [editSaving, setEditSaving] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<number | null>(null);
  const [inbox, setInbox] = useState<KidsHomeworkSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const classSelectId = useId();
  const titleId = useId();
  const descriptionId = useId();
  const dueAtId = useId();

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

  const selectedClassId = useMemo(() => Number(classId || 0), [classId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [classList, pendingInbox] = await Promise.all([kidsListClasses(), kidsTeacherHomeworkInbox()]);
      setClasses(classList);
      setInbox(pendingInbox);
      if (!classId && classList.length > 0) {
        setClassId(String(classList[0].id));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ödev verileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [classId]);

  const loadClassHomeworks = useCallback(async (cid: number) => {
    if (!cid) {
      setHomeworks([]);
      return;
    }
    try {
      const list = await kidsListClassHomeworks(cid);
      setHomeworks(list);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sınıf ödevleri yüklenemedi');
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
      toast.error('Önce sınıf seç.');
      return;
    }
    if (!title.trim()) {
      toast.error('Başlık gerekli.');
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
      toast.success('Ödev yayınlandı.');
      await Promise.all([loadClassHomeworks(selectedClassId), load()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ödev oluşturulamadı');
    } finally {
      setCreating(false);
    }
  }

  async function reviewSubmission(submissionId: number, approved: boolean) {
    setReviewingId(submissionId);
    try {
      await kidsTeacherReviewHomeworkSubmission(submissionId, { approved });
      toast.success(approved ? 'Ödev onaylandı.' : 'Düzeltme istendi.');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Değerlendirme kaydedilemedi');
    } finally {
      setReviewingId(null);
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
    if (rejected.length > 0) toast.error(`Boyut limiti aşıldı: ${rejected.join(', ')}`);
    if (accepted.length > 0) setFiles((prev) => [...prev, ...accepted]);
  }

  function removeFile(target: File) {
    setFiles((prev) =>
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
    if (rejected.length > 0) toast.error(`Boyut limiti aşıldı: ${rejected.join(', ')}`);
    if (accepted.length > 0) setEditFiles((prev) => [...prev, ...accepted]);
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
      toast.error('Başlık gerekli.');
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
      toast.success('Ödev güncellendi.');
      cancelEditHomework();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ödev güncellenemedi');
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
      toast.success('Ödev eki silindi.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ödev eki silinemedi');
    } finally {
      setDeletingAttachmentId(null);
    }
  }

  return (
    <KidsPanelMax>
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="font-logo text-2xl font-bold text-slate-900 dark:text-white">Ödev Yönetimi</h1>
        <KidsSecondaryButton type="button" onClick={() => void load()} disabled={loading}>
          {loading ? 'Yükleniyor…' : 'Yenile'}
        </KidsSecondaryButton>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <KidsCard tone="emerald">
          <h2 className="font-logo text-lg font-bold text-emerald-950 dark:text-emerald-50">Yeni ödev yayınla</h2>
          <form className="mt-4 space-y-3" onSubmit={createHomework}>
            <KidsFormField id={classSelectId} label="Sınıf">
              <KidsSelect
                id={classSelectId}
                value={classId}
                onChange={setClassId}
                options={classes.map((c) => ({ value: String(c.id), label: c.name }))}
              />
            </KidsFormField>
            <KidsFormField id={titleId} label="Başlık">
              <input
                id={titleId}
                className={kidsInputClass}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </KidsFormField>
            <KidsFormField id={descriptionId} label="Açıklama">
              <textarea
                id={descriptionId}
                className={kidsTextareaClass}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </KidsFormField>
            <KidsFormField id={dueAtId} label="Son teslim tarihi (opsiyonel)">
              <KidsDateTimeField id={dueAtId} value={dueAtLocal} onChange={setDueAtLocal} />
            </KidsFormField>
            <div className="space-y-2 rounded-xl border border-emerald-200/70 bg-emerald-50/40 p-3 dark:border-emerald-800/50 dark:bg-emerald-950/20">
              <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-100">Ödev dosya ekleri</p>
              {uploadPreviewItems.length > 0 ? (
                <MediaSlider items={uploadPreviewItems} className="h-44" alt="Ödev dosya önizleme" fit="contain" />
              ) : (
                <p className="text-xs text-slate-600 dark:text-slate-300">Henüz dosya eklenmedi.</p>
              )}
              <div className="flex items-center justify-between">
                <input
                  id="homework-files"
                  type="file"
                  multiple
                  onChange={(e) => appendFiles(Array.from(e.target.files || []))}
                  className="hidden"
                />
                <label htmlFor="homework-files" className="cursor-pointer text-xs font-semibold text-emerald-700 hover:text-emerald-500 dark:text-emerald-200">
                  + Dosya ekle
                </label>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Görsel 10 MB, döküman 20 MB</span>
              </div>
              {files.length > 0 ? (
                <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                  {files.map((f) => (
                    <li key={`${f.name}-${f.size}-${f.lastModified}`} className="flex items-center justify-between gap-2">
                      <span className="truncate">
                        {f.name} ({formatFileSize(f.size)})
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(f)}
                        className="rounded-full border border-rose-300 px-2 py-0.5 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40"
                      >
                        Kaldır
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <KidsPrimaryButton type="submit" disabled={creating}>
              {creating ? 'Yayınlanıyor…' : 'Yayınla'}
            </KidsPrimaryButton>
          </form>
        </KidsCard>

        <KidsCard tone="sky">
          <h2 className="font-logo text-lg font-bold text-indigo-950 dark:text-indigo-50">Seçili sınıfın ödevleri</h2>
          <div className="mt-3 space-y-2">
            {homeworks.length === 0 ? (
              <p className="text-sm text-indigo-900/80 dark:text-indigo-100/80">Bu sınıf için ödev yok.</p>
            ) : (
              homeworks.map((hw) => (
                <div key={hw.id} className="rounded-xl border border-indigo-200/70 px-3 py-2 dark:border-indigo-700/60">
                  {editingHomeworkId === hw.id ? (
                    <div className="space-y-2">
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className={kidsInputClass}
                        placeholder="Başlık"
                      />
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className={kidsTextareaClass}
                        rows={3}
                        placeholder="Açıklama"
                      />
                      <KidsDateTimeField id={`edit-due-${hw.id}`} value={editDueAtLocal} onChange={setEditDueAtLocal} />
                      <div className="rounded-lg border border-indigo-200/70 bg-white/70 p-2 dark:border-indigo-800/50 dark:bg-slate-900/60">
                        <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-100">Mevcut ekler</p>
                        {Array.isArray(hw.attachments) && hw.attachments.length > 0 ? (
                          <ul className="mt-1 space-y-1 text-xs">
                            {hw.attachments.map((att) => (
                              <li key={att.id} className="flex items-center justify-between gap-2">
                                <span className="truncate text-slate-700 dark:text-slate-200">{att.original_name || 'Dosya'}</span>
                                <button
                                  type="button"
                                  onClick={() => void deleteHomeworkAttachment(hw.id, att.id)}
                                  disabled={deletingAttachmentId === att.id || editSaving}
                                  className="rounded-full border border-rose-300 px-2 py-0.5 text-rose-700 hover:bg-rose-50 disabled:opacity-60 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40"
                                >
                                  {deletingAttachmentId === att.id ? 'Siliniyor…' : 'Sil'}
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Ek yok.</p>
                        )}
                      </div>
                      <div className="rounded-lg border border-indigo-200/70 bg-indigo-50/40 p-2 dark:border-indigo-800/50 dark:bg-indigo-950/20">
                        <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-100">Yeni ekler</p>
                        {editPreviewItems.length > 0 ? (
                          <MediaSlider items={editPreviewItems} className="mt-1 h-36" alt="Ödev ek önizleme" fit="contain" />
                        ) : null}
                        <div className="mt-1 flex items-center justify-between">
                          <input
                            id={`edit-homework-files-${hw.id}`}
                            type="file"
                            multiple
                            onChange={(e) => appendEditFiles(Array.from(e.target.files || []))}
                            className="hidden"
                          />
                          <label htmlFor={`edit-homework-files-${hw.id}`} className="cursor-pointer text-xs font-semibold text-indigo-700 hover:text-indigo-500 dark:text-indigo-200">
                            + Dosya ekle
                          </label>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">Görsel 10 MB, döküman 20 MB</span>
                        </div>
                        {editFiles.length > 0 ? (
                          <ul className="mt-1 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                            {editFiles.map((f) => (
                              <li key={`${hw.id}-${f.name}-${f.size}-${f.lastModified}`} className="flex items-center justify-between gap-2">
                                <span className="truncate">
                                  {f.name} ({formatFileSize(f.size)})
                                </span>
                                <button
                                  type="button"
                                  onClick={() => removeEditFile(f)}
                                  className="rounded-full border border-rose-300 px-2 py-0.5 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40"
                                >
                                  Kaldır
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                      <div className="flex justify-end gap-2">
                        <KidsSecondaryButton type="button" onClick={cancelEditHomework} disabled={editSaving}>
                          Vazgeç
                        </KidsSecondaryButton>
                        <KidsPrimaryButton type="button" onClick={() => void saveEditHomework()} disabled={editSaving || !editTitle.trim()}>
                          {editSaving ? 'Kaydediliyor…' : 'Kaydet'}
                        </KidsPrimaryButton>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-slate-900 dark:text-white">{hw.title}</p>
                        <button
                          type="button"
                          onClick={() => startEditHomework(hw)}
                          className="rounded-full border border-indigo-300 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-700 dark:text-indigo-200 dark:hover:bg-indigo-900/40"
                        >
                          Düzenle
                        </button>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">{hw.description || 'Açıklama yok'}</p>
                      {hw.due_at ? (
                        <p className="mt-1 text-xs text-indigo-800/80 dark:text-indigo-200/80">
                          Son teslim: {new Date(hw.due_at).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                      ) : null}
                      {Array.isArray(hw.attachments) && hw.attachments.length > 0 ? (
                        <div className="mt-2">
                          <MediaSlider
                            items={hw.attachments.map((att) => ({
                              url: isImageAttachment(att.content_type, att.original_name) ? att.url : filePlaceholderUrl(att.original_name || 'dosya'),
                              type: 'image',
                            }))}
                            className="h-40"
                            alt={hw.title}
                            fit="contain"
                          />
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </KidsCard>
      </div>

      <KidsCard tone="amber" className="mt-6">
        <h2 className="font-logo text-lg font-bold text-amber-950 dark:text-amber-50">Veli onayı gelen ödevler</h2>
        <div className="mt-3 space-y-2">
          {inbox.length === 0 ? (
            <p className="text-sm text-amber-900/80 dark:text-amber-100/80">Bekleyen kayıt yok.</p>
          ) : (
            inbox.map((sub) => (
              <div key={sub.id} className="rounded-xl border border-amber-200/80 p-3 dark:border-amber-700/60">
                <p className="font-semibold text-slate-900 dark:text-white">{sub.homework.title}</p>
                <p className="text-xs text-slate-700 dark:text-slate-300">
                  {sub.student.first_name} {sub.student.last_name}
                </p>
                <div className="mt-2 flex gap-2">
                  <KidsPrimaryButton
                    type="button"
                    disabled={reviewingId !== null}
                    onClick={() => void reviewSubmission(sub.id, true)}
                  >
                    {reviewingId === sub.id ? '…' : 'Onayla'}
                  </KidsPrimaryButton>
                  <KidsSecondaryButton
                    type="button"
                    disabled={reviewingId !== null}
                    onClick={() => void reviewSubmission(sub.id, false)}
                  >
                    Düzeltme iste
                  </KidsSecondaryButton>
                </div>
              </div>
            ))
          )}
        </div>
      </KidsCard>
    </KidsPanelMax>
  );
}
