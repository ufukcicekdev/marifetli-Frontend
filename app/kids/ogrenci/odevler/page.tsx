'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';
import {
  kidsListStudentHomeworks,
  kidsMarkHomeworkDone,
  type KidsHomeworkSubmission,
} from '@/src/lib/kids-api';
import { KidsCard, KidsPanelMax, KidsPrimaryButton, KidsSecondaryButton } from '@/src/components/kids/kids-ui';
import { MediaSlider } from '@/src/components/media-slider';
import type { MediaItem } from '@/src/lib/extract-media';

const STATUS_LABEL: Record<KidsHomeworkSubmission['status'], string> = {
  published: 'Yayınlandı',
  student_done: 'Veli kontrolünde',
  parent_approved: 'Öğretmen değerlendirmesi bekleniyor',
  parent_rejected: 'Veli eksik işaretledi',
  teacher_approved: 'Öğretmen onayladı',
  teacher_revision: 'Öğretmen düzeltme istedi',
};

function isImageAttachment(contentType: string, fileName: string): boolean {
  const ct = (contentType || '').toLowerCase();
  if (ct.startsWith('image/')) return true;
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(fileName || '');
}

function filePlaceholderUrl(fileName: string): string {
  const ext = (fileName.split('.').pop() || 'DOSYA').toUpperCase().slice(0, 6);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540"><rect width="960" height="540" fill="#EFF6FF"/><rect x="360" y="120" width="240" height="300" rx="24" fill="#BFDBFE"/><path d="M520 120v76c0 13 11 24 24 24h56" fill="#93C5FD"/><path d="M520 120l80 100" stroke="#60A5FA" stroke-width="10"/><text x="480" y="300" text-anchor="middle" font-family="Arial, sans-serif" font-size="40" font-weight="700" fill="#1E3A8A">${ext}</text><text x="480" y="345" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" fill="#1D4ED8">Ödev eki</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function formatFileSize(sizeBytes: number): string {
  const s = Number(sizeBytes || 0);
  if (s <= 0) return '';
  if (s < 1024) return `${s} B`;
  if (s < 1024 * 1024) return `${(s / 1024).toFixed(1)} KB`;
  return `${(s / (1024 * 1024)).toFixed(1)} MB`;
}

export default function KidsStudentHomeworksPage() {
  const router = useRouter();
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();
  const [items, setItems] = useState<KidsHomeworkSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await kidsListStudentHomeworks();
      setItems(list);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ödevler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

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
      await kidsMarkHomeworkDone(submissionId);
      toast.success('Ödevin veli kontrolüne gönderildi.');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'İşaretlenemedi');
    } finally {
      setMarkingId(null);
    }
  }

  if (authLoading || !user) {
    return <p className="text-center text-gray-600 dark:text-gray-400">Yükleniyor…</p>;
  }

  return (
    <KidsPanelMax>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-logo text-2xl font-bold text-slate-900 dark:text-white">Ödevlerim</h1>
        <div className="flex gap-2">
          <KidsSecondaryButton type="button" onClick={() => void load()} disabled={loading}>
            {loading ? 'Yükleniyor…' : 'Yenile'}
          </KidsSecondaryButton>
          <Link href={`${pathPrefix}/ogrenci/projeler`} className="inline-flex">
            <KidsSecondaryButton type="button">Challenges</KidsSecondaryButton>
          </Link>
        </div>
      </div>

      {items.length === 0 && !loading ? (
        <KidsCard tone="emerald">
          <p className="text-sm text-emerald-900 dark:text-emerald-100">Henüz atanmış bir ödev yok.</p>
        </KidsCard>
      ) : null}

      <div className="space-y-3">
        {items.map((sub) => {
          const canMarkDone =
            sub.status === 'published' ||
            sub.status === 'parent_rejected' ||
            sub.status === 'teacher_revision';
          return (
            <KidsCard key={sub.id} tone="sky">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{sub.homework.title}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{sub.homework.class_name || 'Sınıf'}</p>
                  {(sub.homework.teacher_display || sub.homework.teacher_subject) ? (
                    <p className="text-xs text-sky-800/80 dark:text-sky-200/80">
                      {sub.homework.teacher_display || 'Öğretmen'}{sub.homework.teacher_subject ? ` (${sub.homework.teacher_subject})` : ''}
                    </p>
                  ) : null}
                  {sub.homework.due_at ? (
                    <p className="text-xs text-violet-800/80 dark:text-violet-200/80">
                      Son teslim: {new Date(sub.homework.due_at).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-indigo-900/80 dark:text-indigo-100/80">{STATUS_LABEL[sub.status]}</p>
                </div>
                <KidsPrimaryButton
                  type="button"
                  disabled={!canMarkDone || markingId !== null}
                  onClick={() => void markDone(sub.id)}
                >
                  {markingId === sub.id ? 'Gönderiliyor…' : 'Yaptım'}
                </KidsPrimaryButton>
              </div>
              {Array.isArray(sub.homework.attachments) && sub.homework.attachments.length > 0 ? (
                <div className="mt-3 space-y-2">
                  <MediaSlider
                    items={sub.homework.attachments.map<MediaItem>((att) => ({
                      url: isImageAttachment(att.content_type, att.original_name)
                        ? att.url
                        : filePlaceholderUrl(att.original_name || 'dosya'),
                      type: 'image',
                    }))}
                    className="h-52"
                    alt={sub.homework.title}
                    fit="contain"
                  />
                  <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                    {sub.homework.attachments.map((att) => (
                      <li key={att.id} className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{att.original_name || 'Dosya'}</span>
                        {att.size_bytes ? <span>{formatFileSize(att.size_bytes)}</span> : null}
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noreferrer"
                          download={att.original_name || true}
                          className="rounded-full border border-sky-300 px-2 py-0.5 font-semibold text-sky-700 hover:bg-sky-100 dark:border-sky-700 dark:text-sky-200 dark:hover:bg-sky-900/40"
                        >
                          Gör / İndir
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </KidsCard>
          );
        })}
      </div>
    </KidsPanelMax>
  );
}
