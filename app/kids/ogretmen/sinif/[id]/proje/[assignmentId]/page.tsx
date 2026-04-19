'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import {
  kidsFormatAssignmentWindowTr,
  kidsGetAssignmentSubmissions,
  type KidsAssignment,
  type KidsTeacherSubmission,
  type KidsUser,
} from '@/src/lib/kids-api';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';
import { KidsTeacherStudentSubmissionsRow } from '@/src/components/kids/kids-teacher-student-submissions-row';
import { KidsCard, KidsPanelMax, kidsLabelClass } from '@/src/components/kids/kids-ui';
import { useKidsI18n } from '@/src/providers/kids-language-provider';

type FilterTab = 'all' | 'pending' | 'done' | 'star' | 'missing';

export default function KidsTeacherProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const classId = Number(params.id);
  const assignmentId = Number(params.assignmentId);
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();
  const { t, language } = useKidsI18n();

  const [assignment, setAssignment] = useState<KidsAssignment | null>(null);
  const [submissions, setSubmissions] = useState<KidsTeacherSubmission[]>([]);
  const [notSubmittedStudents, setNotSubmittedStudents] = useState<KidsUser[]>([]);
  const [pickSlots, setPickSlots] = useState<{ used: number; limit: number }>({ used: 0, limit: 5 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('pending');

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!Number.isFinite(classId) || !Number.isFinite(assignmentId)) return;
    const silent = opts?.silent === true;
    if (!silent) setLoading(true);
    try {
      const data = await kidsGetAssignmentSubmissions(classId, assignmentId);
      setAssignment(data.assignment);
      setSubmissions(data.submissions);
      setNotSubmittedStudents(data.not_submitted_students);
      setPickSlots({ used: data.teacher_pick_count, limit: data.teacher_pick_limit });
    } catch {
      toast.error(t('teacherProjectDetail.loadError'));
      if (!silent) router.replace(`${pathPrefix}/ogretmen/sinif/${classId}`);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [classId, assignmentId, pathPrefix, router, t]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      router.replace(kidsLoginPortalHref(pathPrefix, 'ogretmen'));
      return;
    }
    void load();
  }, [authLoading, user, router, pathPrefix, load]);

  const stats = useMemo(() => {
    const pending = submissions.filter((s) => !s.teacher_reviewed_at).length;
    const done = submissions.filter((s) => !!s.teacher_reviewed_at).length;
    const stars = submissions.filter((s) => s.is_teacher_pick).length;
    return { pending, done, stars, total: submissions.length };
  }, [submissions]);

  const visibleSubmissions = useMemo(() => {
    const sorted = [...submissions].sort((a, b) => {
      const ar = !!a.teacher_reviewed_at;
      const br = !!b.teacher_reviewed_at;
      if (ar !== br) return ar ? 1 : -1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    if (filter === 'pending') return sorted.filter((s) => !s.teacher_reviewed_at);
    if (filter === 'done') return sorted.filter((s) => !!s.teacher_reviewed_at);
    if (filter === 'star') return sorted.filter((s) => s.is_teacher_pick);
    return sorted;
  }, [submissions, filter]);

  /** Görünür teslimleri öğrenciye göre grupla; satırda yan yana tur kutuları. */
  const submissionRowsByStudent = useMemo(() => {
    const map = new Map<number, KidsTeacherSubmission[]>();
    for (const s of visibleSubmissions) {
      const sid = s.student.id;
      if (!map.has(sid)) map.set(sid, []);
      map.get(sid)!.push(s);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => {
        const ra = a.round_number ?? 1;
        const rb = b.round_number ?? 1;
        if (ra !== rb) return ra - rb;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
    }
    return Array.from(map.values()).sort((a, b) => {
      const aMax = Math.max(...a.map((x) => new Date(x.created_at).getTime()));
      const bMax = Math.max(...b.map((x) => new Date(x.created_at).getTime()));
      return bMax - aMax;
    });
  }, [visibleSubmissions]);

  /** Bekleyen teslim sırası — değerlendirme kaydından sonra “sonraki” buradan seçilir. */
  const pendingReviewQueue = useMemo(
    () =>
      [...submissions]
        .filter((s) => !s.teacher_reviewed_at)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [submissions],
  );

  const [activeReviewSubmissionId, setActiveReviewSubmissionId] = useState<number | null>(null);

  const onSubmissionUpdated = useCallback(
    async (opts?: { afterReviewOpenNextId?: number | null }) => {
      await load({ silent: true });
      if (opts && 'afterReviewOpenNextId' in opts) {
        setActiveReviewSubmissionId(opts.afterReviewOpenNextId ?? null);
      }
    },
    [load],
  );

  useEffect(() => {
    if (filter === 'pending' && stats.pending === 0 && stats.total > 0) {
      setFilter('all');
    }
  }, [filter, stats.pending, stats.total]);

  /** Filtre / liste değişince kart unmount olursa modal state takılı kalmasın */
  useEffect(() => {
    if (activeReviewSubmissionId == null) return;
    if (filter === 'missing') {
      setActiveReviewSubmissionId(null);
      return;
    }
    const stillVisible = visibleSubmissions.some((s) => s.id === activeReviewSubmissionId);
    if (!stillVisible) setActiveReviewSubmissionId(null);
  }, [activeReviewSubmissionId, filter, visibleSubmissions]);

  const filterLabel = useMemo<Record<FilterTab, string>>(
    () => ({
      pending: t('teacherProjectDetail.filter.pending'),
      all: t('teacherProjectDetail.filter.all'),
      done: t('teacherProjectDetail.filter.done'),
      star: t('teacherProjectDetail.filter.star'),
      missing: t('teacherProjectDetail.filter.missing'),
    }),
    [t],
  );

  if (authLoading || !user || (user.role !== 'teacher' && user.role !== 'admin')) {
    return (
      <KidsPanelMax>
        <p className="text-center text-violet-800 dark:text-violet-200">{t('common.loading')}</p>
      </KidsPanelMax>
    );
  }

  if (loading || !assignment) {
    return (
      <KidsPanelMax>
        <p className="text-center text-violet-800 dark:text-violet-200">{t('common.loading')}</p>
      </KidsPanelMax>
    );
  }

  const subN = assignment.submission_count ?? submissions.length;
  const enr = assignment.enrolled_student_count ?? 0;
  const windowLine = kidsFormatAssignmentWindowTr(assignment);

  function FilterBtn({ value, children }: { value: FilterTab; children: ReactNode }) {
    const on = filter === value;
    return (
      <button
        type="button"
        aria-current={on ? 'page' : undefined}
        onClick={() => setFilter(value)}
        className={`rounded-2xl px-3 py-2.5 text-sm font-black tracking-tight transition sm:px-4 ${
          on
            ? 'bg-white text-violet-950 shadow-lg ring-2 ring-fuchsia-500 ring-offset-2 ring-offset-violet-100 dark:bg-gray-950 dark:text-white dark:ring-fuchsia-400 dark:ring-offset-violet-950'
            : 'text-violet-950 hover:bg-white/75 dark:text-violet-100 dark:hover:bg-violet-900/50'
        }`}
      >
        {on ? <span className="mr-1 text-fuchsia-600 dark:text-fuchsia-400">✓</span> : null}
        {children}
      </button>
    );
  }

  return (
    <KidsPanelMax className="max-w-6xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`${pathPrefix}/ogretmen/sinif/${classId}`}
          className="inline-flex items-center gap-2 text-sm font-bold text-violet-700 hover:text-fuchsia-600 dark:text-violet-300 dark:hover:text-fuchsia-400"
        >
          <span aria-hidden>←</span> {t('teacherProjectDetail.backClass')}
        </Link>
      </div>

      <KidsCard className="mb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-fuchsia-600 dark:text-fuchsia-400">{t('nav.challenges')}</p>
            <h1 className="font-logo mt-1 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
              {assignment.title}
            </h1>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 text-center">
            <div className="rounded-xl bg-amber-50 px-3 py-2 dark:bg-amber-950/40">
              <p className="text-lg font-black text-amber-900 dark:text-amber-100">{stats.pending}</p>
              <p className="text-[10px] font-extrabold uppercase text-amber-950 dark:text-amber-100">{t('teacherProjectDetail.pending')}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 px-3 py-2 dark:bg-emerald-950/40">
              <p className="text-lg font-black text-emerald-900 dark:text-emerald-100">{stats.done}</p>
              <p className="text-[10px] font-extrabold uppercase text-emerald-950 dark:text-emerald-100">{t('teacherProjectDetail.done')}</p>
            </div>
            <div className="rounded-xl bg-violet-50 px-3 py-2 dark:bg-violet-950/40">
              <p className="text-lg font-black text-violet-900 dark:text-violet-100">{subN}</p>
              <p className="text-[10px] font-extrabold uppercase text-violet-950 dark:text-violet-100">{t('teacherProjectDetail.submissions')}</p>
            </div>
          </div>
        </div>
        <p className="mt-2 text-sm text-slate-600 dark:text-gray-400">
          {t('teacherProjectDetail.enrolledStudents')}: {enr} · {t('teacherProjectDetail.stars')}: {pickSlots.used}/{pickSlots.limit}
        </p>
        {windowLine ? (
          <p className="mt-1 text-xs font-semibold text-violet-800 dark:text-violet-200">{windowLine}</p>
        ) : null}

        <details className="mt-4 rounded-xl border border-violet-100 bg-violet-50/40 open:bg-violet-50/60 dark:border-violet-900/40 dark:bg-violet-950/20 dark:open:bg-violet-950/35">
          <summary className="cursor-pointer list-none px-3 py-2 text-sm font-bold text-violet-800 marker:hidden dark:text-violet-200 [&::-webkit-details-marker]:hidden">
            {t('teacherProjectDetail.challengeDetailSummary')}
          </summary>
          <div className="border-t border-violet-100 px-3 pb-3 pt-2 text-sm dark:border-violet-900/50">
            <p className="text-xs text-slate-500 dark:text-gray-400">
              {assignment.require_video && assignment.require_image
                ? t('teacherProjectDetail.submissionType.imageOrVideo')
                  .replace('{sec}', String(assignment.video_max_seconds))
                  .replace('{rounds}', String(assignment.submission_rounds ?? 1))
                : assignment.require_video
                  ? t('teacherProjectDetail.submissionType.videoOnly')
                    .replace('{sec}', String(assignment.video_max_seconds))
                    .replace('{rounds}', String(assignment.submission_rounds ?? 1))
                  : assignment.require_image
                    ? t('teacherProjectDetail.submissionType.imageOnly').replace('{rounds}', String(assignment.submission_rounds ?? 1))
                    : t('teacherProjectDetail.submissionType.flexible')}
            </p>
            {assignment.purpose ? (
              <div className="mt-3">
                <p className={kidsLabelClass}>{t('teacherClass.assignments.purpose')}</p>
                <p className="mt-1 whitespace-pre-wrap text-slate-700 dark:text-gray-300">{assignment.purpose}</p>
              </div>
            ) : null}
            {assignment.materials ? (
              <div className="mt-3">
                <p className={kidsLabelClass}>{t('teacherClass.assignments.materials')}</p>
                <p className="mt-1 whitespace-pre-wrap text-slate-700 dark:text-gray-300">{assignment.materials}</p>
              </div>
            ) : null}
          </div>
        </details>
      </KidsCard>

      <KidsCard tone="amber" className="border-2 border-violet-200 dark:border-violet-800">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="font-logo text-lg font-bold text-slate-900 dark:text-white">{t('teacherProjectDetail.submissions')} 🎨</h2>
            <p className="mt-1 text-sm font-bold text-violet-800 dark:text-violet-200">
              {t('teacherProjectDetail.selectedFilter').replace('{label}', filterLabel[filter])}
            </p>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-gray-400">{t('teacherProjectDetail.submissionsHelp')}</p>
          </div>
          <div
            className="rounded-2xl bg-linear-to-r from-violet-300 via-fuchsia-200 to-amber-200 p-1.5 shadow-inner dark:from-violet-800 dark:via-fuchsia-900 dark:to-amber-900/80"
            role="tablist"
            aria-label={t('teacherProjectDetail.submissionFilterAria')}
          >
            <div className="flex flex-wrap gap-1">
              <FilterBtn value="pending">
                {t('teacherProjectDetail.filterBtn.pending')} <span className="opacity-90">({stats.pending})</span>
              </FilterBtn>
              <FilterBtn value="all">
                {t('teacherProjectDetail.filterBtn.all')} <span className="opacity-90">({stats.total})</span>
              </FilterBtn>
              <FilterBtn value="done">
                {t('teacherProjectDetail.filterBtn.done')} <span className="opacity-90">({stats.done})</span>
              </FilterBtn>
              <FilterBtn value="star">
                {t('teacherProjectDetail.filterBtn.star')} <span className="opacity-90">({stats.stars})</span>
              </FilterBtn>
              <FilterBtn value="missing">
                {t('teacherProjectDetail.filterBtn.missing')}{' '}
                <span className="opacity-90">({notSubmittedStudents.length})</span>
              </FilterBtn>
            </div>
          </div>
        </div>

        {filter === 'missing' ? (
          notSubmittedStudents.length === 0 ? (
            <p className="mt-6 text-center text-sm text-slate-500 dark:text-gray-400">
              {(assignment.enrolled_student_count ?? 0) === 0
                ? t('teacherProjectDetail.emptyMissing.noEnrolled')
                : t('teacherProjectDetail.emptyMissing.allSubmitted')}
            </p>
          ) : (
            <ul className="mt-5 space-y-2">
              {notSubmittedStudents.map((stu) => {
                const label = [stu.first_name, stu.last_name].filter(Boolean).join(' ').trim() || stu.student_login_name || stu.email;
                return (
                  <li
                    key={stu.id}
                    className="flex flex-wrap items-baseline justify-between gap-2 rounded-2xl border-2 border-amber-200/80 bg-amber-50/60 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/30"
                  >
                    <span className="font-bold text-amber-950 dark:text-amber-50">{label}</span>
                    <span className="text-xs text-amber-900/80 dark:text-amber-200/90">{stu.student_login_name || stu.email}</span>
                  </li>
                );
              })}
            </ul>
          )
        ) : visibleSubmissions.length === 0 ? (
          <p className="mt-6 text-center text-sm text-slate-500 dark:text-gray-400">
            {stats.total === 0
              ? t('teacherProjectDetail.empty.noneYet')
              : filter === 'pending'
                ? t('teacherProjectDetail.empty.noPending')
                : t('teacherProjectDetail.empty.noneForFilter')}
          </p>
        ) : (
          <ul className="mt-5 space-y-3">
            {submissionRowsByStudent.map((subs) => (
              <KidsTeacherStudentSubmissionsRow
                key={subs[0].student.id}
                classId={classId}
                subs={subs}
                pickSlots={pickSlots}
                onUpdated={onSubmissionUpdated}
                reviewFlow={{
                  activeSubmissionId: activeReviewSubmissionId,
                  setActiveSubmissionId: setActiveReviewSubmissionId,
                  pendingQueue: pendingReviewQueue,
                }}
              />
            ))}
          </ul>
        )}
      </KidsCard>
    </KidsPanelMax>
  );
}
