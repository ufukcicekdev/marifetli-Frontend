'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import {
  kidsCreateAnnouncement,
  kidsDeleteAnnouncementAttachment,
  kidsListClasses,
  kidsListAnnouncements,
  kidsPatchAnnouncement,
  kidsUploadAnnouncementAttachment,
  type KidsAnnouncement,
  type KidsClass,
} from '@/src/lib/kids-api';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';
import { KidsPrimaryButton, KidsSelect, kidsInputClass, kidsTextareaClass } from '@/src/components/kids/kids-ui';
import { MediaSlider } from '@/src/components/media-slider';
import type { MediaItem } from '@/src/lib/extract-media';

const ANNOUNCEMENT_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const ANNOUNCEMENT_DOCUMENT_MAX_BYTES = 20 * 1024 * 1024;

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
  const [rows, setRows] = useState<KidsAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [classes, setClasses] = useState<KidsClass[]>([]);
  const [classId, setClassId] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editFiles, setEditFiles] = useState<File[]>([]);
  const [editSaving, setEditSaving] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<number | null>(null);

  const canCreate = user?.role === 'teacher' || user?.role === 'admin';
  const selectedClassId = useMemo(() => Number(classId || 0), [classId]);

  async function load() {
    setLoading(true);
    try {
      const list = await kidsListAnnouncements();
      setRows(list);
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
      toast.error(e instanceof Error ? e.message : 'Duyurular yüklenemedi');
    } finally {
      setLoading(false);
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

  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const at = a.published_at ? new Date(a.published_at).getTime() : 0;
        const bt = b.published_at ? new Date(b.published_at).getTime() : 0;
        return bt - at;
      }),
    [rows],
  );

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
        rejected.push(`${f.name} (en fazla ${limitText})`);
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
      toast.error(`Boyut limiti aşıldı: ${rejected.join(', ')}`);
    }
    if (accepted.length > 0) {
      setFiles((prev) => [...prev, ...accepted]);
    }
  }

  function appendEditFiles(next: File[]) {
    if (next.length === 0) return;
    const { accepted, rejected } = filterFilesBySize(next);
    if (rejected.length > 0) {
      toast.error(`Boyut limiti aşıldı: ${rejected.join(', ')}`);
    }
    if (accepted.length > 0) {
      setEditFiles((prev) => [...prev, ...accepted]);
    }
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
    setEditingId(a.id);
    setEditTitle(a.title || '');
    setEditBody(a.body || '');
    setEditFiles([]);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle('');
    setEditBody('');
    setEditFiles([]);
  }

  async function onSaveEdit() {
    if (!editingId) return;
    const t = editTitle.trim();
    const b = editBody.trim();
    if (!t || !b) {
      toast.error('Başlık ve duyuru metni gerekli.');
      return;
    }
    setEditSaving(true);
    try {
      let latest = await kidsPatchAnnouncement(editingId, { title: t, body: b });
      if (editFiles.length > 0) {
        for (const f of editFiles) {
          latest = await kidsUploadAnnouncementAttachment(editingId, f);
        }
      }
      setRows((prev) => prev.map((row) => (row.id === latest.id ? latest : row)));
      toast.success('Duyuru güncellendi');
      cancelEdit();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Duyuru güncellenemedi');
    } finally {
      setEditSaving(false);
    }
  }

  async function onDeleteAttachment(announcementId: number, attachmentId: number) {
    setDeletingAttachmentId(attachmentId);
    try {
      const latest = await kidsDeleteAnnouncementAttachment(announcementId, attachmentId);
      setRows((prev) => prev.map((row) => (row.id === latest.id ? latest : row)));
      toast.success('Ek silindi');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ek silinemedi');
    } finally {
      setDeletingAttachmentId(null);
    }
  }

  async function onCreate() {
    const t = title.trim();
    const b = body.trim();
    if (!t || !b) return;
    if (!selectedClassId) {
      toast.error('Duyuru için sınıf seçmelisin.');
      return;
    }
    setSaving(true);
    try {
      const created = await kidsCreateAnnouncement({
        scope: 'class',
        kids_class: selectedClassId,
        title: t,
        body: b,
        is_published: true,
        target_role: 'all',
      });
      if (files.length > 0) {
        let latest = created;
        for (const f of files) {
          latest = await kidsUploadAnnouncementAttachment(created.id, f);
        }
        setRows((prev) => [latest, ...prev.filter((x) => x.id !== latest.id)]);
      }
      setTitle('');
      setBody('');
      setFiles([]);
      toast.success('Duyuru yayınlandı');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Duyuru oluşturulamadı');
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || !user) {
    return <p className="text-center text-sm text-violet-800 dark:text-violet-200">Yükleniyor…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="font-logo text-2xl font-bold text-violet-950 dark:text-violet-50">Duyurular</h1>
      {canCreate ? (
        <div className="space-y-2 rounded-2xl border-2 border-violet-200 bg-white/90 p-4 dark:border-violet-800 dark:bg-gray-900/70">
          <p className="text-sm font-semibold text-violet-900 dark:text-violet-100">Yeni duyuru</p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Başlık"
            className={kidsInputClass}
          />
          <textarea
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Duyuru metni"
            className={kidsTextareaClass}
          />
          <div className="space-y-1">
            <label className="text-sm font-semibold text-violet-900 dark:text-violet-100">Sınıf</label>
            <KidsSelect
              value={classId}
              onChange={setClassId}
              options={classes.map((c) => ({ value: String(c.id), label: c.name }))}
            />
            {classes.length === 0 ? (
              <p className="text-xs text-amber-700 dark:text-amber-300">Önce bir sınıfa atanmalısın.</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-violet-900 dark:text-violet-100">Dosya ekleri</label>
            {files.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-violet-300/80 bg-violet-50/30 p-5 text-center dark:border-violet-700 dark:bg-violet-950/20">
                <input
                  id="announcement-files"
                  type="file"
                  multiple
                  onChange={(e) => appendFiles(Array.from(e.target.files || []))}
                  className="hidden"
                />
                <label htmlFor="announcement-files" className="cursor-pointer text-sm font-medium text-violet-800 dark:text-violet-100">
                  Görsel / dosya eklemek için tıklayın
                </label>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Birden fazla görsel veya döküman ekleyebilirsiniz. Görsel: en fazla 10 MB, döküman: en fazla 20 MB.
                </p>
              </div>
            ) : (
              <div className="space-y-2 rounded-xl border border-violet-200/80 bg-violet-50/30 p-3 dark:border-violet-800/60 dark:bg-violet-950/20">
                {uploadPreviewItems.length > 0 ? (
                  <div className="space-y-2">
                    <MediaSlider items={uploadPreviewItems} className="h-52" alt="Duyuru dosya önizleme" fit="contain" />
                    <div className="flex justify-end">
                      <input
                        id="announcement-files-more"
                        type="file"
                        multiple
                        onChange={(e) => appendFiles(Array.from(e.target.files || []))}
                        className="hidden"
                      />
                      <label htmlFor="announcement-files-more" className="cursor-pointer text-xs font-semibold text-violet-700 hover:text-violet-500 dark:text-violet-200">
                        + Dosya ekle
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="rounded-lg border border-violet-200/80 bg-white p-3 text-xs text-slate-500 dark:border-violet-800/60 dark:bg-slate-900 dark:text-slate-300">
                      Görsel yok, sadece doküman eklenmiş.
                    </div>
                    <div className="flex justify-end">
                      <input
                        id="announcement-files-more"
                        type="file"
                        multiple
                        onChange={(e) => appendFiles(Array.from(e.target.files || []))}
                        className="hidden"
                      />
                      <label htmlFor="announcement-files-more" className="cursor-pointer text-xs font-semibold text-violet-700 hover:text-violet-500 dark:text-violet-200">
                        + Dosya ekle
                      </label>
                    </div>
                  </div>
                )}
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
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <KidsPrimaryButton
              type="button"
              onClick={() => void onCreate()}
              disabled={saving || !title.trim() || !body.trim() || !selectedClassId}
            >
              {saving ? 'Yayınlanıyor…' : 'Yayınla'}
            </KidsPrimaryButton>
          </div>
        </div>
      ) : null}
      {loading ? <p className="text-sm text-slate-500">Yükleniyor…</p> : null}
      {!loading && sorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-violet-300 bg-violet-50/50 p-6 text-sm text-violet-900 dark:border-violet-800 dark:bg-violet-950/20 dark:text-violet-100">
          Henüz duyuru yok.
        </div>
      ) : null}
      <ul className="space-y-2">
        {sorted.map((a) => (
          <li key={a.id} className="rounded-2xl border-2 border-violet-200 bg-white/90 px-4 py-3 dark:border-violet-800 dark:bg-gray-900/70">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-violet-950 dark:text-violet-100">
                {editingId === a.id ? 'Duyuru düzenleniyor' : a.title}
              </p>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {a.published_at
                  ? new Date(a.published_at).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })
                  : 'Taslak'}
              </span>
            </div>
            {canCreate && editingId !== a.id ? (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => startEdit(a)}
                  className="rounded-full border border-violet-300 px-2.5 py-0.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 dark:border-violet-700 dark:text-violet-200 dark:hover:bg-violet-900/40"
                >
                  Düzenle
                </button>
              </div>
            ) : null}
            {editingId === a.id ? (
              <div className="mt-3 space-y-2 rounded-xl border border-violet-200/80 bg-violet-50/40 p-3 dark:border-violet-800/60 dark:bg-violet-950/25">
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Başlık"
                  className={kidsInputClass}
                />
                <textarea
                  rows={3}
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  placeholder="Duyuru metni"
                  className={kidsTextareaClass}
                />
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-violet-900/90 dark:text-violet-100/90">Yeni dosya ekleri</p>
                  {Array.isArray(a.attachments) && a.attachments.length > 0 ? (
                    <ul className="space-y-2 rounded-lg border border-violet-200/70 bg-white/70 p-2 dark:border-violet-800/50 dark:bg-slate-900/60">
                      {a.attachments.map((att) => (
                        <li key={`edit-att-${att.id}`} className="flex items-center justify-between gap-2 text-xs">
                          <span className="truncate text-slate-700 dark:text-slate-200">
                            {att.original_name || 'Dosya'}
                            {att.size_bytes ? ` (${formatFileSize(att.size_bytes)})` : ''}
                          </span>
                          <button
                            type="button"
                            onClick={() => void onDeleteAttachment(a.id, att.id)}
                            disabled={deletingAttachmentId === att.id || editSaving}
                            className="rounded-full border border-rose-300 px-2 py-0.5 text-rose-700 hover:bg-rose-50 disabled:opacity-60 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40"
                          >
                            {deletingAttachmentId === att.id ? 'Siliniyor…' : 'Mevcut eki sil'}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400">Bu duyuruda mevcut ek yok.</p>
                  )}
                  {editPreviewItems.length > 0 ? (
                    <MediaSlider items={editPreviewItems} className="h-48" alt="Duyuru düzenleme önizleme" fit="contain" />
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
                      + Dosya ekle
                    </label>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Görsel 10 MB, döküman 20 MB</span>
                  </div>
                  {editFiles.length > 0 ? (
                    <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                      {editFiles.map((f) => (
                        <li key={`${a.id}-${f.name}-${f.size}-${f.lastModified}`} className="flex items-center justify-between gap-2">
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
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={editSaving}
                    className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Vazgeç
                  </button>
                  <KidsPrimaryButton
                    type="button"
                    onClick={() => void onSaveEdit()}
                    disabled={editSaving || !editTitle.trim() || !editBody.trim()}
                  >
                    {editSaving ? 'Kaydediliyor…' : 'Kaydet'}
                  </KidsPrimaryButton>
                </div>
              </div>
            ) : (
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{a.body}</p>
            )}
            {Array.isArray(a.attachments) && a.attachments.length > 0 ? (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-semibold text-violet-900/90 dark:text-violet-100/90">Ekler</p>
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
                        <MediaSlider items={sliderItems} className="h-64" alt={a.title || 'Duyuru eki'} fit="contain" />
                      ) : null}
                      {docItems.length > 0 ? (
                        <ul className="space-y-2">
                          {docItems.map((att) => (
                            <li key={att.id} className="rounded-xl border border-violet-200/80 bg-violet-50/50 p-2 dark:border-violet-800/60 dark:bg-violet-950/30">
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                                <span className="font-medium text-slate-700 dark:text-slate-200">{att.original_name || 'Dosya'}</span>
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
                                  Gör / İndir
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
        ))}
      </ul>
    </div>
  );
}
