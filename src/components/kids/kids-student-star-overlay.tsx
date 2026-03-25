'use client';

import { useEffect } from 'react';
import { KidsPrimaryButton } from '@/src/components/kids/kids-ui';

type Props = {
  open: boolean;
  /** Kutlanan challenge / yıldız etiketleri */
  labels: string[];
  onClose: () => void;
};

export function KidsStudentStarOverlay({ open, labels, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-violet-950/50 px-4 backdrop-blur-md"
      role="dialog"
      aria-modal
      aria-labelledby="kids-star-celebration-title"
    >
      <div className="relative max-w-md overflow-hidden rounded-[2rem] border-4 border-amber-300 bg-gradient-to-br from-amber-50 via-fuchsia-50 to-sky-100 p-8 text-center shadow-2xl shadow-amber-500/30 dark:border-amber-500/80 dark:from-violet-950 dark:via-fuchsia-950 dark:to-sky-950">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          {[...Array(12)].map((_, i) => (
            <span
              key={i}
              className="absolute animate-pulse text-2xl opacity-80"
              style={{
                left: `${8 + (i * 7) % 84}%`,
                top: `${5 + ((i * 11) % 70)}%`,
                animationDelay: `${i * 0.12}s`,
              }}
            >
              ✨
            </span>
          ))}
        </div>
        <div className="relative">
          <p className="text-5xl drop-shadow-md" aria-hidden>
            ⭐
          </p>
          <h2
            id="kids-star-celebration-title"
            className="mt-4 font-logo text-2xl font-black text-violet-950 dark:text-amber-100"
          >
            Öğretmen yıldızı!
          </h2>
          <p className="mt-2 text-sm font-semibold text-violet-900/90 dark:text-violet-100/90">
            Bu challenge’da öne çıkan teslimlerden birisin — aferin!
          </p>
          {labels.length > 0 ? (
            <ul className="mt-4 space-y-1 text-left text-sm font-bold text-fuchsia-900 dark:text-fuchsia-200">
              {labels.map((l) => (
                <li key={l} className="rounded-xl bg-white/70 px-3 py-2 dark:bg-white/10">
                  🎉 {l}
                </li>
              ))}
            </ul>
          ) : null}
          <KidsPrimaryButton type="button" className="mt-8 w-full rounded-2xl py-4 text-base" onClick={onClose}>
            Devam et
          </KidsPrimaryButton>
        </div>
      </div>
    </div>
  );
}
