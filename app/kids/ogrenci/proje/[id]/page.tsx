'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import {
  kidsAssignmentSubmissionGate,
  kidsCreateSubmission,
  kidsFormatAssignmentWindowTr,
  kidsGetSubmissionForAssignment,
  kidsStudentDashboard,
  kidsUploadSubmissionImage,
  type KidsAssignment,
  type KidsSubmissionRecord,
} from '@/src/lib/kids-api';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';

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
      reject(new Error('Video okunamadı'));
    };
    v.src = url;
  });
}

export default function KidsStudentAssignmentPage() {
  const params = useParams();
  const router = useRouter();
  const assignmentId = Number(params.id);
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();

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

  const load = useCallback(async () => {
    try {
      const data = await kidsStudentDashboard();
      const found = data.assignments.find((a) => a.id === assignmentId) ?? null;
      setAssignment(found);
      if (!found) {
        setExistingSubmission(null);
        return;
      }
      let sub: KidsSubmissionRecord | null = null;
      try {
        sub = await kidsGetSubmissionForAssignment(assignmentId);
      } catch {
        toast.error('Kayıtlı teslim bilgisi alınamadı');
        sub = null;
      }
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
    } catch {
      toast.error('Proje yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

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

  const maxStepImages = assignment?.max_step_images ?? 3;

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
          `Video süresi çok uzun (yaklaşık ${Math.ceil(sec)} sn). En fazla ${assignment.video_max_seconds} sn olmalı.`,
        );
      } else {
        toast.success(`Süre uygun görünüyor (~${Math.ceil(sec)} sn). Linki aşağıya yapıştırmayı unutma.`);
      }
    } catch {
      toast.error('Video kontrol edilemedi');
    }
    e.target.value = '';
  }

  async function onAssignmentImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !assignment) return;
    if (imageUrls.length >= maxStepImages) {
      toast.error(`En fazla ${maxStepImages} görsel ekleyebilirsin.`);
      e.target.value = '';
      return;
    }
    setUploadingImage(true);
    try {
      const { url } = await kidsUploadSubmissionImage(f);
      setImageUrls((prev) => [...prev, url]);
      toast.success('Görsel eklendi');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Görsel yüklenemedi');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  }

  function removeImageAt(i: number) {
    setImageUrls((prev) => prev.filter((_, j) => j !== i));
  }

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
          kind: 'steps',
          steps_payload: payload,
          caption: caption.trim(),
        });
      } else {
        rec = await kidsCreateSubmission({
          assignment: assignment.id,
          kind: 'video',
          video_url: videoUrl.trim(),
          caption: caption.trim(),
        });
      }
      setExistingSubmission(rec);
      toast.success(isUpdate ? 'Teslimin güncellendi' : 'Teslim alındı');
      if (!isUpdate) {
        router.push(`${pathPrefix}/ogrenci/panel`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kaydedilemedi');
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || !user || user.role !== 'student') {
    return <p className="text-center text-gray-600">Yükleniyor…</p>;
  }
  if (loading) {
    return <p className="text-center text-gray-600">Yükleniyor…</p>;
  }
  if (!assignment) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <p className="text-gray-600 dark:text-gray-400">Bu proje bulunamadı veya sana atanmadı.</p>
        <Link href={`${pathPrefix}/ogrenci/panel`} className="mt-4 inline-block text-brand hover:underline">
          Panele dön
        </Link>
      </div>
    );
  }

  const inputPlay =
    'w-full rounded-2xl border-2 border-violet-200/90 bg-gradient-to-br from-white to-violet-50/40 px-4 py-3 text-sm text-slate-800 shadow-inner shadow-violet-100/30 placeholder:text-violet-300/80 focus:border-fuchsia-400 focus:outline-none focus:ring-4 focus:ring-fuchsia-200/50 disabled:cursor-not-allowed disabled:opacity-75 dark:border-violet-700 dark:from-violet-950/40 dark:to-fuchsia-950/20 dark:text-white dark:placeholder:text-violet-600/50 dark:focus:border-fuchsia-500 dark:focus:ring-fuchsia-900/40';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={`${pathPrefix}/ogrenci/panel`}
        className="inline-flex text-sm font-bold text-fuchsia-700 hover:underline dark:text-fuchsia-300"
      >
        ← Öğrenci paneli
      </Link>
      <div className="rounded-[1.75rem] border-4 border-white/90 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-amber-400 p-1 shadow-xl shadow-fuchsia-500/20 dark:border-violet-900/50 dark:from-violet-800 dark:via-fuchsia-800 dark:to-amber-700">
        <div className="rounded-2xl bg-white/95 px-5 py-6 dark:bg-gray-950/95 sm:px-7 sm:py-7">
          <p className="text-xs font-black uppercase tracking-widest text-fuchsia-600 dark:text-fuchsia-400">
            📌 Proje
          </p>
          <h1 className="font-logo mt-1 text-2xl font-black text-violet-950 dark:text-white">{assignment.title}</h1>
          {assignment.purpose ? (
            <p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-relaxed text-slate-600 dark:text-gray-300">
              {assignment.purpose}
            </p>
          ) : null}
          {assignment.materials ? (
            <div className="mt-4 rounded-2xl border-2 border-sky-200 bg-gradient-to-r from-sky-50 to-cyan-50 p-4 text-sm dark:border-sky-800 dark:from-sky-950/50 dark:to-cyan-950/40">
              <span className="font-logo font-bold text-sky-900 dark:text-sky-100">🧰 Malzemeler</span>
              <p className="mt-2 whitespace-pre-wrap font-medium text-sky-900/90 dark:text-sky-100/90">
                {assignment.materials}
              </p>
            </div>
          ) : null}
          <p className="mt-4 text-xs font-semibold text-violet-700/80 dark:text-violet-300/90">
            {assignment.require_video && !assignment.require_image
              ? `🎬 Video teslimi · en fazla ${assignment.video_max_seconds} sn`
              : assignment.require_image && !assignment.require_video
                ? `📝 Adım adım yazılı teslim + en az 1 görsel (en fazla ${maxStepImages}).`
                : `🎬📝 Video süre sınırı: ${assignment.video_max_seconds} sn${assignment.require_image ? ' · Görsel veya video seçebilirsin' : ''}`}
          </p>
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
            ? 'Teslim dönemi henüz başlamadı. Başlangıç zamanından sonra bu sayfadan teslim edebilirsin.'
            : existingSubmission
              ? 'Teslim süresi sona erdi. Gönderdiğin içerik aşağıda salt okunur; yeni teslim veya düzenleme yapılamaz. Öğretmen geri bildirimin varsa yine görüntülenir.'
              : 'Teslim süresi sona erdi. Artık bu projeye teslim gönderemez veya düzenleyemezsin.'}
        </div>
      ) : null}

      {existingSubmission?.is_teacher_pick ? (
        <div className="rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50 p-4 text-sm text-amber-950 dark:border-amber-700 dark:from-amber-950/50 dark:to-yellow-950/40 dark:text-amber-100">
          <p className="text-lg" aria-hidden>
            ⭐
          </p>
          <p className="font-semibold">Proje yıldızı</p>
          <p className="mt-1 leading-relaxed">
            Öğretmen bu teslimi bu projede öne çıkardı. Rozet yolunda da görünecek.
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
          Bu proje için süre dolmadan teslim göndermemişsin; artık teslim eklenemez.
        </p>
      ) : showReadOnlySubmission && existingSubmission ? (
        <div className="rounded-[1.75rem] border-4 border-fuchsia-200/90 bg-gradient-to-br from-violet-200/40 via-fuchsia-100/50 to-amber-100/40 p-1 shadow-xl dark:border-fuchsia-900/50 dark:from-violet-950/40 dark:via-fuchsia-950/30 dark:to-amber-950/20">
          <div className="space-y-5 rounded-2xl bg-white/95 p-6 dark:bg-gray-950/95 sm:p-7">
            <div>
              <h2 className="font-logo flex items-center gap-2 text-xl font-black text-violet-800 dark:text-violet-200">
                <span aria-hidden>📦</span> Teslimin
              </h2>
              <p className="mt-1 text-sm font-semibold text-violet-600/90 dark:text-violet-300/90">
                {submissionClosed
                  ? '⏳ Süre doldu — yalnızca okuyabilirsin.'
                  : '🔒 Öğretmen değerlendirdi — artık düzenlenemez.'}
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
                      ✏️ Adım {i + 1}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm font-medium text-slate-800 dark:text-gray-100">
                      {s.text || '—'}
                    </p>
                  </div>
                ))}
                {(existingSubmission.steps_payload?.image_urls ?? []).length > 0 ? (
                  <div className="rounded-2xl border-2 border-amber-300/70 bg-gradient-to-r from-amber-50 to-orange-50 p-4 dark:border-amber-800 dark:from-amber-950/40 dark:to-orange-950/30">
                    <p className="font-logo text-sm font-black text-amber-900 dark:text-amber-100">🖼 Görsellerin</p>
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
                <p className="font-logo text-sm font-black text-sky-900 dark:text-sky-100">🎬 Video</p>
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
                  <p className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-400">Bağlantı yok</p>
                )}
              </div>
            )}
            <div className="rounded-2xl border-2 border-emerald-200/80 bg-gradient-to-r from-emerald-50/90 to-teal-50/80 p-4 dark:border-emerald-900 dark:from-emerald-950/35 dark:to-teal-950/30">
              <p className="font-logo text-xs font-black uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
                💬 Kısa özet
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
            <h2 className="font-logo text-lg font-black text-violet-900 dark:text-violet-100">Teslimini yükle</h2>
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
                📝 Adım adım
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
                🎬 Video
              </label>
            </div>
          ) : submissionMode === 'video_only' ? (
            <p className="rounded-xl bg-sky-100/80 px-3 py-2 text-sm font-bold text-sky-900 dark:bg-sky-950/50 dark:text-sky-100">
              Bu proje için video teslimi gerekir.
            </p>
          ) : (
            <p className="rounded-xl bg-violet-100/80 px-3 py-2 text-sm font-bold text-violet-900 dark:bg-violet-950/50 dark:text-violet-100">
              Bu proje için adım adım yazılı teslim gerekir.
            </p>
          )}

          {showSteps ? (
            <div className="space-y-4">
              {steps.map((s, i) => (
                <div key={i}>
                  <label className="font-logo text-sm font-black text-fuchsia-800 dark:text-fuchsia-200">
                    ✏️ Adım {i + 1}
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
                    placeholder="Ne yaptın? Buraya yaz…"
                  />
                </div>
              ))}
              <button
                type="button"
                disabled={formLocked}
                onClick={() => setSteps([...steps, { text: '' }])}
                className="text-sm font-black text-fuchsia-700 underline-offset-2 hover:underline disabled:opacity-50 dark:text-fuchsia-300"
              >
                + Bir adım daha ekle
              </button>
              {assignment.require_image ? (
                <div className="rounded-2xl border-2 border-amber-300/90 bg-gradient-to-br from-amber-50 via-orange-50/80 to-yellow-50/60 p-4 shadow-inner dark:border-amber-800 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-yellow-950/20">
                  <p className="font-logo text-sm font-black text-amber-950 dark:text-amber-100">
                    🖼 Görseller ({imageUrls.length} / {maxStepImages})
                  </p>
                  <p className="mt-1 text-xs font-semibold text-amber-900/85 dark:text-amber-200/90">
                    JPEG, PNG veya WebP · dosya başına en fazla 2 MB · en az 1 görsel
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
                            aria-label="Görseli kaldır"
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <div className="mt-3">
                    <label className="text-xs font-black uppercase tracking-wide text-amber-900 dark:text-amber-200">
                      📤 Görsel seç
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
                  🎥 Video dosyası (süre kontrolü)
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
                <label className="text-sm font-black text-sky-900 dark:text-sky-100">🔗 Video bağlantısı</label>
                <input
                  value={videoUrl}
                  disabled={formLocked}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className={`mt-2 ${inputPlay}`}
                  placeholder="YouTube, Drive…"
                />
              </div>
            </div>
          ) : null}

          <div>
            <label className="font-logo text-sm font-black text-emerald-800 dark:text-emerald-200">
              💬 Kısa açıklama / özet
            </label>
            <textarea
              value={caption}
              disabled={formLocked}
              onChange={(e) => setCaption(e.target.value)}
              rows={2}
              className={`mt-2 ${inputPlay}`}
              placeholder="İstersen bir cümleyle özetle…"
            />
          </div>

          <button
            type="submit"
            disabled={!canSubmitFinal || submitting}
            className="w-full rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-amber-500 py-4 text-base font-black text-white shadow-lg shadow-fuchsia-500/30 transition hover:brightness-105 disabled:opacity-50"
          >
            {submitting
              ? 'Gönderiliyor…'
              : existingSubmission
                ? '✨ Güncelle'
                : '🎉 Teslim et'}
          </button>
        </form>
      )}
    </div>
  );
}
