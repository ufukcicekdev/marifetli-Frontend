'use client';

import type { LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calculator,
  ChevronRight,
  ClipboardList,
  Download,
  Eye,
  FileImage,
  FileText,
  FlaskConical,
  FolderOpen,
  FolderPlus,
  GraduationCap,
  LayoutGrid,
  List,
  MoreVertical,
  Pencil,
  ScrollText,
  Trash2,
  Upload,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';
import {
  kidsBrowseClassDocuments,
  kidsCreateClassDocumentFolder,
  kidsDeleteClassDocument,
  kidsDeleteClassDocumentFolder,
  kidsDistributeClassDocuments,
  kidsListClassDocumentFolders,
  kidsListClasses,
  kidsPatchClassDocument,
  kidsTeacherFoldersOverview,
  kidsTeacherRecentDocuments,
  type KidsClass,
  type KidsClassDocument,
  type KidsClassDocumentBrowseRow,
  type KidsClassDocumentFolder,
  type KidsTeacherFolderGrouped,
} from '@/src/lib/kids-api';
import {
  KidsCenteredModal,
  KidsPanelMax,
  KidsPrimaryButton,
  KidsSecondaryButton,
  KidsSelect,
  kidsInputClass,
  kidsTextareaClass,
  type KidsSelectOption,
} from '@/src/components/kids/kids-ui';
import { useKidsI18n } from '@/src/providers/kids-language-provider';

const MAX_BYTES = 20 * 1024 * 1024;

function localeForLang(lang: string): string {
  if (lang === 'en') return 'en-GB';
  if (lang === 'ge') return 'de-DE';
  return 'tr-TR';
}

function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v < 10 && i > 0 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

function formatDocumentAgo(iso: string, t: (k: string) => string, lang: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  const now = Date.now();
  const diffMs = Math.max(0, now - d.getTime());
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return t('lessonDocs.justNow');
  if (min < 60) return t('lessonDocs.minutesAgo').replace('{n}', String(min));
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return t('lessonDocs.hoursAgo').replace('{n}', String(hrs));

  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  const startYesterday = new Date(startToday);
  startYesterday.setDate(startYesterday.getDate() - 1);
  if (d >= startYesterday && d < startToday) {
    const time = d.toLocaleTimeString(localeForLang(lang), { hour: '2-digit', minute: '2-digit' });
    return t('lessonDocs.yesterdayTime').replace('{time}', time);
  }
  const days = Math.max(1, Math.floor(min / 1440));
  return t('lessonDocs.daysAgo').replace('{n}', String(days));
}

function formatDocDate(iso: string, lang: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  return d.toLocaleDateString(localeForLang(lang), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function typeLabel(kind: string, t: (k: string) => string): string {
  if (kind === 'pdf') return t('lessonDocs.typePdf');
  if (kind === 'word') return t('lessonDocs.typeWord');
  if (kind === 'image') return t('lessonDocs.typeImage');
  if (kind === 'presentation') return t('lessonDocs.typePresentation');
  return t('lessonDocs.typeFile');
}

function TypeIcon({ kind }: { kind: string }) {
  const cls = 'h-5 w-5 text-white';
  if (kind === 'pdf') return <FileText className={cls} aria-hidden />;
  if (kind === 'word') return <FileText className={cls} aria-hidden />;
  if (kind === 'image') return <FileImage className={cls} aria-hidden />;
  if (kind === 'presentation') return <FileText className={cls} aria-hidden />;
  return <FileText className={cls} aria-hidden />;
}

function iconBg(kind: string): string {
  if (kind === 'pdf') return 'bg-rose-500';
  if (kind === 'word') return 'bg-blue-600';
  if (kind === 'image') return 'bg-amber-500';
  if (kind === 'presentation') return 'bg-violet-600';
  return 'bg-fuchsia-500';
}

function folderCardVisual(name: string): { wrap: string; Icon: LucideIcon } {
  const n = name.toLowerCase();
  if (/math|matemat|algebra|sayı|sayi|geometr/.test(n))
    return { wrap: 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-200', Icon: Calculator };
  if (/science|fen|bilim|kimya|fizik|biyoloji/.test(n))
    return { wrap: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-200', Icon: FlaskConical };
  if (/homework|ödev|odev|assignment|etkinlik/.test(n))
    return { wrap: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-100', Icon: ClipboardList };
  if (/exam|sınav|sinav|quiz|test|ölçek|olcek/.test(n))
    return { wrap: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-200', Icon: ScrollText };
  return { wrap: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/40 dark:text-fuchsia-200', Icon: FolderOpen };
}

function docRowKey(doc: KidsClassDocument): string {
  return `${doc.id}-${doc.kids_class}`;
}

function SectionHeading({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="h-8 w-1 shrink-0 rounded-full bg-gradient-to-b from-violet-500 to-fuchsia-500" />
        <h2 className="truncate text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

export default function KidsTeacherLessonDocumentsPage() {
  const router = useRouter();
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();
  const { t, language } = useKidsI18n();
  const [classes, setClasses] = useState<KidsClass[]>([]);
  const [recent, setRecent] = useState<KidsClassDocument[]>([]);
  const [groupedFolders, setGroupedFolders] = useState<KidsTeacherFolderGrouped[]>([]);
  const [flatFolders, setFlatFolders] = useState<
    { id: number; kids_class_id: number; class_name: string; name: string; document_count: number; total_size_bytes: number }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [folderName, setFolderName] = useState('');
  const [folderSuggestions, setFolderSuggestions] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [editDoc, setEditDoc] = useState<KidsClassDocument | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editFolders, setEditFolders] = useState<KidsClassDocumentFolder[]>([]);
  const [editFolderId, setEditFolderId] = useState<string>('');
  const [editNewFolderName, setEditNewFolderName] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadStep, setUploadStep] = useState<1 | 2>(1);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [allFoldersOpen, setAllFoldersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [docMenuKey, setDocMenuKey] = useState<string | null>(null);
  const [newFolderNameInput, setNewFolderNameInput] = useState('');
  const [browseClassId, setBrowseClassId] = useState<number | null>(null);
  const [browseFolderId, setBrowseFolderId] = useState<number | null>(null);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseBreadcrumbs, setBrowseBreadcrumbs] = useState<{ id: number | null; name: string }[]>([]);
  const [browseFolders, setBrowseFolders] = useState<KidsClassDocumentBrowseRow[]>([]);
  const [browseDocuments, setBrowseDocuments] = useState<KidsClassDocument[]>([]);
  const [subfolderOpen, setSubfolderOpen] = useState(false);
  const [subfolderName, setSubfolderName] = useState('');
  const [savingSubfolder, setSavingSubfolder] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cl, rec, overview] = await Promise.all([
        kidsListClasses(),
        kidsTeacherRecentDocuments(80),
        kidsTeacherFoldersOverview(),
      ]);
      setClasses(cl);
      setRecent(rec);
      setGroupedFolders(overview.grouped);
      setFlatFolders(overview.flat);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('lessonDocs.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!uploadOpen || classes.length === 0) {
      if (!uploadOpen) setFolderSuggestions([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const lists = await Promise.all(classes.map((c) => kidsListClassDocumentFolders(c.id)));
        const names = new Set<string>();
        for (const list of lists) {
          for (const f of list) names.add(f.name);
        }
        if (!cancelled) {
          setFolderSuggestions([...names].sort((a, b) => a.localeCompare(b, 'tr')));
        }
      } catch {
        if (!cancelled) setFolderSuggestions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uploadOpen, classes]);

  useEffect(() => {
    if (!editDoc) {
      setEditFolders([]);
      return;
    }
    let cancelled = false;
    void kidsListClassDocumentFolders(editDoc.kids_class)
      .then((list) => {
        if (!cancelled) setEditFolders(list);
      })
      .catch(() => {
        if (!cancelled) setEditFolders([]);
      });
    return () => {
      cancelled = true;
    };
  }, [editDoc]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      router.replace(kidsLoginPortalHref(pathPrefix, 'ogretmen'));
      return;
    }
    void load();
  }, [authLoading, user, router, pathPrefix, load]);

  useEffect(() => {
    if (!docMenuKey) return;
    const onDown = () => setDocMenuKey(null);
    const id = window.setTimeout(() => window.addEventListener('click', onDown), 0);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('click', onDown);
    };
  }, [docMenuKey]);

  useEffect(() => {
    if (classes.length > 0 && browseClassId == null) {
      setBrowseClassId(classes[0].id);
    }
  }, [classes, browseClassId]);

  useEffect(() => {
    setBrowseFolderId(null);
  }, [browseClassId]);

  const refreshBrowse = useCallback(
    async (folderIdOverride?: number | null) => {
      if (browseClassId == null) return;
      const fid = folderIdOverride !== undefined ? folderIdOverride : browseFolderId;
      setBrowseLoading(true);
      try {
        const data = await kidsBrowseClassDocuments(browseClassId, fid);
        setBrowseBreadcrumbs(data.breadcrumbs);
        setBrowseFolders(data.folders);
        setBrowseDocuments(data.documents);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t('lessonDocs.loadFailed'));
      } finally {
        setBrowseLoading(false);
      }
    },
    [browseClassId, browseFolderId, t],
  );

  useEffect(() => {
    void refreshBrowse();
  }, [refreshBrowse]);

  function openUploadModal() {
    setUploadStep(1);
    if (browseClassId != null) {
      setSelectedIds(new Set([browseClassId]));
    }
    const path = browseBreadcrumbs
      .map((b) => b.name.trim())
      .filter(Boolean)
      .join('/');
    setFolderName(path);
    setUploadOpen(true);
  }

  async function openGroupedFolder(name: string) {
    if (browseClassId == null) return;
    try {
      const root = await kidsBrowseClassDocuments(browseClassId, null);
      const hit = root.folders.find((f) => f.name === name);
      if (hit) {
        setBrowseFolderId(hit.id);
      } else {
        toast.error(t('lessonDocs.folderNotInClass'));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('lessonDocs.loadFailed'));
    }
  }

  async function createSubfolder() {
    if (browseClassId == null || !subfolderName.trim()) {
      toast.error(t('lessonDocs.newFolderNameRequired'));
      return;
    }
    setSavingSubfolder(true);
    try {
      await kidsCreateClassDocumentFolder(browseClassId, subfolderName.trim(), {
        parentId: browseFolderId ?? undefined,
      });
      toast.success(t('lessonDocs.subfolderCreated'));
      setSubfolderOpen(false);
      setSubfolderName('');
      await load();
      await refreshBrowse();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('lessonDocs.failed'));
    } finally {
      setSavingSubfolder(false);
    }
  }

  async function removeBrowseFolder(folderId: number) {
    if (browseClassId == null) return;
    if (!window.confirm(t('lessonDocs.deleteFolderConfirmCascade'))) return;
    let parentAfterDelete: number | null | undefined;
    if (folderId === browseFolderId) {
      if (browseBreadcrumbs.length <= 2) parentAfterDelete = null;
      else {
        const p = browseBreadcrumbs[browseBreadcrumbs.length - 2];
        parentAfterDelete = p.id;
      }
    }
    try {
      await kidsDeleteClassDocumentFolder(browseClassId, folderId, { cascade: true });
      toast.success(t('lessonDocs.folderDeleted'));
      const isCurrent = folderId === browseFolderId;
      if (isCurrent && parentAfterDelete !== undefined) {
        setBrowseFolderId(parentAfterDelete);
      }
      await load();
      await refreshBrowse(isCurrent && parentAfterDelete !== undefined ? parentAfterDelete : undefined);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('lessonDocs.failed'));
    }
  }

  function toggleClass(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onPickFiles(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    if (f.size > MAX_BYTES) {
      toast.error(t('lessonDocs.dropzoneHint'));
      return;
    }
    setFile(f);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error(t('lessonDocs.titleRequired'));
      return;
    }
    if (!file) {
      toast.error(t('lessonDocs.fileRequired'));
      return;
    }
    if (sortedClasses.length === 0) {
      toast.error(t('lessonDocs.noClassesAssigned'));
      return;
    }
    const ids = [...selectedIds];
    if (ids.length === 0) {
      toast.error(t('lessonDocs.selectClassHint'));
      return;
    }
    setSending(true);
    try {
      await kidsDistributeClassDocuments({
        title: title.trim(),
        description: description.trim(),
        class_ids: ids,
        file,
        folder_path: folderName.trim() || undefined,
      });
      toast.success(t('lessonDocs.success'));
      setTitle('');
      setDescription('');
      setFolderName('');
      setFile(null);
      setSelectedIds(new Set());
      setUploadStep(1);
      if (fileRef.current) fileRef.current.value = '';
      setUploadOpen(false);
      await load();
      await refreshBrowse();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('lessonDocs.failed'));
    } finally {
      setSending(false);
    }
  }

  async function saveEdit() {
    if (!editDoc) return;
    setSavingEdit(true);
    try {
      const newFolder = editNewFolderName.trim();
      const payload: Parameters<typeof kidsPatchClassDocument>[2] = {
        title: editTitle.trim(),
        description: editDescription.trim(),
      };
      if (newFolder) payload.folder_name = newFolder;
      else payload.folder_id = editFolderId ? Number(editFolderId) : null;
      await kidsPatchClassDocument(editDoc.kids_class, editDoc.id, payload);
      toast.success(t('lessonDocs.saved'));
      setEditDoc(null);
      await load();
      await refreshBrowse();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('lessonDocs.saveFailed'));
    } finally {
      setSavingEdit(false);
    }
  }

  async function removeDoc(doc: KidsClassDocument) {
    if (!window.confirm(t('lessonDocs.deleteConfirm'))) return;
    try {
      await kidsDeleteClassDocument(doc.kids_class, doc.id);
      toast.success(t('lessonDocs.deleted'));
      setDocMenuKey(null);
      await load();
      await refreshBrowse();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('lessonDocs.failed'));
    }
  }

  function closeUploadModal() {
    setUploadOpen(false);
    setUploadStep(1);
    setTitle('');
    setDescription('');
    setFolderName('');
    setFile(null);
    setSelectedIds(new Set());
    setDrag(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  function goToUploadStep2() {
    if (!title.trim()) {
      toast.error(t('lessonDocs.titleRequired'));
      return;
    }
    if (!file) {
      toast.error(t('lessonDocs.fileRequired'));
      return;
    }
    setUploadStep(2);
  }

  function openNewFolderModal() {
    setNewFolderNameInput('');
    setNewFolderOpen(true);
  }

  function closeNewFolderModal() {
    setNewFolderOpen(false);
    setNewFolderNameInput('');
  }

  function continueNewFolderToUpload() {
    const name = newFolderNameInput.trim();
    if (!name) {
      toast.error(t('lessonDocs.newFolderNameRequired'));
      return;
    }
    closeNewFolderModal();
    setUploadStep(1);
    if (browseClassId != null) {
      setSelectedIds(new Set([browseClassId]));
    } else {
      setSelectedIds(new Set());
    }
    setFolderName(name);
    setUploadOpen(true);
  }

  const sortedClasses = useMemo(
    () => [...classes].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr')),
    [classes],
  );

  const browseClassOptions = useMemo<KidsSelectOption[]>(
    () => sortedClasses.map((c) => ({ value: String(c.id), label: c.name?.trim() || '—' })),
    [sortedClasses],
  );

  const browseClassSelectValue =
    browseClassId != null
      ? String(browseClassId)
      : sortedClasses[0]
        ? String(sortedClasses[0].id)
        : '';

  if (authLoading || loading) {
    return (
      <KidsPanelMax>
        <p className="py-12 text-center text-sm text-slate-600 dark:text-slate-400">{t('common.loading')}</p>
      </KidsPanelMax>
    );
  }
  if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
    return null;
  }

  return (
    <KidsPanelMax className="relative">
      <header className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <h1 className="font-logo text-2xl font-bold text-violet-950 dark:text-violet-50 md:text-3xl">
            {t('lessonDocs.title')}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {t('lessonDocs.pageSubtitle')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => openNewFolderModal()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-violet-900 shadow-sm transition hover:border-violet-300 hover:bg-violet-50 dark:border-slate-600 dark:bg-gray-800 dark:text-violet-100 dark:hover:border-violet-600"
          >
            <FolderPlus className="h-5 w-5 text-violet-600" strokeWidth={1.75} />
            {t('lessonDocs.newFolderBtn')}
          </button>
          <button
            type="button"
            onClick={() => openUploadModal()}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-fuchsia-500/25 transition hover:from-violet-500 hover:to-fuchsia-500"
          >
            <Upload className="h-5 w-5" strokeWidth={1.75} />
            {t('lessonDocs.uploadFileBtn')}
          </button>
        </div>
      </header>

      <section className="mb-12">
        <SectionHeading
          title={t('lessonDocs.smartFolders')}
          right={
            <button
              type="button"
              onClick={() => setAllFoldersOpen(true)}
              className="text-sm font-semibold text-violet-600 hover:text-violet-800 dark:text-violet-300 dark:hover:text-violet-100"
            >
              {t('lessonDocs.viewAllFolders')}
            </button>
          }
        />
        {groupedFolders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/30 px-6 py-12 text-center text-sm text-slate-600 dark:border-violet-800 dark:bg-violet-950/20 dark:text-slate-400">
            {t('lessonDocs.emptyFoldersHint')}
          </div>
        ) : (
          <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {groupedFolders.map((g) => {
              const { wrap, Icon } = folderCardVisual(g.name);
              const visible = g.class_names.slice(0, 3);
              const more = Math.max(0, g.class_names.length - 3);
              return (
                <button
                  key={g.name}
                  type="button"
                  onClick={() => void openGroupedFolder(g.name)}
                  className="w-[min(100%,260px)] shrink-0 snap-start rounded-2xl border border-violet-100 bg-white p-5 text-left shadow-md transition hover:border-violet-300 hover:shadow-lg dark:border-violet-900/40 dark:bg-gray-900/70 dark:hover:border-violet-600"
                >
                  <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${wrap}`}>
                    <Icon className="h-7 w-7" strokeWidth={1.5} aria-hidden />
                  </div>
                  <p className="mt-4 text-center font-bold text-slate-900 dark:text-white">{g.name}</p>
                  <p className="mt-1 text-center text-xs text-slate-500 dark:text-slate-400">
                    {t('lessonDocs.folderStats')
                      .replace('{count}', String(g.document_count))
                      .replace('{size}', formatBytes(g.total_size_bytes))}
                  </p>
                  <p className="mt-2 text-center text-[10px] font-semibold text-violet-600 dark:text-violet-400">
                    {t('lessonDocs.openFolderBrowse')}
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-0">
                    <div className="flex -space-x-2">
                      {visible.map((cn) => (
                        <div
                          key={cn}
                          title={cn}
                          className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-violet-200 to-fuchsia-200 text-[10px] font-bold text-violet-900 dark:border-gray-900 dark:from-violet-800 dark:to-fuchsia-900 dark:text-violet-100"
                        >
                          {(cn || '?').slice(0, 2).toUpperCase()}
                        </div>
                      ))}
                      {more > 0 ? (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-[10px] font-bold text-slate-700 dark:border-gray-900 dark:bg-slate-700 dark:text-slate-200">
                          {t('lessonDocs.classesMore').replace('{n}', String(more))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-10 rounded-2xl border border-violet-100 bg-white p-5 shadow-sm dark:border-violet-900/40 dark:bg-gray-900/50">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="block min-w-0 flex-1">
              <label
                htmlFor="lesson-docs-browse-class"
                className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300"
              >
                <GraduationCap className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {t('lessonDocs.browsePickClass')}
              </label>
              {sortedClasses.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t('lessonDocs.noClassesAssigned')}</p>
              ) : (
                <div className="mt-1.5">
                  <KidsSelect
                    id="lesson-docs-browse-class"
                    value={browseClassSelectValue}
                    onChange={(v) => setBrowseClassId(Number(v))}
                    options={browseClassOptions}
                    searchable={browseClassOptions.length > 8}
                    panelMaxHeightPx={280}
                  />
                </div>
              )}
            </div>
            <button
              type="button"
              disabled={browseClassId == null}
              onClick={() => {
                setSubfolderName('');
                setSubfolderOpen(true);
              }}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-bold text-violet-900 shadow-sm transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-100 dark:hover:bg-violet-900/50"
            >
              <FolderPlus className="h-5 w-5 text-violet-600 dark:text-violet-300" strokeWidth={1.75} />
              {t('lessonDocs.newSubfolderBtn')}
            </button>
          </div>

          {browseClassId != null ? (
            <>
              <nav
                className="mt-4 flex flex-wrap items-center gap-1 text-sm"
                aria-label={t('lessonDocs.breadcrumbNav')}
              >
                {browseBreadcrumbs.map((cr, idx) => {
                  const isRoot = cr.id == null && !cr.name.trim();
                  const label = isRoot ? t('lessonDocs.browseRoot') : cr.name;
                  const targetId = isRoot ? null : cr.id;
                  const isLast = idx === browseBreadcrumbs.length - 1;
                  return (
                    <span key={`${idx}-${label}`} className="flex items-center gap-1">
                      {idx > 0 ? <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden /> : null}
                      <button
                        type="button"
                        onClick={() => setBrowseFolderId(targetId)}
                        className={`max-w-[12rem] truncate rounded-lg px-2 py-1 font-semibold transition ${
                          isLast
                            ? 'text-violet-900 dark:text-violet-100'
                            : 'text-violet-600 hover:bg-violet-50 hover:text-violet-800 dark:text-violet-300 dark:hover:bg-violet-950/50 dark:hover:text-violet-100'
                        }`}
                      >
                        {label}
                      </button>
                    </span>
                  );
                })}
              </nav>

              {browseFolderId != null ? (
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void removeBrowseFolder(browseFolderId)}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-rose-600 transition hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                    {t('lessonDocs.deleteCurrentFolder')}
                  </button>
                </div>
              ) : null}

              {browseLoading ? (
                <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">{t('common.loading')}</p>
              ) : (
                <>
                  {browseFolders.length > 0 ? (
                    <div className="mt-6">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {t('lessonDocs.subfoldersHeading')}
                      </p>
                      <ul className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {browseFolders.map((f) => {
                          const { wrap, Icon } = folderCardVisual(f.name);
                          return (
                            <li key={f.id} className="flex min-w-0 gap-2">
                              <button
                                type="button"
                                onClick={() => setBrowseFolderId(f.id)}
                                className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-4 text-left shadow-sm transition hover:border-violet-200 hover:bg-white dark:border-slate-700 dark:bg-gray-800/80 dark:hover:border-violet-700 dark:hover:bg-gray-900"
                              >
                                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${wrap}`}>
                                  <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate font-bold text-slate-900 dark:text-white">{f.name}</p>
                                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                    {t('lessonDocs.subfolderStats')
                                      .replace('{sub}', String(f.subfolder_count))
                                      .replace('{files}', String(f.document_count))}
                                  </p>
                                </div>
                                <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
                              </button>
                              <button
                                type="button"
                                title={t('lessonDocs.deleteFolder')}
                                onClick={() => void removeBrowseFolder(f.id)}
                                className="flex shrink-0 items-center justify-center self-stretch rounded-xl border border-slate-100 bg-white px-3 text-rose-600 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 dark:border-slate-700 dark:bg-gray-900 dark:hover:border-rose-900 dark:hover:bg-rose-950/40"
                              >
                                <Trash2 className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : null}

                  {browseDocuments.length > 0 ? (
                    <div className="mt-6">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {t('lessonDocs.filesInFolder')}
                      </p>
                      <ul className="mt-2 space-y-2">
                        {browseDocuments.map((doc) => {
                          const k = docRowKey(doc);
                          const displayName = doc.original_name?.trim() || doc.title;
                          const folderMeta =
                            doc.folder_path?.trim() || doc.folder_name?.trim() || t('lessonDocs.noFolder');
                          return (
                            <li
                              key={k}
                              className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5 shadow-sm dark:border-slate-700/80 dark:bg-gray-900/60"
                            >
                              <div
                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg(doc.file_kind)}`}
                              >
                                <TypeIcon kind={doc.file_kind} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                  {displayName}
                                </p>
                                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{folderMeta}</p>
                              </div>
                              <a
                                href={doc.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-lg p-2 text-slate-500 transition hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-950/50 dark:hover:text-violet-200"
                                title={t('lessonDocs.preview')}
                              >
                                <Eye className="h-5 w-5" aria-hidden />
                              </a>
                              <button
                                type="button"
                                title={t('lessonDocs.edit')}
                                onClick={() => {
                                  setEditDoc(doc);
                                  setEditTitle(doc.title);
                                  setEditDescription(doc.description || '');
                                  setEditFolderId(doc.folder_id != null ? String(doc.folder_id) : '');
                                  setEditNewFolderName('');
                                }}
                                className="rounded-lg p-2 text-slate-500 transition hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-950/50 dark:hover:text-violet-200"
                              >
                                <Pencil className="h-5 w-5" aria-hidden />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : null}

                  {browseFolders.length === 0 && browseDocuments.length === 0 ? (
                    <div className="mt-8 rounded-xl border border-dashed border-violet-200 py-10 text-center text-sm text-slate-500 dark:border-violet-800 dark:text-slate-400">
                      {t('lessonDocs.browseEmptyFolder')}
                    </div>
                  ) : null}
                </>
              )}
            </>
          ) : null}
        </div>
      </section>

      <section>
        <SectionHeading
          title={t('lessonDocs.recentSection')}
          right={
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-600 dark:bg-gray-800/80">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                title={t('lessonDocs.viewGrid')}
                className={`rounded-lg p-2 transition ${
                  viewMode === 'grid'
                    ? 'bg-white text-violet-600 shadow-sm dark:bg-gray-900 dark:text-violet-300'
                    : 'text-slate-500 hover:text-violet-600 dark:text-slate-400'
                }`}
              >
                <LayoutGrid className="h-5 w-5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                title={t('lessonDocs.viewList')}
                className={`rounded-lg p-2 transition ${
                  viewMode === 'list'
                    ? 'bg-white text-violet-600 shadow-sm dark:bg-gray-900 dark:text-violet-300'
                    : 'text-slate-500 hover:text-violet-600 dark:text-slate-400'
                }`}
              >
                <List className="h-5 w-5" aria-hidden />
              </button>
            </div>
          }
        />

        {recent.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-violet-200 py-16 text-center text-sm text-slate-500 dark:border-violet-800 dark:text-slate-400">
            {t('lessonDocs.emptyTeacher')}
          </div>
        ) : viewMode === 'list' ? (
          <ul className="space-y-2">
            {recent.map((doc) => {
              const k = docRowKey(doc);
              const displayName = doc.original_name?.trim() || doc.title;
              const meta = [
                doc.folder_path?.trim() || doc.folder_name?.trim() || t('lessonDocs.noFolder'),
                formatBytes(doc.size_bytes),
                formatDocDate(doc.created_at, language),
              ].join(' • ');
              return (
                <li
                  key={k}
                  className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm dark:border-slate-700/80 dark:bg-gray-900/60"
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg(doc.file_kind)}`}
                  >
                    <TypeIcon kind={doc.file_kind} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900 dark:text-white">{displayName}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">{meta}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      {typeLabel(doc.file_kind, t)} · {formatDocumentAgo(doc.created_at, t, language)} ·{' '}
                      {doc.class_name}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {t('lessonDocs.distributed')}
                  </span>
                  <div className="relative flex shrink-0 items-center gap-1">
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg p-2 text-slate-500 transition hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-950/50 dark:hover:text-violet-200"
                      title={t('lessonDocs.preview')}
                    >
                      <Eye className="h-5 w-5" aria-hidden />
                    </a>
                    <button
                      type="button"
                      title={t('lessonDocs.docMenu')}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDocMenuKey((prev) => (prev === k ? null : k));
                      }}
                      className="rounded-lg p-2 text-slate-500 transition hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-950/50 dark:hover:text-violet-200"
                    >
                      <MoreVertical className="h-5 w-5" aria-hidden />
                    </button>
                    {docMenuKey === k ? (
                      <div
                        className="absolute right-0 top-full z-30 mt-1 min-w-[10rem] rounded-xl border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-600 dark:bg-gray-900"
                        onClick={(e) => e.stopPropagation()}
                        role="menu"
                      >
                        <button
                          type="button"
                          role="menuitem"
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-violet-50 dark:text-slate-200 dark:hover:bg-violet-950/50"
                          onClick={() => {
                            setDocMenuKey(null);
                            setEditDoc(doc);
                            setEditTitle(doc.title);
                            setEditDescription(doc.description || '');
                            setEditFolderId(doc.folder_id != null ? String(doc.folder_id) : '');
                            setEditNewFolderName('');
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                          {t('lessonDocs.edit')}
                        </button>
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noreferrer"
                          role="menuitem"
                          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-violet-50 dark:text-slate-200 dark:hover:bg-violet-950/50"
                          onClick={() => setDocMenuKey(null)}
                        >
                          <Download className="h-4 w-4" />
                          {t('lessonDocs.download')}
                        </a>
                        <button
                          type="button"
                          role="menuitem"
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/30"
                          onClick={() => void removeDoc(doc)}
                        >
                          <Trash2 className="h-4 w-4" />
                          {t('lessonDocs.delete')}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {recent.map((doc) => {
              const k = docRowKey(doc);
              const displayName = doc.original_name?.trim() || doc.title;
              return (
                <li
                  key={k}
                  className="flex flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-gray-900/60"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconBg(doc.file_kind)}`}
                    >
                      <TypeIcon kind={doc.file_kind} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 font-semibold text-slate-900 dark:text-white">{displayName}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{doc.class_name}</p>
                    </div>
                  </div>
                  <span className="mt-3 inline-flex w-fit items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                    {t('lessonDocs.distributed')}
                  </span>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-full border border-violet-200 py-2 text-xs font-bold text-violet-800 dark:border-violet-700 dark:text-violet-200"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      {t('lessonDocs.preview')}
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setEditDoc(doc);
                        setEditTitle(doc.title);
                        setEditDescription(doc.description || '');
                        setEditFolderId(doc.folder_id != null ? String(doc.folder_id) : '');
                        setEditNewFolderName('');
                      }}
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-full border border-slate-200 py-2 text-xs font-bold text-slate-700 dark:border-slate-600 dark:text-slate-200"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      {t('lessonDocs.edit')}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {uploadOpen ? (
        <KidsCenteredModal
          title={
            uploadStep === 1 ? t('lessonDocs.uploadStep1Title') : t('lessonDocs.uploadStep2Title')
          }
          onClose={closeUploadModal}
          footer={
            uploadStep === 1 ? (
              <KidsSecondaryButton type="button" onClick={closeUploadModal}>
                {t('common.cancel')}
              </KidsSecondaryButton>
            ) : (
              <div className="flex w-full flex-wrap justify-end gap-2">
                <KidsSecondaryButton type="button" onClick={() => setUploadStep(1)}>
                  {t('lessonDocs.backToFile')}
                </KidsSecondaryButton>
                <KidsSecondaryButton type="button" onClick={closeUploadModal}>
                  {t('common.cancel')}
                </KidsSecondaryButton>
              </div>
            )
          }
        >
          {uploadStep === 1 ? (
            <div className="space-y-5">
              <p className="text-sm text-slate-600 dark:text-slate-400">{t('lessonDocs.uploadStep1Hint')}</p>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                  {t('lessonDocs.dropzone')}
                </p>
                <div
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      fileRef.current?.click();
                    }
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    setDrag(true);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDrag(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    const rel = e.relatedTarget as Node | null;
                    if (rel && e.currentTarget.contains(rel)) return;
                    setDrag(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDrag(false);
                    onPickFiles(e.dataTransfer.files);
                  }}
                  onClick={() => fileRef.current?.click()}
                  className={`mt-2 flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed px-4 py-10 transition dark:bg-violet-950/20 ${
                    drag
                      ? 'border-violet-500 bg-violet-50 dark:border-violet-400'
                      : 'border-violet-200 hover:border-fuchsia-400 dark:border-violet-700'
                  }`}
                >
                  <Upload className="mb-2 h-10 w-10 text-violet-500" strokeWidth={1.25} />
                  <p className="text-sm font-semibold text-violet-900 dark:text-violet-100">
                    {t('lessonDocs.dropzone')}
                  </p>
                  <p className="mt-1 text-center text-xs text-slate-500 dark:text-slate-400">
                    {t('lessonDocs.dropzoneHint')}
                  </p>
                  {file ? (
                    <p className="mt-3 max-w-full truncate text-xs font-medium text-fuchsia-700 dark:text-fuchsia-300">
                      {file.name}
                    </p>
                  ) : null}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  className="sr-only"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,image/jpeg,image/png,image/webp"
                  onChange={(e) => onPickFiles(e.target.files)}
                />
              </div>
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                  {t('lessonDocs.docTitle')}
                </span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`${kidsInputClass} mt-1.5`}
                  placeholder={t('lessonDocs.titlePlaceholder')}
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                  {t('lessonDocs.description')}
                </span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className={`${kidsTextareaClass} mt-1.5`}
                  placeholder={t('lessonDocs.descriptionPlaceholder')}
                />
              </label>
              <label className="block">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                  <FolderOpen className="h-3.5 w-3.5" aria-hidden />
                  {t('lessonDocs.folder')}
                </span>
                <input
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  className={`${kidsInputClass} mt-1.5`}
                  placeholder={t('lessonDocs.folderPlaceholder')}
                  list="lesson-doc-folder-suggestions"
                  autoComplete="off"
                />
                <datalist id="lesson-doc-folder-suggestions">
                  {folderSuggestions.map((n) => (
                    <option key={n} value={n} />
                  ))}
                </datalist>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('lessonDocs.folderHint')}</p>
              </label>
              <KidsPrimaryButton type="button" className="w-full" onClick={goToUploadStep2}>
                {t('lessonDocs.continueToClasses')}
              </KidsPrimaryButton>
            </div>
          ) : (
            <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">
              <p className="text-sm text-slate-600 dark:text-slate-400">{t('lessonDocs.uploadStep2Hint')}</p>
              {sortedClasses.length === 0 ? (
                <p className="rounded-xl border border-dashed border-violet-200 py-8 text-center text-sm text-slate-500 dark:border-violet-800 dark:text-slate-400">
                  {t('lessonDocs.noClassesAssigned')}
                </p>
              ) : (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                    {t('lessonDocs.pickClass')}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {sortedClasses.map((c) => {
                      const on = selectedIds.has(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleClass(c.id)}
                          className={`rounded-full border-2 px-4 py-2 text-sm font-bold transition ${
                            on
                              ? 'border-violet-600 bg-violet-600 text-white shadow-md dark:border-violet-400 dark:bg-violet-600'
                              : 'border-violet-200 bg-white text-violet-900 hover:border-violet-400 dark:border-violet-700 dark:bg-gray-800 dark:text-violet-100'
                          }`}
                        >
                          {c.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <KidsPrimaryButton
                type="submit"
                className="w-full"
                disabled={sending || sortedClasses.length === 0}
              >
                {sending ? t('lessonDocs.distributing') : t('lessonDocs.distribute')}
              </KidsPrimaryButton>
            </form>
          )}
        </KidsCenteredModal>
      ) : null}

      {newFolderOpen ? (
        <KidsCenteredModal
          title={t('lessonDocs.newFolderModalTitle')}
          onClose={closeNewFolderModal}
          footer={
            <div className="flex flex-wrap justify-end gap-2">
              <KidsSecondaryButton type="button" onClick={closeNewFolderModal}>
                {t('common.cancel')}
              </KidsSecondaryButton>
              <KidsPrimaryButton type="button" onClick={() => continueNewFolderToUpload()}>
                {t('lessonDocs.newFolderContinueUpload')}
              </KidsPrimaryButton>
            </div>
          }
        >
          <p className="text-sm text-slate-600 dark:text-slate-400">{t('lessonDocs.newFolderModalHint')}</p>
          <label className="mt-4 block">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('lessonDocs.folder')}</span>
            <input
              value={newFolderNameInput}
              onChange={(e) => setNewFolderNameInput(e.target.value)}
              className={`${kidsInputClass} mt-1`}
              placeholder={t('lessonDocs.folderPlaceholder')}
            />
          </label>
        </KidsCenteredModal>
      ) : null}

      {subfolderOpen ? (
        <KidsCenteredModal
          title={t('lessonDocs.subfolderModalTitle')}
          onClose={() => {
            setSubfolderOpen(false);
            setSubfolderName('');
          }}
          footer={
            <div className="flex flex-wrap justify-end gap-2">
              <KidsSecondaryButton
                type="button"
                onClick={() => {
                  setSubfolderOpen(false);
                  setSubfolderName('');
                }}
              >
                {t('common.cancel')}
              </KidsSecondaryButton>
              <KidsPrimaryButton type="button" disabled={savingSubfolder} onClick={() => void createSubfolder()}>
                {savingSubfolder ? t('common.loading') : t('lessonDocs.createSubfolder')}
              </KidsPrimaryButton>
            </div>
          }
        >
          <p className="text-sm text-slate-600 dark:text-slate-400">{t('lessonDocs.subfolderModalHint')}</p>
          <label className="mt-4 block">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('lessonDocs.folder')}</span>
            <input
              value={subfolderName}
              onChange={(e) => setSubfolderName(e.target.value)}
              className={`${kidsInputClass} mt-1`}
              placeholder={t('lessonDocs.folderPlaceholder')}
            />
          </label>
        </KidsCenteredModal>
      ) : null}

      {allFoldersOpen ? (
        <KidsCenteredModal
          title={t('lessonDocs.allFoldersTitle')}
          onClose={() => setAllFoldersOpen(false)}
          footer={
            <KidsSecondaryButton type="button" onClick={() => setAllFoldersOpen(false)}>
              {t('common.cancel')}
            </KidsSecondaryButton>
          }
        >
          {flatFolders.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">{t('lessonDocs.emptyFoldersHint')}</p>
          ) : (
            <div className="max-h-[min(70vh,420px)] overflow-auto rounded-xl border border-slate-200 dark:border-slate-600">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-3 py-2 font-bold text-slate-700 dark:text-slate-200">{t('lessonDocs.tableClass')}</th>
                    <th className="px-3 py-2 font-bold text-slate-700 dark:text-slate-200">{t('lessonDocs.tableFolder')}</th>
                    <th className="px-3 py-2 font-bold text-slate-700 dark:text-slate-200">{t('lessonDocs.tableFiles')}</th>
                    <th className="px-3 py-2 font-bold text-slate-700 dark:text-slate-200">{t('lessonDocs.tableSize')}</th>
                  </tr>
                </thead>
                <tbody>
                  {flatFolders.map((row) => (
                    <tr key={`${row.id}-${row.kids_class_id}`} className="border-t border-slate-100 dark:border-slate-700">
                      <td className="px-3 py-2 text-slate-800 dark:text-slate-200">{row.class_name}</td>
                      <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">{row.name}</td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{row.document_count}</td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{formatBytes(row.total_size_bytes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </KidsCenteredModal>
      ) : null}

      {editDoc ? (
        <KidsCenteredModal
          title={t('lessonDocs.editTitle')}
          onClose={() => setEditDoc(null)}
          footer={
            <div className="flex flex-wrap justify-end gap-2">
              <KidsSecondaryButton type="button" onClick={() => setEditDoc(null)}>
                {t('common.cancel')}
              </KidsSecondaryButton>
              <KidsPrimaryButton type="button" disabled={savingEdit} onClick={() => void saveEdit()}>
                {savingEdit ? t('common.loading') : t('lessonDocs.save')}
              </KidsPrimaryButton>
            </div>
          }
        >
          <label className="block">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('lessonDocs.docTitle')}</span>
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className={`${kidsInputClass} mt-1`}
            />
          </label>
          <label className="mt-3 block">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('lessonDocs.description')}</span>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={3}
              className={`${kidsTextareaClass} mt-1`}
            />
          </label>
          <div className="mt-3">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('lessonDocs.editFolder')}</span>
            <select
              value={editFolderId}
              onChange={(e) => setEditFolderId(e.target.value)}
              className={`${kidsInputClass} mt-1`}
              disabled={!!editNewFolderName.trim()}
            >
              <option value="">{t('lessonDocs.noFolder')}</option>
              {editFolders.map((f) => (
                <option key={f.id} value={String(f.id)}>
                  {f.name}
                </option>
              ))}
            </select>
            <label className="mt-2 block">
              <span className="text-xs text-slate-600 dark:text-slate-400">{t('lessonDocs.newFolderName')}</span>
              <input
                value={editNewFolderName}
                onChange={(e) => setEditNewFolderName(e.target.value)}
                className={`${kidsInputClass} mt-1`}
                placeholder={t('lessonDocs.newFolderPlaceholder')}
              />
            </label>
          </div>
        </KidsCenteredModal>
      ) : null}
    </KidsPanelMax>
  );
}
