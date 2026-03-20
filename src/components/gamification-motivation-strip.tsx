'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/src/lib/api';
import { useAuthStore } from '@/src/stores/auth-store';
import { useGamificationRoadmapModalStore } from '@/src/stores/gamification-roadmap-modal-store';

export const gamificationRoadmapQueryKey = ['gamification-roadmap'] as const;

/**
 * İnce teşvik şeridi + yol haritası modalını açan CTA.
 * Misafir: genel tanıtım; giriş yapmış: kişisel mesaj + hızlı CTA.
 */
export function GamificationMotivationStrip() {
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const openRoadmapModal = useGamificationRoadmapModalStore((s) => s.openModal);

  const hideOnPath =
    !pathname ||
    pathname.startsWith('/giris') ||
    pathname.startsWith('/kayit') ||
    pathname.startsWith('/auth/');

  const { data, isLoading, isError } = useQuery({
    queryKey: gamificationRoadmapQueryKey,
    queryFn: () => api.getMyGamificationRoadmap().then((r) => r.data),
    enabled: isAuthenticated && !hideOnPath,
    staleTime: 120_000,
    gcTime: 600_000,
  });

  if (hideOnPath) return null;

  const openGeneral = () => openRoadmapModal({ tab: 'general' });
  const openPersonal = () => openRoadmapModal({ tab: 'personal' });

  if (!isAuthenticated) {
    return (
      <div className="border-b border-amber-200/60 dark:border-amber-900/40 bg-gradient-to-r from-amber-50/95 via-white to-brand-pink/30 dark:from-amber-950/40 dark:via-gray-900/80 dark:to-brand/15">
        <div className="container mx-auto px-3 sm:px-4 max-w-6xl py-2.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-lg shrink-0" aria-hidden>
              🎁
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Marifetli&apos;de rütbe ve rozetler seni bekliyor
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Nasıl puan kazanacağını ve hangi ödüllerin olduğunu tek ekranda gör.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={openGeneral}
              className="text-xs sm:text-sm font-semibold whitespace-nowrap px-3 py-1.5 rounded-lg bg-brand text-white hover:bg-brand-hover shadow-sm"
            >
              Ödül sistemini gör
            </button>
            <Link
              href="/giris"
              className="text-xs font-medium text-amber-800 dark:text-amber-300 hover:underline whitespace-nowrap"
            >
              Giriş yap
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || isError || !data) return null;

  const cta = data.top_badge_cue;

  return (
    <div className="border-b border-amber-200/60 dark:border-amber-900/40 bg-gradient-to-r from-amber-50/95 via-white to-brand-pink/30 dark:from-amber-950/40 dark:via-gray-900/80 dark:to-brand/15">
      <div className="container mx-auto px-3 sm:px-4 max-w-6xl py-2.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-lg shrink-0" aria-hidden>
            🧭
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{data.headline}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{data.subtext}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 w-full sm:w-auto flex-wrap">
          {data.level_band?.next_title != null && (
            <div className="hidden sm:flex flex-col min-w-[100px] flex-1 sm:flex-none sm:min-w-[120px]">
              <div className="h-1.5 rounded-full bg-amber-200/80 dark:bg-gray-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-brand transition-[width] duration-500"
                  style={{ width: `${Math.min(100, data.level_band.progress_percent_in_band ?? 0)}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                {data.level_title} → {data.level_band.next_title}
              </span>
            </div>
          )}
          {cta ? (
            <Link
              href={cta.cta_path}
              className="text-xs sm:text-sm font-semibold whitespace-nowrap px-3 py-1.5 rounded-lg bg-brand text-white hover:bg-brand-hover shadow-sm"
            >
              {cta.cta_label}
            </Link>
          ) : null}
          <button
            type="button"
            onClick={openPersonal}
            className="text-xs font-semibold text-amber-900 dark:text-amber-200 hover:underline whitespace-nowrap px-1"
          >
            Yol haritası
          </button>
          <button
            type="button"
            onClick={openGeneral}
            className="text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 whitespace-nowrap"
          >
            Kurallar
          </button>
        </div>
      </div>
    </div>
  );
}
