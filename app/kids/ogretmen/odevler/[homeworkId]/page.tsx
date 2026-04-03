'use client';

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  kidsListTeacherHomeworkSubmissionsByHomework,
  type KidsHomeworkSubmission,
  type KidsHomeworkSubmissionOverview,
} from '@/src/lib/kids-api';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';
import { useKidsI18n } from '@/src/providers/kids-language-provider';
import { KidsCard, KidsPanelMax, KidsSecondaryButton } from '@/src/components/kids/kids-ui';
import { MediaSlider } from '@/src/components/media-slider';
import type { MediaItem } from '@/src/lib/extract-media';

type FilterTab = 'all' | 'done' | 'missing';

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

export default function KidsTeacherHomeworkDetailPage() {
  const router = useRouter();
  const params = useParams<{ homeworkId: string }>();
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();
  const { t } = useKidsI18n();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<KidsHomeworkSubmissionOverview | null>(null);
  const [filter, setFilter] = useState<FilterTab>('all');
  /** Tek seferde bir teslim açık; çok kayıtta sayfa kısa ve slider yalnızca açık satırda yüklenir. */
  const [openSubmissionId, setOpenSubmissionId] = useState<number | null>(null);
  const accordionBaseId = useId();

  function statusLabel(status: KidsHomeworkSubmission['status']): string {
    switch (status) {
      case 'published':
        return t('teacherHomework.subStatus.notSubmitted');
      case 'student_done':
        return t('teacherHomework.subStatus.awaitingParent');
      case 'parent_approved':
        return t('teacherHomework.subStatus.done');
      case 'parent_rejected':
        return t('teacherHomework.subStatus.parentRevision');
      case 'teacher_revision':
        return t('teacherHomework.subStatus.teacherRevision');
      case 'teacher_approved':
        return t('teacherHomework.subStatus.done');
      default:
        return status;
    }
  }

  const homeworkId = Number(params?.homeworkId || 0);

  const load = useCallback(async () => {
    if (!homeworkId) return;
    setLoading(true);
    try {
      const data = await kidsListTeacherHomeworkSubmissionsByHomework(homeworkId);
      setOverview(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ödev detayları yüklenemedi');
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, [homeworkId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      router.replace(kidsLoginPortalHref(pathPrefix, 'ogretmen'));
      return;
    }
    void load();
  }, [authLoading, user, pathPrefix, router, load]);

  const rows = overview?.submissions ?? [];
  const submittedRows = useMemo(() => rows.filter((s) => s.status !== 'published'), [rows]);
  const notSubmittedRows = useMemo(() => rows.filter((s) => s.status === 'published'), [rows]);
  const doneRows = useMemo(
    () => rows.filter((s) => s.status === 'teacher_approved' || s.status === 'parent_approved'),
    [rows],
  );

  const visibleRows = useMemo(() => {
    if (filter === 'done') return doneRows;
    if (filter === 'missing') return [];
    return rows;
  }, [doneRows, filter, rows]);

  useEffect(() => {
    setOpenSubmissionId((prev) => {
      if (prev == null) return null;
      return visibleRows.some((r) => r.id === prev) ? prev : null;
    });
  }, [visibleRows]);

  function FilterBtn({ value, count, label }: { value: FilterTab; count: number; label: string }) {
    const on = filter === value;
    return (
      <button
        type="button"
        aria-current={on ? 'page' : undefined}
        onClick={() => setFilter(value)}
        className={`rounded-2xl px-3 py-2 text-sm font-black tracking-tight transition sm:px-4 ${
          on
            ? 'bg-white text-violet-950 shadow-lg ring-2 ring-fuchsia-500 ring-offset-2 ring-offset-violet-100 dark:bg-gray-950 dark:text-white dark:ring-fuchsia-400 dark:ring-offset-violet-950'
            : 'text-violet-950 hover:bg-white/75 dark:text-violet-100 dark:hover:bg-violet-900/50'
        }`}
      >
        {label} <span className="opacity-90">({count})</span>
      </button>
    );
  }

  return (
    <KidsPanelMax className="max-w-6xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link
          href={`${pathPrefix}/ogretmen/odevler`}
          className="rounded-full border border-indigo-300 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-300 dark:hover:bg-indigo-900/30"
        >
          ← Ödev listesi
        </Link>
        <KidsSecondaryButton type="button" onClick={() => void load()} disabled={loading}>
          {loading ? t('common.loading') : t('teacherHomework.refresh')}
        </KidsSecondaryButton>
      </div>

      <KidsCard tone="amber" className="border-2 border-violet-200 dark:border-violet-800">
        <div className="rounded-2xl bg-linear-to-r from-violet-300 via-fuchsia-200 to-amber-200 p-1.5 shadow-inner dark:from-violet-800 dark:via-fuchsia-900 dark:to-amber-900/80">
          <div className="flex flex-wrap gap-1">
            <FilterBtn value="all" label={t('teacherHomework.submissionsTabAll')} count={rows.length} />
            <FilterBtn value="done" label={t('teacherHomework.submissionsTabDone')} count={doneRows.length} />
            <FilterBtn value="missing" label={t('teacherHomework.submissionsTabMissing')} count={notSubmittedRows.length} />
          </div>
        </div>

        {filter === 'missing' ? (
          notSubmittedRows.length === 0 ? (
            <p className="mt-6 text-center text-sm text-slate-500 dark:text-gray-400">Teslim etmeyen öğrenci yok.</p>
          ) : (
            <ul className="mt-5 space-y-2">
              {notSubmittedRows.map((row) => (
                <li
                  key={`not-${row.id}`}
                  className="flex flex-wrap items-baseline justify-between gap-2 rounded-2xl border-2 border-amber-200/80 bg-amber-50/60 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/30"
                >
                  <span className="font-bold text-amber-950 dark:text-amber-50">
                    {row.student.first_name} {row.student.last_name}
                  </span>
                  <span className="text-xs text-amber-900/80 dark:text-amber-200/90">{row.student.email}</span>
                </li>
              ))}
            </ul>
          )
        ) : visibleRows.length === 0 ? (
          <p className="mt-6 text-center text-sm text-slate-500 dark:text-gray-400">Bu filtrede teslim yok.</p>
        ) : (
          <div className="mt-5 space-y-2">
            {visibleRows.map((sub) => {
              const studentName = `${sub.student.first_name} ${sub.student.last_name}`.trim();
              const isOpen = openSubmissionId === sub.id;
              const headId = `${accordionBaseId}-h-${sub.id}`;
              const panelId = `${accordionBaseId}-p-${sub.id}`;
              return (
                <div
                  key={sub.id}
                  className="overflow-hidden rounded-xl border border-amber-200/80 text-xs dark:border-amber-700/60"
                >
                  <button
                    type="button"
                    id={headId}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    title={isOpen ? t('teacherHomework.accordionClose') : t('teacherHomework.accordionOpen')}
                    onClick={() => setOpenSubmissionId((prev) => (prev === sub.id ? null : sub.id))}
                    className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition hover:bg-amber-50/80 dark:hover:bg-amber-950/25"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white">{studentName}</p>
                      <p className="text-slate-600 dark:text-slate-300">{statusLabel(sub.status)}</p>
                    </div>
                    <svg
                      className={`h-5 w-5 shrink-0 text-violet-700 transition-transform dark:text-violet-300 ${isOpen ? 'rotate-180' : ''}`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  {isOpen ? (
                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={headId}
                      className="space-y-2 border-t border-amber-200/70 px-3 pb-3 pt-2 dark:border-amber-800/50"
                    >
                      {sub.student_note?.trim() ? (
                        <div className="rounded-lg border border-indigo-200/80 bg-indigo-50/50 p-2 dark:border-indigo-800/50 dark:bg-indigo-950/30">
                          <p className="text-[11px] font-bold text-indigo-900 dark:text-indigo-100">
                            {t('teacherHomework.studentNote')}
                          </p>
                          <p className="mt-0.5 whitespace-pre-wrap text-xs text-indigo-950 dark:text-indigo-100">
                            {sub.student_note.trim()}
                          </p>
                        </div>
                      ) : null}
                      {sub.parent_note?.trim() ? (
                        <div className="rounded-lg border border-fuchsia-200/80 bg-fuchsia-50/50 p-2 dark:border-fuchsia-800/50 dark:bg-fuchsia-950/30">
                          <p className="text-[11px] font-bold text-fuchsia-900 dark:text-fuchsia-100">
                            {t('teacherHomework.parentNote')}
                          </p>
                          <p className="mt-0.5 whitespace-pre-wrap text-xs text-fuchsia-950 dark:text-fuchsia-100">
                            {sub.parent_note.trim()}
                          </p>
                        </div>
                      ) : null}
                      {Array.isArray(sub.attachments) && sub.attachments.length > 0 ? (
                        <div className="rounded-lg border border-sky-200/80 bg-sky-50/60 p-2 dark:border-sky-800/50 dark:bg-sky-950/30">
                          <p className="mb-1 text-[11px] font-bold text-sky-900 dark:text-sky-100">
                            {t('teacherHomework.studentUploads')}
                          </p>
                          <MediaSlider
                            items={sub.attachments.map<MediaItem>((att) => ({
                              url: isImageAttachment(att.content_type, att.original_name)
                                ? att.url
                                : filePlaceholderUrl(att.original_name || 'dosya', t('homework.attachmentLabel')),
                              type: 'image',
                            }))}
                            className="h-48"
                            alt={studentName}
                            fit="contain"
                          />
                          <div className="mt-2 flex flex-wrap gap-2">
                            {sub.attachments.map((att) => (
                              <a
                                key={att.id}
                                href={att.url}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-full border border-sky-300 px-2 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-100 dark:border-sky-700 dark:text-sky-200 dark:hover:bg-sky-900/40"
                              >
                                {att.original_name || `${t('homework.attachmentLabel')} #${att.id}`}
                              </a>
                            ))}
                          </div>
                        </div>
                      ) : sub.status !== 'published' ? (
                        <div className="rounded-lg border border-amber-300/80 bg-amber-50/70 p-2 dark:border-amber-800/60 dark:bg-amber-950/40">
                          <p className="text-[11px] font-bold text-amber-950 dark:text-amber-100">
                            {t('teacherHomework.noStudentUploads')}
                          </p>
                          <p className="mt-1 text-[11px] leading-snug text-amber-900/90 dark:text-amber-200/90">
                            {t('teacherHomework.noStudentUploadsHint')}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </KidsCard>
    </KidsPanelMax>
  );
}
