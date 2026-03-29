'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import type { KidsTeacherSubmission } from '@/src/lib/kids-api';
import {
  KidsTeacherModalShell,
  KidsTeacherSubmissionCard,
  kidsTeacherSubmissionStudentLabel,
  kidsTeacherStudentInitials,
  type KidsTeacherSubmissionReviewFlow,
} from '@/src/components/kids/kids-teacher-submission-card';

type Props = {
  classId: number;
  /** Aynı öğrenciye ait teslimler (en az 1) */
  subs: KidsTeacherSubmission[];
  pickSlots: { used: number; limit: number };
  onUpdated: (opts?: { afterReviewOpenNextId?: number | null }) => void | Promise<void>;
  reviewFlow: KidsTeacherSubmissionReviewFlow;
};

function useIsMdUp() {
  const [ok, setOk] = useState(false);
  useLayoutEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    setOk(mq.matches);
    const fn = () => setOk(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  return ok;
}

function submissionMetaLine(sub: KidsTeacherSubmission) {
  const steps = sub.steps_payload?.steps?.filter((x) => (x.text || '').trim()).length ?? 0;
  const imgN = sub.steps_payload?.image_urls?.length ?? 0;
  return `${new Date(sub.created_at).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}${
    sub.kind === 'video' ? ' · video' : ` · adim:${steps}`
  }${imgN ? ` · gorsel:${imgN}` : ''}`;
}

/**
 * Öğretmen challenge teslim listesinde: öğrenci başına tek satır,
 * her teslim (tur) yan yana kompakt kutularda.
 * Sol blokta tıklanınca tüm turların metin + küçük görsel özeti (abartısız boyut).
 * Mobil (768px altı): her tur `details` accordion; geniş ekranda grid.
 */
export function KidsTeacherStudentSubmissionsRow({
  classId,
  subs,
  pickSlots,
  onUpdated,
  reviewFlow,
}: Props) {
  const first = subs[0];
  const label = kidsTeacherSubmissionStudentLabel(first.student);
  const initials = kidsTeacherStudentInitials(first.student);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const mdUp = useIsMdUp();

  useEffect(() => setMounted(true), []);

  return (
    <li
      className="overflow-hidden rounded-3xl border-2 border-violet-200/90 bg-white/95 shadow-md shadow-violet-200/40 dark:border-violet-800 dark:bg-gray-900/90 dark:shadow-violet-950/50"
      aria-label={`${label} — ${subs.length} teslim`}
    >
      <div className="flex flex-col gap-4 p-3 sm:p-4 md:flex-row md:items-start">
        <button
          type="button"
          onClick={() => setOverviewOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={overviewOpen}
          className="group flex w-full shrink-0 items-center gap-3 rounded-2xl border-2 border-transparent pb-3 text-left transition hover:border-violet-200 hover:bg-violet-50/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400 md:w-44 md:flex-col md:items-start md:justify-center md:border-b-0 md:pb-0 md:pr-4 dark:hover:border-violet-700 dark:hover:bg-violet-950/50 md:dark:border-r md:dark:border-violet-800"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-amber-400 text-sm font-black text-white shadow-lg shadow-fuchsia-500/30">
            {initials}
          </div>
          <div className="min-w-0 flex-1 md:w-full">
            <p className="font-logo text-base font-bold leading-tight text-violet-950 dark:text-white">{label}</p>
            <p className="mt-0.5 text-xs font-semibold text-violet-600 dark:text-violet-400">
              {subs.length} teslim · özete tıkla
            </p>
          </div>
        </button>

        {mdUp ? (
          <div
            className={`grid w-full min-w-0 flex-1 gap-3 ${
              subs.length > 1 ? 'grid-cols-2' : 'grid-cols-1'
            }`}
          >
            {subs.map((sub) => (
              <KidsTeacherSubmissionCard
                key={sub.id}
                variant="row"
                classId={classId}
                sub={sub}
                pickSlots={pickSlots}
                onUpdated={onUpdated}
                reviewFlow={reviewFlow}
              />
            ))}
          </div>
        ) : (
          <div className="flex w-full min-w-0 flex-1 flex-col gap-2 md:hidden">
            {subs.map((sub) => {
              const reviewed = Boolean(sub.teacher_reviewed_at);
              return (
                <details
                  key={sub.id}
                  className="overflow-hidden rounded-2xl border-2 border-violet-200/90 bg-white/95 shadow-sm dark:border-violet-800 dark:bg-gray-900/90"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-3 text-left [&::-webkit-details-marker]:hidden">
                    <div className="min-w-0 flex-1">
                      <p className="font-logo text-sm font-black text-violet-950 dark:text-white">
                        Challenge {sub.round_number ?? 1}
                      </p>
                      <p className="mt-0.5 text-[11px] font-medium leading-snug text-violet-700 dark:text-violet-300">
                        {submissionMetaLine(sub)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {reviewed ? (
                        <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">
                          Tamam
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-violet-950">
                          Bekliyor
                        </span>
                      )}
                      <span className="text-lg text-violet-400" aria-hidden>
                        ▼
                      </span>
                    </div>
                  </summary>
                  <div className="border-t border-violet-100 bg-violet-50/30 px-1 pb-1 pt-0 dark:border-violet-900 dark:bg-violet-950/20">
                    <KidsTeacherSubmissionCard
                      variant="row"
                      accordionPanel
                      classId={classId}
                      sub={sub}
                      pickSlots={pickSlots}
                      onUpdated={onUpdated}
                      reviewFlow={reviewFlow}
                    />
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </div>

      {mounted && overviewOpen ? (
        <KidsTeacherModalShell
          maxWidthClass="max-w-2xl"
          title={
            <span className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
              <span>{label}</span>
              <span className="text-sm font-semibold text-violet-600 dark:text-violet-300">
                Teslim özeti ({subs.length})
              </span>
            </span>
          }
          onClose={() => setOverviewOpen(false)}
        >
          <div className="space-y-6">
            {subs.map((sub) => {
              const images = sub.steps_payload?.image_urls ?? [];
              const steps = sub.steps_payload?.steps?.filter((x) => (x.text || '').trim()) ?? [];
              const reviewed = Boolean(sub.teacher_reviewed_at);
              return (
                <section
                  key={sub.id}
                  className="rounded-2xl border border-violet-200/90 bg-violet-50/40 p-3 dark:border-violet-800/60 dark:bg-violet-950/25"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h4 className="font-logo text-base font-bold text-violet-950 dark:text-white">
                      Challenge {sub.round_number ?? 1}
                    </h4>
                    {reviewed ? (
                      <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-bold text-white">
                        Tamam
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-bold text-violet-950">
                        Bekliyor
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-600 dark:text-gray-400">
                    {new Date(sub.created_at).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}
                    {sub.kind === 'video' ? ' · Video teslim' : ` · ${steps.length} adım`}
                  </p>

                  {sub.caption.trim() ? (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800 dark:text-gray-200">{sub.caption}</p>
                  ) : null}

                  {sub.kind === 'video' && sub.video_url?.trim() ? (
                    <a
                      href={sub.video_url.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex text-sm font-bold text-fuchsia-600 underline underline-offset-2 hover:text-violet-700 dark:text-fuchsia-400"
                    >
                      Videoyu aç →
                    </a>
                  ) : null}

                  {steps.length > 0 ? (
                    <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-slate-700 dark:text-gray-300">
                      {steps.map((st, i) => (
                        <li key={i} className="whitespace-pre-wrap">
                          {st.text}
                        </li>
                      ))}
                    </ol>
                  ) : null}

                  {images.length > 0 ? (
                    <div className="mt-3">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                        Görseller
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {images.map((url, ui) => (
                          <div
                            key={`${sub.id}-img-${ui}`}
                            className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 border-violet-200 bg-white dark:border-violet-700 dark:bg-gray-900"
                          >
                            <img
                              src={url}
                              alt=""
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : sub.kind !== 'video' ? (
                    <p className="mt-2 text-xs italic text-slate-500 dark:text-gray-500">Bu turda yüklenmiş görsel yok.</p>
                  ) : null}
                </section>
              );
            })}
          </div>
        </KidsTeacherModalShell>
      ) : null}
    </li>
  );
}
