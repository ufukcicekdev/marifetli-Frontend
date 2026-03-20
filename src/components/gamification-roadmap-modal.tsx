'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/src/lib/api';
import { useAuthStore } from '@/src/stores/auth-store';
import { useAuthModalStore } from '@/src/stores/auth-modal-store';
import { useGamificationRoadmapModalStore } from '@/src/stores/gamification-roadmap-modal-store';
import { gamificationRoadmapQueryKey } from '@/src/components/gamification-motivation-strip';
import type { GamificationBadgeCue, GamificationRoadmap, PublicGamificationInfo } from '@/src/types';

function CueRow({ cue }: { cue: GamificationBadgeCue }) {
  const pct = Math.min(100, (cue.current / Math.max(1, cue.target)) * 100);
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl shrink-0" aria-hidden>
            {cue.icon}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{cue.name}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{cue.hint}</p>
          </div>
        </div>
        <Link
          href={cue.cta_path}
          className="text-xs font-semibold text-brand hover:text-brand-hover shrink-0"
        >
          {cue.cta_label} →
        </Link>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div className="h-full rounded-full bg-brand/90 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 tabular-nums">
        {cue.current} / {cue.target}
      </p>
    </div>
  );
}

function PersonalPanel({ data }: { data: GamificationRoadmap }) {
  const lb = data.level_band;
  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between items-baseline gap-2 mb-1">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{data.level_title}</span>
          <span className="text-xs text-amber-700 dark:text-amber-300 tabular-nums">{data.reputation} itibar</span>
        </div>
        {lb?.next_title != null && (
          <>
            <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-brand"
                style={{ width: `${Math.min(100, lb.progress_percent_in_band)}%` }}
              />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1.5">
              Sonraki: <strong className="text-gray-800 dark:text-gray-200">{lb.next_title}</strong>
              {lb.points_to_next > 0 ? (
                <span> — yaklaşık {lb.points_to_next} puan kaldı</span>
              ) : null}
            </p>
          </>
        )}
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Sıradaki rozetler</p>
        <div className="space-y-2 max-h-[min(40vh,320px)] overflow-y-auto pr-1">
          {data.badge_cues.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Bu davranış rozetlerinin hepsini topladın. Başarılar sayfasında başka hedefler var.
            </p>
          ) : (
            data.badge_cues.map((cue) => <CueRow key={cue.slug} cue={cue} />)
          )}
        </div>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 italic border-t border-gray-200 dark:border-gray-700 pt-3">
        {data.subtext}
      </p>
    </div>
  );
}

function GeneralPanel({ data }: { data: PublicGamificationInfo }) {
  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide mb-2">
          Nasıl çalışır?
        </h3>
        <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-300 space-y-1.5">
          {data.how_it_works.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide mb-2">
          İtibar ipuçları
        </h3>
        <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-300 space-y-1.5">
          {data.reputation_tips.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide mb-2">
          Rütbe basamakları (itibar puanı)
        </h3>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden text-sm">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-800/80 text-xs text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-3 py-2 font-medium">Rütbe</th>
                <th className="px-3 py-2 font-medium">Puan aralığı</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {data.levels.map((row) => (
                <tr key={row.title} className="text-gray-800 dark:text-gray-200">
                  <td className="px-3 py-2 font-medium">{row.title}</td>
                  <td className="px-3 py-2 tabular-nums text-gray-600 dark:text-gray-400">
                    {row.points_max == null
                      ? `${row.points_min}+`
                      : `${row.points_min} – ${row.points_max}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {data.badges.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide mb-2">
            Rozetler
          </h3>
          <ul className="space-y-2">
            {data.badges.map((b) => (
              <li
                key={b.slug}
                className="flex gap-3 rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-white/50 dark:bg-gray-800/30"
              >
                <span className="text-2xl shrink-0" aria-hidden>
                  {b.icon || '◆'}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{b.name}</p>
                  {b.description ? (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{b.description}</p>
                  ) : null}
                  <p className="text-[10px] text-gray-500 dark:text-gray-500 mt-1 uppercase tracking-wide">
                    {b.badge_type === 'milestone' && b.points_required
                      ? `İtibar: ${b.points_required}+`
                      : b.badge_type !== 'milestone' && b.requirement_value
                        ? `Hedef: ${b.requirement_value}`
                        : b.badge_type}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export function GamificationRoadmapModal() {
  const { open, closeModal, initialTab } = useGamificationRoadmapModalStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [tab, setTab] = useState<'general' | 'personal'>('general');

  useEffect(() => {
    if (open) {
      setTab(isAuthenticated && initialTab === 'personal' ? 'personal' : 'general');
    }
  }, [open, isAuthenticated, initialTab]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, closeModal]);

  const { data: publicData, isLoading: pubLoading, isError: pubError } = useQuery({
    queryKey: ['gamification-public'],
    queryFn: () => api.getPublicGamificationInfo().then((r) => r.data),
    enabled: open,
    staleTime: 10 * 60_000,
  });

  const { data: personalData, isLoading: perLoading, isError: perError } = useQuery({
    queryKey: gamificationRoadmapQueryKey,
    queryFn: () => api.getMyGamificationRoadmap().then((r) => r.data),
    enabled: open && isAuthenticated && tab === 'personal',
    staleTime: 120_000,
  });

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={closeModal}
        aria-hidden
      />
      <div
        className="fixed left-1/2 top-1/2 z-[111] w-[min(96vw,520px)] max-h-[min(92vh,720px)] -translate-x-1/2 -translate-y-1/2 flex flex-col rounded-2xl border-2 border-amber-400/40 dark:border-amber-600/35 bg-white dark:bg-gray-900 shadow-2xl shadow-amber-900/20 overflow-hidden animate-in zoom-in-95 fade-in duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gamification-roadmap-title"
      >
        <div className="bg-gradient-to-r from-amber-500 to-brand px-4 py-3 shrink-0 flex items-start justify-between gap-2">
          <div>
            <h2 id="gamification-roadmap-title" className="text-lg font-bold text-white">
              Yol haritası & ödüller
            </h2>
            <p className="text-xs text-white/90 mt-0.5">
              Rütbeler, rozetler ve nasıl ilerleyeceğin — herkes için şeffaf.
            </p>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="shrink-0 rounded-lg p-1.5 text-white/90 hover:bg-white/20 transition-colors"
            aria-label="Kapat"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isAuthenticated && (
          <div className="flex border-b border-gray-200 dark:border-gray-700 shrink-0">
            <button
              type="button"
              onClick={() => setTab('general')}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                tab === 'general'
                  ? 'text-brand border-b-2 border-brand bg-amber-50/50 dark:bg-amber-950/20'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}
            >
              Nasıl çalışır?
            </button>
            <button
              type="button"
              onClick={() => setTab('personal')}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                tab === 'personal'
                  ? 'text-brand border-b-2 border-brand bg-amber-50/50 dark:bg-amber-950/20'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}
            >
              Senin ilerlemen
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 min-h-0">
          {(!isAuthenticated || tab === 'general') && (
            <>
              {pubLoading && (
                <div className="space-y-3 animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  <div className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl" />
                </div>
              )}
              {pubError && (
                <p className="text-sm text-red-600 dark:text-red-400">Bilgiler yüklenemedi. Lütfen tekrar deneyin.</p>
              )}
              {publicData && <GeneralPanel data={publicData} />}
            </>
          )}
          {isAuthenticated && tab === 'personal' && (
            <>
              {perLoading && (
                <div className="space-y-3 animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                  <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl" />
                </div>
              )}
              {perError && (
                <p className="text-sm text-red-600 dark:text-red-400">İlerlemen yüklenemedi.</p>
              )}
              {personalData && <PersonalPanel data={personalData} />}
            </>
          )}
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 shrink-0 flex flex-wrap gap-2 justify-end bg-gray-50/80 dark:bg-gray-800/50">
          {!isAuthenticated ? (
            <button
              type="button"
              onClick={() => {
                closeModal();
                useAuthModalStore.getState().open('register');
              }}
              className="text-sm font-semibold px-4 py-2 rounded-xl bg-brand text-white hover:bg-brand-hover"
            >
              Katıl, kazanmaya başla
            </button>
          ) : null}
          <button
            type="button"
            onClick={closeModal}
            className="text-sm font-semibold px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Kapat
          </button>
        </div>
      </div>
    </>
  );
}
