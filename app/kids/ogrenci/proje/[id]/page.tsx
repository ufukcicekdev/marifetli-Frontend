'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  FlaskConical,
  Leaf,
  Lightbulb,
  Music,
  Palette,
  Rocket,
  Sparkles,
  Upload,
  Zap,
} from 'lucide-react';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import {
  KIDS_MAX_IMAGES_PER_SUBMISSION,
  kidsAssignmentSubmissionGate,
  kidsCreateSubmission,
  kidsFormatAssignmentWindowTr,
  kidsGetSubmissionRoundsForAssignment,
  kidsStudentAssignmentAllRoundsSubmitted,
  kidsStudentDashboard,
  kidsUploadSubmissionImage,
  type KidsAssignment,
  type KidsAssignmentRoundSlot,
  type KidsSubmissionRecord,
} from '@/src/lib/kids-api';
import { kidsSubmissionReviewHintLines } from '@/src/lib/kids-submission-review-hint-i18n';
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
import { KidsMascotBubble } from '@/src/components/kids/kids-mascot-bubble';

const BUDDY_EXPLORER_IMG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuA3b5ooINhscRadwZNiztlFoBih9iIRudM1GrYYa4GVPyf8pfjQza8uFzBexu_OG5FxpPmcbygWO_mXRzqxKzn5RQ2q7DGtwy14dtQkriIrlYR7nP5oKIa7ORSMBhaQ-3U2vWMJMnUpqljdKb22cB47Kp8-HgvKDRgISV8U3tcbLL08NqI31zdzCa55p3LHNE1Cfhq6QjkPxVVPtZjidHL8BT8V5gGhh7FPiwQEV4RfQQTU7EbzSJvyF9G-TxabQ9LQA9tMWf7xxRur';

function rubricMaxPoints(a: KidsAssignment): number | null {
  if (!a.rubric_schema?.length) return null;
  const n = a.rubric_schema.reduce((s, r) => s + (typeof r.max_points === 'number' ? r.max_points : 0), 0);
  return n > 0 ? n : null;
}

function heroThemeIcon(theme: KidsAssignment['challenge_card_theme']) {
  const cls = 'h-16 w-16 sm:h-20 sm:w-20 text-violet-600 dark:text-violet-300';
  if (theme === 'art') return <Palette className={cls} strokeWidth={1.75} aria-hidden />;
  if (theme === 'science') return <FlaskConical className={cls} strokeWidth={1.75} aria-hidden />;
  if (theme === 'motion') return <Zap className={cls} strokeWidth={1.75} aria-hidden />;
  if (theme === 'music') return <Music className={cls} strokeWidth={1.75} aria-hidden />;
  return <Leaf className={cls} strokeWidth={1.75} aria-hidden />;
}

type RoundDraft = {
  kind: 'steps' | 'video';
  steps: { text: string }[];
  imageUrls: string[];
  videoUrl: string;
  caption: string;
};

function emptyDraftForAssignment(found: KidsAssignment): RoundDraft {
  let kind: 'steps' | 'video' = 'steps';
  if (found.require_video && !found.require_image) kind = 'video';
  else if (found.require_image && !found.require_video) kind = 'steps';
  return { kind, steps: [{ text: '' }], imageUrls: [], videoUrl: '', caption: '' };
}

function snapshotRoundDraft(
  kind: 'steps' | 'video',
  steps: { text: string }[],
  imageUrls: string[],
  videoUrl: string,
  caption: string,
): RoundDraft {
  return {
    kind,
    steps: steps.length ? steps.map((s) => ({ text: s.text ?? '' })) : [{ text: '' }],
    imageUrls: [...imageUrls],
    videoUrl,
    caption,
  };
}

function draftRoundValid(
  assignment: KidsAssignment,
  draft: RoundDraft,
  maxStepImages: number,
  submissionMode: 'both' | 'steps_only' | 'video_only',
): boolean {
  const showSteps = submissionMode === 'steps_only' || (submissionMode === 'both' && draft.kind === 'steps');
  const showVideo = submissionMode === 'video_only' || (submissionMode === 'both' && draft.kind === 'video');

  if (showVideo) {
    if (assignment.require_video && !draft.videoUrl.trim()) return false;
    return Boolean(draft.videoUrl.trim() || draft.caption.trim());
  }
  if (showSteps) {
    const mainText = (draft.steps[0]?.text ?? '').trim();
    if (!mainText) return false;
    if (assignment.require_image) {
      return draft.imageUrls.length >= 1 && draft.imageUrls.length <= maxStepImages;
    }
    return true;
  }
  return false;
}

function allRoundSlotsHaveSubmission(slots: KidsAssignmentRoundSlot[], totalRounds: number): boolean {
  const tr = Math.max(1, totalRounds);
  if (slots.length === 0) return false;
  for (let r = 1; r <= tr; r++) {
    const slot = slots.find((x) => x.round_number === r);
    if (!slot?.submission) return false;
  }
  return true;
}

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
  const roundDraftsRef = useRef<Record<number, RoundDraft>>({});

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
        const merged =
          rawSteps && rawSteps.length > 0
            ? rawSteps
                .map((s) => (s.text || '').trim())
                .filter(Boolean)
                .join('\n\n')
            : '';
        setSteps([{ text: merged }]);
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

  const hydrateFromDraft = useCallback((d: RoundDraft) => {
    setExistingSubmission(null);
    setKind(d.kind);
    setSteps(d.steps.length ? d.steps.map((s) => ({ text: s.text ?? '' })) : [{ text: '' }]);
    setImageUrls([...d.imageUrls]);
    setVideoUrl(d.videoUrl);
    setCaption(d.caption);
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
        const anySubmitted = bundle.rounds.some((x) => x.submission);
        const useMultiDraft = gateOk && total > 1 && !anySubmitted;
        let initial = 1;
        const urlInRange = Number.isFinite(qn) && qn >= 1 && qn <= total;
        if (
          urlInRange &&
          (!gateOk || useMultiDraft || canNavigateToAssignmentRound(qn, bundle.rounds, total, true))
        ) {
          initial = qn;
        } else {
          const inc = bundle.rounds.find((x) => !x.submission);
          if (inc) initial = inc.round_number;
        }
        setActiveRound(initial);
        if (useMultiDraft) {
          const drafts: Record<number, RoundDraft> = {};
          for (let r = 1; r <= total; r++) drafts[r] = emptyDraftForAssignment(found);
          roundDraftsRef.current = drafts;
          hydrateFromDraft(drafts[initial]);
        } else {
          const slot = bundle.rounds.find((r) => r.round_number === initial);
          hydrateForm(slot?.submission ?? null, found);
        }
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
  }, [assignmentId, hydrateForm, hydrateFromDraft, t]);

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
      if (!steps[0]?.text?.trim()) return false;
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
  /** Tüm turlar gönderildi; liste «tamamlandı» ve inceleme modunda düzenleme kapalı. */
  const studentChallengeComplete = useMemo(() => {
    if (!assignment) return false;
    if (kidsStudentAssignmentAllRoundsSubmitted(assignment)) return true;
    return allRoundSlotsHaveSubmission(roundSlots, totalRounds);
  }, [assignment, roundSlots, totalRounds]);
  const anyRoundSubmitted = useMemo(
    () => roundSlots.some((s) => s.submission),
    [roundSlots],
  );
  /** Çok turlu ve hiç teslim yokken: taslak + ileri–geri; gönderim yalnızca son turda toplu. */
  const draftMode =
    submissionGate.ok &&
    Math.max(1, totalRounds) > 1 &&
    !anyRoundSubmitted &&
    !submissionClosed;

  const allRoundsComplete = useMemo(() => {
    if (!assignment || !draftMode) return false;
    const tr = Math.max(1, totalRounds);
    for (let r = 1; r <= tr; r++) {
      const draft =
        r === activeRound
          ? snapshotRoundDraft(kind, steps, imageUrls, videoUrl, caption)
          : (roundDraftsRef.current[r] ?? emptyDraftForAssignment(assignment));
      if (!draftRoundValid(assignment, draft, maxStepImages, submissionMode)) return false;
    }
    return true;
  }, [
    assignment,
    draftMode,
    totalRounds,
    activeRound,
    kind,
    steps,
    imageUrls,
    videoUrl,
    caption,
    submissionMode,
    maxStepImages,
  ]);

  function switchRound(r: number) {
    if (!assignment || r < 1 || r > totalRounds) return;
    if (draftMode) {
      roundDraftsRef.current[activeRound] = snapshotRoundDraft(kind, steps, imageUrls, videoUrl, caption);
      const nextDraft = roundDraftsRef.current[r] ?? emptyDraftForAssignment(assignment);
      setActiveRound(r);
      hydrateFromDraft(nextDraft);
      const path = `${pathPrefix}/ogrenci/proje/${assignmentId}${r > 1 ? `?round=${r}` : ''}`;
      router.replace(path, { scroll: false });
      return;
    }
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
    existingSubmission &&
      (submissionClosed || teacherEvaluated || studentChallengeComplete),
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
    router.push(`${pathPrefix}/ogrenci/projeler`);
  }, [router, pathPrefix]);

  function goDraftNext() {
    if (!assignment || !draftMode) return;
    const tr = Math.max(1, totalRounds);
    if (activeRound >= tr) return;
    roundDraftsRef.current[activeRound] = snapshotRoundDraft(kind, steps, imageUrls, videoUrl, caption);
    const next = activeRound + 1;
    const d = roundDraftsRef.current[next] ?? emptyDraftForAssignment(assignment);
    setActiveRound(next);
    hydrateFromDraft(d);
    router.replace(
      `${pathPrefix}/ogrenci/proje/${assignmentId}${next > 1 ? `?round=${next}` : ''}`,
      { scroll: false },
    );
  }

  function goDraftBack() {
    if (!assignment || !draftMode) return;
    if (activeRound <= 1) return;
    roundDraftsRef.current[activeRound] = snapshotRoundDraft(kind, steps, imageUrls, videoUrl, caption);
    const prev = activeRound - 1;
    const d = roundDraftsRef.current[prev] ?? emptyDraftForAssignment(assignment);
    setActiveRound(prev);
    hydrateFromDraft(d);
    router.replace(
      `${pathPrefix}/ogrenci/proje/${assignmentId}${prev > 1 ? `?round=${prev}` : ''}`,
      { scroll: false },
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!assignment) return;
    if (studentChallengeComplete) return;

    const trRoundsSubmit = Math.max(1, totalRounds);
    if (draftMode && activeRound === trRoundsSubmit) {
      if (!submissionGate.ok) return;
      roundDraftsRef.current[activeRound] = snapshotRoundDraft(kind, steps, imageUrls, videoUrl, caption);
      for (let r = 1; r <= trRoundsSubmit; r++) {
        const draft = roundDraftsRef.current[r] ?? emptyDraftForAssignment(assignment);
        if (!draftRoundValid(assignment, draft, maxStepImages, submissionMode)) {
          toast.error(t('projectDetail.fillThisRound').replace('{n}', String(r)));
          return;
        }
      }
      setSubmitting(true);
      try {
        let lastRec: KidsSubmissionRecord | null = null;
        for (let r = 1; r <= trRoundsSubmit; r++) {
          const d = roundDraftsRef.current[r] ?? emptyDraftForAssignment(assignment);
          const captionForApi = d.caption.trim();
          const showStepsR =
            submissionMode === 'steps_only' || (submissionMode === 'both' && d.kind === 'steps');
          if (showStepsR) {
            const mainText = (d.steps[0]?.text ?? '').trim();
            const payload: { steps: { text: string }[]; image_urls?: string[] } = {
              steps: mainText ? [{ text: mainText }] : [],
            };
            if (assignment.require_image) {
              payload.image_urls = [...d.imageUrls];
            }
            lastRec = await kidsCreateSubmission({
              assignment: assignment.id,
              round_number: r,
              kind: 'steps',
              steps_payload: payload,
              caption: captionForApi,
            });
          } else {
            lastRec = await kidsCreateSubmission({
              assignment: assignment.id,
              round_number: r,
              kind: 'video',
              video_url: d.videoUrl.trim(),
              caption: captionForApi,
            });
          }
        }
        if (lastRec) setExistingSubmission(lastRec);
        let bundle: Awaited<ReturnType<typeof kidsGetSubmissionRoundsForAssignment>> | null = null;
        try {
          bundle = await kidsGetSubmissionRoundsForAssignment(assignmentId);
          setRoundSlots(bundle.rounds);
          const tr = Math.max(1, bundle.submission_rounds || 1);
          setTotalRounds(tr);
          const slot = bundle.rounds.find((x) => x.round_number === trRoundsSubmit);
          hydrateForm(slot?.submission ?? lastRec, assignment);
          setActiveRound(trRoundsSubmit);
        } catch {
          if (lastRec) hydrateForm(lastRec, assignment);
        }
        toast.success(t('projectDetail.received'));
        const showMotivation = Math.random() < 0.85;
        if (showMotivation) {
          setMotivationMessage(kidsPickStepMotivationMessage(true, t));
          setMotivationIsFinal(true);
          setMotivationOpen(true);
        } else {
          router.push(`${pathPrefix}/ogrenci/projeler`);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t('common.saveFailed'));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!canSubmitFinal) return;
    const isUpdate = Boolean(existingSubmission);
    setSubmitting(true);
    try {
      const captionForApi = caption.trim();
      let rec: KidsSubmissionRecord;
      if (showSteps) {
        const mainText = (steps[0]?.text ?? '').trim();
        const payload: { steps: { text: string }[]; image_urls?: string[] } = {
          steps: mainText ? [{ text: mainText }] : [],
        };
        if (assignment.require_image) {
          payload.image_urls = [...imageUrls];
        }
        rec = await kidsCreateSubmission({
          assignment: assignment.id,
          round_number: activeRound,
          kind: 'steps',
          steps_payload: payload,
          caption: captionForApi,
        });
      } else {
        rec = await kidsCreateSubmission({
          assignment: assignment.id,
          round_number: activeRound,
          kind: 'video',
          video_url: videoUrl.trim(),
          caption: captionForApi,
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

        if (hasMoreRounds) {
          const next = activeRound + 1;
          const nextSlot = bundle?.rounds.find((x) => x.round_number === next);
          setActiveRound(next);
          hydrateForm(nextSlot?.submission ?? null, assignment);
          router.replace(`${pathPrefix}/ogrenci/proje/${assignmentId}?round=${next}`, { scroll: false });
        } else {
          const showMotivation = Math.random() < 0.85;
          if (showMotivation) {
            setMotivationMessage(kidsPickStepMotivationMessage(true, t));
            setMotivationIsFinal(true);
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

  const trRounds = Math.max(1, totalRounds);
  /** İlk kayıt: ara turlarda «Sonraki adım», son turda «Gönder». Güncellemede her zaman «Güncelle». */
  const primaryIsNextStep = !existingSubmission && trRounds > 1 && activeRound < trRounds;
  const heroProgressPct = Math.min(100, Math.round((activeRound / trRounds) * 100));
  const rubricPts = rubricMaxPoints(assignment);
  const heroStatusUpper = teacherEvaluated
    ? t('projectDetail.statusReviewed')
    : !submissionGate.ok && submissionGate.phase === 'not_yet'
      ? t('projectDetail.statusSoon')
      : !submissionGate.ok && submissionGate.phase === 'closed' && !existingSubmission
        ? t('projectDetail.statusClosed')
        : existingSubmission
          ? t('projectDetail.statusSubmitted')
          : t('projectDetail.statusInProgress');
  const explorerTipRaw =
    assignment.materials?.trim() || assignment.purpose?.trim() || t('projectDetail.explorerTipFallback');
  const explorerTipText =
    explorerTipRaw.length > 320 ? `${explorerTipRaw.slice(0, 317)}…` : explorerTipRaw;
  const fieldBase =
    'w-full rounded-lg border-0 bg-zinc-100 p-4 text-sm font-medium text-slate-800 shadow-inner placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500';

  const heroSection = (
    <section className="relative group">
      <div
        className="absolute -inset-1 rounded-xl bg-gradient-to-r from-violet-600 to-pink-500 opacity-10 blur transition duration-1000 group-hover:opacity-20"
        aria-hidden
      />
      <div className="relative overflow-hidden rounded-xl border border-white/40 bg-white/85 p-8 shadow-[0_40px_80px_rgba(156,39,176,0.08)] backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/75 md:p-12">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-center">
          <div className="min-w-0 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-violet-700 dark:text-violet-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-violet-600" aria-hidden />
              {heroStatusUpper}
            </div>
            <h1 className="font-logo text-4xl font-black leading-tight tracking-tight text-slate-900 dark:text-white md:text-5xl">
              {assignment.title}
            </h1>
            {assignment.purpose ? (
              <p className="max-w-lg whitespace-pre-wrap text-lg text-slate-600 dark:text-zinc-300">
                {assignment.purpose}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-6 pt-2">
              <div className="flex flex-col">
                <span className="text-2xl font-black text-violet-600 dark:text-violet-400">
                  {t('projectDetail.stepOfTotal')
                    .replace('{current}', String(activeRound))
                    .replace('{total}', String(trRounds))}
                </span>
                <span className="text-xs font-bold uppercase tracking-tighter text-slate-500 dark:text-zinc-400">
                  {t('projectDetail.currentProgress')}
                </span>
              </div>
              <div className="hidden h-10 w-px bg-slate-200 sm:block dark:bg-zinc-600" aria-hidden />
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-fuchsia-100 dark:bg-fuchsia-950/50">
                  <Sparkles className="h-5 w-5 text-fuchsia-600 dark:text-fuchsia-300" aria-hidden />
                </div>
                <span className="font-bold text-slate-900 dark:text-white">
                  {rubricPts != null
                    ? t('projectDetail.pointsReward').replace('{n}', String(rubricPts))
                    : t('projectDetail.pointsGeneric')}
                </span>
              </div>
            </div>
          </div>
          <div className="relative mx-auto flex h-44 w-44 shrink-0 items-center justify-center sm:h-48 sm:w-48">
            <div
              className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-200/40 to-pink-200/40 blur-3xl dark:from-violet-600/20 dark:to-pink-600/20"
              aria-hidden
            />
            <div className="relative flex h-36 w-36 -rotate-6 items-center justify-center rounded-xl bg-white shadow-2xl transition-transform duration-500 hover:rotate-0 dark:bg-zinc-800 sm:h-40 sm:w-40">
              {heroThemeIcon(assignment.challenge_card_theme)}
            </div>
            <div className="absolute -right-1 -top-2 flex h-14 w-14 rotate-12 items-center justify-center rounded-full bg-amber-300 shadow-lg dark:bg-amber-400">
              <Brain className="h-7 w-7 text-amber-950" aria-hidden />
            </div>
          </div>
        </div>
        <div className="mt-10 space-y-3">
          <div className="flex items-end justify-between gap-4">
            <span className="text-sm font-black text-slate-900 dark:text-white">
              {t('projectDetail.adventureProgress')}
            </span>
            <span className="shrink-0 text-sm font-black text-violet-600 dark:text-violet-400">
              {t('projectDetail.percentComplete').replace('{n}', String(heroProgressPct))}
            </span>
          </div>
          <div className="h-4 w-full rounded-full bg-zinc-200 p-1 dark:bg-zinc-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-600 to-pink-500 shadow-[0_0_15px_rgba(124,58,237,0.35)] transition-all duration-500"
              style={{ width: `${heroProgressPct}%` }}
            />
          </div>
        </div>
        <KidsAssignmentRoundStepper
          totalRounds={totalRounds}
          activeRound={activeRound}
          roundSlots={roundSlots}
          gateOpen={submissionGate.ok}
          disableNavigation={formLocked}
          freeNavigate={draftMode}
          composeHint={
            draftMode
              ? t('projectDetail.stepperComposeHint').replace('{n}', String(Math.max(1, totalRounds)))
              : undefined
          }
          onSelectRound={switchRound}
        />
        <p className="mt-3 text-xs font-semibold text-violet-700 dark:text-violet-300">
          {assignment.require_video && !assignment.require_image
            ? t('projectDetail.submitModeVideo').replace('{max}', String(assignment.video_max_seconds))
            : assignment.require_image && !assignment.require_video
              ? t('projectDetail.submitModeSteps')
              : t('projectDetail.submitModeBoth').replace('{max}', String(assignment.video_max_seconds))}
        </p>
        {windowLabel ? (
          <p className="mt-2 rounded-xl bg-amber-100/80 px-3 py-2 text-sm font-bold text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
            📅 {windowLabel}
          </p>
        ) : null}
      </div>
    </section>
  );

  const reviewHintLines =
    existingSubmission?.review_hint != null
      ? kidsSubmissionReviewHintLines(existingSubmission, t)
      : null;

  const marfiBubbProjeMsg = existingSubmission
    ? t('marfi.odev.submitted')
    : t('marfi.proje.welcome');
  const marfiBubbleProjeMood = existingSubmission ? 'proud' as const : 'happy' as const;

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-1 pb-16 sm:px-0">
      <Link
        href={`${pathPrefix}/ogrenci/projeler`}
        className="inline-flex text-sm font-bold text-violet-700 hover:underline dark:text-violet-300"
      >
        ← {t('projectDetail.backChallenges')}
      </Link>

      {/* Marfi karşılama balonu — her gün bir kez */}
      <KidsMascotBubble
        mood={marfiBubbleProjeMood}
        message={marfiBubbProjeMsg}
        dismissible
        storageKey={`marfi-proje-${assignment?.id}-${new Date().toDateString()}`}
        placement="right"
        mascotSize={82}
      />

      {heroSection}

      {!submissionGate.ok ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          {submissionGate.phase === 'not_yet'
            ? t('projectDetail.windowNotStarted')
            : existingSubmission
              ? t('projectDetail.windowEndedReadonly')
              : t('projectDetail.windowEnded')}
        </div>
      ) : null}

      {existingSubmission?.is_teacher_pick ? (
        <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 p-4 text-sm text-amber-950 dark:border-amber-700 dark:from-amber-950/50 dark:to-yellow-950/40 dark:text-amber-100">
          <p className="text-lg" aria-hidden>
            ⭐
          </p>
          <p className="font-semibold">{t('projectDetail.starTitle')}</p>
          <p className="mt-1 leading-relaxed">{t('projectDetail.starBody')}</p>
        </div>
      ) : null}

      {existingSubmission?.review_hint && reviewHintLines ? (
        <div
          className={`rounded-xl border p-4 text-sm ${
            existingSubmission.review_hint.code === 'pending'
              ? 'border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100'
              : 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/35 dark:text-emerald-100'
          }`}
        >
          <p className="font-semibold">{reviewHintLines.title}</p>
          <p className="mt-1 leading-relaxed">{reviewHintLines.body}</p>
        </div>
      ) : null}

      {submissionClosed && !existingSubmission ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm font-semibold text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
          {t('projectDetail.missedWindow')}
        </p>
      ) : showReadOnlySubmission && existingSubmission ? (
        <section className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-6 rounded-lg border border-zinc-200/80 bg-white/90 p-8 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80 lg:col-span-2">
            <div>
              <h2 className="font-logo text-2xl font-black text-slate-900 dark:text-white">
                {t('projectDetail.yourSubmission')}
                {totalRounds > 1 ? (
                  <span className="text-violet-600 dark:text-violet-400">
                    {' '}
                    · {t('projectDetail.step')} {activeRound}
                  </span>
                ) : null}
              </h2>
              <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-zinc-400">
                {submissionClosed
                  ? `⏳ ${t('projectDetail.readonlyTimeUp')}`
                  : teacherEvaluated
                    ? `🔒 ${t('projectDetail.readonlyReviewed')}`
                    : `✅ ${t('projectDetail.readonlyCompleteNoEdit')}`}
              </p>
            </div>
            {existingSubmission.kind === 'steps' ? (
              <div className="space-y-4">
                {(existingSubmission.steps_payload?.steps ?? []).map((s, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-violet-200/60 bg-violet-50/50 p-4 dark:border-violet-800 dark:bg-violet-950/30"
                  >
                    <p className="text-xs font-black uppercase tracking-wide text-violet-600 dark:text-violet-400">
                      {t('projectDetail.stepHeading')
                        .replace('{n}', String(i + 1))
                        .replace('{label}', t('projectDetail.stepDefaultLabel'))}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm font-medium text-slate-800 dark:text-zinc-100">
                      {s.text || '—'}
                    </p>
                  </div>
                ))}
                {(existingSubmission.steps_payload?.image_urls ?? []).length > 0 ? (
                  <div className="rounded-lg border border-amber-200/70 bg-amber-50/60 p-4 dark:border-amber-800 dark:bg-amber-950/30">
                    <p className="text-sm font-black text-amber-900 dark:text-amber-100">{t('projectDetail.yourImage')}</p>
                    <ul className="mt-3 flex flex-wrap gap-3">
                      {(existingSubmission.steps_payload?.image_urls ?? []).map((url, idx) => (
                        <li
                          key={`${url}-${idx}`}
                          className="h-28 w-28 overflow-hidden rounded-xl border border-white shadow-md dark:border-zinc-700"
                        >
                          <img src={url} alt="" className="h-full w-full object-cover" />
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-lg border border-sky-200/70 bg-sky-50/60 p-4 dark:border-sky-800 dark:bg-sky-950/30">
                <p className="text-sm font-black text-sky-900 dark:text-sky-100">{t('projectDetail.video')}</p>
                {existingSubmission.video_url ? (
                  <a
                    href={existingSubmission.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex break-all text-sm font-bold text-violet-700 underline-offset-2 hover:underline dark:text-violet-300"
                  >
                    {existingSubmission.video_url}
                  </a>
                ) : (
                  <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">{t('projectDetail.noLink')}</p>
                )}
              </div>
            )}
            <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
              <p className="text-xs font-black uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
                {t('projectDetail.shortSummary')}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm font-medium text-emerald-950 dark:text-emerald-50">
                {existingSubmission.caption?.trim() ? existingSubmission.caption : '—'}
              </p>
            </div>
          </div>
          <div className="space-y-8">
            <div className="rounded-lg bg-gradient-to-br from-amber-100 to-amber-300 p-6 text-amber-950 dark:from-amber-900/40 dark:to-amber-800/30 dark:text-amber-50">
              <div className="flex items-start gap-4">
                <Lightbulb className="h-8 w-8 shrink-0" strokeWidth={2} aria-hidden />
                <div>
                  <p className="mb-1 text-sm font-black uppercase tracking-wider">{t('projectDetail.explorerTipTitle')}</p>
                  <p className="text-xs font-semibold leading-relaxed">{explorerTipText}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <form
          className={`space-y-12 ${formLocked ? 'opacity-95' : ''}`}
          onSubmit={onSubmit}
        >
          <section className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-8 lg:col-span-2">
              <div className="rounded-lg border border-zinc-200/80 bg-white/90 p-8 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
                {submissionMode === 'both' ? (
                  <div className="mb-8 flex flex-wrap gap-3 border-b border-zinc-100 pb-6 dark:border-zinc-700">
                    <label className="flex cursor-pointer items-center gap-2 rounded-full border-2 border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-bold has-[:checked]:border-violet-500 has-[:checked]:bg-violet-50 dark:border-zinc-600 dark:bg-zinc-800 dark:has-[:checked]:border-violet-400 dark:has-[:checked]:bg-violet-950/40">
                      <input
                        type="radio"
                        name="kind"
                        checked={kind === 'steps'}
                        disabled={formLocked}
                        onChange={() => setKind('steps')}
                        className="accent-violet-600"
                      />
                      {t('projectDetail.stepByStep')}
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 rounded-full border-2 border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-bold has-[:checked]:border-violet-500 has-[:checked]:bg-violet-50 dark:border-zinc-600 dark:bg-zinc-800 dark:has-[:checked]:border-violet-400 dark:has-[:checked]:bg-violet-950/40">
                      <input
                        type="radio"
                        name="kind"
                        checked={kind === 'video'}
                        disabled={formLocked}
                        onChange={() => setKind('video')}
                        className="accent-violet-600"
                      />
                      {t('projectDetail.video')}
                    </label>
                  </div>
                ) : submissionMode === 'video_only' ? (
                  <p className="mb-6 rounded-lg bg-sky-100/80 px-3 py-2 text-sm font-bold text-sky-900 dark:bg-sky-950/50 dark:text-sky-100">
                    {t('projectDetail.videoRequired')}
                  </p>
                ) : (
                  <p className="mb-6 rounded-lg bg-violet-100/80 px-3 py-2 text-sm font-bold text-violet-900 dark:bg-violet-950/50 dark:text-violet-100">
                    {t('projectDetail.stepsRequired')}
                  </p>
                )}

                {showSteps ? (
                  <div className="space-y-8">
                    <div>
                      <div className="mb-6 flex items-center gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-600 text-lg font-black text-white">
                          {activeRound}
                        </div>
                        <h3 className="font-logo text-2xl font-bold text-slate-900 dark:text-white">
                          {t('projectDetail.stepHeading')
                            .replace('{n}', String(activeRound))
                            .replace('{label}', t('projectDetail.stepDefaultLabel'))}
                        </h3>
                      </div>
                      <div className="space-y-2">
                        <label className="ml-1 text-sm font-bold text-slate-800 dark:text-zinc-200">
                          {t('projectDetail.whatDidYouDo')}
                        </label>
                        <textarea
                          value={steps[0]?.text ?? ''}
                          disabled={formLocked}
                          onChange={(e) => setSteps([{ text: e.target.value }])}
                          rows={4}
                          className={`${fieldBase} min-h-[120px] resize-none p-6`}
                          placeholder={t('projectDetail.stepPlaceholder')}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="ml-1 text-sm font-bold text-slate-800 dark:text-zinc-200">
                        {t('projectDetail.optionalSummaryLabel')}
                      </label>
                      <textarea
                        value={caption}
                        disabled={formLocked}
                        onChange={(e) => setCaption(e.target.value)}
                        rows={2}
                        className={`${fieldBase} resize-none`}
                        placeholder={t('projectDetail.optionalSummaryPlaceholder')}
                      />
                    </div>
                  </div>
                ) : null}

                {showVideo ? (
                  <div className="space-y-6">
                    <div>
                      <label className="ml-1 text-sm font-bold text-slate-800 dark:text-zinc-200">
                        {t('projectDetail.videoFile')}
                      </label>
                      <input
                        type="file"
                        accept="video/*"
                        disabled={formLocked}
                        onChange={onVideoFile}
                        className="mt-2 block w-full cursor-pointer text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-violet-600 file:px-4 file:py-2 file:font-bold file:text-white hover:file:bg-violet-700 disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="ml-1 text-sm font-bold text-slate-800 dark:text-zinc-200">
                        {t('projectDetail.videoLink')}
                      </label>
                      <input
                        value={videoUrl}
                        disabled={formLocked}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        className={`mt-2 ${fieldBase}`}
                        placeholder={t('projectDetail.videoLinkPlaceholder')}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="ml-1 text-sm font-bold text-slate-800 dark:text-zinc-200">
                        {t('projectDetail.caption')}
                      </label>
                      <textarea
                        value={caption}
                        disabled={formLocked}
                        onChange={(e) => setCaption(e.target.value)}
                        rows={2}
                        className={`${fieldBase} resize-none`}
                        placeholder={t('projectDetail.captionPlaceholder')}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-6 rounded-lg border border-zinc-200/80 bg-white/90 p-8 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
                <div className="relative mx-auto mb-2 h-32 w-32">
                  <div
                    className="absolute inset-0 rounded-full bg-violet-400/20 animate-ping opacity-20"
                    aria-hidden
                  />
                  <Image
                    src={BUDDY_EXPLORER_IMG}
                    alt=""
                    width={128}
                    height={128}
                    className="relative z-10 mx-auto h-32 w-32 object-contain"
                  />
                </div>
                <h4 className="text-xl font-bold text-slate-900 dark:text-white">{t('projectDetail.mascotSnapTitle')}</h4>
                <p className="px-2 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
                  {showSteps && assignment.require_image
                    ? t('projectDetail.mascotSnapBodyImage')
                    : showVideo
                      ? t('projectDetail.mascotSnapBodyVideo')
                      : t('projectDetail.mascotSnapBodyText')}
                </p>
                {showSteps && assignment.require_image ? (
                  <>
                    <input
                      id="kids-project-image-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={formLocked || uploadingImage || imageUrls.length >= maxStepImages}
                      onChange={(ev) => void onAssignmentImageFile(ev)}
                      className="sr-only"
                    />
                    <label
                      htmlFor="kids-project-image-upload"
                      className="group flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50/80 p-8 transition-colors hover:border-violet-400 hover:bg-white dark:border-zinc-600 dark:bg-zinc-800/50 dark:hover:border-violet-500"
                    >
                      <Upload
                        className="mb-2 h-10 w-10 text-zinc-500 transition-colors group-hover:text-violet-600 dark:text-zinc-400"
                        strokeWidth={1.5}
                        aria-hidden
                      />
                      <p className="text-sm font-bold text-slate-700 dark:text-zinc-200">
                        {t('projectDetail.selectImageTitle')}
                      </p>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                        {t('projectDetail.imageSizeHint')}
                      </p>
                    </label>
                    {imageUrls.length > 0 ? (
                      <ul className="flex flex-wrap justify-center gap-2">
                        {imageUrls.map((url, idx) => (
                          <li key={`${url}-${idx}`} className="relative h-20 w-20 overflow-hidden rounded-lg border border-white shadow dark:border-zinc-700">
                            <img src={url} alt="" className="h-full w-full object-cover" />
                            <button
                              type="button"
                              disabled={formLocked}
                              onClick={() => removeImageAt(idx)}
                              className="absolute right-0.5 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-xs font-black text-white disabled:opacity-50"
                              aria-label={t('projectDetail.removeImage')}
                            >
                              ×
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </>
                ) : null}
              </div>

              <div className="rounded-lg bg-gradient-to-br from-amber-200 via-amber-300 to-yellow-400 p-6 text-amber-950 dark:from-amber-900/50 dark:via-amber-800/40 dark:to-yellow-700/30 dark:text-amber-50">
                <div className="flex items-start gap-4">
                  <Lightbulb className="h-8 w-8 shrink-0" strokeWidth={2} aria-hidden />
                  <div>
                    <p className="mb-1 text-sm font-black uppercase tracking-wider">
                      {t('projectDetail.explorerTipTitle')}
                    </p>
                    <p className="text-xs font-semibold leading-relaxed">{explorerTipText}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-center gap-4 pb-8 pt-4">
            {draftMode ? (
              <>
                {activeRound > 1 ? (
                  <button
                    type="button"
                    onClick={goDraftBack}
                    className="group inline-flex items-center gap-2 rounded-full border-2 border-violet-400 bg-white px-8 py-4 text-base font-black text-violet-700 shadow-sm transition-all hover:bg-violet-50 active:scale-[0.98] dark:border-violet-500 dark:bg-zinc-900 dark:text-violet-200 dark:hover:bg-violet-950/50 sm:px-10 sm:py-5 sm:text-lg"
                  >
                    <ArrowLeft
                      className="h-5 w-5 transition-transform group-hover:-translate-x-0.5"
                      strokeWidth={2}
                      aria-hidden
                    />
                    {t('projectDetail.backStep')}
                  </button>
                ) : null}
                {activeRound < trRounds ? (
                  <button
                    type="button"
                    onClick={goDraftNext}
                    className="group relative inline-flex items-center gap-4 rounded-full bg-gradient-to-r from-violet-600 to-pink-500 px-12 py-5 text-lg font-black text-white shadow-[0_20px_40px_rgba(124,58,237,0.2)] transition-all hover:shadow-[0_25px_50px_rgba(124,58,237,0.28)] active:scale-[0.98] sm:px-16 sm:py-6 sm:text-xl"
                  >
                    {t('projectDetail.nextStep')}
                    <ArrowRight
                      className="h-6 w-6 transition-transform group-hover:translate-x-1"
                      strokeWidth={2}
                      aria-hidden
                    />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!allRoundsComplete || submitting}
                    className="group relative inline-flex items-center gap-4 rounded-full bg-gradient-to-r from-violet-600 to-pink-500 px-12 py-5 text-lg font-black text-white shadow-[0_20px_40px_rgba(124,58,237,0.2)] transition-all hover:shadow-[0_25px_50px_rgba(124,58,237,0.28)] active:scale-[0.98] disabled:opacity-50 sm:px-16 sm:py-6 sm:text-xl"
                  >
                    {submitting ? t('common.loading') : t('projectDetail.submitChallenge')}
                    <Rocket
                      className="h-6 w-6 transition-transform group-hover:translate-x-1"
                      strokeWidth={2}
                      aria-hidden
                    />
                  </button>
                )}
              </>
            ) : (
              <button
                type="submit"
                disabled={!canSubmitFinal || submitting}
                className="group relative flex items-center gap-4 rounded-full bg-gradient-to-r from-violet-600 to-pink-500 px-12 py-5 text-lg font-black text-white shadow-[0_20px_40px_rgba(124,58,237,0.2)] transition-all hover:shadow-[0_25px_50px_rgba(124,58,237,0.28)] active:scale-[0.98] disabled:opacity-50 sm:px-16 sm:py-6 sm:text-xl"
              >
                {submitting
                  ? t('common.loading')
                  : existingSubmission
                    ? t('projectDetail.update')
                    : primaryIsNextStep
                      ? t('projectDetail.nextStep')
                      : t('projectDetail.submitChallenge')}
                {!submitting && primaryIsNextStep && !existingSubmission ? (
                  <ArrowRight
                    className="h-6 w-6 transition-transform group-hover:translate-x-1"
                    strokeWidth={2}
                    aria-hidden
                  />
                ) : (
                  <Rocket
                    className="h-6 w-6 transition-transform group-hover:translate-x-1"
                    strokeWidth={2}
                    aria-hidden
                  />
                )}
              </button>
            )}
          </div>
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
