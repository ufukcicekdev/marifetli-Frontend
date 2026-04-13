'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  BookOpen,
  Calculator,
  CheckCircle2,
  Clock,
  FlaskConical,
  Languages,
  Music,
  RefreshCw,
  Sparkles,
  Star,
  Flame,
  Users,
} from 'lucide-react';
import { KidsHomeworkMarkDoneCelebrationModal, kidsPickHomeworkCelebrationMotivate } from '@/src/components/kids/kids-homework-mark-done-celebration-modal';
import { KidsMascotBubble } from '@/src/components/kids/kids-mascot-bubble';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';
import {
  kidsDeleteStudentHomeworkSubmissionAttachment,
  kidsListStudentHomeworks,
  kidsMarkHomeworkDone,
  kidsUploadStudentHomeworkSubmissionAttachment,
  type KidsHomework,
  type KidsHomeworkSubmission,
} from '@/src/lib/kids-api';
import { KidsPanelMax, KidsPrimaryButton } from '@/src/components/kids/kids-ui';
import { MediaSlider } from '@/src/components/media-slider';
import type { MediaItem } from '@/src/lib/extract-media';
import { useKidsI18n } from '@/src/providers/kids-language-provider';

const FALLBACK_HERO_IMAGES = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCJ9eFjUXYJSLlmo9o8xPJoID5sPwviTI4wien_54N-IAGaOKByVBqdFCpW5MU6Rz8cTP22EBToWoalBq7152fLNXSBNq6GPdR8IGjPKEE1bP4BEVMgFr4KPbvc-JwKgPGVsYpaB4DGYPcMwoDLAV1puyTXUVTr1Y1-AU1zJOSm4WQlblcjdBA82JYVWLC6RvacaqsGimqjKBh5ZvZBRufP1x_bjgaDncTVdDogQ8ZQofuhrwDiuv43C_9t7qWoXK11a2kGqA3PEaCe',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBfZqcWOYojiJQ3yCEq4clPB6f7_a1iv8CzIw9VxMS9YwelWJWak1lxzM51szWlS-72bUsgzpZd7PyOMhCUH57d4xsG1UYF4iDiRWQlcysUM2GtnrajHwwVUBLeLupVo25qoCuHWvGDR3u5M7bqksaKqVhMY-ls1eL9NsrjCT8Ln8l_baEI1mSw6km3oGRfPzs0sfBokVPKV5txt0hn7vjcYSbEsdcHlMrWLQ8wThrBobPZj6QvLrUlNcKcsAY9S4MhoCJyhltThkZd',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCRHNr4vvD6ekj9F7JcpGXvHWn08weNgXTccYvIJ3MNJCxvy92Wj9i3r5AV7DYcZUtgE2kE7Ghth2FE4trvAH899mnIOQvDOkXe4fTZZR3f4FrgoRitDgpvamYn_11hzCMh96eWHAX1vSrqzY2NH_zsJGyFr18fuEdntR_gksdJlQTNv85yPy7PvK4Ofwahw12Fpf9fc8Jc034Ig3xP-5wp1ivg4Q7OT1h-CNC9HWRzdBK_PbenZT9mKuR_7MyD0jt57R84jgw7P0EL',
] as const;

const MOTIVATION_MASCOT_SRC =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuA--KbHmwiCx1zh8NzICX7Riou49Ib-eEtquIxYD6YlhKAhC6_EG1EVahgOU2ZCiAxTVN1vgbTD7TU1SZ-4b-WrAcz8rQiIzxyWogRmMbdBVj1XsRhx04dGAo-ggg7p-25rDeYsV2q1Dh5vgJyQLW-0FH9emmiQP3Hb2TyPKl03MQvCRgmKM4j80R45gdUIXKs5JMuwv-TTa_m7K6DT4JTKHJYcNzkBYLD9LGhnHrYxlrFsWpgCwhYbkugMqnnNG8v76SXe2HhLqhU6';

function interpolate(template: string, vars: Record<string, string | number>): string {
  let s = template;
  for (const [k, v] of Object.entries(vars)) {
    s = s.split(`{${k}}`).join(String(v));
  }
  return s;
}

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

function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Ardışık günlerde öğrencinin ödevi teslim ettiği gün sayımı.
 * Yalnızca `student_done_at` (öğrenci "Yaptım" zamanı) kullanılır; öğretmen onayının güncellediği `updated_at` seriye karışmaz.
 */
function homeworkCompletionStreak(doneItems: KidsHomeworkSubmission[]): number {
  const keys = new Set<string>();
  for (const s of doneItems) {
    const raw = s.student_done_at;
    if (!raw) continue;
    keys.add(localDayKey(new Date(raw)));
  }
  if (keys.size === 0) return 0;
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  if (!keys.has(localDayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  for (let i = 0; i < 400; i++) {
    const k = localDayKey(cursor);
    if (keys.has(k)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else break;
  }
  return streak;
}

function firstHomeworkImageUrl(hw: KidsHomework): string | null {
  const atts = hw.attachments;
  if (!Array.isArray(atts)) return null;
  for (const att of atts) {
    if (isImageAttachment(att.content_type, att.original_name)) return att.url;
  }
  return null;
}

function subjectMeta(
  subject: string | undefined,
  className: string | undefined,
  t: (k: string) => string,
): { label: string; Icon: typeof BookOpen; iconClass: string; pillClass: string } {
  const s = `${subject || ''} ${className || ''}`.toLowerCase();
  if (s.includes('mat'))
    return { label: t('homework.subjectMath'), Icon: Calculator, iconClass: 'text-violet-600', pillClass: 'bg-white/90' };
  if (s.includes('fen') || s.includes('bilim'))
    return { label: t('homework.subjectScience'), Icon: FlaskConical, iconClass: 'text-blue-600', pillClass: 'bg-white/90' };
  if (s.includes('türk') || s.includes('turk'))
    return { label: t('homework.subjectTurkish'), Icon: BookOpen, iconClass: 'text-pink-600', pillClass: 'bg-white/90' };
  if (s.includes('müzik') || s.includes('muzik'))
    return { label: t('homework.subjectMusic'), Icon: Music, iconClass: 'text-pink-600', pillClass: 'bg-white/90' };
  if (s.includes('ingiliz'))
    return { label: t('homework.subjectEnglish'), Icon: Languages, iconClass: 'text-indigo-600', pillClass: 'bg-white/90' };
  const cn = (className || '').trim();
  return {
    label: cn || t('homework.subjectGeneric'),
    Icon: Sparkles,
    iconClass: 'text-violet-600',
    pillClass: 'bg-white/90',
  };
}

function dueMs(hw: KidsHomework): number | null {
  if (!hw.due_at) return null;
  const t = new Date(hw.due_at).getTime();
  return Number.isFinite(t) ? t : null;
}

function formatDueLine(
  hw: KidsHomework,
  now: number,
  language: string,
  t: (k: string) => string,
): { text: string; urgent: boolean } {
  const end = dueMs(hw);
  if (end === null) return { text: t('homework.dueNoDate'), urgent: false };
  if (end < now) return { text: t('homework.dueOverdue'), urgent: true };
  const dayMs = 86400000;
  const days = Math.ceil((end - now) / dayMs);
  const dueDate = new Date(end);
  const today = new Date(now);
  const sameDay =
    dueDate.getFullYear() === today.getFullYear() &&
    dueDate.getMonth() === today.getMonth() &&
    dueDate.getDate() === today.getDate();
  if (sameDay) {
    const time = dueDate.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' });
    return { text: interpolate(t('homework.dueTodayAt'), { time }), urgent: true };
  }
  if (days <= 1) return { text: t('homework.dueTomorrow'), urgent: true };
  if (days === 2) return { text: interpolate(t('homework.dueDaysLeft'), { n: 2 }), urgent: false };
  return { text: interpolate(t('homework.dueDaysLeft'), { n: days }), urgent: false };
}

function formatFutureSubline(dueAt: string | null, language: string, t: (k: string) => string): string {
  if (!dueAt) return t('homework.futureOpens');
  const end = new Date(dueAt).getTime();
  if (!Number.isFinite(end)) return t('homework.futureOpens');
  const now = Date.now();
  const dayMs = 86400000;
  const days = Math.ceil((end - now) / dayMs);
  if (days <= 1) return t('homework.dueTomorrow');
  return new Date(end).toLocaleDateString(language, { weekday: 'long' });
}

type HomeworkTab = 'incoming' | 'done';
type PendingUploadItem = { id: string; file: File; previewUrl: string };

function byNewestHomework(a: KidsHomeworkSubmission, b: KidsHomeworkSubmission): number {
  const ad = new Date(a.homework.created_at || a.updated_at || '').getTime();
  const bd = new Date(b.homework.created_at || b.updated_at || '').getTime();
  return bd - ad;
}

export default function KidsStudentHomeworksPage() {
  const router = useRouter();
  const { user, loading: authLoading, pathPrefix, refreshUser } = useKidsAuth();
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
  const [celebration, setCelebration] = useState<{
    growthPointsBefore: number;
    growthPointsAfter: number;
    growthPointsDelta: number;
    motivateLine: string;
  } | null>(null);
  const nowMs = Date.now();

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
      const marked = await kidsMarkHomeworkDone(submissionId);
      setPendingUploads((prev) => {
        const next = { ...prev };
        const old = next[submissionId] ?? [];
        for (const row of old) URL.revokeObjectURL(row.previewUrl);
        delete next[submissionId];
        return next;
      });
      setCelebration({
        growthPointsBefore: Number(marked.growth_points_before ?? 0),
        growthPointsAfter: Number(marked.growth_points_after ?? 0),
        growthPointsDelta: Number(marked.growth_points_delta ?? 0),
        motivateLine: kidsPickHomeworkCelebrationMotivate(t),
      });
      void refreshUser();
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

  const streak = useMemo(() => homeworkCompletionStreak(doneItems), [doneItems]);

  /** Sıradaki ödevler: teslime göre sıralı listede 3. ve 4. (üstteki kartlarla mümkün olduğunca çakışmasın). */
  const futureTasks = useMemo(() => {
    const sorted = [...incomingItems].sort((a, b) => {
      const da = dueMs(a.homework);
      const db = dueMs(b.homework);
      if (da === null && db === null) return 0;
      if (da === null) return 1;
      if (db === null) return -1;
      return da - db;
    });
    return sorted.slice(2, 4);
  }, [incomingItems]);

  const visibleItems = tab === 'incoming' ? incomingItems : doneItems;

  const growthPoints = user?.growth_points ?? 0;
  const xpFormatted = new Intl.NumberFormat(language).format(growthPoints);

  if (authLoading || !user) {
    return <p className="text-center text-gray-600 dark:text-gray-400">{t('common.loading')}</p>;
  }

  /* Marfi mesaj secimi */
  const marfiHomeworkMsg = (() => {
    if (incomingItems.length === 0 && doneItems.length > 0) return t('marfi.homework.allDone');
    if (incomingItems.length > 0) return t('marfi.homework.hasPending');
    return t('marfi.homework.noHomework');
  })();
  const marfiHomeworkMood = incomingItems.length === 0 && doneItems.length > 0 ? 'excited' as const : incomingItems.length > 0 ? 'thinking' as const : 'happy' as const;

  return (
    <KidsPanelMax className="max-w-7xl px-1 pb-12 sm:px-3 lg:px-6">
      {/* Marfi motivasyon balonu */}
      <KidsMascotBubble
        mood={marfiHomeworkMood}
        message={marfiHomeworkMsg}
        dismissible
        storageKey={`marfi-hw-${new Date().toDateString()}-${incomingItems.length}`}
        placement="left"
        mascotSize={90}
        className="mb-6"
      />
      <header className="mb-8 flex flex-col justify-between gap-6 md:mb-10 md:flex-row md:items-center">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <h1 className="font-logo text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              {t('homework.title')}
            </h1>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              aria-label={t('homework.refresh')}
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Link
              href={`${pathPrefix}/ogrenci/projeler`}
              className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-800 shadow-sm hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-200 dark:hover:bg-violet-900/40"
            >
              {t('nav.challenges')}
            </Link>
          </div>
          <p className="text-base font-medium text-slate-600 dark:text-zinc-400">
            {t('homework.heroSubtitleBefore')}{' '}
            <span className="font-extrabold text-violet-600 dark:text-violet-400">
              {incomingItems.length} {t('homework.heroSubtitleMid')}
            </span>{' '}
            {t('homework.heroSubtitleAfter')}
          </p>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-[180px] shrink-0 items-center gap-4 rounded-2xl border border-amber-100 bg-white p-4 shadow-sm dark:border-amber-900/40 dark:bg-zinc-900/80">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/80 dark:text-amber-400">
              <Flame className="h-6 w-6 fill-current" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                {t('homework.statStreak')}
              </p>
              <p className="text-lg font-black text-slate-900 dark:text-white">
                {interpolate(t('homework.statStreakDays'), { n: streak })}
              </p>
            </div>
          </div>
          <div className="flex min-w-[180px] shrink-0 items-center gap-4 rounded-2xl border border-fuchsia-100 bg-white p-4 shadow-sm dark:border-fuchsia-900/40 dark:bg-zinc-900/80">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-950/80 dark:text-fuchsia-400">
              <Star className="h-6 w-6 fill-current" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                {t('homework.statTotalXp')}
              </p>
              <p className="text-lg font-black text-slate-900 dark:text-white">
                {interpolate(t('homework.statXpValue'), { n: xpFormatted })}
              </p>
              <p className="mt-1 max-w-48 text-[10px] font-medium leading-tight text-slate-400 dark:text-zinc-500">
                {t('homework.statXpExplain')}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mb-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setTab('incoming')}
          className={`rounded-full px-6 py-2.5 text-sm font-bold shadow-md transition ${
            tab === 'incoming'
              ? 'bg-violet-600 text-white shadow-violet-500/25 dark:bg-violet-500'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
          }`}
        >
          {t('homework.tabIncoming')}
        </button>
        <button
          type="button"
          onClick={() => setTab('done')}
          className={`rounded-full px-6 py-2.5 text-sm font-bold transition ${
            tab === 'done'
              ? 'bg-violet-600 text-white shadow-md shadow-violet-500/25 dark:bg-violet-500'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
          }`}
        >
          {t('homework.tabDone')}
        </button>
      </div>

      {items.length === 0 && !loading ? (
        <div className="mb-8 rounded-3xl border border-emerald-200 bg-emerald-50/80 p-6 text-center text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
          {t('homework.empty')}
        </div>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-2 xl:grid-cols-3">
        {visibleItems.map((sub, idx) => {
          const hw = sub.homework;
          const canMarkDone =
            sub.status === 'published' || sub.status === 'parent_rejected' || sub.status === 'teacher_revision';
          const pendingRows = pendingUploads[sub.id] ?? [];
          const hasStudentImage =
            (Array.isArray(sub.attachments) && sub.attachments.length > 0) || pendingRows.length > 0;
          const isOpen = openDetailId === sub.id;
          const teacherImg = firstHomeworkImageUrl(hw);
          const heroUrl = teacherImg ?? FALLBACK_HERO_IMAGES[idx % FALLBACK_HERO_IMAGES.length]!;
          const meta = subjectMeta(hw.teacher_subject, hw.class_name, t);
          const { Icon: SubIcon } = meta;
          const due = formatDueLine(hw, nowMs, language, t);
          const isDoneTab = tab === 'done';
          const showProgress =
            !isDoneTab && (sub.status === 'teacher_revision' || sub.status === 'parent_rejected');
          const progressPct = hasStudentImage ? 72 : 38;

          let badgeText = t('homework.badgeInProgress');
          let badgeClass = 'bg-amber-400 text-amber-950 dark:bg-amber-400 dark:text-amber-950';
          if (isDoneTab) {
            badgeText = t('homework.badgeDone');
            badgeClass = 'bg-emerald-500 text-white';
          } else if (sub.status === 'published') {
            badgeText = t('homework.badgeNew');
            badgeClass = 'bg-violet-600 text-white';
          }

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

          const ctaPrimary =
            isDoneTab
              ? t('homework.ctaResults')
              : sub.status === 'published'
                ? t('homework.ctaStart')
                : t('homework.ctaContinue');

          return (
            <div
              key={sub.id}
              className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition-all duration-500 hover:shadow-[0_24px_48px_rgba(140,0,216,0.08)] dark:border-zinc-800 dark:bg-zinc-900/90"
            >
              <div className="relative h-48 w-full overflow-hidden">
                {teacherImg ? (
                  <Image
                    src={heroUrl}
                    alt=""
                    fill
                    className={`object-cover ${isDoneTab ? 'opacity-60 grayscale-35' : ''}`}
                    sizes="(max-width:768px) 100vw, 33vw"
                  />
                ) : (
                  <>
                    <Image
                      src={heroUrl}
                      alt=""
                      fill
                      className={`object-cover ${isDoneTab ? 'opacity-60 grayscale-35' : ''}`}
                      sizes="(max-width:768px) 100vw, 33vw"
                    />
                    <div
                      className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-violet-500/20"
                      aria-hidden
                    />
                  </>
                )}
                <div
                  className={`absolute left-4 top-4 flex items-center gap-2 rounded-full px-3 py-1 backdrop-blur-sm ${meta.pillClass}`}
                >
                  <SubIcon className={`h-4 w-4 shrink-0 ${meta.iconClass}`} strokeWidth={2} />
                  <span className="text-xs font-bold text-slate-800">{meta.label}</span>
                </div>
                <div className={`absolute right-4 top-4 rounded-full px-3 py-1 text-xs font-black ${badgeClass}`}>
                  {badgeText}
                </div>
                {isDoneTab ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="rounded-full bg-white/85 p-4 shadow-lg backdrop-blur-md dark:bg-zinc-900/85">
                      <CheckCircle2 className="h-10 w-10 text-emerald-500" strokeWidth={2.25} />
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-1 flex-col p-6">
                <h3 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">{hw.title}</h3>
                <p className="mb-4 flex-1 text-sm leading-relaxed text-slate-600 line-clamp-3 dark:text-zinc-400">
                  {hw.description?.trim() || '—'}
                </p>

                {showProgress ? (
                  <div className="mb-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">{t('homework.progress')}</span>
                      <span className="text-xs font-bold text-violet-600 dark:text-violet-400">%{progressPct}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-linear-to-r from-violet-600 to-fuchsia-500 transition-all"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                ) : null}

                <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4 dark:border-zinc-800">
                  <div className="flex min-w-0 items-center gap-2 text-slate-600 dark:text-zinc-400">
                    <Users className="h-5 w-5 shrink-0 text-violet-500 dark:text-violet-400" strokeWidth={2} />
                    <span className="truncate text-sm font-bold text-slate-800 dark:text-zinc-200">
                      {hw.class_name?.trim() || t('homework.cardClassFallback')}
                    </span>
                  </div>
                  {isDoneTab ? (
                    <span className="text-xs font-extrabold uppercase tracking-tight text-emerald-600 dark:text-emerald-400">
                      {t('homework.greatJob')}
                    </span>
                  ) : (
                    <div
                      className={`flex items-center gap-2 text-xs font-bold ${
                        due.urgent ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-zinc-400'
                      }`}
                    >
                      <Clock className="h-4 w-4 shrink-0" />
                      <span>{due.text}</span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setOpenDetailId((prev) => (prev === sub.id ? null : sub.id))}
                  className={`mt-6 w-full rounded-full py-4 text-sm font-bold transition ${
                    isDoneTab
                      ? 'border-2 border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
                      : sub.status === 'published'
                        ? 'bg-linear-to-r from-violet-600 to-pink-500 text-white shadow-lg shadow-purple-500/15 group-hover:scale-[1.02] active:scale-[0.99]'
                        : 'bg-slate-200 text-violet-700 hover:bg-violet-600 hover:text-white dark:bg-zinc-800 dark:text-violet-300 dark:hover:bg-violet-600 dark:hover:text-white'
                  }`}
                >
                  {ctaPrimary}
                </button>
              </div>

              {isOpen ? (
                <div className="space-y-3 border-t border-slate-100 bg-slate-50/90 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
                  {hw.description ? (
                    <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-zinc-200">{hw.description}</p>
                  ) : null}
                  {Array.isArray(hw.attachments) && hw.attachments.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-800 dark:text-zinc-200">{t('homework.teacherFiles')}</p>
                      <MediaSlider
                        items={hw.attachments.map<MediaItem>((att) => ({
                          url: isImageAttachment(att.content_type, att.original_name)
                            ? att.url
                            : filePlaceholderUrl(att.original_name || 'dosya', t('homework.attachmentLabel')),
                          type: 'image',
                        }))}
                        className="h-52"
                        alt={hw.title}
                        fit="contain"
                      />
                    </div>
                  ) : null}
                  <div className="rounded-2xl border border-sky-200/80 bg-white/90 p-3 dark:border-sky-900/50 dark:bg-sky-950/20">
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
                      <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{t('homework.imageWillUploadOnDone')}</p>
                    ) : null}
                    {studentMediaItems.length > 0 ? (
                      <div className="mt-2">
                        <MediaSlider
                          key={studentMediaEntries.map((e) => (e.kind === 'remote' ? `r:${e.id}` : `p:${e.pendingId}`)).join('|')}
                          items={studentMediaItems}
                          className="h-52"
                          alt={`${hw.title} ogrenci`}
                          fit="contain"
                          deleteDisabled={markingId !== null || deletingAttachmentId !== null}
                          onDeleteAtIndex={(itemIndex) => {
                            const target = studentMediaEntries[itemIndex];
                            if (!target) return;
                            if (target.kind === 'pending') {
                              removePendingFile(sub.id, target.pendingId);
                              return;
                            }
                            if (canMarkDone) void deleteSubmissionImage(sub.id, target.id);
                          }}
                        />
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-slate-600 dark:text-zinc-400">{t('homework.noStudentImageYet')}</p>
                    )}
                    {canMarkDone ? (
                      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                        {!hasStudentImage ? (
                          <p className="text-xs text-amber-700 dark:text-amber-300">{t('homework.doneRequiresImage')}</p>
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
                  <button
                    type="button"
                    className="w-full text-center text-xs font-semibold text-violet-600 underline dark:text-violet-400"
                    onClick={() => setOpenDetailId(null)}
                  >
                    {t('homework.detailClose')}
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {visibleItems.length === 0 && items.length > 0 && !loading ? (
        <p className="mt-10 text-center text-slate-600 dark:text-zinc-400">
          {tab === 'incoming' ? t('homework.emptyPendingTab') : t('homework.emptyDoneTab')}
        </p>
      ) : null}

      <section className="mt-16 grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
        <div className="relative flex min-h-[280px] flex-col justify-center overflow-hidden rounded-3xl bg-linear-to-r from-violet-600 to-indigo-700 p-8 shadow-xl md:min-h-[300px] md:p-12 lg:col-span-8">
          <div className="relative z-10 max-w-md">
            <h2 className="mb-4 text-2xl font-black leading-tight text-white md:text-3xl">{t('homework.motivationTitle')}</h2>
            <p className="mb-8 text-base text-purple-100 opacity-95 md:text-lg">{t('homework.motivationBody')}</p>
            <Link
              href={`${pathPrefix}/ogrenci/yol`}
              className="inline-flex rounded-full bg-white px-8 py-4 text-sm font-black text-violet-700 shadow-xl transition hover:scale-105 active:scale-95"
            >
              {t('homework.motivationCta')}
            </Link>
          </div>
          <div className="pointer-events-none absolute right-0 top-0 hidden h-full w-1/2 md:block">
            <Image
              src={MOTIVATION_MASCOT_SRC}
              alt=""
              width={400}
              height={400}
              className="h-full w-full object-contain object-right translate-x-8 translate-y-6"
            />
          </div>
        </div>
        <div className="flex flex-col justify-center rounded-3xl border-2 border-white bg-slate-100/90 p-6 shadow-inner dark:border-zinc-800 dark:bg-zinc-900/80 md:p-8 lg:col-span-4">
          <h3 className="mb-6 text-lg font-black text-slate-900 dark:text-white">{t('homework.futureTasks')}</h3>
          <div className="space-y-4">
            {futureTasks.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-zinc-400">{t('homework.futureTasksEmpty')}</p>
            ) : (
              futureTasks.map((row, i) => {
                const subMeta = subjectMeta(row.homework.teacher_subject, row.homework.class_name, t);
                const SubI = subMeta.Icon;
                const tone =
                  i === 0
                    ? 'bg-pink-100 text-pink-600 dark:bg-pink-950/60 dark:text-pink-300'
                    : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300';
                return (
                  <div
                    key={row.id}
                    className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-950/80"
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tone}`}>
                      <SubI className="h-5 w-5" strokeWidth={2} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{row.homework.title}</p>
                      <p className="text-xs text-slate-500 dark:text-zinc-400">
                        {formatFutureSubline(row.homework.due_at, language, t)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      <KidsHomeworkMarkDoneCelebrationModal
        open={celebration !== null}
        growthPointsBefore={celebration?.growthPointsBefore ?? 0}
        growthPointsAfter={celebration?.growthPointsAfter ?? 0}
        growthPointsDelta={celebration?.growthPointsDelta ?? 0}
        motivateLine={celebration?.motivateLine ?? ''}
        onContinue={() => setCelebration(null)}
      />
    </KidsPanelMax>
  );
}
