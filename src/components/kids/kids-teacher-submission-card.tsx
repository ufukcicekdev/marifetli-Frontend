'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import {
  kidsPatchSubmissionHighlight,
  kidsPatchTeacherSubmissionReview,
  type KidsTeacherSubmission,
} from '@/src/lib/kids-api';
import { KidsPrimaryButton, KidsSecondaryButton, kidsTextareaClass } from '@/src/components/kids/kids-ui';

export function kidsTeacherSubmissionStudentLabel(s: KidsTeacherSubmission['student']): string {
  const n = [s.first_name, s.last_name].filter(Boolean).join(' ').trim();
  return n || s.email;
}

export function kidsTeacherStudentInitials(s: KidsTeacherSubmission['student']): string {
  const f = (s.first_name || '').trim();
  const l = (s.last_name || '').trim();
  if (f && l) return (f[0] + l[0]).toUpperCase();
  if (f) return f.slice(0, 2).toUpperCase();
  const e = (s.email || '?').trim();
  return e.slice(0, 2).toUpperCase();
}

export function KidsTeacherModalShell({
  title,
  children,
  footer,
  onClose,
  maxWidthClass = 'max-w-lg',
}: {
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  /** Örn. `max-w-2xl` — geniş özet modalları için */
  maxWidthClass?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (!el.open) el.showModal();
    return () => {
      el.close();
    };
  }, []);

  return createPortal(
    <dialog
      ref={dialogRef}
      className="kids-dialog-overlay bg-transparent"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="kids-dialog-fill">
        <div
          className="kids-dialog-backdrop kids-dialog-backdrop--centered bg-violet-950/60 backdrop-blur-sm"
          role="presentation"
          onClick={onClose}
        >
          <div
            className={`flex max-h-[85dvh] w-full min-w-0 shrink-0 flex-col overflow-hidden rounded-2xl border-2 border-violet-300 bg-white shadow-2xl shadow-fuchsia-500/20 dark:border-violet-700 dark:bg-gray-900 sm:max-h-[90dvh] sm:rounded-3xl ${maxWidthClass}`}
            onClick={(e) => e.stopPropagation()}
          >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b-2 border-violet-100 bg-gradient-to-r from-violet-100 via-fuchsia-100 to-amber-100 px-4 py-3 dark:border-violet-900 dark:from-violet-950 dark:via-fuchsia-950 dark:to-amber-950/80">
          <h3 className="min-w-0 font-logo text-lg font-bold tracking-tight text-violet-950 dark:text-violet-100">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full border-2 border-violet-300 bg-white px-3 py-1.5 text-sm font-black text-violet-800 shadow-sm hover:bg-violet-50 dark:border-violet-700 dark:bg-gray-800 dark:text-violet-200 dark:hover:bg-violet-950"
          >
            ✕ Kapat
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4 [-webkit-overflow-scrolling:touch]">
          {children}
        </div>
        {footer ? (
          <div className="shrink-0 border-t-2 border-violet-100 bg-violet-50/50 p-4 dark:border-violet-900 dark:bg-violet-950/40">
            {footer}
          </div>
        ) : null}
          </div>
        </div>
      </div>
    </dialog>,
    document.body,
  );
}

function KidsImageLightboxDialog({ url, onClose }: { url: string; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (!el.open) el.showModal();
    return () => {
      el.close();
    };
  }, []);

  return createPortal(
    <dialog
      ref={dialogRef}
      className="kids-dialog-overlay overflow-hidden bg-[#000000]"
      style={{ backgroundColor: '#000000' }}
      aria-label="Görsel tam ekran"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="kids-dialog-fill min-h-0 bg-[#000000]" style={{ backgroundColor: '#000000' }}>
        <div
          className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-[#000000] px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top,0px))]"
          style={{ backgroundColor: '#000000' }}
        >
          <span className="text-xs font-bold text-white/80">Tam ekran görsel</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-bold text-white"
          >
            Kapat
          </button>
        </div>
        <button
          type="button"
          className="relative flex min-h-0 min-w-0 flex-1 cursor-zoom-out items-center justify-center bg-[#000000] p-2"
          style={{ backgroundColor: '#000000' }}
          onClick={onClose}
          aria-label="Kapat"
        >
          <img src={url} alt="" className="max-h-full max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
        </button>
      </div>
    </dialog>,
    document.body,
  );
}

export type KidsTeacherSubmissionReviewFlow = {
  /** Hangi teslimin değerlendirme modalı açık (sayfa state’i) */
  activeSubmissionId: number | null;
  setActiveSubmissionId: (id: number | null) => void;
  /** Bekleyen teslim sırası — “sonraki” buradan hesaplanır */
  pendingQueue: KidsTeacherSubmission[];
};

export function KidsTeacherSubmissionCard({
  classId,
  sub,
  pickSlots,
  onUpdated,
  reviewFlow,
  variant = 'default',
  accordionPanel = false,
}: {
  classId: number;
  sub: KidsTeacherSubmission;
  pickSlots: { used: number; limit: number };
  onUpdated?: (opts?: { afterReviewOpenNextId?: number | null }) => void | Promise<void>;
  reviewFlow?: KidsTeacherSubmissionReviewFlow;
  /** `row`: öğrenci satırı içinde kompakt kutu (kimlik üst satırda). */
  variant?: 'default' | 'row';
  /** Mobil accordion içi: üst başlık satırı gizlenir (summary dışarıda). */
  accordionPanel?: boolean;
}) {
  const canReview = sub.can_review !== false;
  const reviewed = Boolean(sub.teacher_reviewed_at);
  const [valid, setValid] = useState<boolean>(sub.teacher_review_valid ?? true);
  const [positive, setPositive] = useState<boolean | null>(sub.teacher_review_positive ?? null);
  const [note, setNote] = useState(sub.teacher_note_to_student ?? '');
  const [saving, setSaving] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [pickOn, setPickOn] = useState(Boolean(sub.is_teacher_pick));
  const [detailOpen, setDetailOpen] = useState(false);
  const [evaluateOpenLocal, setEvaluateOpenLocal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const evaluatePreviewDetailsRef = useRef<HTMLDetailsElement>(null);

  const evaluateOpen = reviewFlow
    ? reviewFlow.activeSubmissionId === sub.id
    : evaluateOpenLocal;
  const setEvaluateOpen = (open: boolean) => {
    if (reviewFlow) {
      reviewFlow.setActiveSubmissionId(open ? sub.id : null);
    } else {
      setEvaluateOpenLocal(open);
    }
  };

  const name = useMemo(() => kidsTeacherSubmissionStudentLabel(sub.student), [sub.student]);
  const initials = useMemo(() => kidsTeacherStudentInitials(sub.student), [sub.student]);
  const images = sub.steps_payload?.image_urls ?? [];
  const stepCount = sub.steps_payload?.steps?.filter((x) => (x.text || '').trim()).length ?? 0;

  const serverPick = Boolean(sub.is_teacher_pick);
  const pickDirty = pickOn !== serverPick;

  const hasTextDetail =
    Boolean(sub.caption?.trim()) ||
    (sub.kind === 'steps' && (sub.steps_payload?.steps?.length ?? 0) > 0) ||
    (sub.kind === 'video' && Boolean(sub.video_url?.trim()));

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (evaluateOpen && evaluatePreviewDetailsRef.current) {
      evaluatePreviewDetailsRef.current.open = true;
    }
  }, [evaluateOpen, sub.id]);

  useEffect(() => {
    setValid(sub.teacher_review_valid ?? true);
    setPositive(sub.teacher_review_positive ?? null);
    setNote(sub.teacher_note_to_student ?? '');
    setPickOn(Boolean(sub.is_teacher_pick));
  }, [
    sub.id,
    sub.teacher_review_valid,
    sub.teacher_review_positive,
    sub.teacher_note_to_student,
    sub.is_teacher_pick,
  ]);

  /** Challenge yıldızı ile “kurallara uymuyor” bir arada olamaz */
  useEffect(() => {
    if (!pickOn || valid) return;
    setValid(true);
    setPositive((p) => (p === null ? true : p));
  }, [pickOn, valid]);

  useEffect(() => {
    if (!lightboxUrl) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxUrl(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxUrl]);

  useEffect(() => {
    if (!lightboxUrl) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [lightboxUrl]);

  const onSave = useCallback(async () => {
    if (canReview) {
      if (valid) {
        if (positive !== true && positive !== false) {
          toast.error('Önce “çok iyi” veya “gelişim alanı” seç.');
          return;
        }
      }
    }

    if (pickOn && pickDirty && pickSlots.used >= pickSlots.limit && !serverPick) {
      toast.error(`En fazla ${pickSlots.limit} yıldız.`);
      return;
    }

    if (pickOn && !valid) {
      toast.error('Challenge yıldızı verildiğinde teslim kurallara uygun (Evet) sayılır.');
      return;
    }

    if (!canReview && !pickDirty) {
      toast.error('Kaydedilecek değişiklik yok.');
      return;
    }

    setSaving(true);
    let savedFullReview = false;
    try {
      if (canReview) {
        await kidsPatchTeacherSubmissionReview(classId, sub.id, {
          teacher_review_valid: valid,
          teacher_review_positive: valid ? positive : null,
          teacher_note_to_student: note.trim(),
        });
        savedFullReview = true;
      }
      if (pickDirty) {
        await kidsPatchSubmissionHighlight(classId, sub.id, pickOn);
      }
      toast.success('Kaydedildi!');

      if (reviewFlow && savedFullReview) {
        const q = reviewFlow.pendingQueue;
        const idx = q.findIndex((s) => s.id === sub.id);
        const nextId = idx >= 0 && idx + 1 < q.length ? q[idx + 1].id : null;
        await onUpdated?.({ afterReviewOpenNextId: nextId });
      } else {
        await onUpdated?.();
        setEvaluateOpen(false);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Kaydedilemedi');
    } finally {
      setSaving(false);
    }
  }, [
    canReview,
    classId,
    note,
    pickDirty,
    pickOn,
    pickSlots.limit,
    pickSlots.used,
    positive,
    reviewFlow,
    serverPick,
    sub.id,
    valid,
    onUpdated,
  ]);

  const primaryDisabled = saving || (!canReview && !pickDirty);

  const queueIndex = reviewFlow
    ? reviewFlow.pendingQueue.findIndex((s) => s.id === sub.id)
    : -1;
  const queueLabel =
    reviewFlow && queueIndex >= 0
      ? `Sıra: ${queueIndex + 1} / ${reviewFlow.pendingQueue.length}`
      : null;

  const choiceOff =
    'rounded-2xl border-2 border-violet-300 bg-violet-50/80 px-3 py-3 text-left text-sm font-bold text-violet-900 shadow-sm hover:border-fuchsia-400 hover:bg-fuchsia-50/50 dark:border-violet-700 dark:bg-violet-950/50 dark:text-violet-100 dark:hover:border-fuchsia-600';
  const choiceOn =
    'rounded-2xl border-2 border-fuchsia-500 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-3 text-left text-sm font-bold text-white shadow-lg shadow-fuchsia-500/30 ring-2 ring-amber-300 ring-offset-2 ring-offset-white dark:ring-offset-gray-900';

  const lightbox =
    mounted && lightboxUrl ? (
      <KidsImageLightboxDialog key={lightboxUrl} url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
    ) : null;

  const detailModal =
    mounted && detailOpen ? (
      <KidsTeacherModalShell
        title={
          <span className="flex items-center gap-2">
            <span>Detay</span> {name} — Challenge {sub.round_number ?? 1} · teslim detayı
          </span>
        }
        onClose={() => setDetailOpen(false)}
      >
        {sub.caption.trim() ? (
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-wide text-fuchsia-600 dark:text-fuchsia-400">
              Özet / not
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800 dark:text-gray-200">{sub.caption}</p>
          </div>
        ) : null}
        {sub.kind === 'video' && sub.video_url.trim() ? (
          <a
            href={sub.video_url.trim()}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-4 inline-flex rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-bold text-white shadow-md"
          >
            ▶ Videoyu yeni sekmede aç
          </a>
        ) : null}
        {sub.kind === 'steps' && sub.steps_payload?.steps?.length ? (
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-fuchsia-600 dark:text-fuchsia-400">
              Adımlar
            </p>
            <ol className="mt-2 list-decimal space-y-2 pl-4 text-sm text-slate-800 dark:text-gray-200">
              {sub.steps_payload.steps.map((st, si) => (
                <li key={si} className="whitespace-pre-wrap">
                  {st.text}
                </li>
              ))}
            </ol>
          </div>
        ) : null}
        {!hasTextDetail ? (
          <p className="text-sm text-slate-600 dark:text-gray-400">
            {images.length > 0
              ? 'Yazılı detay yok. Görsellere kart üzerinde tıkla — tam ekran açılır.'
              : 'Bu teslimde ek yazı veya görsel yok.'}
          </p>
        ) : null}
      </KidsTeacherModalShell>
    ) : null;

  const evaluateModal =
    mounted && evaluateOpen ? (
      <KidsTeacherModalShell
        title={
          <span className="flex items-center gap-2">
            <span>Degerlendir</span> {name} — Challenge {sub.round_number ?? 1}
          </span>
        }
        onClose={() => setEvaluateOpen(false)}
        footer={
          <div className="flex flex-col gap-2">
            {queueLabel ? (
              <p className="text-center text-xs font-semibold text-violet-800 dark:text-violet-200 sm:text-left">
                {queueLabel}
                {canReview && reviewFlow && reviewFlow.pendingQueue.length > 1 ? (
                  <span className="block font-normal text-violet-600/90 dark:text-violet-300/90">
                    Kaydedince sırada bekleyen varsa otomatik açılır.
                  </span>
                ) : null}
              </p>
            ) : null}
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <KidsSecondaryButton type="button" onClick={() => setEvaluateOpen(false)} className="w-full sm:w-auto">
                Vazgeç
              </KidsSecondaryButton>
              <KidsPrimaryButton
                type="button"
                disabled={primaryDisabled}
                onClick={() => void onSave()}
                className="w-full sm:w-auto"
              >
                {saving ? 'Kaydediliyor…' : 'Kaydet'}
              </KidsPrimaryButton>
            </div>
          </div>
        }
      >
        {!canReview ? (
          <p className="mb-4 rounded-2xl border-2 border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
            Teslim süresi bitince kurallar ve emek düzeyi seçilir. Şimdilik yıldızı işaretleyip Kaydet ile
            gönderebilirsin.
          </p>
        ) : (
          <p className="mb-4 rounded-2xl border-2 border-violet-200 bg-violet-50/80 p-3 text-sm text-violet-950 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-100">
            <strong>1.</strong> Kurallara uyuyor mu? <strong>2.</strong> Uygunsa emek nasıl? Seçili kutular{' '}
            <strong className="text-fuchsia-600">pembe-mor</strong>, diğerleri açık leylak.
          </p>
        )}

        <details
          ref={evaluatePreviewDetailsRef}
          className="mb-4 overflow-hidden rounded-2xl border-2 border-sky-200 bg-sky-50/50 dark:border-sky-800/70 dark:bg-sky-950/30"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-3 font-logo text-sm font-bold text-sky-950 dark:text-sky-50 [&::-webkit-details-marker]:hidden">
            <span className="flex min-w-0 items-center gap-2">
              <span aria-hidden>Gorseller</span>
              <span>Görseller ve teslim detayı</span>
            </span>
            <span className="shrink-0 text-[11px] font-semibold text-sky-700 dark:text-sky-300">
              {images.length > 0
                ? `${images.length} görsel`
                : sub.kind === 'video'
                  ? 'Video'
                  : hasTextDetail
                    ? 'Metin'
                    : 'Özet yok'}
            </span>
          </summary>
          <div className="space-y-3 border-t border-sky-200/90 px-3 pb-3 pt-2 dark:border-sky-800/60">
            {images.length > 0 ? (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-sky-800 dark:text-sky-200">Görseller</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {images.map((url, ui) => (
                    <button
                      key={ui}
                      type="button"
                      onClick={() => setLightboxUrl(url)}
                      className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 border-sky-300 shadow-sm transition hover:ring-2 hover:ring-fuchsia-400/60 dark:border-sky-600"
                    >
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[10px] text-sky-800/80 dark:text-sky-200/80">Küçük önizleme · tıkla tam ekran</p>
              </div>
            ) : null}
            {sub.kind === 'video' && sub.video_url.trim() ? (
              <a
                href={sub.video_url.trim()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-2 text-xs font-bold text-white shadow-sm"
              >
                ▶ Videoyu yeni sekmede aç
              </a>
            ) : null}
            {sub.caption.trim() ? (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-fuchsia-600 dark:text-fuchsia-400">
                  Özet / not
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800 dark:text-gray-200">{sub.caption}</p>
              </div>
            ) : null}
            {sub.kind === 'steps' && sub.steps_payload?.steps?.length ? (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-fuchsia-600 dark:text-fuchsia-400">
                  Adımlar
                </p>
                <ol className="mt-2 max-h-40 list-decimal space-y-1.5 overflow-y-auto pl-4 text-sm text-slate-800 dark:text-gray-200">
                  {sub.steps_payload.steps.map((st, si) => (
                    <li key={si} className="whitespace-pre-wrap">
                      {st.text}
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
            {!hasTextDetail && images.length === 0 && !(sub.kind === 'video' && sub.video_url.trim()) ? (
              <p className="text-sm text-slate-600 dark:text-gray-400">Bu teslimde ek yazı veya görsel yok.</p>
            ) : null}
          </div>
        </details>

        <div className="mb-4 rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-100 to-yellow-100 p-3 dark:border-amber-700 dark:from-amber-950/60 dark:to-yellow-950/40">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              className="h-5 w-5 rounded border-2 border-amber-500 text-violet-600 focus:ring-violet-500"
              checked={pickOn}
              onChange={(e) => {
                const on = e.target.checked;
                setPickOn(on);
                if (on) {
                  setValid(true);
                  setPositive((p) => (p === null ? true : p));
                }
              }}
            />
            <span className="text-sm font-bold text-amber-950 dark:text-amber-100">
              Challenge yildizi ({pickSlots.used}/{pickSlots.limit} kullanildi)
            </span>
          </label>
          <p className="mt-1 pl-8 text-xs text-amber-900/90 dark:text-amber-200/90">
            Öne çıkan teslim; öğrenci rozet kazanır. Kaydet ile onaylanır. Yıldız işaretliyken teslim{' '}
            <strong>kurallara uygun</strong> kabul edilir.
          </p>
        </div>

        {canReview ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-bold text-violet-900 dark:text-violet-100">Kurallara uyuyor mu?</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className={valid === true ? choiceOn : choiceOff}
                  onClick={() => {
                    setValid(true);
                    if (positive === null) setPositive(true);
                  }}
                >
                  Evet ✓
                </button>
                <button
                  type="button"
                  disabled={pickOn}
                  title={pickOn ? 'Yıldız verildiğinde Hayır/kısmen seçilemez' : undefined}
                  className={`${valid === false ? choiceOn : choiceOff} disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45`}
                  onClick={() => {
                    if (pickOn) return;
                    setValid(false);
                    setPositive(null);
                  }}
                >
                  Hayır / kısmen
                </button>
              </div>
              {pickOn ? (
                <p className="mt-2 text-xs font-medium text-amber-800 dark:text-amber-200/90">
                  Yildiz acikken bu teslim kurallara uyuyor sayilir; “Hayir / kismen” kapalida.
                </p>
              ) : null}
            </div>
            {valid ? (
              <div>
                <p className="text-sm font-bold text-violet-900 dark:text-violet-100">Emek düzeyi</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className={positive === true ? choiceOn : choiceOff}
                    onClick={() => setPositive(true)}
                  >
                    Cok iyi
                  </button>
                  <button
                    type="button"
                    className={positive === false ? choiceOn : choiceOff}
                    onClick={() => setPositive(false)}
                  >
                    Gelisim
                  </button>
                </div>
              </div>
            ) : null}
            <div>
              <label className="text-sm font-bold text-violet-900 dark:text-violet-100">Kısa not</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                maxLength={600}
                className={`${kidsTextareaClass} mt-1 text-sm`}
                placeholder="İsteğe bağlı tatlı bir cümle…"
              />
            </div>
          </div>
        ) : null}
      </KidsTeacherModalShell>
    ) : null;

  const isRow = variant === 'row';
  const isAccordionPanel = isRow && accordionPanel;
  const Shell = isRow ? 'div' : 'li';
  const shellClass = isAccordionPanel
    ? 'flex min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-none border-0 bg-transparent shadow-none dark:bg-transparent'
    : isRow
      ? 'flex min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-2xl border-2 border-violet-200/90 bg-white/95 shadow-md shadow-violet-200/30 dark:border-violet-800 dark:bg-gray-900/90 dark:shadow-violet-950/40'
      : 'overflow-visible rounded-3xl border-2 border-violet-200/90 bg-white/95 shadow-md shadow-violet-200/40 dark:border-violet-800 dark:bg-gray-900/90 dark:shadow-violet-950/50';

  const imgBtnClass = isRow
    ? 'h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 border-violet-300 shadow-md transition hover:ring-2 hover:ring-fuchsia-300/60 dark:border-violet-700'
    : 'h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 border-violet-300 shadow-md transition hover:ring-4 hover:ring-fuchsia-300/60 dark:border-violet-700';

  return (
    <Shell className={shellClass}>
      {lightbox}
      {detailModal}
      {evaluateModal}

      {isRow && !isAccordionPanel ? (
        <div className="flex items-start justify-between gap-2 border-b border-violet-100 bg-gradient-to-r from-violet-50/90 to-fuchsia-50/50 px-2.5 py-2 dark:border-violet-900 dark:from-violet-950/70 dark:to-fuchsia-950/40">
          <div className="min-w-0 flex-1">
            <span className="font-logo text-sm font-black text-violet-950 dark:text-white">
              Challenge {sub.round_number ?? 1}
            </span>
            <span className="mt-0.5 block text-[10px] font-medium leading-snug text-violet-700/90 dark:text-violet-300">
              {new Date(sub.created_at).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}
              {sub.kind === 'video' ? ' · video' : ` · adim:${stepCount}`}
              {images.length ? ` · gorsel:${images.length}` : ''}
            </span>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-0.5">
            {reviewed ? (
              <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">
                Tamam
              </span>
            ) : (
              <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-violet-950">
                Bekliyor
              </span>
            )}
            {pickOn || serverPick ? <span className="text-base leading-none">Yildiz</span> : null}
          </div>
        </div>
      ) : !isRow ? (
        <div className="flex flex-wrap items-center gap-2 border-b-2 border-violet-100 bg-gradient-to-r from-violet-50 via-fuchsia-50/80 to-amber-50/60 px-3 py-3 dark:border-violet-900 dark:from-violet-950/80 dark:via-fuchsia-950/50 dark:to-amber-950/30 sm:px-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-amber-400 text-sm font-black text-white shadow-lg shadow-fuchsia-500/30">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-logo text-base font-bold text-violet-950 dark:text-white">{name}</p>
            <p className="text-xs font-medium text-violet-700/90 dark:text-violet-300">
              Challenge {sub.round_number ?? 1}
              {' · '}
              {new Date(sub.created_at).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}
              {sub.kind === 'video' ? ' · video' : ` · adim ${stepCount}`}
              {images.length ? ` · gorsel ${images.length}` : ''}
            </p>
          </div>
          {reviewed ? (
            <span className="rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
              Tamam ✓
            </span>
          ) : (
            <span className="rounded-full bg-amber-400 px-2.5 py-1 text-xs font-bold text-violet-950 shadow-sm">
              Bekliyor
            </span>
          )}
          {pickOn || serverPick ? <span className="text-xs font-bold text-amber-600">Yildiz</span> : null}
        </div>
      ) : null}

      <div
        className={
          isAccordionPanel
            ? 'flex flex-1 flex-col gap-2 px-2 pb-2.5 pt-1'
            : isRow
              ? 'flex flex-1 flex-col gap-2 p-2.5'
              : 'flex flex-col gap-3 p-3 sm:p-4 md:flex-row md:items-start md:gap-4'
        }
      >
        {images.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {images.map((url, ui) => (
              <button
                key={ui}
                type="button"
                onClick={() => setLightboxUrl(url)}
                className={imgBtnClass}
              >
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        ) : null}

        <div className={`min-w-0 w-full ${isRow ? 'space-y-2' : 'flex-1 space-y-3'}`}>
          {sub.caption.trim() ? (
            <p
              className={`text-slate-700 dark:text-gray-300 ${isRow ? 'line-clamp-2 text-xs' : 'line-clamp-2 text-sm'}`}
            >
              {sub.caption}
            </p>
          ) : (
            <p
              className={`italic text-slate-400 dark:text-gray-500 ${isRow ? 'text-xs' : 'text-sm'}`}
            >
              Kısa özet yok — detayda bak.
            </p>
          )}
          <div className={`flex flex-wrap ${isRow ? 'gap-1.5' : 'gap-2'}`}>
            <KidsSecondaryButton
              type="button"
              onClick={() => setDetailOpen(true)}
              className={isRow ? 'min-h-9 px-3 text-[11px]' : 'min-h-10 px-4 text-xs sm:text-sm'}
            >
              Detay
            </KidsSecondaryButton>
            <KidsPrimaryButton
              type="button"
              onClick={() => setEvaluateOpen(true)}
              className={isRow ? 'min-h-9 px-3 text-[11px]' : 'min-h-10 px-5 text-xs sm:text-sm'}
            >
              Degerlendir
            </KidsPrimaryButton>
          </div>
          {!canReview && (
            <p
              className={`font-medium text-violet-600 dark:text-violet-400 ${isRow ? 'text-[10px] leading-snug' : 'text-xs'}`}
            >
              Süre bitince tam değerlendirme açılır; şimdilik yıldız modal içinde.
            </p>
          )}
        </div>
      </div>
    </Shell>
  );
}
