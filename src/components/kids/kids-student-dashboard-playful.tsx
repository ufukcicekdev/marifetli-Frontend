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
import { useKidsI18n } from '@/src/providers/kids-language-provider';

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

function growthNextHint(points: number, t: (key: string) => string): string {
  const p = Math.max(0, points || 0);
  if (p < 6) return t('student.dashboard.growthHint1');
  if (p < 16) return t('student.dashboard.growthHint2');
  return t('student.dashboard.growthHint3');
}

function certificateLevelLabel(level: string, t: (key: string) => string): string {
  if (level === 'gold') return t('student.certificate.levelGold');
  if (level === 'silver') return t('student.certificate.levelSilver');
  if (level === 'bronze') return t('student.certificate.levelBronze');
  return level;
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
  t,
}: {
  milestones: KidsRoadmapMilestone[];
  pathPrefix: string;
  t: (key: string) => string;
}) {
  const top = [...milestones].sort((a, b) => a.order - b.order).slice(0, 6);
  if (top.length === 0) return null;
  return (
    <section className="rounded-3xl border-2 border-amber-200/80 bg-gradient-to-r from-amber-50/90 via-white to-violet-50/90 p-4 shadow-lg shadow-amber-200/20 dark:border-amber-900/50 dark:from-amber-950/30 dark:via-gray-950 dark:to-violet-950/30">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-logo text-lg font-black text-amber-900 dark:text-amber-100">
          {t('student.dashboard.roadmapTitle')}
        </h2>
        <Link
          href={`${pathPrefix}/ogrenci/yol`}
          className="text-sm font-bold text-fuchsia-700 underline-offset-2 hover:underline dark:text-fuchsia-300"
        >
          {t('student.dashboard.roadmapSeeAll')}
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

function certificateSvg(
  row: KidsAchievementCertificate,
  studentName: string,
  t: (key: string) => string,
): string {
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
  const period = escapeXml(t('student.certificate.svg.periodLine').replace('{label}', row.period_label));
  const metrics = escapeXml(
    t('student.certificate.svg.metricsLine')
      .replace('{hw}', String(row.homework_count))
      .replace('{ch}', String(row.challenge_count))
      .replace('{pct}', String(row.progress_percent)),
  );
  const brand = escapeXml(t('student.certificate.svg.brand'));
  const subtitle = escapeXml(t('student.certificate.svg.achievementSubtitle'));
  const lineThis = escapeXml(t('student.certificate.svg.lineThisCertificate'));
  const lineFor = escapeXml(t('student.certificate.svg.lineForRecipient'));
  const sigLeft = escapeXml(t('student.certificate.svg.signatureStudent'));
  const sigRight = escapeXml(t('student.certificate.svg.signatureBrand'));
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="980" viewBox="0 0 1400 980">
  <rect width="1400" height="980" fill="#f8fafc"/>
  <rect x="36" y="36" width="1328" height="908" rx="34" fill="white" stroke="${bg}" stroke-width="12"/>
  <rect x="76" y="88" width="1248" height="140" rx="26" fill="${bg}"/>
  <text x="700" y="150" text-anchor="middle" font-size="54" font-weight="700" fill="#1f2937">${brand}</text>
  <text x="700" y="198" text-anchor="middle" font-size="28" font-weight="600" fill="#334155">${subtitle}</text>

  <text x="700" y="320" text-anchor="middle" font-size="42" font-weight="700" fill="#111827">${title}</text>
  <text x="700" y="390" text-anchor="middle" font-size="30" font-weight="600" fill="#374151">${lineThis}</text>
  <text x="700" y="450" text-anchor="middle" font-size="50" font-weight="700" fill="#4f46e5">${name}</text>
  <text x="700" y="510" text-anchor="middle" font-size="30" font-weight="600" fill="#374151">${lineFor}</text>

  <text x="700" y="600" text-anchor="middle" font-size="28" font-weight="500" fill="#334155">${period}</text>
  <text x="700" y="648" text-anchor="middle" font-size="24" font-weight="500" fill="#334155">${metrics}</text>
  <text x="700" y="696" text-anchor="middle" font-size="24" font-weight="500" fill="#334155">${message}</text>

  <line x1="140" y1="820" x2="560" y2="820" stroke="#94a3b8" stroke-width="2" />
  <line x1="840" y1="820" x2="1260" y2="820" stroke="#94a3b8" stroke-width="2" />
  <text x="350" y="856" text-anchor="middle" font-size="22" fill="#475569">${sigLeft}</text>
  <text x="1050" y="856" text-anchor="middle" font-size="22" fill="#475569">${sigRight}</text>
</svg>`;
}

async function certificatePngDataUrl(
  row: KidsAchievementCertificate,
  studentName: string,
  t: (key: string) => string,
): Promise<string> {
  const svg = certificateSvg(row, studentName, t);
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error(t('student.certificate.errorImage')));
      el.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = 1400;
    canvas.height = 980;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error(t('student.certificate.errorCanvas'));
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
  t,
}: {
  certificates: KidsAchievementCertificate[];
  studentName: string;
  t: (key: string) => string;
}) {
  const onDownloadPng = async (row: KidsAchievementCertificate) => {
    const dataUrl = await certificatePngDataUrl(row, studentName, t);
    const name =
      row.period_key === 'weekly'
        ? t('student.certificate.downloadPngWeekly')
        : t('student.certificate.downloadPngMonthly');
    triggerDownload(dataUrl, name);
  };

  const onDownloadPdf = async (row: KidsAchievementCertificate) => {
    const dataUrl = await certificatePngDataUrl(row, studentName, t);
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const pad = 24;
    doc.addImage(dataUrl, 'PNG', pad, pad, pageW - pad * 2, pageH - pad * 2, undefined, 'FAST');
    const fname =
      row.period_key === 'weekly'
        ? t('student.certificate.downloadPdfWeekly')
        : t('student.certificate.downloadPdfMonthly');
    doc.save(fname);
  };

  if (!certificates.length) return null;
  return (
    <section className="rounded-3xl border-2 border-indigo-200 bg-white/90 p-5 shadow-lg dark:border-indigo-900/40 dark:bg-gray-950/80">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-logo flex items-center gap-2 text-xl font-black text-indigo-900 dark:text-indigo-100">
          <Trophy className="h-5 w-5" aria-hidden /> {t('student.dashboard.certificatesTitle')}
        </h2>
        <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
          {t('student.dashboard.certificatesBadge')}
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
                {row.earned ? t('student.dashboard.certEarned') : t('student.dashboard.certInProgress')}
              </span>
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">{row.message}</p>
            <p className="mt-2 text-xs font-bold text-slate-700 dark:text-slate-200">
              {t('student.dashboard.certHomeworkChallenge')
                .replace('{hw}', String(row.homework_count))
                .replace('{ch}', String(row.challenge_count))}
            </p>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/80 dark:bg-gray-900/70">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-amber-400 transition-[width] duration-700"
                style={{ width: `${Math.max(6, Math.min(100, row.progress_percent || 0))}%` }}
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
              <span>
                {t('student.dashboard.certSteps')
                  .replace('{total}', String(row.total_count))
                  .replace('{target}', String(row.target_count))}
              </span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                {row.period_label}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Medal className="h-3.5 w-3.5" aria-hidden />
              {t('student.dashboard.certLevel').replace('{level}', certificateLevelLabel(row.level, t))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  void onDownloadPng(row);
                }}
                className="rounded-xl border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-black text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-200"
              >
                {t('student.dashboard.downloadPng')}
              </button>
              <button
                type="button"
                onClick={() => {
                  void onDownloadPdf(row);
                }}
                className="rounded-xl border border-fuchsia-300 bg-fuchsia-50 px-3 py-1.5 text-xs font-black text-fuchsia-700 transition hover:bg-fuchsia-100 dark:border-fuchsia-700 dark:bg-fuchsia-950/40 dark:text-fuchsia-200"
              >
                {t('student.dashboard.downloadPdf')}
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
  const { t } = useKidsI18n();
  const gp = user.growth_points ?? 0;
  const bar = growthBarFraction(gp);
  const stage = user.growth_stage;
  const studentName =
    `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || t('student.dashboard.defaultName');

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="relative overflow-hidden rounded-[2rem] border-4 border-white/80 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-amber-400 p-1 shadow-2xl shadow-fuchsia-500/25 dark:border-violet-900/60 dark:from-violet-800 dark:via-fuchsia-800 dark:to-amber-700">
        <div className="rounded-[1.5rem] bg-white/95 px-5 py-6 dark:bg-gray-950/95 sm:px-8 sm:py-8">
          <p className="text-center text-xs font-black uppercase tracking-[0.25em] text-fuchsia-600 dark:text-fuchsia-400">
            {t('student.dashboard.cornerSubtitle')}
          </p>
          <h1 className="font-logo mt-2 text-center text-3xl font-black text-violet-950 dark:text-white sm:text-4xl">
            {t('student.dashboard.greeting').replace(
              '{name}',
              user.first_name || t('student.dashboard.greetingHeroFallback'),
            )}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-center text-sm font-medium text-slate-600 dark:text-gray-300">
            {t('student.dashboard.heroBody')}
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
                    {t('student.dashboard.growthLabel')}{' '}
                    <strong>{gp}</strong>
                    {' · '}
                    {growthNextHint(gp, t)}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </header>

      {roadmap ? (
        <RoadmapStrip milestones={roadmap.milestones} pathPrefix={pathPrefix} t={t} />
      ) : null}
      <AchievementCertificates certificates={certificates} studentName={studentName} t={t} />

      <section className="rounded-3xl border-2 border-fuchsia-200 bg-white/90 p-5 shadow-lg dark:border-fuchsia-900/40 dark:bg-gray-950/80">
        <h2 className="font-logo flex items-center gap-2 text-xl font-black text-fuchsia-900 dark:text-fuchsia-100">
          <Backpack className="h-5 w-5" aria-hidden /> {t('student.dashboard.classesTitle')}
        </h2>
        {loading ? (
          <p className="mt-3 animate-pulse text-sm font-medium text-gray-500">
            {t('student.dashboard.classesLoading')}
          </p>
        ) : classes.length === 0 ? (
          <p className="mt-3 text-sm font-medium text-gray-600 dark:text-gray-400">
            {t('student.dashboard.classesEmpty')}
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
            <Target className="h-5 w-5" aria-hidden /> {t('student.dashboard.challengesTitle')}
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-600 dark:text-gray-300">
            {t('student.dashboard.challengesBody')}
          </p>
          <Link
            href={`${pathPrefix}/ogrenci/projeler`}
            className="mt-4 flex min-h-12 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-amber-500 px-6 py-3 text-center text-sm font-black text-white shadow-md shadow-fuchsia-500/25 transition hover:brightness-105"
          >
            {t('student.dashboard.challengesCta')}
          </Link>
        </div>
      </section>

      <div className="flex justify-center">
        <div className="flex w-full max-w-xl flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href={`${pathPrefix}/ogrenci/yol`}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border-2 border-violet-300 bg-violet-50 px-6 py-3 text-sm font-black text-violet-900 transition hover:bg-violet-100 dark:border-violet-700 dark:bg-violet-950/60 dark:text-violet-100 dark:hover:bg-violet-900/60 sm:w-auto"
          >
            <Map className="mr-1 h-4 w-4" aria-hidden /> {t('student.dashboard.navRoadmap')}
          </Link>
          <Link
            href={`${pathPrefix}/ogrenci/oyun-merkezi`}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border-2 border-emerald-300 bg-emerald-50 px-6 py-3 text-sm font-black text-emerald-900 transition hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100 dark:hover:bg-emerald-900/50 sm:w-auto"
          >
            <Gamepad2 className="mr-1 h-4 w-4" aria-hidden /> {t('student.dashboard.navGameCenter')}
          </Link>
        </div>
      </div>
    </div>
  );
}
