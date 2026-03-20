'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import DOMPurify from 'dompurify';
import { useAchievementUnlockStore, type BadgeUnlockPayload } from '@/src/stores/achievement-unlock-store';
import { useAuthStore } from '@/src/stores/auth-store';

function MiniConfetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        id: i,
        left: `${(i * 37) % 100}%`,
        delay: `${(i % 8) * 0.05}s`,
        duration: `${1.2 + (i % 5) * 0.15}s`,
        hue: (i * 47) % 360,
      })),
    []
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="marifetli-confetti-piece absolute top-0 h-2 w-2 rounded-sm"
          style={{
            left: p.left,
            backgroundColor: `hsl(${p.hue} 85% 55%)`,
            ['--confetti-dur' as string]: p.duration,
            ['--confetti-delay' as string]: p.delay,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Başarı veya itibar rozeti açıldığında gösterilen modal.
 */
export function AchievementUnlockedModal() {
  const { pending, dismiss } = useAchievementUnlockStore();
  const user = useAuthStore((s) => s.user);
  const profilePath = user?.username ? `/profil/${user.username}` : '/';

  if (!pending) return null;

  const isBadge = pending.kind === 'badge';
  const badge = isBadge ? (pending as BadgeUnlockPayload) : null;
  const safeSvg =
    badge?.icon_svg &&
    DOMPurify.sanitize(badge.icon_svg, {
      USE_PROFILES: { svg: true, svgFilters: true },
    });

  return (
    <>
      <div
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={dismiss}
        aria-hidden
      />
      <div
        className="fixed left-1/2 top-1/2 z-[101] w-[min(92vw,380px)] -translate-x-1/2 -translate-y-1/2 animate-in zoom-in-95 fade-in duration-300"
        role="dialog"
        aria-labelledby="achievement-unlocked-title"
        aria-modal="true"
      >
        <div className="relative rounded-2xl border-2 border-amber-400/50 bg-gradient-to-b from-amber-50 to-brand-pink/80 dark:from-gray-900 dark:to-gray-800 dark:border-amber-500/40 shadow-2xl shadow-amber-900/20 overflow-hidden">
          <MiniConfetti />
          <div className="relative z-[1]">
            <div className="bg-gradient-to-r from-amber-500 to-brand px-4 py-2 text-center">
              <p className="text-sm font-bold uppercase tracking-wider text-white/95">
                {isBadge ? '🎖️ Yeni rozet!' : '🎉 Başarı açıldı!'}
              </p>
            </div>
            <div className="p-6 text-center">
              <div
                className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 to-brand/80 dark:from-amber-600/40 dark:to-brand/40 text-4xl shadow-lg ring-4 ring-amber-400/30 [&_svg]:max-h-12 [&_svg]:max-w-12 [&_svg]:text-amber-800 dark:[&_svg]:text-amber-200"
                aria-hidden
              >
                {safeSvg ? (
                  <span dangerouslySetInnerHTML={{ __html: safeSvg }} />
                ) : (
                  <span>{pending.icon || (isBadge ? '🏅' : '🏆')}</span>
                )}
              </div>
              <h2 id="achievement-unlocked-title" className="text-xl font-bold text-gray-900 dark:text-white">
                {pending.name}
              </h2>
              {pending.description && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{pending.description}</p>
              )}
              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={dismiss}
                  className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
                >
                  Harika!
                </button>
                <Link
                  href={isBadge ? profilePath : `${profilePath}/basarilar`}
                  onClick={dismiss}
                  className="rounded-xl border-2 border-amber-500 bg-transparent px-5 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-500/10 dark:border-amber-400 dark:text-amber-300 dark:hover:bg-amber-500/20"
                >
                  {isBadge ? 'Profilim →' : 'Tüm başarılar →'}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
