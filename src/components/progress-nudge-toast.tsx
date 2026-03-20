'use client';

import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/src/stores/auth-store';

export type ProgressNudgePayload = {
  kind: 'progress';
  achievement_id: number;
  code: string;
  name: string;
  icon: string;
  current: number;
  target: number;
  milestone_percent: number;
  hint: string;
};

/**
 * Başarı ilerlemesi eşiği (25/50/75/90/95) — tam kilitten sonra toast.
 * Son adım (95) biraz daha belirgin.
 */
export function showProgressNudgeToast(nudge: ProgressNudgePayload) {
  const username = useAuthStore.getState().user?.username;
  const isAlmost = nudge.milestone_percent >= 95;
  const basarilarHref = username ? `/profil/${username}/basarilar` : '/sorular';

  toast.custom(
    (t) => (
      <div
        className={`${
          t.visible ? 'animate-in fade-in slide-in-from-top-2' : 'animate-out fade-out'
        } max-w-[min(92vw,340px)] rounded-xl border shadow-lg overflow-hidden ${
          isAlmost
            ? 'border-amber-400/70 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/40 dark:to-gray-900 dark:border-amber-500/50'
            : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900'
        }`}
      >
        <div className="flex gap-3 p-3.5">
          <span className="text-2xl shrink-0 leading-none" aria-hidden>
            {nudge.icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
              Başarı ilerlemesi
            </p>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">{nudge.hint}</p>
            <div className="mt-2 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-brand dark:bg-brand transition-all"
                style={{ width: `${Math.min(100, Math.round((nudge.current / nudge.target) * 100))}%` }}
              />
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
              {nudge.current} / {nudge.target}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Link
                href={basarilarHref}
                className="text-xs font-medium text-brand hover:text-brand-hover"
                onClick={() => toast.dismiss(t.id)}
              >
                Başarıları gör →
              </Link>
              <button
                type="button"
                className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 ml-auto"
                onClick={() => toast.dismiss(t.id)}
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      id: `progress-nudge-${nudge.achievement_id}-${nudge.milestone_percent}`,
      duration: isAlmost ? 8000 : 5500,
      position: 'top-center',
    }
  );
}
