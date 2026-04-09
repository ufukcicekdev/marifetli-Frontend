'use client';

import { useCallback, useEffect, useId, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';
import {
  kidsDeleteParentHomeworkSubmissionAttachment,
  KIDS_CLASS_SPECIAL_GRADE,
  kidsParseStandardClassName,
  kidsParentChildrenOverview,
  kidsParentKindergartenRecords,
  kidsParentReviewHomeworkSubmission,
  type KidsKindergartenDailyRecordRow,
  type KidsParentChildOverview,
} from '@/src/lib/kids-api';
import { BookOpen, Calendar, ClipboardList, Gamepad2, Sparkles, Sun } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { KidsCenteredModal, KidsPanelMax, KidsPrimaryButton, KidsSecondaryButton } from '@/src/components/kids/kids-ui';
import { ChildStatusSummaryCard, LearningAnalyticsSection } from './child-status-summary-card';
import { MediaSlider } from '@/src/components/media-slider';
import type { MediaItem } from '@/src/lib/extract-media';
import { useKidsI18n } from '@/src/providers/kids-language-provider';

function isImageAttachment(contentType: string, fileName: string): boolean {
  const ct = (contentType || '').toLowerCase();
  if (ct.startsWith('image/')) return true;
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(fileName || '');
}

function kgBoolTriLabel(v: boolean | null | undefined, t: (key: string) => string): string {
  if (v === true) return t('teacherClass.kindergarten.triYes');
  if (v === false) return t('teacherClass.kindergarten.triNo');
  return t('teacherClass.kindergarten.triUnset');
}

function kgFormatSlotsOrLegacy(
  slots: unknown,
  legacyOk: boolean | null | undefined,
  t: (key: string) => string,
): ReactNode {
  if (Array.isArray(slots) && slots.length > 0) {
    return (
      <ul className="list-none space-y-0.5 text-xs leading-snug">
        {(slots as { label?: string; ok?: boolean | null }[]).map((s, i) => {
          const lab = String(s?.label ?? '').trim() || '—';
          return (
            <li key={i}>
              <span className="font-semibold text-slate-800 dark:text-slate-100">{lab}:</span>{' '}
              {kgBoolTriLabel(s?.ok ?? null, t)}
            </li>
          );
        })}
      </ul>
    );
  }
  return kgBoolTriLabel(legacyOk ?? null, t);
}

/** (doğru/soru)×100, en fazla bir ondalık; soru başı puan = 100/n. */
function testScoreOutOf100Label(totalCorrect: number, totalQuestions: number): string {
  const n = Number(totalQuestions) || 0;
  if (n <= 0) return '0';
  const v = Math.round(((Number(totalCorrect) || 0) / n) * 1000) / 10;
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

function filePlaceholderUrl(fileName: string, label: string): string {
  const ext = (fileName.split('.').pop() || 'DOSYA').toUpperCase().slice(0, 6);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540"><rect width="960" height="540" fill="#FEF3C7"/><rect x="360" y="120" width="240" height="300" rx="24" fill="#FDE68A"/><path d="M520 120v76c0 13 11 24 24 24h56" fill="#FCD34D"/><path d="M520 120l80 100" stroke="#F59E0B" stroke-width="10"/><text x="480" y="300" text-anchor="middle" font-family="Arial, sans-serif" font-size="40" font-weight="700" fill="#92400E">${ext}</text><text x="480" y="345" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" fill="#B45309">${label}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Veli özeti: sınıf adı Anaokulu-X / Anasınıfı-X vb. ise günlük tablosu gösterilir. */
function childIsPreschoolProgram(c: KidsParentChildOverview): boolean {
  return (c.classes ?? []).some((cl) => {
    const k = cl.class_kind;
    if (k === 'anasinifi' || k === 'kindergarten') return true;
    const p = kidsParseStandardClassName(cl.name);
    return p?.grade === KIDS_CLASS_SPECIAL_GRADE.PRE_PRIMARY;
  });
}

function DetailPanelEmpty({ icon: Icon, message }: { icon: LucideIcon; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-violet-200/70 bg-gradient-to-b from-violet-50/60 to-transparent py-14 px-6 text-center dark:border-violet-800/50 dark:from-violet-950/30">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100/90 text-violet-500 shadow-inner dark:bg-violet-900/55 dark:text-violet-300">
        <Icon className="h-7 w-7" strokeWidth={1.5} aria-hidden />
      </div>
      <p className="max-w-sm text-sm font-medium leading-relaxed text-slate-600 dark:text-zinc-400">{message}</p>
    </div>
  );
}

export default function KidsParentChildrenStatusPage() {
  const router = useRouter();
  const { user, loading, pathPrefix } = useKidsAuth();
  const { t, language } = useKidsI18n();
  const [overview, setOverview] = useState<KidsParentChildOverview[] | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [reviewingSubmissionId, setReviewingSubmissionId] = useState<number | null>(null);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    submissionId: number;
    attachmentId: number;
    fileName?: string;
    currentAttachmentCount?: number;
  } | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [detailModalChildId, setDetailModalChildId] = useState<number | null>(null);
  const [openPendingDetailId, setOpenPendingDetailId] = useState<number | null>(null);
  const [activityTab, setActivityTab] = useState<'challenges' | 'homework' | 'tests' | 'preschool'>('challenges');
  const activityTabsId = useId();
  const [kgYearMonth, setKgYearMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [kgRecords, setKgRecords] = useState<KidsKindergartenDailyRecordRow[]>([]);
  const [kgRecordsLoading, setKgRecordsLoading] = useState(false);
  const [kgRecordsError, setKgRecordsError] = useState<string | null>(null);
  const homeworkAccordionBaseId = useId();
  const [expandedHomeworkSubmissionId, setExpandedHomeworkSubmissionId] = useState<number | null>(null);
  const homeworkStatusLabel: Record<string, string> = {
    published: t('homework.status.published'),
    student_done: t('homework.status.studentDone'),
    parent_approved: t('homework.status.parentApproved'),
    parent_rejected: t('homework.status.parentRejected'),
    teacher_approved: t('homework.status.teacherApproved'),
    teacher_revision: t('homework.status.teacherRevision'),
  };
  const challengeStatusLabel: Record<string, string> = {
    approved: t('childrenStatus.challengeApproved'),
    completed: t('childrenStatus.challengeCompleted'),
    rejected: t('childrenStatus.challengeRejected'),
    pending_teacher: t('childrenStatus.challengePendingTeacher'),
    pending_parent: t('childrenStatus.challengePendingParent'),
  };

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
      setOverviewError(e instanceof Error ? e.message : t('childrenStatus.overviewError'));
      setOverview(null);
      setSelectedChildId('');
    } finally {
      setOverviewLoading(false);
    }
  }, [t]);

  const loadPreschoolRecords = useCallback(async () => {
    const sid = Number(selectedChildId);
    if (!Number.isFinite(sid) || sid <= 0) return;
    setKgRecordsLoading(true);
    setKgRecordsError(null);
    try {
      const { records } = await kidsParentKindergartenRecords(sid, kgYearMonth);
      setKgRecords(records);
    } catch (e) {
      setKgRecordsError(e instanceof Error ? e.message : t('childrenStatus.preschoolLoadError'));
      setKgRecords([]);
    } finally {
      setKgRecordsLoading(false);
    }
  }, [selectedChildId, kgYearMonth, t]);

  useEffect(() => {
    if (activityTab !== 'preschool') return;
    void loadPreschoolRecords();
  }, [activityTab, loadPreschoolRecords]);

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

  useEffect(() => {
    setExpandedHomeworkSubmissionId(null);
  }, [selectedChildId]);

  async function markSubmittedReviewed(submissionId: number, approved: boolean) {
    setReviewingSubmissionId(submissionId);
    try {
      await kidsParentReviewHomeworkSubmission(submissionId, { approved });
      toast.success(approved ? t('parent.panel.reviewSent') : t('teacherHomework.revisionRequested'));
      await loadOverview();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('parent.panel.reviewSaveFailed'));
    } finally {
      setReviewingSubmissionId(null);
    }
  }

  async function deleteSubmissionAttachment(
    submissionId: number,
    attachmentId: number,
    fileName?: string,
    currentAttachmentCount?: number,
  ) {
    setPendingDelete({ submissionId, attachmentId, fileName, currentAttachmentCount });
  }

  async function confirmDeleteSubmissionAttachment() {
    if (!pendingDelete) return;
    const { submissionId, attachmentId, currentAttachmentCount } = pendingDelete;
    setPendingDelete(null);
    setDeletingAttachmentId(attachmentId);
    try {
      await kidsDeleteParentHomeworkSubmissionAttachment(submissionId, attachmentId);
      if ((currentAttachmentCount ?? 0) <= 1) {
        await kidsParentReviewHomeworkSubmission(submissionId, { approved: false });
        toast.success('Son gorsel silindi, teslim ogrenciye revizyona geri gonderildi');
      } else {
        toast.success('Gorsel silindi');
      }
      await loadOverview();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gorsel silinemedi');
    } finally {
      setDeletingAttachmentId(null);
    }
  }

  if (loading || !user || user.role !== 'parent') {
    return (
      <KidsPanelMax>
        <p className="text-center text-violet-800 dark:text-violet-200">{t('common.loading')}</p>
      </KidsPanelMax>
    );
  }

  const childrenList = overview ?? [];
  const modalChild =
    detailModalChildId != null
      ? (childrenList.find((x) => x.id === detailModalChildId) ?? null)
      : null;
  const todayLabel = new Date().toLocaleDateString(
    language === 'en' ? 'en-US' : language === 'ge' ? 'de-DE' : 'tr-TR',
    { weekday: 'long', day: 'numeric', month: 'long' },
  );

  return (
    <KidsPanelMax className="max-w-7xl">
      <main className="space-y-12 pb-12">
        <section className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-400">
              {t('childrenStatus.mockupEyebrow')}
            </span>
            <h1 className="font-logo text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white lg:text-5xl xl:text-6xl">
              {t('parent.panel.childrenStatusTitle')}
            </h1>
            <p className="max-w-xl text-lg text-slate-600 dark:text-zinc-400">
              {t('childrenStatus.mockupHeroSubtitle')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-4 rounded-2xl bg-slate-100/90 p-5 shadow-inner dark:bg-zinc-800/80">
              <div className="rounded-xl bg-amber-100 p-3 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                <Calendar className="h-6 w-6" strokeWidth={2} />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">{t('childrenStatus.mockupToday')}</p>
                <p className="font-bold capitalize text-slate-900 dark:text-white">{todayLabel}</p>
              </div>
            </div>
            <KidsSecondaryButton type="button" onClick={() => void loadOverview()} disabled={overviewLoading}>
              {overviewLoading ? t('parent.panel.refreshing') : t('parent.panel.refresh')}
            </KidsSecondaryButton>
          </div>
        </section>

        {overviewError ? (
          <p className="rounded-xl border border-amber-300/80 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
            {overviewError}
          </p>
        ) : null}

        <section className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          {overviewLoading && childrenList.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-500 dark:text-zinc-400">{t('common.loading')}</div>
          ) : null}
          {!overviewLoading && childrenList.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-500 dark:text-zinc-400">
              {t('childrenStatus.noChildToDisplay')}
            </div>
          ) : null}
          {childrenList.map((c, index) => (
            <ChildStatusSummaryCard
              key={c.id}
              child={c}
              index={index}
              t={t}
              challengeStatusLabel={challengeStatusLabel}
              homeworkStatusLabel={homeworkStatusLabel}
              hasPreschool={childIsPreschoolProgram(c)}
              onOpenDetail={() => {
                setSelectedChildId(String(c.id));
                setExpandedHomeworkSubmissionId(null);
                setOpenPendingDetailId(null);
                setDetailModalChildId(c.id);
                setActivityTab((tab) =>
                  tab === 'preschool' && !childIsPreschoolProgram(c) ? 'challenges' : tab,
                );
              }}
            />
          ))}
        </section>

        {childrenList.length > 0 ? (
          <LearningAnalyticsSection childrenList={childrenList} pathPrefix={pathPrefix} t={t} />
        ) : null}

      {detailModalChildId != null && modalChild ? (
        <KidsCenteredModal
          title={`${modalChild.first_name} ${modalChild.last_name}`}
          onClose={() => setDetailModalChildId(null)}
          maxWidthClass="max-w-4xl"
          panelClassName="ring-2 ring-violet-200/50 shadow-[0_32px_80px_-20px_rgba(109,40,217,0.32)] dark:ring-violet-700/35 dark:shadow-[0_32px_80px_-20px_rgba(0,0,0,0.55)]"
        >
          {(() => {
            const c = modalChild;
            return (
          <div
            key={c.id}
            className="relative overflow-hidden rounded-3xl border border-violet-200/55 bg-gradient-to-br from-white via-violet-50/40 to-fuchsia-50/25 p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.65)] dark:border-violet-800/45 dark:from-zinc-900 dark:via-violet-950/30 dark:to-fuchsia-950/15 sm:p-6"
          >
            <div
              className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-violet-400/15 blur-3xl dark:bg-violet-600/15"
              aria-hidden
            />
            <div className="relative space-y-5">
            <div className="flex gap-4 rounded-2xl border border-violet-100/90 bg-white/70 p-4 backdrop-blur-sm dark:border-violet-900/40 dark:bg-violet-950/35">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-600/30">
                <Sparkles className="h-7 w-7" strokeWidth={2} aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug text-slate-800 dark:text-slate-100">
                  <span className="font-bold text-violet-800 dark:text-violet-200">{t('parent.panel.growthPoints')}:</span>{' '}
                  <span className="text-xl font-black tabular-nums text-slate-900 dark:text-white">
                    {Number(c.growth_points ?? 0)}
                  </span>
                  {c.growth_stage ? (
                    <>
                      <span className="text-slate-400 dark:text-slate-500"> · </span>
                      <span className="font-bold text-slate-900 dark:text-white">{c.growth_stage.title}</span>
                    </>
                  ) : null}
                </p>
                {c.growth_stage?.subtitle ? (
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">{c.growth_stage.subtitle}</p>
                ) : null}
              </div>
            </div>

            {(c.pending_parent_actions ?? []).length > 0 ? (
              <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50/80 px-3 py-2 dark:border-violet-800 dark:bg-violet-950/40">
              <p className="text-xs font-bold text-violet-900 dark:text-violet-100">{t('childrenStatus.pendingParentHomeworks')}</p>
                <ul className="mt-2 space-y-2">
                  {(c.pending_parent_actions ?? []).map((it, idx) => (
                    <li
                      key={`${it.submission_id}-${idx}`}
                      className="rounded-lg border border-violet-200/80 bg-white/80 px-2.5 py-2 text-sm dark:border-violet-700 dark:bg-violet-950/40"
                    >
                      {(() => {
                        const history = (c.homework_history ?? []).find((hw) => hw.submission_id === it.submission_id) ?? null;
                        const isDetailOpen = openPendingDetailId === it.submission_id;
                        return (
                          <>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-semibold text-violet-950 dark:text-violet-100">{it.assignment_title}</p>
                                <p className="text-xs text-violet-800/90 dark:text-violet-200/80">{it.class_name}</p>
                                {Array.isArray(it.submission_attachments) && it.submission_attachments.length > 0 ? (
                                  <p className="text-xs text-violet-700/80 dark:text-violet-200/70">
                                    {it.submission_attachments.length} gorsel eklendi
                                  </p>
                                ) : null}
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <KidsSecondaryButton
                                  type="button"
                                  onClick={() => {
                                    setOpenPendingDetailId((prev) => (prev === it.submission_id ? null : it.submission_id));
                                  }}
                                >
                                  {isDetailOpen ? t('homework.detailClose') : t('homework.detailOpen')}
                                </KidsSecondaryButton>
                                <KidsSecondaryButton
                                  type="button"
                                  disabled={reviewingSubmissionId === it.submission_id}
                                  onClick={() => void markSubmittedReviewed(it.submission_id, false)}
                                >
                                  Revizyon iste
                                </KidsSecondaryButton>
                                <KidsPrimaryButton
                                  type="button"
                                  disabled={
                                    reviewingSubmissionId === it.submission_id ||
                                    !Array.isArray(it.submission_attachments) ||
                                    it.submission_attachments.length === 0
                                  }
                                  onClick={() => void markSubmittedReviewed(it.submission_id, true)}
                                >
                                  {reviewingSubmissionId === it.submission_id ? t('profile.saving') : t('childrenStatus.submitted')}
                                </KidsPrimaryButton>
                              </div>
                            </div>
                            {isDetailOpen ? (
                              <div className="mt-2 space-y-2 rounded-lg border border-slate-200/80 bg-slate-50/70 p-2 dark:border-slate-700/70 dark:bg-slate-900/40">
                                {history?.description ? (
                                  <p className="whitespace-pre-wrap text-xs text-slate-700 dark:text-slate-200">{history.description}</p>
                                ) : null}
                                {Array.isArray(history?.attachments) && history.attachments.length > 0 ? (
                                  <div className="space-y-2">
                                    <p className="text-xs font-semibold text-amber-900 dark:text-amber-100">Ogretmen dosyalari</p>
                                    <MediaSlider
                                      items={history.attachments.map<MediaItem>((att) => ({
                                        url: isImageAttachment(att.content_type, att.original_name)
                                          ? att.url
                                          : filePlaceholderUrl(att.original_name || 'dosya', t('homework.attachmentLabel')),
                                        type: 'image',
                                      }))}
                                      className="h-44"
                                      alt={history.title}
                                      fit="contain"
                                    />
                                  </div>
                                ) : null}
                                {Array.isArray(it.submission_attachments) && it.submission_attachments.length > 0 ? (
                                  <div className="space-y-2">
                                    <p className="text-xs font-semibold text-sky-900 dark:text-sky-100">Ogrenci gorselleri</p>
                                    <MediaSlider
                                      key={it.submission_attachments.map((a) => a.id).join('|')}
                                      items={it.submission_attachments.map<MediaItem>((att) => ({
                                        url: isImageAttachment(att.content_type, att.original_name)
                                          ? att.url
                                          : filePlaceholderUrl(att.original_name || 'dosya', t('homework.attachmentLabel')),
                                        type: 'image',
                                      }))}
                                      className="h-44"
                                      alt={`${it.assignment_title} ogrenci gorselleri`}
                                      fit="contain"
                                      deleteDisabled={deletingAttachmentId !== null}
                                      onDeleteAtIndex={(itemIndex) => {
                                        const att = it.submission_attachments[itemIndex];
                                        if (!att) return;
                                        void deleteSubmissionAttachment(
                                          it.submission_id,
                                          att.id,
                                          att.original_name,
                                          it.submission_attachments.length,
                                        );
                                      }}
                                    />
                                  </div>
                                ) : null}
                              </div>
                            ) : null}
                          </>
                        );
                      })()}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-5">
              <div
                className={`grid gap-1.5 rounded-2xl border border-slate-200/90 bg-slate-100/90 p-1.5 shadow-inner dark:border-zinc-700/80 dark:bg-zinc-800/90 ${
                  childIsPreschoolProgram(c) ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'
                }`}
                role="tablist"
                aria-label={
                  childIsPreschoolProgram(c)
                    ? `${t('childrenStatus.challengeHistory')}, ${t('childrenStatus.homeworkHistory')}, ${t('childrenStatus.testResultsTab')}, ${t('childrenStatus.preschoolTab')}`
                    : `${t('childrenStatus.challengeHistory')}, ${t('childrenStatus.homeworkHistory')}, ${t('childrenStatus.testResultsTab')}`
                }
              >
                <button
                  type="button"
                  role="tab"
                  id={`${activityTabsId}-challenges`}
                  aria-selected={activityTab === 'challenges'}
                  aria-controls={`${activityTabsId}-panel-challenges`}
                  onClick={() => setActivityTab('challenges')}
                  className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-2 py-2 text-xs font-bold transition-all sm:text-sm ${
                    activityTab === 'challenges'
                      ? 'bg-white text-violet-800 shadow-md ring-1 ring-violet-200/80 dark:bg-violet-950 dark:text-violet-50 dark:ring-violet-700/50'
                      : 'text-slate-600 hover:bg-white/80 dark:text-zinc-400 dark:hover:bg-zinc-700/60'
                  }`}
                >
                  <Gamepad2 className="h-4 w-4 shrink-0 opacity-85" aria-hidden />
                  <span className="text-center leading-tight">{t('childrenStatus.challengeHistory')}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  id={`${activityTabsId}-homework`}
                  aria-selected={activityTab === 'homework'}
                  aria-controls={`${activityTabsId}-panel-homework`}
                  onClick={() => setActivityTab('homework')}
                  className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-2 py-2 text-xs font-bold transition-all sm:text-sm ${
                    activityTab === 'homework'
                      ? 'bg-white text-violet-800 shadow-md ring-1 ring-violet-200/80 dark:bg-violet-950 dark:text-violet-50 dark:ring-violet-700/50'
                      : 'text-slate-600 hover:bg-white/80 dark:text-zinc-400 dark:hover:bg-zinc-700/60'
                  }`}
                >
                  <BookOpen className="h-4 w-4 shrink-0 opacity-85" aria-hidden />
                  <span className="text-center leading-tight">{t('childrenStatus.homeworkHistory')}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  id={`${activityTabsId}-tests`}
                  aria-selected={activityTab === 'tests'}
                  aria-controls={`${activityTabsId}-panel-tests`}
                  onClick={() => setActivityTab('tests')}
                  className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-2 py-2 text-xs font-bold transition-all sm:text-sm ${
                    activityTab === 'tests'
                      ? 'bg-white text-violet-800 shadow-md ring-1 ring-violet-200/80 dark:bg-violet-950 dark:text-violet-50 dark:ring-violet-700/50'
                      : 'text-slate-600 hover:bg-white/80 dark:text-zinc-400 dark:hover:bg-zinc-700/60'
                  }`}
                >
                  <ClipboardList className="h-4 w-4 shrink-0 opacity-85" aria-hidden />
                  <span className="text-center leading-tight">{t('childrenStatus.testResultsTab')}</span>
                </button>
                {childIsPreschoolProgram(c) ? (
                  <button
                    type="button"
                    role="tab"
                    id={`${activityTabsId}-preschool`}
                    aria-selected={activityTab === 'preschool'}
                    aria-controls={`${activityTabsId}-panel-preschool`}
                    onClick={() => setActivityTab('preschool')}
                    className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-2 py-2 text-xs font-bold transition-all sm:text-sm ${
                      activityTab === 'preschool'
                        ? 'bg-white text-violet-800 shadow-md ring-1 ring-violet-200/80 dark:bg-violet-950 dark:text-violet-50 dark:ring-violet-700/50'
                        : 'text-slate-600 hover:bg-white/80 dark:text-zinc-400 dark:hover:bg-zinc-700/60'
                    }`}
                  >
                    <Sun className="h-4 w-4 shrink-0 opacity-85" aria-hidden />
                    <span className="text-center leading-tight">{t('childrenStatus.preschoolTab')}</span>
                  </button>
                ) : null}
              </div>

              {activityTab === 'challenges' ? (
                <div
                  id={`${activityTabsId}-panel-challenges`}
                  role="tabpanel"
                  aria-labelledby={`${activityTabsId}-challenges`}
                  className="mt-3"
                >
                  {(c.challenges ?? []).length === 0 ? (
                    <DetailPanelEmpty icon={Gamepad2} message={t('childrenStatus.noChallengeRecord')} />
                  ) : (
                    <ul className="space-y-2">
                      {(c.challenges ?? []).map((ch, idx) => (
                        <li
                          key={`${ch.id ?? ch.title}-${idx}`}
                          className="rounded-2xl border border-violet-100/90 bg-white/90 px-3 py-2.5 shadow-sm dark:border-violet-900/40 dark:bg-zinc-900/60"
                        >
                          <p className="font-semibold text-slate-900 dark:text-white">{ch.title}</p>
                          <p className="text-xs text-slate-600 dark:text-gray-400">
                            {ch.class_name} · {challengeStatusLabel[ch.status] ?? ch.status}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}

              {activityTab === 'homework' ? (
                <div
                  id={`${activityTabsId}-panel-homework`}
                  role="tabpanel"
                  aria-labelledby={`${activityTabsId}-homework`}
                  className="mt-3"
                >
                  {(c.homework_history ?? []).length === 0 ? (
                    <DetailPanelEmpty icon={BookOpen} message={t('childrenStatus.noHomeworkRecord')} />
                  ) : (
                    <ul className="space-y-2">
                      {(c.homework_history ?? []).map((hw) => {
                        const isHwOpen = expandedHomeworkSubmissionId === hw.submission_id;
                        const hwHeadId = `${homeworkAccordionBaseId}-hw-${hw.submission_id}-h`;
                        const hwPanelId = `${homeworkAccordionBaseId}-hw-${hw.submission_id}-p`;
                        return (
                        <li
                          key={hw.submission_id}
                          className="overflow-hidden rounded-xl border border-amber-200/70 bg-white/85 dark:border-amber-800/50 dark:bg-gray-900/50"
                        >
                          <button
                            type="button"
                            id={hwHeadId}
                            aria-expanded={isHwOpen}
                            aria-controls={hwPanelId}
                            onClick={() =>
                              setExpandedHomeworkSubmissionId((prev) =>
                                prev === hw.submission_id ? null : hw.submission_id,
                              )
                            }
                            className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-amber-50/80 dark:hover:bg-amber-950/40"
                          >
                            <span
                              className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-200/80 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200 ${
                                isHwOpen ? 'rotate-180' : ''
                              } transition-transform duration-200`}
                              aria-hidden
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-slate-900 dark:text-white">{hw.title}</p>
                              <p className="text-xs text-slate-600 dark:text-gray-400">
                                {hw.class_name} · {homeworkStatusLabel[hw.status] ?? hw.status}
                              </p>
                            </div>
                          </button>
                          {isHwOpen ? (
                            <div
                              id={hwPanelId}
                              role="region"
                              aria-labelledby={hwHeadId}
                              className="border-t border-amber-200/60 px-3 pb-3 pt-2 dark:border-amber-800/40"
                            >
                          {(hw.teacher_display || hw.teacher_subject) ? (
                            <p className="text-xs text-amber-800/90 dark:text-amber-200/80">
                              {hw.teacher_display || t('childrenStatus.teacher')}
                              {hw.teacher_subject ? ` (${hw.teacher_subject})` : ''}
                            </p>
                          ) : null}
                          {hw.description ? (
                            <p className="mt-1 whitespace-pre-wrap text-xs text-slate-700 dark:text-slate-200">{hw.description}</p>
                          ) : null}
                          {hw.due_at ? (
                            <p className="mt-1 text-xs text-violet-800/90 dark:text-violet-200/80">
                              {t('teacherHomework.dueAt')}: {new Date(hw.due_at).toLocaleString(language, { dateStyle: 'short', timeStyle: 'short' })}
                            </p>
                          ) : null}
                          <div className="mt-2 grid gap-1 text-xs text-slate-700 dark:text-slate-300">
                            {hw.student_done_at ? (
                              <p>{t('childrenStatus.studentCompleted')}: {new Date(hw.student_done_at).toLocaleString(language, { dateStyle: 'short', timeStyle: 'short' })}</p>
                            ) : null}
                            {hw.parent_reviewed_at ? (
                              <p>{t('childrenStatus.parentReviewed')}: {new Date(hw.parent_reviewed_at).toLocaleString(language, { dateStyle: 'short', timeStyle: 'short' })}</p>
                            ) : null}
                            {hw.teacher_reviewed_at ? (
                              <p>{t('childrenStatus.teacherReviewed')}: {new Date(hw.teacher_reviewed_at).toLocaleString(language, { dateStyle: 'short', timeStyle: 'short' })}</p>
                            ) : null}
                          </div>
                          {hw.student_note ? (
                            <p className="mt-1 text-xs italic text-slate-700 dark:text-slate-200">{t('childrenStatus.studentNote')}: "{hw.student_note}"</p>
                          ) : null}
                          {hw.parent_note ? (
                            <p className="mt-1 text-xs italic text-amber-900 dark:text-amber-100">{t('childrenStatus.parentNote')}: "{hw.parent_note}"</p>
                          ) : null}
                          {hw.teacher_note ? (
                            <p className="mt-1 text-xs italic text-amber-900 dark:text-amber-100">{t('childrenStatus.teacherNote')}: "{hw.teacher_note}"</p>
                          ) : null}
                          {Array.isArray(hw.submission_attachments) && hw.submission_attachments.length > 0 ? (
                            <div className="mt-2 space-y-2 rounded-lg border border-sky-200/80 bg-sky-50/70 p-2 dark:border-sky-800/50 dark:bg-sky-950/30">
                              <p className="text-xs font-semibold text-sky-900 dark:text-sky-100">Ogrenci gorselleri</p>
                              <MediaSlider
                                key={hw.submission_attachments.map((a) => a.id).join('|')}
                                items={hw.submission_attachments.map<MediaItem>((att) => ({
                                  url: isImageAttachment(att.content_type, att.original_name)
                                    ? att.url
                                    : filePlaceholderUrl(att.original_name || 'dosya', t('homework.attachmentLabel')),
                                  type: 'image',
                                }))}
                                className="h-44"
                                alt={`${hw.title} ogrenci gorselleri`}
                                fit="contain"
                                deleteDisabled={deletingAttachmentId !== null}
                                onDeleteAtIndex={
                                  hw.status === 'student_done'
                                    ? (itemIndex) => {
                                        const att = hw.submission_attachments[itemIndex];
                                        if (!att) return;
                                        void deleteSubmissionAttachment(
                                          hw.submission_id,
                                          att.id,
                                          att.original_name,
                                          hw.submission_attachments.length,
                                        );
                                      }
                                    : undefined
                                }
                              />
                            </div>
                          ) : null}
                          {Array.isArray(hw.attachments) && hw.attachments.length > 0 ? (
                            <div className="mt-2 space-y-2">
                              <p className="text-xs font-semibold text-amber-900 dark:text-amber-100">
                                {t('homework.teacherFiles')}
                              </p>
                              <MediaSlider
                                key={hw.attachments.map((a) => a.id).join('|')}
                                items={hw.attachments.map<MediaItem>((att) => ({
                                  url: isImageAttachment(att.content_type, att.original_name)
                                    ? att.url
                                    : filePlaceholderUrl(att.original_name || 'dosya', t('homework.attachmentLabel')),
                                  type: 'image',
                                }))}
                                className="h-44"
                                alt={hw.title}
                                fit="contain"
                              />
                            </div>
                          ) : null}
                            </div>
                          ) : null}
                        </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ) : null}

              {activityTab === 'tests' ? (
                <div
                  id={`${activityTabsId}-panel-tests`}
                  role="tabpanel"
                  aria-labelledby={`${activityTabsId}-tests`}
                  className="mt-3"
                >
                  {(c.test_attempts_history ?? []).length === 0 ? (
                    <DetailPanelEmpty icon={ClipboardList} message={t('childrenStatus.noTestResults')} />
                  ) : (
                    <ul className="space-y-2">
                      {(c.test_attempts_history ?? []).map((row) => (
                        <li
                          key={row.attempt_id}
                          className="rounded-xl border border-violet-200/80 bg-white/90 px-3 py-2.5 dark:border-violet-800/50 dark:bg-violet-950/20"
                        >
                          <p className="font-semibold text-slate-900 dark:text-white">{row.title}</p>
                          <p className="text-xs text-slate-600 dark:text-gray-400">
                            {row.class_name || '—'}
                            {row.submitted_at
                              ? ` · ${new Date(row.submitted_at).toLocaleString(language, { dateStyle: 'short', timeStyle: 'short' })}`
                              : ''}
                          </p>
                          <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-100">
                            <span className="text-emerald-700 dark:text-emerald-300">
                              {t('childrenStatus.testCorrectShort')}: {row.total_correct}
                            </span>
                            {' · '}
                            <span className="text-rose-700 dark:text-rose-300">
                              {t('childrenStatus.testWrongShort')}: {row.total_wrong}
                            </span>
                            {' · '}
                            <span className="text-slate-600 dark:text-slate-300">
                              {t('childrenStatus.testQuestionsShort')}: {row.total_questions}
                            </span>
                            {' · '}
                            <span className="text-violet-800 dark:text-violet-200">
                              {t('childrenStatus.testScoreShort')}: {testScoreOutOf100Label(row.total_correct, row.total_questions)}/100
                            </span>
                          </p>
                          {row.auto_submitted ? (
                            <p className="mt-1 text-xs text-amber-800/90 dark:text-amber-200/80">
                              {t('childrenStatus.testAutoSubmitted')}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}

              {activityTab === 'preschool' ? (
                <div
                  id={`${activityTabsId}-panel-preschool`}
                  role="tabpanel"
                  aria-labelledby={`${activityTabsId}-preschool`}
                  className="mt-3 space-y-4"
                >
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="flex flex-col gap-1 text-xs font-semibold text-amber-900 dark:text-amber-100">
                      {t('childrenStatus.preschoolMonth')}
                      <input
                        type="month"
                        value={kgYearMonth}
                        onChange={(e) => setKgYearMonth(e.target.value)}
                        className="rounded-xl border-2 border-amber-200/80 bg-white px-3 py-2 text-sm text-slate-900 dark:border-amber-800/60 dark:bg-gray-800 dark:text-white"
                      />
                      <span className="font-normal text-amber-800/85 dark:text-amber-200/75">
                        {t('childrenStatus.preschoolMonthHint')}
                      </span>
                    </label>
                    <KidsSecondaryButton type="button" disabled={kgRecordsLoading} onClick={() => void loadPreschoolRecords()}>
                      {kgRecordsLoading ? t('common.loading') : t('common.refresh')}
                    </KidsSecondaryButton>
                  </div>
                  {kgRecordsError ? (
                    <p className="rounded-lg border border-rose-200/80 bg-rose-50/90 px-3 py-2 text-sm text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-100">
                      {kgRecordsError}
                    </p>
                  ) : null}
                  {kgRecordsLoading && kgRecords.length === 0 && !kgRecordsError ? (
                    <p className="text-sm text-amber-900/75 dark:text-amber-100/70">{t('common.loading')}</p>
                  ) : null}
                  {!kgRecordsLoading && kgRecords.length === 0 && !kgRecordsError ? (
                    <DetailPanelEmpty icon={Sun} message={t('childrenStatus.preschoolEmpty')} />
                  ) : null}
                  {kgRecords.length > 0 ? (
                    <div className="overflow-x-auto rounded-xl border border-emerald-200/70 dark:border-emerald-900/40">
                      <table className="min-w-[640px] w-full border-collapse text-left text-sm">
                        <thead>
                          <tr className="border-b border-emerald-200/80 bg-emerald-50/80 dark:border-emerald-900/50 dark:bg-emerald-950/40">
                            <th className="px-2 py-2 font-bold text-emerald-950 dark:text-emerald-50">
                              {t('childrenStatus.preschoolColDate')}
                            </th>
                            <th className="px-2 py-2 font-bold text-emerald-950 dark:text-emerald-50">
                              {t('childrenStatus.preschoolColClass')}
                            </th>
                            <th className="px-2 py-2 font-bold text-emerald-950 dark:text-emerald-50">
                              {t('childrenStatus.preschoolColPresent')}
                            </th>
                            <th className="px-2 py-2 font-bold text-emerald-950 dark:text-emerald-50">
                              {t('childrenStatus.preschoolColMeal')}
                            </th>
                            <th className="px-2 py-2 font-bold text-emerald-950 dark:text-emerald-50">
                              {t('childrenStatus.preschoolColNap')}
                            </th>
                            <th className="min-w-[140px] px-2 py-2 font-bold text-emerald-950 dark:text-emerald-50">
                              {t('childrenStatus.preschoolColNote')}
                            </th>
                            <th className="px-2 py-2 font-bold text-emerald-950 dark:text-emerald-50">
                              {t('childrenStatus.preschoolColEod')}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {kgRecords.map((rec) => {
                            const className =
                              (c.classes ?? []).find((cl) => cl.id === rec.kids_class_id)?.name ??
                              `Sınıf #${rec.kids_class_id}`;
                            const d = rec.record_date ? new Date(`${rec.record_date}T12:00:00`) : null;
                            return (
                              <tr
                                key={rec.id}
                                className="border-b border-emerald-100/90 odd:bg-white/80 even:bg-emerald-50/25 dark:border-emerald-900/30 dark:odd:bg-gray-900/20 dark:even:bg-emerald-950/15"
                              >
                                <td className="px-2 py-2 whitespace-nowrap font-medium text-slate-900 dark:text-white">
                                  {d && !Number.isNaN(d.getTime())
                                    ? d.toLocaleDateString(language, { dateStyle: 'medium' })
                                    : rec.record_date}
                                </td>
                                <td className="px-2 py-2 text-slate-800 dark:text-slate-100">{className}</td>
                                <td className="px-2 py-2">{kgBoolTriLabel(rec.present, t)}</td>
                                <td className="px-2 py-2 align-top">{kgFormatSlotsOrLegacy(rec.meal_slots, rec.meal_ok, t)}</td>
                                <td className="px-2 py-2 align-top">{kgFormatSlotsOrLegacy(rec.nap_slots, rec.nap_ok, t)}</td>
                                <td className="px-2 py-2 text-xs text-slate-700 dark:text-slate-200">
                                  {(rec.teacher_day_note || '').trim() || '—'}
                                </td>
                                <td className="px-2 py-2 text-xs font-semibold">
                                  {rec.digest_sent_at ? (
                                    <span className="text-emerald-700 dark:text-emerald-300">
                                      {t('teacherClass.kindergarten.eodSentBadge')}
                                    </span>
                                  ) : (
                                    <span className="text-slate-500 dark:text-slate-400">{t('teacherClass.kindergarten.triUnset')}</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            </div>
          </div>
            );
          })()}
        </KidsCenteredModal>
      ) : null}
      </main>
      {pendingDelete ? (
        <KidsCenteredModal
          title="Gorsel silme onayi"
          onClose={() => {
            if (deletingAttachmentId !== null) return;
            setPendingDelete(null);
          }}
          footer={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <KidsSecondaryButton
                type="button"
                disabled={deletingAttachmentId !== null}
                onClick={() => setPendingDelete(null)}
              >
                {t('common.cancel')}
              </KidsSecondaryButton>
              <KidsPrimaryButton
                type="button"
                disabled={deletingAttachmentId !== null}
                onClick={() => void confirmDeleteSubmissionAttachment()}
              >
                {deletingAttachmentId !== null ? t('common.loading') : t('common.delete')}
              </KidsPrimaryButton>
            </div>
          }
        >
          <p className="text-sm text-slate-700 dark:text-gray-300">
            Silinecek dosya:{' '}
            <span className="font-semibold text-slate-900 dark:text-white">
              {pendingDelete.fileName || 'Gorsel'}
            </span>
          </p>
          <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">
            Bu islem geri alinamaz.
          </p>
        </KidsCenteredModal>
      ) : null}
    </KidsPanelMax>
  );
}
