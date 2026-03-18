'use client';

import { useAchievementUnlockStore } from '@/src/stores/achievement-unlock-store';
import { useAuthStore } from '@/src/stores/auth-store';
import Link from 'next/link';

/**
 * "Bu başarıyı açtın!" modalı — challenge / oyunlaştırma hissi.
 */
export function AchievementUnlockedModal() {
  const { pending, dismiss } = useAchievementUnlockStore();
  const user = useAuthStore((s) => s.user);
  const achievementsPath = user?.username ? `/profil/${user.username}/basarilar` : '/profil/me/basarilar';

  if (!pending) return null;

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
        <div className="rounded-2xl border-2 border-amber-400/50 bg-gradient-to-b from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 dark:border-amber-500/40 shadow-2xl shadow-amber-900/20 overflow-hidden">
          {/* Üst şerit: Challenge / Başarı açıldı */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-white/95">
              🎉 Başarı açıldı!
            </p>
          </div>
          <div className="p-6 text-center">
            {/* Rozet */}
            <div
              className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 to-orange-300 dark:from-amber-600/40 dark:to-orange-600/40 text-4xl shadow-lg ring-4 ring-amber-400/30"
              aria-hidden
            >
              {pending.icon || '🏆'}
            </div>
            <h2
              id="achievement-unlocked-title"
              className="text-xl font-bold text-gray-900 dark:text-white"
            >
              {pending.name}
            </h2>
            {pending.description && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {pending.description}
              </p>
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
                href={achievementsPath}
                onClick={dismiss}
                className="rounded-xl border-2 border-amber-500 bg-transparent px-5 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-500/10 dark:border-amber-400 dark:text-amber-300 dark:hover:bg-amber-500/20"
              >
                Tüm başarılar →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
