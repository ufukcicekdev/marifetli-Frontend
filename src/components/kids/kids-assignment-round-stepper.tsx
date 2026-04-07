'use client';

import type { KidsAssignmentRoundSlot } from '@/src/lib/kids-api';

type Props = {
  totalRounds: number;
  activeRound: number;
  roundSlots: KidsAssignmentRoundSlot[];
  /** Teslim penceresi açıkken sırayı koru; kapalıyken tüm adımlar arasında gezinilebilir. */
  gateOpen: boolean;
  onSelectRound: (round: number) => void;
  /** Form kilitliyse tıklamayı kapat */
  disableNavigation?: boolean;
  /** true: öğrenci taslak doldururken tüm turlara tıklanabilir (sıra kilidi yok). */
  freeNavigate?: boolean;
  /** Varsa üst açıklama metni (i18n; {n} yerine tur sayısı). */
  composeHint?: string;
};

function slotDone(slots: KidsAssignmentRoundSlot[], r: number): boolean {
  return Boolean(slots.find((x) => x.round_number === r)?.submission);
}

export function canNavigateToAssignmentRound(
  r: number,
  roundSlots: KidsAssignmentRoundSlot[],
  totalRounds: number,
  gateOpen: boolean,
): boolean {
  if (r < 1 || r > totalRounds) return false;
  if (!gateOpen) return true;
  if (slotDone(roundSlots, r)) return true;
  if (r === 1) return true;
  return slotDone(roundSlots, r - 1);
}

export function KidsAssignmentRoundStepper({
  totalRounds,
  activeRound,
  roundSlots,
  gateOpen,
  onSelectRound,
  disableNavigation,
  freeNavigate,
  composeHint,
}: Props) {
  if (totalRounds <= 1) return null;

  return (
    <div className="mt-4">
      <p className="text-xs font-bold text-violet-800 dark:text-violet-200">
        {composeHint ??
          (freeNavigate
            ? `Bu konu için ${totalRounds} ayrı adım var. Her adımı doldurup ileri–geri gezinebilirsin; en sonda tek seferde göndereceksin.`
            : `Bu konu için ${totalRounds} ayrı challenge adımı var. Her adımı sırayla tamamlayıp kaydet; bir sonraki adım öncekine bağlıdır.`)}
      </p>
      <div className="mt-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:thin]">
        <ol className="flex min-w-min list-none items-center gap-1 px-0.5 sm:gap-2" aria-label="Challenge adımları">
          {Array.from({ length: totalRounds }, (_, i) => i + 1).map((r, idx) => {
            const done = slotDone(roundSlots, r);
            const active = r === activeRound;
            const allowed =
              freeNavigate && gateOpen ? true : canNavigateToAssignmentRound(r, roundSlots, totalRounds, gateOpen);
            const locked = !allowed && gateOpen;
            const blocked = Boolean(disableNavigation) || locked;

            return (
              <li key={r} className="flex items-center gap-1 sm:gap-2">
                <button
                  type="button"
                  disabled={blocked}
                  title={
                    locked
                      ? `Önce “Adım ${r - 1}” teslimini tamamlamalısın`
                      : done
                        ? `Adım ${r} tamamlandı`
                        : `Adım ${r}`
                  }
                  onClick={() => {
                    if (!blocked) onSelectRound(r);
                  }}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 text-sm font-black transition sm:h-12 sm:w-12 sm:text-base ${
                    active
                      ? 'border-fuchsia-500 bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg ring-2 ring-fuchsia-300/60 dark:ring-fuchsia-700/50'
                      : done
                        ? 'border-emerald-500 bg-emerald-500 text-white dark:border-emerald-600 dark:bg-emerald-600'
                        : locked
                          ? 'cursor-not-allowed border-violet-200 bg-violet-100/60 text-violet-400 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-600'
                          : 'border-violet-300 bg-white text-violet-900 shadow-sm dark:border-violet-700 dark:bg-violet-950/50 dark:text-violet-100'
                  } ${blocked && !locked ? 'opacity-60' : ''}`}
                >
                  {done && !active ? '✓' : r}
                </button>
                {idx < totalRounds - 1 ? (
                  <div
                    className={`h-1 w-4 shrink-0 rounded-full sm:w-8 ${
                      slotDone(roundSlots, r) ? 'bg-emerald-400 dark:bg-emerald-600' : 'bg-violet-200 dark:bg-violet-800'
                    }`}
                    aria-hidden
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
