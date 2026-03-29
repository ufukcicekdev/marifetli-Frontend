'use client';

import Link from 'next/link';
import { Backpack, Gamepad2, Leaf, Map, Sparkles, Sprout, Star, Target, TreePine } from 'lucide-react';
import {
  kidsClassLocationLine,
  type KidsBadgeRoadmap,
  type KidsClass,
  type KidsRoadmapMilestone,
  type KidsUser,
} from '@/src/lib/kids-api';
function milestoneIcon(icon: string): JSX.Element {
  if (icon === 'seed') return <Sprout className="h-6 w-6" aria-hidden />;
  if (icon === 'sprout') return <Leaf className="h-6 w-6" aria-hidden />;
  if (icon === 'tree') return <TreePine className="h-6 w-6" aria-hidden />;
  if (icon === 'star_tree') return <Sparkles className="h-6 w-6" aria-hidden />;
  return <Star className="h-6 w-6" aria-hidden />;
}

function growthBarFraction(points: number): number {
  const p = Math.max(0, points || 0);
  if (p < 6) return p <= 0 ? 0.06 : p / 6;
  if (p < 16) return (p - 6) / 10;
  return 1;
}

function growthNextHint(points: number): string {
  const p = Math.max(0, points || 0);
  if (p < 6) return 'Sonraki rozet için puan biriktir';
  if (p < 16) return 'Parlayan rozetine az kaldı';
  return 'Harika gidiyorsun!';
}

const classShells = [
  'border-fuchsia-300/90 bg-gradient-to-br from-fuchsia-50 to-white dark:border-fuchsia-800 dark:from-fuchsia-950/50 dark:to-gray-950',
  'border-sky-300/90 bg-gradient-to-br from-sky-50 to-white dark:border-sky-800 dark:from-sky-950/50 dark:to-gray-950',
  'border-amber-300/90 bg-gradient-to-br from-amber-50 to-white dark:border-amber-800 dark:from-amber-950/40 dark:to-gray-950',
  'border-emerald-300/90 bg-gradient-to-br from-emerald-50 to-white dark:border-emerald-800 dark:from-emerald-950/40 dark:to-gray-950',
];

function RoadmapStrip({
  milestones,
  pathPrefix,
}: {
  milestones: KidsRoadmapMilestone[];
  pathPrefix: string;
}) {
  const top = [...milestones].sort((a, b) => a.order - b.order).slice(0, 6);
  if (top.length === 0) return null;
  return (
    <section className="rounded-3xl border-2 border-amber-200/80 bg-gradient-to-r from-amber-50/90 via-white to-violet-50/90 p-4 shadow-lg shadow-amber-200/20 dark:border-amber-900/50 dark:from-amber-950/30 dark:via-gray-950 dark:to-violet-950/30">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-logo text-lg font-black text-amber-900 dark:text-amber-100">Rozet yolun</h2>
        <Link
          href={`${pathPrefix}/ogrenci/yol`}
          className="text-sm font-bold text-fuchsia-700 underline-offset-2 hover:underline dark:text-fuchsia-300"
        >
          Tümünü gör →
        </Link>
      </div>
      <ul className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {top.map((m) => (
          <li
            key={m.key}
            className={
              'min-w-[5.5rem] shrink-0 rounded-2xl border-2 px-2 py-3 text-center text-xs font-bold transition ' +
              (m.unlocked
                ? 'border-amber-400 bg-gradient-to-b from-amber-100 to-amber-50 text-amber-950 shadow-md dark:border-amber-500 dark:from-amber-900/80 dark:to-amber-950 dark:text-amber-50'
                : 'border-gray-200 bg-gray-100/80 text-gray-500 opacity-90 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400')
            }
          >
            <span className="text-2xl leading-none" aria-hidden>
              {milestoneIcon(m.icon)}
            </span>
            <span className="mt-1 line-clamp-2 block leading-tight">{m.title}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

type Props = {
  pathPrefix: string;
  user: KidsUser;
  classes: KidsClass[];
  roadmap: KidsBadgeRoadmap | null;
  loading: boolean;
};

export function KidsStudentDashboardPlayful({
  pathPrefix,
  user,
  classes,
  roadmap,
  loading,
}: Props) {
  const gp = user.growth_points ?? 0;
  const bar = growthBarFraction(gp);
  const stage = user.growth_stage;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="relative overflow-hidden rounded-[2rem] border-4 border-white/80 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-amber-400 p-1 shadow-2xl shadow-fuchsia-500/25 dark:border-violet-900/60 dark:from-violet-800 dark:via-fuchsia-800 dark:to-amber-700">
        <div className="rounded-[1.5rem] bg-white/95 px-5 py-6 dark:bg-gray-950/95 sm:px-8 sm:py-8">
          <p className="text-center text-xs font-black uppercase tracking-[0.25em] text-fuchsia-600 dark:text-fuchsia-400">
            Senin köşen
          </p>
          <h1 className="font-logo mt-2 text-center text-3xl font-black text-violet-950 dark:text-white sm:text-4xl">
            Merhaba {user.first_name || 'kahraman'}!
          </h1>
          <p className="mx-auto mt-2 max-w-md text-center text-sm font-medium text-slate-600 dark:text-gray-300">
            Rozet yolunu takip et, challenge’larını ayrı sayfadan yönet — öğretmenin yıldızı seninle.
          </p>

          {stage ? (
            <div className="mt-5 rounded-2xl border-2 border-emerald-300/80 bg-gradient-to-r from-emerald-50 to-teal-50 p-4 dark:border-emerald-800 dark:from-emerald-950/50 dark:to-teal-950/40">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-4xl" aria-hidden>
                  <Leaf className="h-8 w-8" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-logo text-lg font-black text-emerald-900 dark:text-emerald-100">{stage.title}</p>
                  <p className="text-sm font-medium text-emerald-800/90 dark:text-emerald-200/90">{stage.subtitle}</p>
                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-emerald-200/80 dark:bg-emerald-900/60">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-sky-400 transition-[width] duration-700 ease-out"
                      style={{ width: `${Math.round(bar * 100)}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs font-semibold text-emerald-800/80 dark:text-emerald-300/80">
                    Büyüme puanı: <strong>{gp}</strong> · {growthNextHint(gp)}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </header>

      {roadmap ? <RoadmapStrip milestones={roadmap.milestones} pathPrefix={pathPrefix} /> : null}

      <section className="rounded-3xl border-2 border-fuchsia-200 bg-white/90 p-5 shadow-lg dark:border-fuchsia-900/40 dark:bg-gray-950/80">
        <h2 className="font-logo flex items-center gap-2 text-xl font-black text-fuchsia-900 dark:text-fuchsia-100">
          <Backpack className="h-5 w-5" aria-hidden /> Sınıflarım
        </h2>
        {loading ? (
          <p className="mt-3 animate-pulse text-sm font-medium text-gray-500">Yükleniyor…</p>
        ) : classes.length === 0 ? (
          <p className="mt-3 text-sm font-medium text-gray-600 dark:text-gray-400">
            Henüz bir sınıfa kayıtlı değilsin — öğretmeninin davet linkiyle katıl.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {classes.map((c, i) => {
              const loc = kidsClassLocationLine(c);
              return (
                <li
                  key={c.id}
                  className={`rounded-2xl border-2 p-4 shadow-sm ${classShells[i % classShells.length]}`}
                >
                  <span className="font-logo text-base font-black text-violet-950 dark:text-white">{c.name}</span>
                  {loc ? (
                    <span className="mt-1 block text-xs font-medium text-gray-600 dark:text-gray-400">{loc}</span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-3xl border-2 border-violet-300/80 bg-gradient-to-br from-violet-100/90 via-fuchsia-50/80 to-amber-50/70 p-1 shadow-lg dark:border-violet-800 dark:from-violet-950/50 dark:via-fuchsia-950/30 dark:to-amber-950/20">
        <div className="rounded-[1.35rem] bg-white/95 px-5 py-5 dark:bg-gray-950/90">
          <h2 className="font-logo flex items-center gap-2 text-lg font-black text-violet-900 dark:text-violet-100">
            <Target className="h-5 w-5" aria-hidden /> Challenges
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-600 dark:text-gray-300">
            Çok adımlı challenge’larda her teslim ayrı kaydedilir. Tüm listeyi ve ilerlemeni buradan aç.
          </p>
          <Link
            href={`${pathPrefix}/ogrenci/projeler`}
            className="mt-4 flex min-h-12 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-amber-500 px-6 py-3 text-center text-sm font-black text-white shadow-md shadow-fuchsia-500/25 transition hover:brightness-105"
          >
            Challenges’a git →
          </Link>
        </div>
      </section>

      <div className="flex justify-center">
        <div className="flex w-full max-w-xl flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href={`${pathPrefix}/ogrenci/yol`}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border-2 border-violet-300 bg-violet-50 px-6 py-3 text-sm font-black text-violet-900 transition hover:bg-violet-100 dark:border-violet-700 dark:bg-violet-950/60 dark:text-violet-100 dark:hover:bg-violet-900/60 sm:w-auto"
          >
            <Map className="mr-1 h-4 w-4" aria-hidden /> Rozet yolu
          </Link>
          <Link
            href={`${pathPrefix}/ogrenci/oyun-merkezi`}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border-2 border-emerald-300 bg-emerald-50 px-6 py-3 text-sm font-black text-emerald-900 transition hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100 dark:hover:bg-emerald-900/50 sm:w-auto"
          >
            <Gamepad2 className="mr-1 h-4 w-4" aria-hidden /> Oyun merkezi
          </Link>
        </div>
      </div>
    </div>
  );
}
