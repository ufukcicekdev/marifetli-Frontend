'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  kidsListTeacherHomeworkSubmissionsByHomework,
  kidsTeacherReviewHomeworkSubmission,
  type KidsHomeworkSubmission,
  type KidsHomeworkSubmissionOverview,
} from '@/src/lib/kids-api';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';
import { useKidsI18n } from '@/src/providers/kids-language-provider';
import {
  KidsCard,
  KidsPanelMax,
  KidsPrimaryButton,
  KidsSecondaryButton,
} from '@/src/components/kids/kids-ui';

type FilterTab = 'pending' | 'all' | 'done' | 'revision' | 'missing';

function statusLabel(status: KidsHomeworkSubmission['status']): string {
  switch (status) {
    case 'published':
      return 'Teslim etmedi';
    case 'student_done':
      return 'Öğrenci teslim etti (veli bekliyor)';
    case 'parent_approved':
      return 'Veli onayladı (öğretmen bekliyor)';
    case 'parent_rejected':
      return 'Veli revizyon istedi';
    case 'teacher_revision':
      return 'Öğretmen revizyon istedi';
    case 'teacher_approved':
      return 'Öğretmen onayladı';
    default:
      return status;
  }
}

export default function KidsTeacherHomeworkDetailPage() {
  const router = useRouter();
  const params = useParams<{ homeworkId: string }>();
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();
  const { t } = useKidsI18n();
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [overview, setOverview] = useState<KidsHomeworkSubmissionOverview | null>(null);
  const [filter, setFilter] = useState<FilterTab>('pending');

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
  const waitingTeacherRows = useMemo(() => rows.filter((s) => s.status === 'parent_approved'), [rows]);
  const revisionRows = useMemo(
    () => rows.filter((s) => s.status === 'parent_rejected' || s.status === 'teacher_revision'),
    [rows],
  );
  const doneRows = useMemo(
    () => rows.filter((s) => s.status === 'teacher_approved' || s.status === 'teacher_revision'),
    [rows],
  );

  const visibleRows = useMemo(() => {
    if (filter === 'pending') return waitingTeacherRows;
    if (filter === 'done') return doneRows;
    if (filter === 'revision') return revisionRows;
    if (filter === 'missing') return [];
    return rows;
  }, [doneRows, filter, revisionRows, rows, waitingTeacherRows]);

  async function reviewSubmission(submissionId: number, approved: boolean) {
    setReviewingId(submissionId);
    try {
      await kidsTeacherReviewHomeworkSubmission(submissionId, { approved });
      toast.success(approved ? t('teacherHomework.approved') : t('teacherHomework.revisionRequested'));
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('teacherHomework.reviewSaveFailed'));
    } finally {
      setReviewingId(null);
    }
  }

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
      <div className="mb-4 flex items-center justify-between gap-2">
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

      <KidsCard className="mb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-fuchsia-600 dark:text-fuchsia-400">ODEV DETAY</p>
            <h1 className="font-logo mt-1 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
              {overview?.homework?.title || 'Ödev'}
            </h1>
            {overview?.homework?.description ? (
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{overview.homework.description}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 text-center">
            <div className="rounded-xl bg-amber-50 px-3 py-2 dark:bg-amber-950/40">
              <p className="text-lg font-black text-amber-900 dark:text-amber-100">{waitingTeacherRows.length}</p>
              <p className="text-[10px] font-extrabold uppercase text-amber-950 dark:text-amber-100">Bekleyen</p>
            </div>
            <div className="rounded-xl bg-emerald-50 px-3 py-2 dark:bg-emerald-950/40">
              <p className="text-lg font-black text-emerald-900 dark:text-emerald-100">{doneRows.length}</p>
              <p className="text-[10px] font-extrabold uppercase text-emerald-950 dark:text-emerald-100">Tamam</p>
            </div>
            <div className="rounded-xl bg-violet-50 px-3 py-2 dark:bg-violet-950/40">
              <p className="text-lg font-black text-violet-900 dark:text-violet-100">{submittedRows.length}</p>
              <p className="text-[10px] font-extrabold uppercase text-violet-950 dark:text-violet-100">Teslim</p>
            </div>
          </div>
        </div>
      </KidsCard>

      <KidsCard tone="amber" className="border-2 border-violet-200 dark:border-violet-800">
        <div className="rounded-2xl bg-linear-to-r from-violet-300 via-fuchsia-200 to-amber-200 p-1.5 shadow-inner dark:from-violet-800 dark:via-fuchsia-900 dark:to-amber-900/80">
          <div className="flex flex-wrap gap-1">
            <FilterBtn value="pending" label="Bekleyen" count={waitingTeacherRows.length} />
            <FilterBtn value="all" label="Tümü" count={rows.length} />
            <FilterBtn value="done" label="Tamam" count={doneRows.length} />
            <FilterBtn value="revision" label="Revizyon" count={revisionRows.length} />
            <FilterBtn value="missing" label="Teslim etmeyen" count={notSubmittedRows.length} />
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
            {visibleRows.map((sub) => (
              <div key={sub.id} className="rounded-xl border border-amber-200/80 p-3 text-xs dark:border-amber-700/60">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {sub.student.first_name} {sub.student.last_name}
                    </p>
                    <p className="text-slate-600 dark:text-slate-300">{statusLabel(sub.status)}</p>
                  </div>
                </div>
                {sub.status === 'parent_approved' ? (
                  <div className="mt-2 flex gap-2">
                    <KidsPrimaryButton
                      type="button"
                      disabled={reviewingId !== null}
                      onClick={() => void reviewSubmission(sub.id, true)}
                    >
                      {reviewingId === sub.id ? '...' : t('teacherHomework.approve')}
                    </KidsPrimaryButton>
                    <KidsSecondaryButton
                      type="button"
                      disabled={reviewingId !== null}
                      onClick={() => void reviewSubmission(sub.id, false)}
                    >
                      {t('teacherHomework.askRevision')}
                    </KidsSecondaryButton>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </KidsCard>
    </KidsPanelMax>
  );
}
