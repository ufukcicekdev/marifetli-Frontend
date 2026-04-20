'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Gamepad2, Rocket, Settings, Sparkles, UserRound } from 'lucide-react';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import {
  kidsCreateConversation,
  kidsDeleteParentHomeworkSubmissionAttachment,
  kidsGetAttendanceParent,
  kidsGetParentGamePolicy,
  kidsParentChildrenOverview,
  kidsParentReviewHomeworkSubmission,
  kidsParentSwitchToStudent,
  kidsParentVerifyPassword,
  type KidsAttendanceParentRecord,
  type KidsParentChildOverview,
  type KidsParentGamePolicy,
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
import { KidsFeedbackModal, shouldShowFeedbackModal, dismissFeedbackModal } from '@/src/components/kids/kids-feedback-modal';
import { MediaSlider } from '@/src/components/media-slider';
import type { MediaItem } from '@/src/lib/extract-media';

function isImageAttachment(contentType: string, fileName: string): boolean {
  const ct = (contentType || '').toLowerCase();
  if (ct.startsWith('image/')) return true;
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(fileName || '');
}

function filePlaceholderUrl(fileName: string, label: string): string {
  const ext = (fileName.split('.').pop() || 'DOSYA').toUpperCase().slice(0, 6);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540"><rect width="960" height="540" fill="#FEF3C7"/><rect x="360" y="120" width="240" height="300" rx="24" fill="#FDE68A"/><path d="M520 120v76c0 13 11 24 24 24h56" fill="#FCD34D"/><path d="M520 120l80 100" stroke="#F59E0B" stroke-width="10"/><text x="480" y="300" text-anchor="middle" font-family="Arial, sans-serif" font-size="40" font-weight="700" fill="#92400E">${ext}</text><text x="480" y="345" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" fill="#B45309">${label}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function childInitials(first: string, last: string): string {
  const a = (first[0] || '?').toUpperCase();
  const b = (last[0] || first[1] || '?').toUpperCase();
  return `${a}${b}`;
}

export default function KidsParentPanelPage() {
  const router = useRouter();
  const { user, loading, pathPrefix, setUserFromServer } = useKidsAuth();
  const { t, language } = useKidsI18n();
  const [switchingId, setSwitchingId] = useState<number | null>(null);
  const [overview, setOverview] = useState<KidsParentChildOverview[] | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
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
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    submissionId: number;
    attachmentId: number;
    fileName?: string;
    currentAttachmentCount?: number;
  } | null>(null);
  const [openPendingDetailId, setOpenPendingDetailId] = useState<number | null>(null);
  const [gamePolicy, setGamePolicy] = useState<KidsParentGamePolicy | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<KidsAttendanceParentRecord[]>([]);
  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    setOverviewError(null);
    try {
      const { children } = await kidsParentChildrenOverview();
      setOverview(children);
      setGamePolicy(null);
      const firstId = children[0]?.id;
      if (firstId) {
        try {
          const p = await kidsGetParentGamePolicy(firstId);
          setGamePolicy(p);
        } catch {
          setGamePolicy(null);
        }
      }
      try {
        const att = await kidsGetAttendanceParent();
        setAttendanceRecords(att.records);
      } catch {
        setAttendanceRecords([]);
      }
    } catch (e) {
      setOverviewError(e instanceof Error ? e.message : t('parent.panel.summaryError'));
      setOverview(null);
      setGamePolicy(null);
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
    // 30 saniye sonra geri bildirim modalını göster
    const timer = setTimeout(() => {
      if (shouldShowFeedbackModal()) setFeedbackOpen(true);
    }, 30_000);
    return () => clearTimeout(timer);
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

  const childrenList = overview ?? [];

  if (loading || !user || user.role !== 'parent') {
    return (
      <KidsPanelMax>
        <p className="text-center text-violet-800 dark:text-violet-200">{t('common.loading')}</p>
      </KidsPanelMax>
    );
  }

  const showFromMeFallback = overview === null && overviewError && (user.linked_students?.length ?? 0) > 0;
  const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.email || '';
  const policyWindow =
    gamePolicy?.allowed_start_time && gamePolicy?.allowed_end_time
      ? `${gamePolicy.allowed_start_time.slice(0, 5)} – ${gamePolicy.allowed_end_time.slice(0, 5)}`
      : '—';

  return (
    <>
    {feedbackOpen && <KidsFeedbackModal onClose={() => setFeedbackOpen(false)} />}
    <KidsPanelMax className="max-w-7xl space-y-10 pb-12">
      <KidsSecondaryButton
        type="button"
        disabled={overviewLoading}
        className="w-full sm:w-auto"
        onClick={() => {
          void loadOverview();
        }}
      >
        {overviewLoading ? t('parent.panel.refreshing') : t('parent.panel.refresh')}
      </KidsSecondaryButton>

      {/* Hero */}
      <section className="relative flex min-h-[280px] flex-col overflow-hidden rounded-3xl border border-violet-200/70 bg-gradient-to-br from-violet-50/90 via-white to-fuchsia-50/80 p-8 shadow-lg dark:border-violet-900/50 dark:from-violet-950/40 dark:via-zinc-900 dark:to-fuchsia-950/30 md:min-h-[320px] md:flex-row md:items-center md:p-12">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -right-10 -top-10 h-72 w-72 rounded-full bg-purple-400/25 blur-[80px] dark:bg-purple-500/15" />
          <div className="absolute -bottom-16 -left-10 h-64 w-64 rounded-full bg-pink-400/20 blur-[80px] dark:bg-pink-500/10" />
        </div>
        <div className="relative z-10 max-w-2xl flex-1">
          <h1 className="font-logo text-3xl font-black leading-tight text-slate-900 dark:text-white md:text-4xl">
            {t('parent.panel.dashboardWelcome').replace('{name}', user.first_name || displayName || '…')}
          </h1>
          <p className="mt-3 text-base font-medium leading-relaxed text-slate-600 dark:text-zinc-300 md:text-lg">
            {t('parent.panel.dashboardHeroSubtitle')}
          </p>
        </div>
        <div className="relative z-10 mt-8 flex flex-1 justify-center md:mt-0 md:justify-end">
          <div className="flex h-44 w-44 items-center justify-center rounded-3xl bg-white/60 shadow-inner dark:bg-zinc-800/50 md:h-52 md:w-52">
            <Sparkles className="h-24 w-24 text-violet-400 dark:text-violet-500" strokeWidth={1.25} aria-hidden />
          </div>
        </div>
      </section>

      {/* Bento */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-8 lg:col-span-1">
          <div className="flex h-full flex-col rounded-3xl border border-zinc-200/80 bg-white p-8 shadow-md transition hover:shadow-lg dark:border-zinc-700 dark:bg-zinc-900/90">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300">
                <Gamepad2 className="h-8 w-8" strokeWidth={2} />
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                {t('parent.panel.dashboardActiveBadge')}
              </span>
            </div>
            <h2 className="font-logo text-xl font-bold text-slate-900 dark:text-white">{t('parent.panel.gameControlTitle')}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-zinc-400">{t('parent.panel.gameControlBody')}</p>
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-violet-50/80 px-4 py-3 dark:bg-violet-950/30">
                <span className="text-sm font-bold text-slate-700 dark:text-zinc-200">{t('parent.panel.dashboardDailyLimit')}</span>
                <span className="text-sm font-black text-violet-600 dark:text-violet-300">
                  {gamePolicy ? `${gamePolicy.daily_minutes_limit} dk` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-fuchsia-50/80 px-4 py-3 dark:bg-fuchsia-950/20">
                <span className="text-sm font-bold text-slate-700 dark:text-zinc-200">{t('parent.panel.dashboardPlayWindow')}</span>
                <span className="text-sm font-black text-pink-600 dark:text-pink-300">{policyWindow}</span>
              </div>
            </div>
            <Link
              href={`${pathPrefix}/veli/ebeveyn-kontrolleri`}
              className="mt-auto flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-4 text-sm font-bold text-white shadow-lg shadow-violet-500/30 transition hover:from-violet-500 hover:to-fuchsia-500"
            >
              <Settings className="h-5 w-5" strokeWidth={2} />
              {t('parent.panel.parentControls')}
            </Link>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="h-full rounded-3xl border border-zinc-200/80 bg-white p-8 shadow-md dark:border-zinc-700 dark:bg-zinc-900/90">
            <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-logo text-xl font-bold text-slate-900 dark:text-white">{t('parent.panel.childrenStatusTitle')}</h2>
              <Link
                href={`${pathPrefix}/veli/cocuklarin-durumu`}
                className="text-sm font-bold text-violet-600 hover:underline dark:text-violet-400"
              >
                {t('parent.panel.dashboardSeeAll')}
              </Link>
            </div>
            {overviewLoading && childrenList.length === 0 ? (
              <p className="text-center text-sm text-slate-500 dark:text-zinc-400">{t('parent.panel.childrenSummaryLoading')}</p>
            ) : childrenList.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-zinc-200 py-12 text-center text-sm text-slate-500 dark:border-zinc-700 dark:text-zinc-400">
                {t('parent.panel.noChildSummary')}
              </p>
            ) : (
              <div className="space-y-4">
                {childrenList.slice(0, 6).map((c) => {
                  const tests = c.test_attempts_history ?? [];
                  const lastTest = tests[0];
                  const testPct =
                    lastTest && lastTest.total_questions > 0
                      ? Math.round((lastTest.total_correct / lastTest.total_questions) * 100)
                      : null;
                  let subR = 0;
                  let totR = 0;
                  for (const a of c.assignments_recent) {
                    subR += a.rounds_submitted;
                    totR += Math.max(1, a.submission_rounds);
                  }
                  const hwList = c.homework_history ?? [];
                  const hwAwaitingParent = (c.pending_parent_actions?.length ?? 0) > 0;
                  const homeworkCell =
                    totR > 0
                      ? `${subR}/${totR}`
                      : hwList.length > 0
                        ? hwAwaitingParent
                          ? t('parent.panel.dashboardHomeworkPending').replace(
                              '{n}',
                              String(c.pending_parent_actions?.length ?? 0),
                            )
                          : t('parent.panel.dashboardHomeworkCount').replace('{n}', String(hwList.length))
                        : '—';
                  const pending = hwAwaitingParent;
                  const statusOk = !pending && (testPct == null || testPct >= 70);
                  const primaryClass = c.classes[0]?.name ?? '—';
                  return (
                    <div
                      key={c.id}
                      className="group flex flex-col gap-4 rounded-2xl bg-zinc-50/90 p-5 transition hover:bg-white hover:shadow-xl dark:bg-zinc-800/50 dark:hover:bg-zinc-800 md:flex-row md:items-center"
                    >
                      <div className="flex min-w-0 items-center gap-4 md:w-[220px] md:shrink-0">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-500 text-lg font-black text-white shadow-md">
                          {childInitials(c.first_name, c.last_name)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-bold text-slate-900 dark:text-white">
                            {c.first_name} {c.last_name}
                          </p>
                          <p className="truncate text-xs text-slate-500 dark:text-zinc-400">{primaryClass}</p>
                        </div>
                      </div>
                      <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('parent.panel.dashboardColTest')}</p>
                          <p className="text-lg font-black text-violet-600 dark:text-violet-300">
                            {testPct != null ? `%${testPct}` : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('parent.panel.dashboardColHomework')}</p>
                          <p className="text-lg font-black text-slate-900 dark:text-white">{homeworkCell}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('parent.panel.dashboardColStatus')}</p>
                          <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-slate-800 dark:text-zinc-200">
                            <span
                              className={`inline-flex h-2 w-2 rounded-full ${statusOk ? 'bg-emerald-500' : pending ? 'bg-amber-500' : 'bg-zinc-400'}`}
                            />
                            {pending
                              ? t('parent.panel.dashboardStatusWatch')
                              : statusOk
                                ? t('parent.panel.dashboardStatusGreat')
                                : t('parent.panel.dashboardStatusNeutral')}
                          </p>
                        </div>
                      </div>
                      <Link
                        href={`#parent-child-${c.id}`}
                        className="inline-flex shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-900 shadow-sm transition group-hover:border-violet-300 group-hover:bg-violet-600 group-hover:text-white dark:border-zinc-600 dark:bg-zinc-900 dark:text-white dark:group-hover:bg-violet-600"
                      >
                        {t('parent.panel.dashboardDetails')}
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hızlı erişim */}
      <section>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-900 p-10 text-white shadow-2xl">
          <div className="relative z-10 max-w-lg">
            <h3 className="font-logo text-2xl font-black">{t('parent.panel.dashboardSwitchTitle')}</h3>
            <p className="mt-2 text-sm font-medium text-indigo-100/90">{t('parent.panel.dashboardSwitchSubtitle')}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {childrenList.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  disabled={switchingId !== null}
                  onClick={() => void goToChildPanel(c.id)}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black text-indigo-700 shadow-md transition hover:bg-indigo-50 disabled:opacity-50"
                >
                  <UserRound className="h-4 w-4" />
                  {switchingId === c.id ? '…' : `${c.first_name}`}
                </button>
              ))}
            </div>
          </div>
          <Rocket className="pointer-events-none absolute -bottom-4 -right-4 h-40 w-40 text-white/15 md:h-48 md:w-48" strokeWidth={1} aria-hidden />
        </div>
      </section>

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

      <div className="mt-12 space-y-8">
        <h2 className="font-logo text-lg font-bold text-slate-800 dark:text-zinc-200">{t('parent.panel.detailSectionTitle')}</h2>
        {childrenList.map((c) => {
          const pendingActions = c.pending_parent_actions ?? [];
          return (
            <div key={c.id} id={`parent-child-${c.id}`} className="scroll-mt-28">
            <KidsCard tone="amber" className="border-2 border-amber-200/90 dark:border-amber-800/60">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-logo text-xl font-bold text-slate-900 dark:text-white">
                    {c.first_name} {c.last_name}
                  </h2>
                  <p className="mt-1 text-sm text-amber-900/90 dark:text-amber-100/85">
                    {t('parent.panel.growthPoints')}:{' '}
                    <strong className="text-amber-950 dark:text-amber-50">{Number(c.growth_points ?? 0)}</strong>
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
                                  <p className="text-xs text-violet-800/90 dark:text-violet-200/80">
                                    {it.class_name} · {t('parent.panel.round')} {it.round_number}
                                  </p>
                                  {Array.isArray(it.submission_attachments) && it.submission_attachments.length > 0 ? (
                                    <p className="text-xs text-violet-700/80 dark:text-violet-200/70">
                                      {it.submission_attachments.length} gorsel
                                    </p>
                                  ) : null}
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <KidsSecondaryButton
                                    type="button"
                                    className="min-h-9! px-3! text-xs!"
                                    onClick={() => {
                                      setOpenPendingDetailId((prev) => (prev === it.submission_id ? null : it.submission_id));
                                    }}
                                  >
                                    {isDetailOpen ? t('homework.detailClose') : t('homework.detailOpen')}
                                  </KidsSecondaryButton>
                                  <KidsSecondaryButton
                                    type="button"
                                    className="min-h-9! px-3! text-xs!"
                                    disabled={reviewingSubmissionId === it.submission_id}
                                    onClick={() => void markSubmittedReviewed(it.submission_id, false)}
                                  >
                                    Revizyon iste
                                  </KidsSecondaryButton>
                                  <KidsPrimaryButton
                                    type="button"
                                    className="min-h-9! px-3! text-xs!"
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

              {(() => {
                const childAtt = attendanceRecords.filter((r) => r.student_id === c.id).slice(0, 10);
                if (childAtt.length === 0) return null;
                return (
                  <div className="mt-5">
                    <p className="text-xs font-bold uppercase tracking-wide text-teal-800 dark:text-teal-200">{t('parent.panel.attendance')}</p>
                    <ul className="mt-2 space-y-1">
                      {childAtt.map((r) => (
                        <li key={r.record_id} className="flex items-center gap-2 rounded-xl border border-teal-100 bg-white/90 px-3 py-1.5 text-xs dark:border-teal-900/40 dark:bg-teal-950/20">
                          <span className="min-w-[6rem] font-medium text-slate-700 dark:text-zinc-300">{r.date}</span>
                          <span className={`rounded-full px-2.5 py-0.5 font-bold ${
                            r.status === 'present' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' :
                            r.status === 'absent' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
                            r.status === 'late' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                            'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
                          }`}>
                            {r.status === 'present' ? 'Geldi' : r.status === 'absent' ? 'Gelmedi' : r.status === 'late' ? 'Geç Geldi' : 'İzinli'}
                          </span>
                          <span className="text-slate-500 dark:text-zinc-500">{r.class_name}</span>
                          {r.note ? <span className="italic text-slate-400">{r.note}</span> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}

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
            </div>
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
    </>
  );
}
