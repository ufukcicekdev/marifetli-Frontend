'use client';

import { useMemo } from 'react';
import { KidsCenteredModal, KidsPrimaryButton } from '@/src/components/kids/kids-ui';

const MID_STEP_MESSAGES = [
  'Çok iyi gidiyorsun! Bu adımı tamamladın — bir sonrakinde de parlayacaksın.',
  'Vay be! Emek verdin, belli oluyor; macera devam ediyor, durma.',
  'Süpersin! Her adım seni biraz daha güçlendiriyor; devam etmelisin.',
  'Bravo! Öğretmenin çalışkanlığını görecek; bir sonraki adımda da şov yap.',
  'Harika iş çıkardın! Küçük adımlar büyük başarıları getirir — devam.',
  'Eline sağlık! Bu tur tamam; nefes al ve sonraki adıma geç.',
];

const FINAL_STEP_MESSAGES = [
  'Tüm adımları bitirdin! Sen bir yıldızsın — gurur duyabilirsin.',
  'Konuyu baştan sona tamamladın. Filiz bile alkışlıyor!',
  'Son adım da sende! Bu projeyi taçlandırdın; süpersin.',
];

/** Yeni bir adım teslimi sonrası rastgele mesaj (güncelleme / tekrar gönderimde kullanılmaz). */
export function kidsPickStepMotivationMessage(isFinalStep: boolean): string {
  const pool = isFinalStep ? FINAL_STEP_MESSAGES : MID_STEP_MESSAGES;
  return pool[Math.floor(Math.random() * pool.length)] ?? pool[0];
}

function Sparkles() {
  const pieces = useMemo(
    () =>
      ['✨', '⭐', '💫', '✨', '🌟'].map((ch, i) => ({
        ch,
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
          {p.ch}
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
 * Öğrenci bir proje adımını ilk kez teslim ettiğinde: maskot + motive metin.
 * Kapatınca üst bileşen navigasyonu (sonraki adım veya projeler listesi) yapar.
 */
export function KidsStudentStepMotivationModal({ open, message, isFinalStep, onContinue }: Props) {
  if (!open) return null;

  return (
    <KidsCenteredModal
      title={
        <span className="flex items-center gap-2">
          <span aria-hidden>🌱</span>
          Filiz diyor ki…
        </span>
      }
      onClose={onContinue}
      maxWidthClass="max-w-md"
      footer={
        <KidsPrimaryButton type="button" className="w-full" onClick={onContinue}>
          {isFinalStep ? 'Projelere dön' : 'Devam ediyorum!'}
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
              <span className="text-[3.5rem] leading-none sm:text-[4rem]" aria-hidden>
                🌱
              </span>
            </div>
          </div>
        </div>
        <p className="font-logo mt-6 text-xl font-black text-violet-950 dark:text-violet-100">
          {isFinalStep ? 'Konu tamam!' : 'Süper gidiyorsun!'}
        </p>
        <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-600 dark:text-gray-300">
          {message}
        </p>
      </div>
    </KidsCenteredModal>
  );
}
