'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';
import {
  kidsParentChildrenOverview,
  kidsParentReviewHomeworkSubmission,
  type KidsParentChildOverview,
} from '@/src/lib/kids-api';
import { KidsCard, KidsPanelMax, KidsPrimaryButton, KidsSecondaryButton, KidsSelect } from '@/src/components/kids/kids-ui';
import { MediaSlider } from '@/src/components/media-slider';
import type { MediaItem } from '@/src/lib/extract-media';

const HOMEWORK_STATUS_LABEL: Record<string, string> = {
  published: 'Yayınlandı',
  student_done: 'Öğrenci yaptı (veli onayı bekliyor)',
  parent_approved: 'Veli onayladı',
  parent_rejected: 'Veli eksik işaretledi',
  teacher_approved: 'Öğretmen onayladı',
  teacher_revision: 'Öğretmen düzeltme istedi',
};

const CHALLENGE_STATUS_LABEL: Record<string, string> = {
  approved: 'Onaylı',
  completed: 'Tamamlandı',
  rejected: 'Reddedildi',
  pending_teacher: 'Öğretmen onayı bekliyor',
  pending_parent: 'Veli onayı bekliyor',
};

function isImageAttachment(contentType: string, fileName: string): boolean {
  const ct = (contentType || '').toLowerCase();
  if (ct.startsWith('image/')) return true;
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(fileName || '');
}

function filePlaceholderUrl(fileName: string): string {
  const ext = (fileName.split('.').pop() || 'DOSYA').toUpperCase().slice(0, 6);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540"><rect width="960" height="540" fill="#FEF3C7"/><rect x="360" y="120" width="240" height="300" rx="24" fill="#FDE68A"/><path d="M520 120v76c0 13 11 24 24 24h56" fill="#FCD34D"/><path d="M520 120l80 100" stroke="#F59E0B" stroke-width="10"/><text x="480" y="300" text-anchor="middle" font-family="Arial, sans-serif" font-size="40" font-weight="700" fill="#92400E">${ext}</text><text x="480" y="345" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" fill="#B45309">Ödev eki</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function formatFileSize(sizeBytes: number): string {
  const s = Number(sizeBytes || 0);
  if (s <= 0) return '';
  if (s < 1024) return `${s} B`;
  if (s < 1024 * 1024) return `${(s / 1024).toFixed(1)} KB`;
  return `${(s / (1024 * 1024)).toFixed(1)} MB`;
}

export default function KidsParentChildrenStatusPage() {
  const router = useRouter();
  const { user, loading, pathPrefix } = useKidsAuth();
  const [overview, setOverview] = useState<KidsParentChildOverview[] | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [reviewingSubmissionId, setReviewingSubmissionId] = useState<number | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string>('');

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    setOverviewError(null);
    try {
      const { children } = await kidsParentChildrenOverview();
      setOverview(children);
      setSelectedChildId((prev) => {
        if (prev && children.some((c) => String(c.id) === prev)) return prev;
        if (children.length > 0) return String(children[0].id);
        return '';
      });
    } catch (e) {
      setOverviewError(e instanceof Error ? e.message : 'Durum özeti alınamadı');
      setOverview(null);
      setSelectedChildId('');
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(kidsLoginPortalHref(pathPrefix, 'veli'));
      return;
    }
    if (user.role !== 'parent') {
      router.replace(kidsLoginPortalHref(pathPrefix));
      return;
    }
    void loadOverview();
  }, [user, loading, pathPrefix, router, loadOverview]);

  async function markSubmittedReviewed(submissionId: number) {
    setReviewingSubmissionId(submissionId);
    try {
      await kidsParentReviewHomeworkSubmission(submissionId, { approved: true });
      toast.success('Teslim öğretmene gönderildi.');
      await loadOverview();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Onay kaydedilemedi');
    } finally {
      setReviewingSubmissionId(null);
    }
  }

  if (loading || !user || user.role !== 'parent') {
    return (
      <KidsPanelMax>
        <p className="text-center text-violet-800 dark:text-violet-200">Yükleniyor…</p>
      </KidsPanelMax>
    );
  }

  const childrenList = overview ?? [];
  const selectedChild =
    childrenList.find((c) => String(c.id) === selectedChildId) ?? childrenList[0] ?? null;
  return (
    <KidsPanelMax>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-logo text-2xl font-bold text-slate-900 dark:text-white">Çocukların Durumu</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-gray-400">
            Challenge geçmişi, ödev geçmişi ve bekleyen veli onaylarını bu ekrandan takip edebilirsin.
          </p>
        </div>
        <KidsSecondaryButton type="button" onClick={() => void loadOverview()} disabled={overviewLoading}>
          {overviewLoading ? 'Yenileniyor…' : 'Yenile'}
        </KidsSecondaryButton>
      </div>

      {childrenList.length > 1 ? (
        <div className="mb-4 max-w-sm">
          <p className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300">Çocuk seç</p>
          <KidsSelect
            value={selectedChild ? String(selectedChild.id) : ''}
            onChange={setSelectedChildId}
            options={childrenList.map((c) => ({
              value: String(c.id),
              label: `${c.first_name} ${c.last_name}`.trim() || `Çocuk #${c.id}`,
            }))}
          />
        </div>
      ) : null}

      {overviewError ? (
        <p className="mb-4 rounded-xl border border-amber-300/80 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
          {overviewError}
        </p>
      ) : null}

      <div className="space-y-6">
        {selectedChild ? (
          (() => {
            const c = selectedChild;
            return (
          <KidsCard key={c.id} tone="amber" className="border-2 border-amber-200/90 dark:border-amber-800/60">
            <h2 className="font-logo text-xl font-bold text-slate-900 dark:text-white">
              {c.first_name} {c.last_name}
            </h2>

            {(c.pending_parent_actions ?? []).length > 0 ? (
              <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50/80 px-3 py-2 dark:border-violet-800 dark:bg-violet-950/40">
                <p className="text-xs font-bold text-violet-900 dark:text-violet-100">Veli kontrolü bekleyen ödevler</p>
                <ul className="mt-2 space-y-2">
                  {(c.pending_parent_actions ?? []).map((it, idx) => (
                    <li
                      key={`${it.submission_id}-${idx}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-violet-200/80 bg-white/80 px-2.5 py-2 text-sm dark:border-violet-700 dark:bg-violet-950/40"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-violet-950 dark:text-violet-100">{it.assignment_title}</p>
                        <p className="text-xs text-violet-800/90 dark:text-violet-200/80">{it.class_name}</p>
                      </div>
                      <KidsPrimaryButton
                        type="button"
                        disabled={reviewingSubmissionId === it.submission_id}
                        onClick={() => void markSubmittedReviewed(it.submission_id)}
                      >
                        {reviewingSubmissionId === it.submission_id ? 'Kaydediliyor…' : 'Teslim edildi'}
                      </KidsPrimaryButton>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-5">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                Challenge geçmişi
              </p>
              {(c.challenges ?? []).length === 0 ? (
                <p className="mt-2 text-sm text-amber-900/75 dark:text-amber-100/70">Henüz challenge kaydı yok.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {(c.challenges ?? []).map((ch, idx) => (
                    <li
                      key={`${ch.id ?? ch.title}-${idx}`}
                      className="rounded-xl border border-amber-200/70 bg-white/85 px-3 py-2 dark:border-amber-800/50 dark:bg-gray-900/50"
                    >
                      <p className="font-semibold text-slate-900 dark:text-white">{ch.title}</p>
                      <p className="text-xs text-slate-600 dark:text-gray-400">
                        {ch.class_name} · {CHALLENGE_STATUS_LABEL[ch.status] ?? ch.status}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-5">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                Ödev geçmişi
              </p>
              {(c.homework_history ?? []).length === 0 ? (
                <p className="mt-2 text-sm text-amber-900/75 dark:text-amber-100/70">Henüz ödev kaydı yok.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {(c.homework_history ?? []).map((hw) => (
                    <li
                      key={hw.submission_id}
                      className="rounded-xl border border-amber-200/70 bg-white/85 px-3 py-2 dark:border-amber-800/50 dark:bg-gray-900/50"
                    >
                      <p className="font-semibold text-slate-900 dark:text-white">{hw.title}</p>
                      <p className="text-xs text-slate-600 dark:text-gray-400">
                        {hw.class_name} · {HOMEWORK_STATUS_LABEL[hw.status] ?? hw.status}
                      </p>
                      {(hw.teacher_display || hw.teacher_subject) ? (
                        <p className="mt-1 text-xs text-amber-800/90 dark:text-amber-200/80">
                          {hw.teacher_display || 'Öğretmen'}
                          {hw.teacher_subject ? ` (${hw.teacher_subject})` : ''}
                        </p>
                      ) : null}
                      {hw.description ? (
                        <p className="mt-1 whitespace-pre-wrap text-xs text-slate-700 dark:text-slate-200">{hw.description}</p>
                      ) : null}
                      {hw.due_at ? (
                        <p className="mt-1 text-xs text-violet-800/90 dark:text-violet-200/80">
                          Son teslim: {new Date(hw.due_at).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                      ) : null}
                      <div className="mt-2 grid gap-1 text-xs text-slate-700 dark:text-slate-300">
                        {hw.student_done_at ? (
                          <p>Ogrenci tamamladi: {new Date(hw.student_done_at).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}</p>
                        ) : null}
                        {hw.parent_reviewed_at ? (
                          <p>Veli degerlendirdi: {new Date(hw.parent_reviewed_at).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}</p>
                        ) : null}
                        {hw.teacher_reviewed_at ? (
                          <p>Ogretmen degerlendirdi: {new Date(hw.teacher_reviewed_at).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}</p>
                        ) : null}
                      </div>
                      {hw.student_note ? (
                        <p className="mt-1 text-xs italic text-slate-700 dark:text-slate-200">Ogrenci notu: "{hw.student_note}"</p>
                      ) : null}
                      {hw.parent_note ? (
                        <p className="mt-1 text-xs italic text-amber-900 dark:text-amber-100">Veli notu: "{hw.parent_note}"</p>
                      ) : null}
                      {hw.teacher_note ? (
                        <p className="mt-1 text-xs italic text-amber-900 dark:text-amber-100">Ogretmen notu: "{hw.teacher_note}"</p>
                      ) : null}
                      {Array.isArray(hw.attachments) && hw.attachments.length > 0 ? (
                        <div className="mt-2 space-y-2">
                          <MediaSlider
                            items={hw.attachments.map<MediaItem>((att) => ({
                              url: isImageAttachment(att.content_type, att.original_name)
                                ? att.url
                                : filePlaceholderUrl(att.original_name || 'dosya'),
                              type: 'image',
                            }))}
                            className="h-44"
                            alt={hw.title}
                            fit="contain"
                          />
                          <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                            {hw.attachments.map((att) => (
                              <li key={att.id} className="flex flex-wrap items-center gap-2">
                                <span className="font-medium">{att.original_name || 'Dosya'}</span>
                                {att.size_bytes ? <span>{formatFileSize(att.size_bytes)}</span> : null}
                                <a
                                  href={att.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  download={att.original_name || true}
                                  className="rounded-full border border-amber-300 px-2 py-0.5 font-semibold text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/40"
                                >
                                  Gor / Indir
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </KidsCard>
            );
          })()
        ) : (
          <KidsCard tone="amber">
            <p className="text-sm text-amber-900/80 dark:text-amber-100/80">Görüntülenecek çocuk bulunamadı.</p>
          </KidsCard>
        )}
      </div>
    </KidsPanelMax>
  );
}
