'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import {
  KIDS_MAX_IMAGES_PER_SUBMISSION,
  kidsAssignmentSubmissionGate,
  kidsCreateSubmission,
  kidsFormatAssignmentWindowTr,
  kidsGetSubmissionRoundsForAssignment,
  kidsStudentDashboard,
  kidsUploadSubmissionImage,
  type KidsAssignment,
  type KidsAssignmentRoundSlot,
  type KidsSubmissionRecord,
} from '@/src/lib/kids-api';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';
import { useKidsI18n } from '@/src/providers/kids-language-provider';
import {
  KidsAssignmentRoundStepper,
  canNavigateToAssignmentRound,
} from '@/src/components/kids/kids-assignment-round-stepper';
import {
  KidsStudentStepMotivationModal,
  kidsPickStepMotivationMessage,
} from '@/src/components/kids/kids-student-step-motivation';

function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(v.duration) ? v.duration : 0);
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Video could not be read'));
    };
    v.src = url;
  });
}

export default function KidsStudentAssignmentPage() {
  const params = useParams();
  const router = useRouter();
  const assignmentId = Number(params.id);
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();
  const { t } = useKidsI18n();

  const [assignment, setAssignment] = useState<KidsAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState<'steps' | 'video'>('steps');
  const [steps, setSteps] = useState<{ text: string }[]>([{ text: '' }]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [existingSubmission, setExistingSubmission] = useState<KidsSubmissionRecord | null>(null);
  const [roundSlots, setRoundSlots] = useState<KidsAssignmentRoundSlot[]>([]);
  const [activeRound, setActiveRound] = useState(1);
  const [totalRounds, setTotalRounds] = useState(1);
  const [motivationOpen, setMotivationOpen] = useState(false);
  const [motivationMessage, setMotivationMessage] = useState('');
  const [motivationIsFinal, setMotivationIsFinal] = useState(false);
  type MotivationNav = { kind: 'next'; next: number } | { kind: 'projects' };
  const motivationNavRef = useRef<MotivationNav | null>(null);

  const hydrateForm = useCallback((sub: KidsSubmissionRecord | null, found: KidsAssignment) => {
    setExistingSubmission(sub);
    let nextKind: 'steps' | 'video' = 'steps';
    if (found.require_video && !found.require_image) nextKind = 'video';
    else if (found.require_image && !found.require_video) nextKind = 'steps';
    else if (sub) nextKind = sub.kind;
    setKind(nextKind);

    if (sub) {
      if (sub.kind === 'steps') {
        const rawSteps = sub.steps_payload?.steps;
        setSteps(
          rawSteps && rawSteps.length > 0
            ? rawSteps.map((s) => ({ text: s.text || '' }))
            : [{ text: '' }],
        );
        setImageUrls(sub.steps_payload?.image_urls ?? []);
        setVideoUrl('');
      } else {
        setSteps([{ text: '' }]);
        setImageUrls([]);
        setVideoUrl(sub.video_url || '');
      }
      setCaption(sub.caption || '');
    } else {
      setSteps([{ text: '' }]);
      setImageUrls([]);
      setVideoUrl('');
      setCaption('');
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await kidsStudentDashboard();
      const found = data.assignments.find((a) => a.id === assignmentId) ?? null;
      setAssignment(found);
      if (!found) {
        setExistingSubmission(null);
        setRoundSlots([]);
        return;
      }
      try {
        const bundle = await kidsGetSubmissionRoundsForAssignment(assignmentId);
        setRoundSlots(bundle.rounds);
        const total = Math.max(1, bundle.submission_rounds || 1);
        setTotalRounds(total);
        const qs =
          typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('round') : null;
        const qn = qs ? parseInt(qs, 10) : NaN;
        const gateOk = kidsAssignmentSubmissionGate(found).ok;
        let initial = 1;
        const urlInRange = Number.isFinite(qn) && qn >= 1 && qn <= total;
        if (urlInRange && (!gateOk || canNavigateToAssignmentRound(qn, bundle.rounds, total, true))) {
          initial = qn;
        } else {
          const inc = bundle.rounds.find((x) => !x.submission);
          if (inc) initial = inc.round_number;
        }
        setActiveRound(initial);
        const slot = bundle.rounds.find((r) => r.round_number === initial);
        hydrateForm(slot?.submission ?? null, found);
      } catch {
        toast.error(t('projectDetail.savedLoadError'));
        setRoundSlots([]);
        setTotalRounds(Math.max(1, found.submission_rounds ?? 1));
        setActiveRound(1);
        hydrateForm(null, found);
      }
    } catch {
      toast.error(t('projectDetail.loadError'));
    } finally {
      setLoading(false);
    }
  }, [assignmentId, hydrateForm, t]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'student') {
      router.replace(kidsLoginPortalHref(pathPrefix, 'ogrenci'));
      return;
    }
    load();
  }, [authLoading, user?.id, user?.role, router, pathPrefix, load]);

  const submissionMode = useMemo(() => {
    if (!assignment) return 'both';
    if (assignment.require_video && !assignment.require_image) return 'video_only';
    if (assignment.require_image && !assignment.require_video) return 'steps_only';
    return 'both';
  }, [assignment]);

  const maxStepImages = KIDS_MAX_IMAGES_PER_SUBMISSION;

  const showSteps =
    submissionMode === 'steps_only' || (submissionMode === 'both' && kind === 'steps');
  const showVideo =
    submissionMode === 'video_only' || (submissionMode === 'both' && kind === 'video');

  const submissionGate = useMemo(() => {
    if (!assignment) return { ok: true as const, phase: 'legacy' as const };
    return kidsAssignmentSubmissionGate(assignment);
  }, [assignment]);

  const windowLabel = useMemo(
    () => (assignment ? kidsFormatAssignmentWindowTr(assignment) : ''),
    [assignment],
  );
  const canSubmit = useMemo(() => {
    if (!assignment) return false;
    if (showVideo) {
      if (assignment.require_video && !videoUrl.trim()) return false;
      return !!videoUrl.trim() || !!caption.trim();
    }
    if (showSteps) {
      if (!steps.some((s) => s.text.trim())) return false;
      if (assignment.require_image) {
        return imageUrls.length >= 1 && imageUrls.length <= maxStepImages;
      }
      return true;
    }
    return false;
  }, [assignment, showSteps, showVideo, steps, videoUrl, caption, imageUrls, maxStepImages]);

  const canSubmitFinal = canSubmit && submissionGate.ok;
  /** Teslim penceresi kapalıysa form yerine salt okunur özet; «henüz başlamadı» için alanlar devre dışı. */
  const submissionClosed =
    !submissionGate.ok && submissionGate.phase === 'closed';
  const formLocked = !submissionGate.ok && !submissionClosed;
  /** Öğretmen değerlendirmesi kaydedildiyse backend ile uyumlu: düzenleme yok. */
  const teacherEvaluated = Boolean(existingSubmission?.teacher_reviewed_at);

  function switchRound(r: number) {
    if (!assignment || r < 1 || r > totalRounds) return;
    if (
      submissionGate.ok &&
      !canNavigateToAssignmentRound(r, roundSlots, totalRounds, true)
    ) {
      toast.error(t('projectDetail.roundLocked').replace('{round}', String(r - 1)));
      return;
    }
    const slot = roundSlots.find((x) => x.round_number === r);
    setActiveRound(r);
    hydrateForm(slot?.submission ?? null, assignment);
    const path = `${pathPrefix}/ogrenci/proje/${assignmentId}${r > 1 ? `?round=${r}` : ''}`;
    router.replace(path, { scroll: false });
  }
  const showReadOnlySubmission = Boolean(
    existingSubmission && (submissionClosed || teacherEvaluated),
  );

  async function onVideoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !assignment) return;
    try {
      const sec = await readVideoDuration(f);
      if (sec > assignment.video_max_seconds + 0.5) {
        toast.error(
          t('projectDetail.videoTooLong')
            .replace('{current}', String(Math.ceil(sec)))
            .replace('{max}', String(assignment.video_max_seconds)),
        );
      } else {
        toast.success(t('projectDetail.videoDurationOk').replace('{current}', String(Math.ceil(sec))));
      }
    } catch {
      toast.error(t('projectDetail.videoCheckFailed'));
    }
    e.target.value = '';
  }

  async function onAssignmentImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !assignment) return;
    if (imageUrls.length >= maxStepImages) {
      toast.error(t('projectDetail.maxImages').replace('{count}', String(maxStepImages)));
      e.target.value = '';
      return;
    }
    setUploadingImage(true);
    try {
      const { url } = await kidsUploadSubmissionImage(f);
      setImageUrls((prev) => [...prev, url]);
      toast.success(t('projectDetail.imageAdded'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('projectDetail.imageUploadFailed'));
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  }

  function removeImageAt(i: number) {
    setImageUrls((prev) => prev.filter((_, j) => j !== i));
  }

  const closeMotivationAndNavigate = useCallback(() => {
    setMotivationOpen(false);
    const p = motivationNavRef.current;
    motivationNavRef.current = null;
    if (!p) return;
    if (p.kind === 'next') {
      router.replace(`${pathPrefix}/ogrenci/proje/${assignmentId}?round=${p.next}`, { scroll: false });
    } else {
      router.push(`${pathPrefix}/ogrenci/projeler`);
    }
  }, [router, pathPrefix, assignmentId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!assignment || !canSubmitFinal) return;
    const isUpdate = Boolean(existingSubmission);
    setSubmitting(true);
    try {
      let rec: KidsSubmissionRecord;
      if (showSteps) {
        const payload: { steps: { text: string }[]; image_urls?: string[] } = {
          steps: steps.filter((s) => s.text.trim()).map((s) => ({ text: s.text.trim() })),
        };
        if (assignment.require_image) {
          payload.image_urls = [...imageUrls];
        }
        rec = await kidsCreateSubmission({
          assignment: assignment.id,
          round_number: activeRound,
          kind: 'steps',
          steps_payload: payload,
          caption: caption.trim(),
        });
      } else {
        rec = await kidsCreateSubmission({
          assignment: assignment.id,
          round_number: activeRound,
          kind: 'video',
          video_url: videoUrl.trim(),
          caption: caption.trim(),
        });
      }
      setExistingSubmission(rec);
      let bundle: Awaited<ReturnType<typeof kidsGetSubmissionRoundsForAssignment>> | null = null;
      try {
        bundle = await kidsGetSubmissionRoundsForAssignment(assignmentId);
        setRoundSlots(bundle.rounds);
        const tr = Math.max(1, bundle.submission_rounds || 1);
        setTotalRounds(tr);
        const slot = bundle.rounds.find((x) => x.round_number === activeRound);
        hydrateForm(slot?.submission ?? rec, assignment);
      } catch {
        hydrateForm(rec, assignment);
      }
      toast.success(isUpdate ? t('projectDetail.updated') : t('projectDetail.received'));
      if (!isUpdate) {
        const tr = Math.max(
          1,
          bundle?.submission_rounds ?? assignment.submission_rounds ?? 1,
        );
        const hasMoreRounds = tr > 1 && activeRound < tr;
        const isFinalStep = !hasMoreRounds;
        /** Son adımda her zaman kutla; ara adımlarda maskot ara sıra (yaklaşık %80) çıkar. */
        const showMotivation = isFinalStep || Math.random() < 0.82;

        if (hasMoreRounds) {
          const next = activeRound + 1;
          const nextSlot = bundle?.rounds.find((x) => x.round_number === next);
          setActiveRound(next);
          hydrateForm(nextSlot?.submission ?? null, assignment);
          if (showMotivation) {
            setMotivationMessage(kidsPickStepMotivationMessage(false, t));
            setMotivationIsFinal(false);
            motivationNavRef.current = { kind: 'next', next };
            setMotivationOpen(true);
          } else {
            router.replace(`${pathPrefix}/ogrenci/proje/${assignmentId}?round=${next}`, { scroll: false });
          }
        } else {
          if (showMotivation) {
            setMotivationMessage(kidsPickStepMotivationMessage(true, t));
            setMotivationIsFinal(true);
            motivationNavRef.current = { kind: 'projects' };
            setMotivationOpen(true);
          } else {
            router.push(`${pathPrefix}/ogrenci/projeler`);
          }
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || !user || user.role !== 'student') {
    return <p className="text-center text-gray-600">{t('common.loading')}</p>;
  }
  if (loading) {
    return <p className="text-center text-gray-600">{t('common.loading')}</p>;
  }
  if (!assignment) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <p className="text-gray-600 dark:text-gray-400">{t('projectDetail.notFound')}</p>
        <Link href={`${pathPrefix}/ogrenci/projeler`} className="mt-4 inline-block text-brand hover:underline">
          {t('projectDetail.backChallenges')}
        </Link>
      </div>
    );
  }

  const inputPlay =
    'w-full rounded-2xl border-2 border-violet-200/90 bg-gradient-to-br from-white to-violet-50/40 px-4 py-3 text-sm text-slate-800 shadow-inner shadow-violet-100/30 placeholder:text-violet-300/80 focus:border-fuchsia-400 focus:outline-none focus:ring-4 focus:ring-fuchsia-200/50 disabled:cursor-not-allowed disabled:opacity-75 dark:border-violet-700 dark:from-violet-950/40 dark:to-fuchsia-950/20 dark:text-white dark:placeholder:text-violet-600/50 dark:focus:border-fuchsia-500 dark:focus:ring-fuchsia-900/40';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={`${pathPrefix}/ogrenci/projeler`}
        className="inline-flex text-sm font-bold text-fuchsia-700 hover:underline dark:text-fuchsia-300"
      >
        ← {t('projectDetail.backChallenges')}
      </Link>
      <div className="rounded-[1.75rem] border-4 border-white/90 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-amber-400 p-1 shadow-xl shadow-fuchsia-500/20 dark:border-violet-900/50 dark:from-violet-800 dark:via-fuchsia-800 dark:to-amber-700">
        <div className="rounded-2xl bg-white/95 px-5 py-6 dark:bg-gray-950/95 sm:px-7 sm:py-7">
          <p className="text-xs font-black uppercase tracking-widest text-fuchsia-600 dark:text-fuchsia-400">
            📌 Challenge
          </p>
          <h1 className="font-logo mt-1 text-2xl font-black text-violet-950 dark:text-white">{assignment.title}</h1>
          {assignment.purpose ? (
            <p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-relaxed text-slate-600 dark:text-gray-300">
              {assignment.purpose}
            </p>
          ) : null}
          {assignment.materials ? (
            <div className="mt-4 rounded-2xl border-2 border-sky-200 bg-gradient-to-r from-sky-50 to-cyan-50 p-4 text-sm dark:border-sky-800 dark:from-sky-950/50 dark:to-cyan-950/40">
              <span className="font-logo font-bold text-sky-900 dark:text-sky-100">🧰 {t('teacherClass.assignments.materials')}</span>
              <p className="mt-2 whitespace-pre-wrap font-medium text-sky-900/90 dark:text-sky-100/90">
                {assignment.materials}
              </p>
            </div>
          ) : null}
          <p className="mt-4 text-xs font-semibold text-violet-700/80 dark:text-violet-300/90">
            {assignment.require_video && !assignment.require_image
                  ? t('projectDetail.submitModeVideo').replace('{max}', String(assignment.video_max_seconds))
              : assignment.require_image && !assignment.require_video
                ? t('projectDetail.submitModeSteps')
                : t('projectDetail.submitModeBoth').replace('{max}', String(assignment.video_max_seconds))}
          </p>
          <KidsAssignmentRoundStepper
            totalRounds={totalRounds}
            activeRound={activeRound}
            roundSlots={roundSlots}
            gateOpen={submissionGate.ok}
            disableNavigation={formLocked}
            onSelectRound={switchRound}
          />
          {windowLabel ? (
            <p className="mt-2 rounded-xl bg-amber-100/80 px-3 py-2 text-sm font-bold text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
              📅 {windowLabel}
            </p>
          ) : null}
        </div>
      </div>

      {!submissionGate.ok ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          {submissionGate.phase === 'not_yet'
            ? t('projectDetail.windowNotStarted')
            : existingSubmission
              ? t('projectDetail.windowEndedReadonly')
              : t('projectDetail.windowEnded')}
        </div>
      ) : null}

      {existingSubmission?.is_teacher_pick ? (
        <div className="rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50 p-4 text-sm text-amber-950 dark:border-amber-700 dark:from-amber-950/50 dark:to-yellow-950/40 dark:text-amber-100">
          <p className="text-lg" aria-hidden>
            ⭐
          </p>
          <p className="font-semibold">{t('projectDetail.starTitle')}</p>
          <p className="mt-1 leading-relaxed">
            {t('projectDetail.starBody')}
          </p>
        </div>
      ) : null}

      {existingSubmission?.review_hint ? (
        <div
          className={`rounded-2xl border p-4 text-sm ${
            existingSubmission.review_hint.code === 'pending'
              ? 'border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100'
              : 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/35 dark:text-emerald-100'
          }`}
        >
          <p className="font-semibold">{existingSubmission.review_hint.title}</p>
          <p className="mt-1 leading-relaxed">{existingSubmission.review_hint.body}</p>
        </div>
      ) : null}

      {submissionClosed && !existingSubmission ? (
        <p className="rounded-2xl border-2 border-rose-200 bg-gradient-to-r from-rose-50 to-amber-50 px-4 py-4 text-sm font-semibold text-rose-900 dark:border-rose-900 dark:from-rose-950/40 dark:to-amber-950/30 dark:text-rose-100">
          {t('projectDetail.missedWindow')}
        </p>
      ) : showReadOnlySubmission && existingSubmission ? (
        <div className="rounded-[1.75rem] border-4 border-fuchsia-200/90 bg-gradient-to-br from-violet-200/40 via-fuchsia-100/50 to-amber-100/40 p-1 shadow-xl dark:border-fuchsia-900/50 dark:from-violet-950/40 dark:via-fuchsia-950/30 dark:to-amber-950/20">
          <div className="space-y-5 rounded-2xl bg-white/95 p-6 dark:bg-gray-950/95 sm:p-7">
            <div>
              <h2 className="font-logo flex items-center gap-2 text-xl font-black text-violet-800 dark:text-violet-200">
                <span aria-hidden>📦</span> {t('projectDetail.yourSubmission')}
                {totalRounds > 1 ? (
                  <span className="text-base font-black text-fuchsia-700 dark:text-fuchsia-300">
                    {' '}
                    · {t('projectDetail.step')} {activeRound}
                  </span>
                ) : null}
              </h2>
              <p className="mt-1 text-sm font-semibold text-violet-600/90 dark:text-violet-300/90">
                {submissionClosed
                  ? `⏳ ${t('projectDetail.readonlyTimeUp')}`
                  : `🔒 ${t('projectDetail.readonlyReviewed')}`}
              </p>
            </div>
            {existingSubmission.kind === 'steps' ? (
              <div className="space-y-4">
                {(existingSubmission.steps_payload?.steps ?? []).map((s, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border-2 border-violet-200/70 bg-gradient-to-br from-violet-50/90 to-white p-4 dark:border-violet-800 dark:from-violet-950/40 dark:to-gray-950"
                  >
                    <p className="font-logo text-xs font-black uppercase tracking-wide text-fuchsia-600 dark:text-fuchsia-400">
                      ✏️ {t('projectDetail.step')} {i + 1}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm font-medium text-slate-800 dark:text-gray-100">
                      {s.text || '—'}
                    </p>
                  </div>
                ))}
                {(existingSubmission.steps_payload?.image_urls ?? []).length > 0 ? (
                  <div className="rounded-2xl border-2 border-amber-300/70 bg-gradient-to-r from-amber-50 to-orange-50 p-4 dark:border-amber-800 dark:from-amber-950/40 dark:to-orange-950/30">
                    <p className="font-logo text-sm font-black text-amber-900 dark:text-amber-100">🖼 {t('projectDetail.yourImage')}</p>
                    <ul className="mt-3 flex flex-wrap gap-3">
                      {(existingSubmission.steps_payload?.image_urls ?? []).map((url, idx) => (
                        <li
                          key={`${url}-${idx}`}
                          className="h-28 w-28 overflow-hidden rounded-2xl border-4 border-white shadow-lg ring-2 ring-amber-200 dark:border-gray-800 dark:ring-amber-900"
                        >
                          <img src={url} alt="" className="h-full w-full object-cover" />
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-sky-300/70 bg-gradient-to-br from-sky-50 to-cyan-50 p-4 dark:border-sky-800 dark:from-sky-950/40 dark:to-cyan-950/30">
                <p className="font-logo text-sm font-black text-sky-900 dark:text-sky-100">🎬 {t('projectDetail.video')}</p>
                {existingSubmission.video_url ? (
                  <a
                    href={existingSubmission.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex break-all text-sm font-bold text-fuchsia-700 underline-offset-2 hover:underline dark:text-fuchsia-300"
                  >
                    {existingSubmission.video_url}
                  </a>
                ) : (
                  <p className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-400">{t('projectDetail.noLink')}</p>
                )}
              </div>
            )}
            <div className="rounded-2xl border-2 border-emerald-200/80 bg-gradient-to-r from-emerald-50/90 to-teal-50/80 p-4 dark:border-emerald-900 dark:from-emerald-950/35 dark:to-teal-950/30">
              <p className="font-logo text-xs font-black uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
                💬 {t('projectDetail.shortSummary')}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm font-medium text-emerald-950 dark:text-emerald-50">
                {existingSubmission.caption?.trim() ? existingSubmission.caption : '—'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <form
          className={`space-y-6 rounded-[1.75rem] border-4 border-violet-200/80 bg-gradient-to-b from-violet-50/90 via-white to-fuchsia-50/50 p-6 shadow-xl dark:border-violet-900/60 dark:from-violet-950/30 dark:via-gray-950 dark:to-fuchsia-950/20 sm:p-7 ${formLocked ? 'opacity-95' : ''}`}
          onSubmit={onSubmit}
        >
          <div className="flex items-center gap-2 border-b-2 border-violet-200/50 pb-3 dark:border-violet-800/50">
            <span className="text-2xl" aria-hidden>
              🚀
            </span>
            <h2 className="font-logo text-lg font-black text-violet-900 dark:text-violet-100">
              {t('projectDetail.uploadSubmission')}
              {totalRounds > 1 ? (
                <span className="text-fuchsia-700 dark:text-fuchsia-300"> · {t('projectDetail.step')} {activeRound}</span>
              ) : null}
            </h2>
          </div>

          {submissionMode === 'both' ? (
            <div className="flex flex-wrap gap-3 text-sm font-bold">
              <label className="flex cursor-pointer items-center gap-2 rounded-2xl border-2 border-violet-200 bg-white/80 px-4 py-2 has-[:checked]:border-fuchsia-500 has-[:checked]:bg-fuchsia-50 dark:border-violet-800 dark:bg-violet-950/40 dark:has-[:checked]:border-fuchsia-400 dark:has-[:checked]:bg-fuchsia-950/40">
                <input
                  type="radio"
                  name="kind"
                  checked={kind === 'steps'}
                  disabled={formLocked}
                  onChange={() => setKind('steps')}
                  className="accent-fuchsia-600"
                />
                📝 {t('projectDetail.stepByStep')}
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-2xl border-2 border-violet-200 bg-white/80 px-4 py-2 has-[:checked]:border-fuchsia-500 has-[:checked]:bg-fuchsia-50 dark:border-violet-800 dark:bg-violet-950/40 dark:has-[:checked]:border-fuchsia-400 dark:has-[:checked]:bg-fuchsia-950/40">
                <input
                  type="radio"
                  name="kind"
                  checked={kind === 'video'}
                  disabled={formLocked}
                  onChange={() => setKind('video')}
                  className="accent-fuchsia-600"
                />
                🎬 {t('projectDetail.video')}
              </label>
            </div>
          ) : submissionMode === 'video_only' ? (
            <p className="rounded-xl bg-sky-100/80 px-3 py-2 text-sm font-bold text-sky-900 dark:bg-sky-950/50 dark:text-sky-100">
              {t('projectDetail.videoRequired')}
            </p>
          ) : (
            <p className="rounded-xl bg-violet-100/80 px-3 py-2 text-sm font-bold text-violet-900 dark:bg-violet-950/50 dark:text-violet-100">
              {t('projectDetail.stepsRequired')}
            </p>
          )}

          {showSteps ? (
            <div className="space-y-4">
              {steps.map((s, i) => (
                <div key={i}>
                  <label className="font-logo text-sm font-black text-fuchsia-800 dark:text-fuchsia-200">
                    ✏️ {t('projectDetail.step')} {i + 1}
                  </label>
                  <textarea
                    value={s.text}
                    disabled={formLocked}
                    onChange={(e) => {
                      const next = [...steps];
                      next[i] = { text: e.target.value };
                      setSteps(next);
                    }}
                    rows={3}
                    className={`mt-2 ${inputPlay}`}
                    placeholder={t('projectDetail.stepPlaceholder')}
                  />
                </div>
              ))}
              <button
                type="button"
                disabled={formLocked}
                onClick={() => setSteps([...steps, { text: '' }])}
                className="text-sm font-black text-fuchsia-700 underline-offset-2 hover:underline disabled:opacity-50 dark:text-fuchsia-300"
              >
                + {t('projectDetail.addStep')}
              </button>
              {assignment.require_image ? (
                <div className="rounded-2xl border-2 border-amber-300/90 bg-gradient-to-br from-amber-50 via-orange-50/80 to-yellow-50/60 p-4 shadow-inner dark:border-amber-800 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-yellow-950/20">
                  <p className="font-logo text-sm font-black text-amber-950 dark:text-amber-100">
                    🖼 {t('projectDetail.image')}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-amber-900/85 dark:text-amber-200/90">
                    {t('projectDetail.imageHint')}
                  </p>
                  {imageUrls.length > 0 ? (
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {imageUrls.map((url, idx) => (
                        <li
                          key={`${url}-${idx}`}
                          className="relative h-24 w-24 overflow-hidden rounded-xl border-4 border-white shadow-md ring-2 ring-amber-300 dark:border-gray-800 dark:ring-amber-800"
                        >
                          <img src={url} alt="" className="h-full w-full object-cover" />
                          <button
                            type="button"
                            disabled={formLocked}
                            onClick={() => removeImageAt(idx)}
                            className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-rose-500 text-sm font-black text-white shadow hover:bg-rose-600 disabled:opacity-50"
                            aria-label={t('projectDetail.removeImage')}
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <div className="mt-3">
                    <label className="text-xs font-black uppercase tracking-wide text-amber-900 dark:text-amber-200">
                      📤 {t('projectDetail.selectImage')}
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={formLocked || uploadingImage || imageUrls.length >= maxStepImages}
                      onChange={(ev) => void onAssignmentImageFile(ev)}
                      className="mt-2 block w-full cursor-pointer text-sm font-medium file:mr-3 file:rounded-xl file:border-0 file:bg-fuchsia-500 file:px-4 file:py-2 file:font-bold file:text-white hover:file:bg-fuchsia-600 disabled:opacity-50"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {showVideo ? (
            <div className="space-y-4 rounded-2xl border-2 border-sky-300/80 bg-gradient-to-br from-sky-50 to-cyan-50/80 p-4 dark:border-sky-800 dark:from-sky-950/40 dark:to-cyan-950/30">
              <div>
                <label className="text-sm font-black text-sky-900 dark:text-sky-100">
                  🎥 {t('projectDetail.videoFile')}
                </label>
                <input
                  type="file"
                  accept="video/*"
                  disabled={formLocked}
                  onChange={onVideoFile}
                  className="mt-2 block w-full cursor-pointer text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-sky-500 file:px-4 file:py-2 file:font-bold file:text-white hover:file:bg-sky-600 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-sm font-black text-sky-900 dark:text-sky-100">🔗 {t('projectDetail.videoLink')}</label>
                <input
                  value={videoUrl}
                  disabled={formLocked}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className={`mt-2 ${inputPlay}`}
                  placeholder={t('projectDetail.videoLinkPlaceholder')}
                />
              </div>
            </div>
          ) : null}

          <div>
            <label className="font-logo text-sm font-black text-emerald-800 dark:text-emerald-200">
              💬 {t('projectDetail.caption')}
            </label>
            <textarea
              value={caption}
              disabled={formLocked}
              onChange={(e) => setCaption(e.target.value)}
              rows={2}
              className={`mt-2 ${inputPlay}`}
              placeholder={t('projectDetail.captionPlaceholder')}
            />
          </div>

          <button
            type="submit"
            disabled={!canSubmitFinal || submitting}
            className="w-full rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-amber-500 py-4 text-base font-black text-white shadow-lg shadow-fuchsia-500/30 transition hover:brightness-105 disabled:opacity-50"
          >
            {submitting
              ? t('common.loading')
              : existingSubmission
                ? `✨ ${t('projectDetail.update')}`
                : `🎉 ${t('projectDetail.submit')}`}
          </button>
        </form>
      )}
      <KidsStudentStepMotivationModal
        open={motivationOpen}
        message={motivationMessage}
        isFinalStep={motivationIsFinal}
        onContinue={closeMotivationAndNavigate}
      />
    </div>
  );
}
