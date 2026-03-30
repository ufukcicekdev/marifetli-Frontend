'use client';

import Link from 'next/link';
import { jsPDF } from 'jspdf';
import {
  Backpack,
  CalendarDays,
  Gamepad2,
  Leaf,
  Map,
  Medal,
  Sparkles,
  Sprout,
  Star,
  Target,
  Trophy,
  TreePine,
} from 'lucide-react';
import {
  kidsClassLocationLine,
  type KidsAchievementCertificate,
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

function certificateShell(level: KidsAchievementCertificate['level']): string {
  if (level === 'gold') {
    return 'border-amber-300 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:border-amber-700 dark:from-amber-950/50 dark:via-amber-900/40 dark:to-orange-950/30';
  }
  if (level === 'silver') {
    return 'border-slate-300 bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:border-slate-700 dark:from-slate-950/50 dark:via-gray-950 dark:to-indigo-950/30';
  }
  if (level === 'bronze') {
    return 'border-orange-300 bg-gradient-to-br from-orange-50 via-amber-50 to-lime-50 dark:border-orange-700 dark:from-orange-950/40 dark:via-amber-950/30 dark:to-lime-950/20';
  }
  return 'border-violet-200 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 dark:border-violet-800 dark:from-violet-950/40 dark:via-gray-950 dark:to-fuchsia-950/20';
}

function escapeXml(raw: string): string {
  return String(raw || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function certificateSvg(row: KidsAchievementCertificate, studentName: string): string {
  const bg =
    row.level === 'gold'
      ? '#fde68a'
      : row.level === 'silver'
        ? '#cbd5e1'
        : row.level === 'bronze'
          ? '#fdba74'
          : '#ddd6fe';
  const title = escapeXml(row.title);
  const name = escapeXml(studentName);
  const message = escapeXml(row.message);
  const period = escapeXml(`${row.period_label} performans sertifikasi`);
  const metrics = escapeXml(
    `Odev ${row.homework_count} · Challenge ${row.challenge_count} · Ilerleme %${row.progress_percent}`,
  );
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="980" viewBox="0 0 1400 980">
  <rect width="1400" height="980" fill="#f8fafc"/>
  <rect x="36" y="36" width="1328" height="908" rx="34" fill="white" stroke="${bg}" stroke-width="12"/>
  <rect x="76" y="88" width="1248" height="140" rx="26" fill="${bg}"/>
  <text x="700" y="150" text-anchor="middle" font-size="54" font-weight="700" fill="#1f2937">Marifetli Kids</text>
  <text x="700" y="198" text-anchor="middle" font-size="28" font-weight="600" fill="#334155">Basari Sertifikasi</text>

  <text x="700" y="320" text-anchor="middle" font-size="42" font-weight="700" fill="#111827">${title}</text>
  <text x="700" y="390" text-anchor="middle" font-size="30" font-weight="600" fill="#374151">Bu sertifika</text>
  <text x="700" y="450" text-anchor="middle" font-size="50" font-weight="700" fill="#4f46e5">${name}</text>
  <text x="700" y="510" text-anchor="middle" font-size="30" font-weight="600" fill="#374151">icin verilmistir.</text>

  <text x="700" y="600" text-anchor="middle" font-size="28" font-weight="500" fill="#334155">${period}</text>
  <text x="700" y="648" text-anchor="middle" font-size="24" font-weight="500" fill="#334155">${metrics}</text>
  <text x="700" y="696" text-anchor="middle" font-size="24" font-weight="500" fill="#334155">${message}</text>

  <line x1="140" y1="820" x2="560" y2="820" stroke="#94a3b8" stroke-width="2" />
  <line x1="840" y1="820" x2="1260" y2="820" stroke="#94a3b8" stroke-width="2" />
  <text x="350" y="856" text-anchor="middle" font-size="22" fill="#475569">Ogrenci</text>
  <text x="1050" y="856" text-anchor="middle" font-size="22" fill="#475569">Marifetli Kids</text>
</svg>`;
}

async function certificatePngDataUrl(row: KidsAchievementCertificate, studentName: string): Promise<string> {
  const svg = certificateSvg(row, studentName);
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Sertifika görseli oluşturulamadı'));
      el.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = 1400;
    canvas.height = 980;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context alınamadı');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}

function triggerDownload(dataUrl: string, filename: string): void {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function AchievementCertificates({
  certificates,
  studentName,
}: {
  certificates: KidsAchievementCertificate[];
  studentName: string;
}) {
  const onDownloadPng = async (row: KidsAchievementCertificate) => {
    const dataUrl = await certificatePngDataUrl(row, studentName);
    const period = row.period_key === 'weekly' ? 'haftalik' : 'aylik';
    triggerDownload(dataUrl, `marifetli-sertifika-${period}.png`);
  };

  const onDownloadPdf = async (row: KidsAchievementCertificate) => {
    const dataUrl = await certificatePngDataUrl(row, studentName);
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const pad = 24;
    doc.addImage(dataUrl, 'PNG', pad, pad, pageW - pad * 2, pageH - pad * 2, undefined, 'FAST');
    const period = row.period_key === 'weekly' ? 'haftalik' : 'aylik';
    doc.save(`marifetli-sertifika-${period}.pdf`);
  };

  if (!certificates.length) return null;
  return (
    <section className="rounded-3xl border-2 border-indigo-200 bg-white/90 p-5 shadow-lg dark:border-indigo-900/40 dark:bg-gray-950/80">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-logo flex items-center gap-2 text-xl font-black text-indigo-900 dark:text-indigo-100">
          <Trophy className="h-5 w-5" aria-hidden /> Basari Sertifikalarim
        </h2>
        <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
          Haftalik + Aylik
        </span>
      </div>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {certificates.map((row) => (
          <li key={row.period_key} className={`rounded-2xl border-2 p-4 shadow-sm ${certificateShell(row.level)}`}>
            <div className="flex items-start justify-between gap-2">
              <p className="font-logo text-base font-black text-slate-900 dark:text-white">{row.title}</p>
              <span
                className={
                  'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-black ' +
                  (row.earned
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300')
                }
              >
                {row.earned ? 'Kazanildi' : 'Devam ediyor'}
              </span>
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">{row.message}</p>
            <p className="mt-2 text-xs font-bold text-slate-700 dark:text-slate-200">
              Odev: {row.homework_count} · Challenge: {row.challenge_count}
            </p>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/80 dark:bg-gray-900/70">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-amber-400 transition-[width] duration-700"
                style={{ width: `${Math.max(6, Math.min(100, row.progress_percent || 0))}%` }}
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
              <span>
                {row.total_count}/{row.target_count} adim
              </span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                {row.period_label}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Medal className="h-3.5 w-3.5" aria-hidden />
              Seviye: {row.level}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  void onDownloadPng(row);
                }}
                className="rounded-xl border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-black text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-200"
              >
                PNG indir
              </button>
              <button
                type="button"
                onClick={() => {
                  void onDownloadPdf(row);
                }}
                className="rounded-xl border border-fuchsia-300 bg-fuchsia-50 px-3 py-1.5 text-xs font-black text-fuchsia-700 transition hover:bg-fuchsia-100 dark:border-fuchsia-700 dark:bg-fuchsia-950/40 dark:text-fuchsia-200"
              >
                PDF indir
              </button>
            </div>
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
  certificates: KidsAchievementCertificate[];
  roadmap: KidsBadgeRoadmap | null;
  loading: boolean;
};

export function KidsStudentDashboardPlayful({
  pathPrefix,
  user,
  classes,
  certificates,
  roadmap,
  loading,
}: Props) {
  const gp = user.growth_points ?? 0;
  const bar = growthBarFraction(gp);
  const stage = user.growth_stage;
  const studentName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'Ogrenci';

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
      <AchievementCertificates certificates={certificates} studentName={studentName} />

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
