'use client';

import { useMemo } from 'react';
import { Sparkles as SparklesIcon, Sprout } from 'lucide-react';
import { KidsCenteredModal, KidsPrimaryButton } from '@/src/components/kids/kids-ui';
import { useKidsI18n } from '@/src/providers/kids-language-provider';

const MID_MOTIVATION_KEYS = [
  'student.motivation.mid0',
  'student.motivation.mid1',
  'student.motivation.mid2',
  'student.motivation.mid3',
  'student.motivation.mid4',
  'student.motivation.mid5',
] as const;

const FINAL_MOTIVATION_KEYS = [
  'student.motivation.final0',
  'student.motivation.final1',
  'student.motivation.final2',
] as const;

/** Yeni bir adım teslimi sonrası rastgele mesaj (güncelleme / tekrar gönderimde kullanılmaz). */
export function kidsPickStepMotivationMessage(
  isFinalStep: boolean,
  t: (key: string) => string,
): string {
  const pool = isFinalStep ? FINAL_MOTIVATION_KEYS : MID_MOTIVATION_KEYS;
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
  message: string;
  /** Son adım (konu bitti) */
  isFinalStep: boolean;
  onContinue: () => void;
};

/**
 * Öğrenci bir challenge adımını ilk kez teslim ettiğinde: maskot + motive metin.
 * Kapatınca üst bileşen navigasyonu (sonraki adım veya challenges listesi) yapar.
 */
export function KidsStudentStepMotivationModal({ open, message, isFinalStep, onContinue }: Props) {
  const { t } = useKidsI18n();
  if (!open) return null;

  return (
    <KidsCenteredModal
      title={
        <span className="flex items-center gap-2">
          <Sprout className="h-4 w-4 text-emerald-500" aria-hidden />
          {t('student.motivation.modalTitle')}
        </span>
      }
      onClose={onContinue}
      maxWidthClass="max-w-md"
      footer={
        <KidsPrimaryButton type="button" className="w-full" onClick={onContinue}>
          {isFinalStep ? t('student.motivation.btnBackToChallenges') : t('student.motivation.btnContinue')}
        </KidsPrimaryButton>
      }
    >
      <div className="relative px-1 pb-2 text-center">
        <Sparkles />
        <div className="relative mx-auto mt-2 flex justify-center">
          <div className="kids-mascot-pop relative">
            <div
              className="absolute inset-0 rounded-full bg-gradient-to-br from-fuchsia-400/50 to-amber-300/40 blur-2xl"
              aria-hidden
            />
            <div className="kids-mascot-wiggle relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 via-fuchsia-400 to-amber-300 shadow-xl ring-4 ring-white/90 dark:ring-violet-950/80 sm:h-32 sm:w-32">
              <Sprout className="h-14 w-14 text-white sm:h-16 sm:w-16" aria-hidden />
            </div>
          </div>
        </div>
        <p className="font-logo mt-6 text-xl font-black text-violet-950 dark:text-violet-100">
          {isFinalStep ? t('student.motivation.headlineFinal') : t('student.motivation.headlineMid')}
        </p>
        <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-600 dark:text-gray-300">
          {message}
        </p>
      </div>
    </KidsCenteredModal>
  );
}
