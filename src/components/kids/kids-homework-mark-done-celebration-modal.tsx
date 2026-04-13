'use client';

import { useMemo } from 'react';
import { Sparkles as SparklesIcon, Star } from 'lucide-react';
import { KidsCenteredModal, KidsPrimaryButton } from '@/src/components/kids/kids-ui';
import { KidsMascot } from '@/src/components/kids/kids-mascot';
import type { KidsLanguageCode } from '@/src/lib/kids-api';
import { useKidsI18n } from '@/src/providers/kids-language-provider';

const MOTIVATE_KEYS = [
  'homework.celebration.motivate0',
  'homework.celebration.motivate1',
  'homework.celebration.motivate2',
] as const;

function growthLocale(lang: KidsLanguageCode): string {
  if (lang === 'tr') return 'tr-TR';
  if (lang === 'ge') return 'de-DE';
  return 'en-US';
}

function interpolate(template: string, vars: Record<string, string | number>): string {
  let s = template;
  for (const [k, v] of Object.entries(vars)) {
    s = s.split(`{${k}}`).join(String(v));
  }
  return s;
}

export function kidsPickHomeworkCelebrationMotivate(t: (key: string) => string): string {
  const pool = MOTIVATE_KEYS;
  const k = pool[Math.floor(Math.random() * pool.length)] ?? pool[0];
  return t(k);
}

function Sparkles() {
  const pieces = useMemo(
    () =>
      [...Array(5)].map((_, i) => ({
        left: `${12 + i * 18}%`,
        delay: `${i * 0.12}s`,
        dur: `${1.1 + (i % 3) * 0.15}s`,
      })),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="marifetli-confetti-piece absolute top-2 text-lg opacity-0"
          style={{
            left: p.left,
            ['--confetti-delay' as string]: p.delay,
            ['--confetti-dur' as string]: p.dur,
          }}
        >
          <SparklesIcon className="h-4 w-4 text-amber-400" />
        </span>
      ))}
    </div>
  );
}

type Props = {
  open: boolean;
  growthPointsBefore: number;
  growthPointsAfter: number;
  growthPointsDelta: number;
  motivateLine: string;
  onContinue: () => void;
};

/**
 * Öğrenci ödevi "Yaptım" ile ilk kez (veya yeniden) teslim ettiğinde: veli mesajı + büyüme puanı farkı + teşvik.
 */
export function KidsHomeworkMarkDoneCelebrationModal({
  open,
  growthPointsBefore,
  growthPointsAfter,
  growthPointsDelta,
  motivateLine,
  onContinue,
}: Props) {
  const { t, language } = useKidsI18n();
  if (!open) return null;

  const loc = growthLocale(language);
  const fromStr = growthPointsBefore.toLocaleString(loc);
  const toStr = growthPointsAfter.toLocaleString(loc);
  const deltaStr = growthPointsDelta.toLocaleString(loc);

  return (
    <KidsCenteredModal
      title={
        <span className="flex items-center gap-2">
          <Star className="h-4 w-4 text-amber-500" aria-hidden fill="currentColor" />
          {t('homework.celebration.title')}
        </span>
      }
      onClose={onContinue}
      maxWidthClass="max-w-md"
      footer={
        <KidsPrimaryButton type="button" className="w-full" onClick={onContinue}>
          {t('homework.celebration.continue')}
        </KidsPrimaryButton>
      }
    >
      <div className="relative px-1 pb-2 text-center">
        <Sparkles />
        {/* Marfi maskotu */}
        <div className="relative mx-auto mb-2 flex justify-center">
          <div className="relative">
            <div
              className="absolute inset-0 -m-4 rounded-full bg-gradient-to-br from-amber-300/40 to-violet-400/30 blur-2xl"
              aria-hidden
            />
            <KidsMascot mood="proud" size={120} />
          </div>
        </div>
        <p className="relative mt-1 text-sm font-semibold leading-relaxed text-slate-700 dark:text-gray-200">
          {t('homework.celebration.sent')}
        </p>
        {growthPointsDelta > 0 ? (
          <p className="relative mt-4 font-logo text-xl font-black text-violet-950 dark:text-violet-100">
            {interpolate(t('homework.celebration.growthLine'), {
              from: fromStr,
              to: toStr,
              delta: deltaStr,
            })}
          </p>
        ) : (
          <p className="relative mt-4 text-sm font-semibold text-slate-600 dark:text-gray-300">
            {t('homework.celebration.noNewPoints')}
          </p>
        )}
        <p className="relative mt-4 text-sm font-semibold leading-relaxed text-slate-600 dark:text-gray-300">
          {motivateLine}
        </p>
      </div>
    </KidsCenteredModal>
  );
}
