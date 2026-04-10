'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle, CheckSquare, Users } from 'lucide-react';
import api from '@/src/lib/api';

const DEFAULT_ABOUT_SUMMARY =
  'Marifetli, ilgi alanlarının buluşma noktası. Örgü, dikiş, yemek, müzik, sanat, hobiler ve daha fazlası. Soru sor, paylaş.';

const STAT_ITEMS = [
  { key: 'question_count' as const, label: 'Soru',  icon: MessageCircle, color: 'text-sky-500',     bg: 'bg-sky-50 dark:bg-sky-950/30' },
  { key: 'answer_count'   as const, label: 'Cevap', icon: CheckSquare,   color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  { key: 'user_count'     as const, label: 'Üye',   icon: Users,         color: 'text-violet-500',  bg: 'bg-violet-50 dark:bg-violet-950/30' },
];

/**
 * Anasayfa sidebar: Hakkımızda (site ayarlarından) + canlı istatistikler.
 */
export function SiteStatsSidebar() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['site-stats'],
    queryFn: () => api.getSiteStats(),
    staleTime: 5 * 60 * 1000,
  });
  const { data: settings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const { data } = await api.getSiteSettings();
      return data;
    },
  });

  const aboutSummary = (settings?.about_summary ?? '').trim() || DEFAULT_ABOUT_SUMMARY;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Stat cards */}
      <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-800 border-b border-gray-100 dark:border-gray-800">
        {STAT_ITEMS.map(({ key, label, icon: Icon, color, bg }) => {
          const value = stats?.[key] ?? 0;
          return (
            <div key={key} className={`flex flex-col items-center gap-1 py-3 ${bg}`}>
              <Icon className={`h-4 w-4 ${color}`} aria-hidden />
              <span className="text-base font-bold text-gray-900 dark:text-white leading-none">
                {statsLoading ? '—' : value.toLocaleString('tr-TR')}
              </span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">{label}</span>
            </div>
          );
        })}
      </div>

      {/* About text */}
      <div className="p-4">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2 text-sm">Hakkımızda</h3>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          {aboutSummary}
        </p>
        <Link
          href="/hakkimizda"
          className="mt-2 inline-block text-sm font-medium text-brand hover:text-brand-hover transition-colors"
        >
          Devamını oku →
        </Link>
      </div>
    </div>
  );
}
