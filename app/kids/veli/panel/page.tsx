'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import {
  kidsCreateConversation,
  kidsParentChildrenOverview,
  kidsParentReviewHomeworkSubmission,
  kidsParentSwitchToStudent,
  kidsParentVerifyPassword,
  type KidsParentChildOverview,
} from '@/src/lib/kids-api';
import {
  KidsCard,
  KidsCenteredModal,
  KidsPanelMax,
  KidsPrimaryButton,
  KidsSecondaryButton,
} from '@/src/components/kids/kids-ui';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';
import { useKidsI18n } from '@/src/providers/kids-language-provider';

export default function KidsParentPanelPage() {
  const router = useRouter();
  const { user, loading, pathPrefix, setUserFromServer } = useKidsAuth();
  const { t, language } = useKidsI18n();
  const [switchingId, setSwitchingId] = useState<number | null>(null);
  const [overview, setOverview] = useState<KidsParentChildOverview[] | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [chatTarget, setChatTarget] = useState<{
    studentId: number;
    studentName: string;
    classId: number;
    className: string;
    teacherUserId: number;
    teacherDisplay: string;
  } | null>(null);
  const [chatPassword, setChatPassword] = useState('');
  const [chatStarting, setChatStarting] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [reviewingSubmissionId, setReviewingSubmissionId] = useState<number | null>(null);

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    setOverviewError(null);
    try {
      const { children } = await kidsParentChildrenOverview();
      setOverview(children);
    } catch (e) {
      setOverviewError(e instanceof Error ? e.message : t('parent.panel.summaryError'));
      setOverview(null);
    } finally {
      setOverviewLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(kidsLoginPortalHref(pathPrefix, 'veli'));
      return;
    }
    // Veli → çocuk geçişi: önce state öğrenci olur, sayfa hâlâ /veli/panel üzerindeyken
    // burada login’e atarsak router.push(ogrenci/panel) ezilir. Öğrenciyi panele yönlendir.
    if (user.role === 'student') {
      router.replace(`${pathPrefix}/ogrenci/panel`);
      return;
    }
    if (user.role !== 'parent') {
      router.replace(kidsLoginPortalHref(pathPrefix));
      return;
    }
    void loadOverview();
  }, [user, loading, pathPrefix, router, loadOverview]);

  async function goToChildPanel(studentId: number) {
    setSwitchingId(studentId);
    try {
      const childUser = await kidsParentSwitchToStudent(studentId);
      setUserFromServer(childUser);
      toast.success(t('parent.panel.switchedToChild'));
      router.replace(`${pathPrefix}/ogrenci/panel`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('parent.panel.switchFailed'));
    } finally {
      setSwitchingId(null);
    }
  }

  async function startTeacherChat() {
    if (!chatTarget) return;
    const password = chatPassword.trim();
    setChatError(null);
    if (typeof kidsParentVerifyPassword !== 'function') {
      setChatError(t('parent.panel.chatUpdateRequired'));
      return;
    }
    if (!password) {
      setChatError(t('parent.panel.enterPassword'));
      return;
    }
    setChatStarting(true);
    try {
      await kidsParentVerifyPassword(password);
      const conv = await kidsCreateConversation({
        student_id: chatTarget.studentId,
        teacher_user_id: chatTarget.teacherUserId,
        kids_class_id: chatTarget.classId,
      });
      setChatTarget(null);
      setChatPassword('');
      toast.success(t('parent.panel.chatOpened'));
      router.push(`${pathPrefix}/mesajlar/${conv.id}`);
    } catch (e) {
      setChatError(e instanceof Error ? e.message : t('parent.panel.chatOpenFailed'));
    } finally {
      setChatStarting(false);
    }
  }

  async function markSubmittedReviewed(submissionId: number) {
    setReviewingSubmissionId(submissionId);
    try {
      await kidsParentReviewHomeworkSubmission(submissionId, { approved: true });
      toast.success(t('parent.panel.reviewSent'));
      await loadOverview();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('parent.panel.reviewSaveFailed'));
    } finally {
      setReviewingSubmissionId(null);
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
  const showFromMeFallback = overview === null && overviewError && (user.linked_students?.length ?? 0) > 0;

  return (
    <KidsPanelMax>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-logo text-2xl font-bold text-slate-900 dark:text-white">{t('parent.panel.title')}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-gray-400">
            {t('parent.panel.subtitle')}
          </p>
        </div>
        <KidsSecondaryButton
          type="button"
          disabled={overviewLoading}
          onClick={() => {
            void loadOverview();
          }}
        >
          {overviewLoading ? t('parent.panel.refreshing') : t('parent.panel.refresh')}
        </KidsSecondaryButton>
      </div>
      <KidsCard tone="emerald" className="mt-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-logo text-base font-bold text-emerald-950 dark:text-emerald-50">{t('parent.panel.gameControlTitle')}</h2>
            <p className="mt-2 text-sm text-emerald-900/85 dark:text-emerald-100/85">
              {t('parent.panel.gameControlBody')}
            </p>
          </div>
          <Link
            href={`${pathPrefix}/veli/ebeveyn-kontrolleri`}
            className="inline-flex min-h-12 w-full shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 px-8 text-sm font-bold text-white shadow-lg transition hover:from-emerald-500 hover:to-teal-500 sm:w-auto"
          >
            {t('parent.panel.parentControls')}
          </Link>
        </div>
      </KidsCard>
      <KidsCard tone="sky" className="mt-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-logo text-base font-bold text-sky-950 dark:text-sky-50">{t('parent.panel.childrenStatusTitle')}</h2>
            <p className="mt-2 text-sm text-sky-900/85 dark:text-sky-100/85">
              {t('childrenStatus.subtitle')}
            </p>
          </div>
          <Link
            href={`${pathPrefix}/veli/cocuklarin-durumu`}
            className="inline-flex min-h-12 w-full shrink-0 items-center justify-center rounded-full bg-linear-to-r from-sky-600 to-indigo-600 px-8 text-sm font-bold text-white shadow-lg transition hover:from-sky-500 hover:to-indigo-500 sm:w-auto"
          >
            {t('parent.panel.childrenStatusTitle')}
          </Link>
        </div>
      </KidsCard>

      {overviewError ? (
        <p className="mt-4 rounded-xl border border-amber-300/80 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
          {overviewError}
        </p>
      ) : null}

      {overviewLoading && childrenList.length === 0 ? (
        <p className="mt-6 text-center text-violet-800 dark:text-violet-200">{t('parent.panel.childrenSummaryLoading')}</p>
      ) : null}

      {!overviewLoading && childrenList.length === 0 && !showFromMeFallback && !overviewError ? (
        <KidsCard tone="amber" className="mt-6">
          <p className="text-sm text-amber-900/85 dark:text-amber-100/85">
            {t('parent.panel.noChildSummary')}
          </p>
        </KidsCard>
      ) : null}

      {showFromMeFallback ? (
        <KidsCard tone="amber" className="mt-6">
          <p className="text-sm font-medium text-amber-950 dark:text-amber-50">{t('parent.panel.childListFallbackTitle')}</p>
          <ul className="mt-3 space-y-2">
            {(user.linked_students ?? []).map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-slate-900 dark:text-white">
                  {c.first_name} {c.last_name}
                </span>
                <KidsPrimaryButton
                  type="button"
                  className="!min-h-10 !px-4 !text-xs"
                  disabled={switchingId !== null}
                  onClick={() => void goToChildPanel(c.id)}
                >
                  {switchingId === c.id ? '…' : t('parent.panel.switchToChild')}
                </KidsPrimaryButton>
              </li>
            ))}
          </ul>
        </KidsCard>
      ) : null}

      <div className="mt-8 space-y-8">
        {childrenList.map((c) => {
          const pendingActions = c.pending_parent_actions ?? [];
          return (
            <KidsCard key={c.id} tone="amber" className="border-2 border-amber-200/90 dark:border-amber-800/60">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-logo text-xl font-bold text-slate-900 dark:text-white">
                    {c.first_name} {c.last_name}
                  </h2>
                  <p className="mt-1 text-sm text-amber-900/90 dark:text-amber-100/85">
                    {t('parent.panel.growthPoints')}:{' '}
                    <strong className="text-amber-950 dark:text-amber-50">{c.growth_points}</strong>
                    {c.growth_stage ? (
                      <>
                        {' '}
                        · <span className="font-semibold">{c.growth_stage.title}</span>
                        <span className="text-amber-800/90 dark:text-amber-200/80"> — {c.growth_stage.subtitle}</span>
                      </>
                    ) : null}
                  </p>
                  {c.student_login_name ? (
                    <p className="mt-1 text-xs text-amber-900/80 dark:text-amber-200/75">
                      {t('parent.panel.optionalSelfLogin')}:{' '}
                      <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono dark:bg-amber-900/50">
                        {c.student_login_name}
                      </code>
                    </p>
                  ) : null}
                </div>
                <KidsPrimaryButton
                  type="button"
                  className="shrink-0"
                  disabled={switchingId !== null}
                  onClick={() => void goToChildPanel(c.id)}
                >
                  {switchingId === c.id ? t('common.switching') : t('parent.panel.switchToChild')}
                </KidsPrimaryButton>
              </div>

              {pendingActions.length > 0 ? (
                <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50/80 px-3 py-2 dark:border-violet-800 dark:bg-violet-950/40">
                  <p className="text-xs font-bold text-violet-900 dark:text-violet-100">{t('childrenStatus.pendingParentHomeworks')}</p>
                  <ul className="mt-2 space-y-2">
                    {pendingActions.map((it, idx) => (
                      <li
                        key={`${it.submission_id}-${idx}`}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-violet-200/80 bg-white/80 px-2.5 py-2 text-sm dark:border-violet-700 dark:bg-violet-950/40"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-violet-950 dark:text-violet-100">{it.assignment_title}</p>
                          <p className="text-xs text-violet-800/90 dark:text-violet-200/80">
                            {it.class_name} · {t('parent.panel.round')} {it.round_number}
                          </p>
                        </div>
                        <KidsPrimaryButton
                          type="button"
                          className="!min-h-9 !px-3 !text-xs"
                          disabled={reviewingSubmissionId === it.submission_id}
                          onClick={() => void markSubmittedReviewed(it.submission_id)}
                        >
                          {reviewingSubmissionId === it.submission_id ? t('profile.saving') : t('childrenStatus.submitted')}
                        </KidsPrimaryButton>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {c.classes.length > 0 ? (
                <div className="mt-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">{t('parent.panel.classes')}</p>
                  <ul className="mt-2 space-y-2">
                    {c.classes.map((cl) => (
                      <li
                        key={cl.id}
                        className="rounded-xl border border-amber-200/90 bg-white/90 px-3 py-2 text-xs font-medium text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-50"
                      >
                        <span className="block">
                          {cl.name}
                          {cl.school_name ? (
                            <span className="text-amber-800/80 dark:text-amber-200/70"> · {cl.school_name}</span>
                          ) : null}
                        </span>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {(cl.teachers && cl.teachers.length > 0
                            ? cl.teachers
                            : [
                                {
                                  teacher_user_id: cl.teacher_user_id,
                                  teacher_display: cl.teacher_display,
                                  subject: t('teacher.panel.classTeacher'),
                                  is_primary: true,
                                },
                              ]
                          ).map((teacherRow) => (
                            <KidsSecondaryButton
                              key={`${cl.id}-${teacherRow.teacher_user_id}`}
                              type="button"
                              className="min-h-9 px-4 text-xs"
                              disabled={chatStarting}
                              onClick={() => {
                                setChatTarget({
                                  studentId: c.id,
                                  studentName: `${c.first_name} ${c.last_name}`.trim(),
                                  classId: cl.id,
                                  className: cl.name,
                                  teacherUserId: teacherRow.teacher_user_id,
                                  teacherDisplay: `${teacherRow.teacher_display}${teacherRow.subject ? ` (${teacherRow.subject})` : ''}`,
                                });
                                setChatPassword('');
                                setChatError(null);
                              }}
                            >
                              {t('parent.panel.messageTeacher')}: {teacherRow.teacher_display}
                              {teacherRow.subject ? ` · ${teacherRow.subject}` : ''}
                            </KidsSecondaryButton>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {c.badges.length > 0 ? (
                <div className="mt-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                    {t('parent.panel.badges')}
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {c.badges.map((b) => (
                      <li
                        key={`${b.key}-${b.earned_at}`}
                        className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-2.5 py-1 text-xs text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-50"
                        title={b.earned_at}
                      >
                        {b.label || b.key}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="mt-4 text-xs text-amber-900/70 dark:text-amber-200/60">{t('parent.panel.noBadges')}</p>
              )}

              <div className="mt-5">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                  {t('parent.panel.projectsFeedback')}
                </p>
                {c.assignments_recent.length === 0 ? (
                  <p className="mt-2 text-sm text-amber-900/75 dark:text-amber-100/70">
                    {t('parent.panel.noOpenProjects')}
                  </p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {c.assignments_recent.map((a) => (
                      <li
                        key={a.id}
                        className="rounded-xl border border-amber-200/70 bg-white/85 px-3 py-2.5 dark:border-amber-800/50 dark:bg-gray-900/50"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-900 dark:text-white">{a.title}</span>
                          {a.got_teacher_star ? (
                            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{t('parent.panel.star')}</span>
                          ) : null}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-gray-400">
                          {a.class_name}
                          {a.submission_closes_at
                            ? ` · ${t('teacherHomework.dueAt')}: ${new Date(a.submission_closes_at).toLocaleString(language, { dateStyle: 'short', timeStyle: 'short' })}`
                            : ''}
                        </p>
                        <p className="mt-1 text-xs text-slate-700 dark:text-gray-300">
                          {t('parent.panel.submissionProgress')
                            .replace('{submitted}', String(a.rounds_submitted))
                            .replace('{total}', String(a.submission_rounds))}
                          {!a.has_submissions ? ` · ${t('childrenStatus.noSubmissionYet')}` : ''}
                          {a.has_submissions && a.awaiting_teacher_feedback
                            ? ` · ${t('childrenStatus.awaitingTeacherFeedback')}`
                            : ''}
                          {a.has_submissions && !a.awaiting_teacher_feedback && a.teacher_feedback_preview
                            ? ` · ${t('parent.panel.feedbackArrived')}`
                            : ''}
                        </p>
                        {a.teacher_feedback_preview ? (
                          <p className="mt-2 rounded-lg bg-amber-100/60 px-2 py-1.5 text-xs italic text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
                            “{a.teacher_feedback_preview}”
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

            </KidsCard>
          );
        })}
      </div>
      {chatTarget ? (
        <KidsCenteredModal
          title={t('parent.panel.chatVerifyTitle')}
          onClose={() => {
            if (chatStarting) return;
            setChatTarget(null);
            setChatPassword('');
            setChatError(null);
          }}
          footer={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <KidsSecondaryButton
                type="button"
                disabled={chatStarting}
                onClick={() => {
                  setChatTarget(null);
                  setChatPassword('');
                  setChatError(null);
                }}
              >
                {t('common.cancel')}
              </KidsSecondaryButton>
              <KidsPrimaryButton type="button" disabled={chatStarting} onClick={() => void startTeacherChat()}>
                {chatStarting ? t('parent.panel.verifying') : t('parent.panel.openMessaging')}
              </KidsPrimaryButton>
            </div>
          }
        >
          <p className="text-sm text-slate-700 dark:text-gray-300">
            {t('parent.panel.chatStartNotice')
              .replace('{student}', chatTarget.studentName)
              .replace('{teacher}', chatTarget.teacherDisplay)
              .replace('{class}', chatTarget.className)}
          </p>
          <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-violet-800 dark:text-violet-200">
            {t('parent.panel.accountPassword')}
          </label>
          <input
            type="password"
            className="mt-2 w-full rounded-xl border-2 border-violet-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-400/25 dark:border-violet-700 dark:bg-gray-800 dark:text-white"
            autoFocus
            value={chatPassword}
            onChange={(e) => {
              setChatPassword(e.target.value);
              if (chatError) setChatError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (!chatStarting) void startTeacherChat();
              }
            }}
            placeholder="••••••••"
            disabled={chatStarting}
          />
          {chatError ? (
            <p className="mt-2 rounded-lg border border-rose-300 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
              {chatError}
            </p>
          ) : null}
        </KidsCenteredModal>
      ) : null}
    </KidsPanelMax>
  );
}
