'use client';

import Link from 'next/link';
import NextImage from 'next/image';
import { jsPDF } from 'jspdf';
import { useEffect, useMemo, useState } from 'react';
import {
  Award,
  Backpack,
  BookOpen,
  CalendarDays,
  Download,
  Flag,
  FlaskConical,
  Gamepad2,
  GraduationCap,
  Image as ImageIcon,
  Leaf,
  Map,
  Medal,
  Rocket,
  Sparkles,
  Sprout,
  Star,
  Timer,
  TreePine,
} from 'lucide-react';
import {
  kidsClassLocationLine,
  kidsStudentAssignmentAllRoundsSubmitted,
  type KidsAchievementCertificate,
  type KidsAssignment,
  type KidsBadgeRoadmap,
  type KidsClass,
  type KidsRoadmapMilestone,
  type KidsUser,
} from '@/src/lib/kids-api';
import { localizedGrowthStageTitle } from '@/src/lib/kids-roadmap-i18n';
import { useKidsI18n } from '@/src/providers/kids-language-provider';

function milestoneIcon(icon: string): JSX.Element {
  if (icon === 'seed') return <Sprout className="h-6 w-6" aria-hidden />;
  if (icon === 'sprout') return <Leaf className="h-6 w-6" aria-hidden />;
  if (icon === 'tree') return <TreePine className="h-6 w-6" aria-hidden />;
  if (icon === 'star_tree') return <Sparkles className="h-6 w-6" aria-hidden />;
  if (icon === 'book') return <BookOpen className="h-6 w-6" aria-hidden />;
  if (icon === 'flag') return <Flag className="h-6 w-6" aria-hidden />;
  if (icon === 'medal_pick') return <Award className="h-6 w-6" aria-hidden />;
  if (icon === 'gamepad') return <Gamepad2 className="h-6 w-6" aria-hidden />;
  if (icon === 'flask') return <FlaskConical className="h-6 w-6" aria-hidden />;
  if (icon === 'gallery') return <ImageIcon className="h-6 w-6" aria-hidden />;
  return <Star className="h-6 w-6" aria-hidden />;
}

function growthNextHint(points: number, t: (key: string) => string): string {
  const p = Math.max(0, points || 0);
  if (p < 6) return t('student.dashboard.growthHint1');
  if (p < 16) return t('student.dashboard.growthHint2');
  if (p < 30) return t('student.dashboard.growthHint3');
  if (p < 50) return t('student.dashboard.growthHint4');
  if (p < 80) return t('student.dashboard.growthHint5');
  return t('student.dashboard.growthHint6');
}

/** Karşılama kartı sağındaki koç illüstrasyonu (Kids landing hero ile uyumlu). */
const PANEL_COACH_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDx9WDdHS0xLIjAHeEctnK7HhAwn-6oZDcy1cLNaETqoHpERPTrcpy4MO1tG6UmZDIeIsCVZVWsWtCUsuEYzUmfjMPVj92IiqYvmNoKPn_XytVf73-uqs9eX9Nc_dQE8G6ZhviQAsf1yv27PFVGXvwM_gN8_I07kQb_zIuRXTu539sqp_ndjsZhANonJDIX4wZfBFUSxH6eMX1sxjIQwFlGl_Pz2A6428GNdYUBtHl8JipofcaeGtGu9JiniM4YCzwiu_KowGQQiwq4';

function xpTierDisplay(gp: number): { cur: number; max: number } {
  const p = Math.max(0, gp || 0);
  if (p < 6) return { cur: p, max: 6 };
  if (p < 16) return { cur: p, max: 16 };
  if (p < 30) return { cur: p, max: 30 };
  if (p < 50) return { cur: p, max: 50 };
  if (p < 80) return { cur: p, max: 80 };
  const step = 50;
  const max = Math.ceil(p / step) * step;
  if (p >= max) return { cur: p, max: p + step };
  return { cur: p, max };
}

function pickFeaturedAssignment(assignments: KidsAssignment[]): KidsAssignment | null {
  const now = Date.now();
  const open = assignments.filter((a) => a.is_published && !kidsStudentAssignmentAllRoundsSubmitted(a));
  const timed = open
    .filter((a) => {
      const t = a.submission_closes_at ? new Date(a.submission_closes_at).getTime() : 0;
      return t > now;
    })
    .sort(
      (a, b) =>
        new Date(a.submission_closes_at!).getTime() - new Date(b.submission_closes_at!).getTime(),
    );
  if (timed.length) return timed[0]!;
  return open[0] ?? null;
}

function useSecondsUntil(iso: string | null): number | null {
  const [s, setS] = useState<number | null>(() =>
    iso ? Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000)) : null,
  );
  useEffect(() => {
    if (!iso) {
      setS(null);
      return;
    }
    const tick = () => setS(Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [iso]);
  return s;
}

function certificateLevelLabel(level: string, t: (key: string) => string): string {
  if (level === 'gold') return t('student.certificate.levelGold');
  if (level === 'silver') return t('student.certificate.levelSilver');
  if (level === 'bronze') return t('student.certificate.levelBronze');
  return level;
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
  logoDataUrl: string | null,
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
  const logoHref = logoDataUrl ? escapeXml(logoDataUrl) : '';
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="980" viewBox="0 0 1400 980">
  <defs>
    <linearGradient id="kidsBadgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#f97316" />
    </linearGradient>
  </defs>
  <rect width="1400" height="980" fill="#f8fafc"/>
  <rect x="36" y="36" width="1328" height="908" rx="34" fill="white" stroke="${bg}" stroke-width="12"/>
  <rect x="76" y="88" width="1248" height="92" rx="18" fill="${bg}"/>

  ${logoHref ? `<image href="${logoHref}" x="596" y="105" width="34" height="34" preserveAspectRatio="xMidYMid meet" />` : ''}
  <text x="628" y="132" text-anchor="start" font-family="Outfit, system-ui, -apple-system, Segoe UI, Arial, sans-serif" font-size="31" font-weight="600" letter-spacing="-0.35" fill="#111827">arifetli</text>
  <rect x="744" y="109" width="88" height="28" rx="9" fill="url(#kidsBadgeGrad)"/>
  <text x="788" y="128.5" text-anchor="middle" font-family="Outfit, system-ui, -apple-system, Segoe UI, Arial, sans-serif" font-size="13.5" font-weight="800" fill="white" letter-spacing="0.55">KIDS</text>

  <text x="700" y="157" text-anchor="middle" font-family="Outfit, system-ui, -apple-system, Segoe UI, Arial, sans-serif" font-size="12.5" font-weight="600" fill="#334155">${subtitle}</text>

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

let certificateLogoDataUrlCache: string | null | undefined;

async function certificateLogoDataUrl(): Promise<string | null> {
  if (certificateLogoDataUrlCache !== undefined) return certificateLogoDataUrlCache;
  try {
    const res = await fetch('/logo.png');
    if (!res.ok) {
      certificateLogoDataUrlCache = null;
      return null;
    }
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('logo_read_failed'));
      reader.readAsDataURL(blob);
    });
    certificateLogoDataUrlCache = dataUrl || null;
    return certificateLogoDataUrlCache;
  } catch {
    certificateLogoDataUrlCache = null;
    return null;
  }
}

async function certificatePngDataUrl(
  row: KidsAchievementCertificate,
  studentName: string,
  t: (key: string) => string,
): Promise<string> {
  const logoDataUrl = await certificateLogoDataUrl();
  const svg = certificateSvg(row, studentName, t, logoDataUrl);
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

  if (!certificates.length) {
    return (
      <section className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-md dark:border-zinc-800 dark:bg-zinc-900/90">
        <h2 className="font-logo text-lg font-black text-slate-900 dark:text-white">
          {t('student.dashboard.certificatesTitle')}
        </h2>
        <p className="mt-3 text-sm text-slate-500 dark:text-zinc-400">{t('student.dashboard.certificatesEmpty')}</p>
      </section>
    );
  }
  return (
    <section className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-md dark:border-zinc-800 dark:bg-zinc-900/90">
      <h2 className="font-logo text-lg font-black text-slate-900 dark:text-white">{t('student.dashboard.certificatesTitle')}</h2>
      <ul className="mt-5 flex flex-col gap-3">
        {certificates.map((row) => {
          const iconWrap =
            row.period_key === 'weekly'
              ? 'bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300'
              : 'bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-950/60 dark:text-fuchsia-300';
          return (
            <li
              key={row.period_key}
              className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/50"
            >
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${iconWrap}`}
                aria-hidden
              >
                {row.period_key === 'weekly' ? <Medal className="h-6 w-6" /> : <Star className="h-6 w-6 fill-current" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-logo text-base font-black text-slate-900 dark:text-white">{row.title}</p>
                <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-zinc-400">
                  <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {row.period_label}
                </p>
                <p className="mt-1 text-[11px] font-medium text-slate-600 dark:text-zinc-500">
                  {t('student.dashboard.certLevel').replace('{level}', certificateLevelLabel(row.level, t))}
                  {' · '}
                  {row.earned ? t('student.dashboard.certEarned') : t('student.dashboard.certInProgress')}
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <button
                  type="button"
                  title={t('student.dashboard.downloadPng')}
                  onClick={() => {
                    void onDownloadPng(row);
                  }}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-200 bg-violet-50 text-violet-700 transition hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-200"
                >
                  <Download className="h-5 w-5" aria-hidden />
                </button>
                <button
                  type="button"
                  title={t('student.dashboard.downloadPdf')}
                  onClick={() => {
                    void onDownloadPdf(row);
                  }}
                  className="hidden text-[10px] font-bold text-violet-600 underline sm:block dark:text-violet-400"
                >
                  PDF
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

type Props = {
  pathPrefix: string;
  user: KidsUser;
  classes: KidsClass[];
  assignments: KidsAssignment[];
  certificates: KidsAchievementCertificate[];
  roadmap: KidsBadgeRoadmap | null;
  loading: boolean;
};

const badgeCardShells = [
  'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
];

export function KidsStudentDashboardPlayful({
  pathPrefix,
  user,
  classes,
  assignments,
  certificates,
  roadmap,
  loading,
}: Props) {
  const { t } = useKidsI18n();
  const gp = user.growth_points ?? 0;
  const { cur: xpCur, max: xpMax } = xpTierDisplay(gp);
  const xpBarPct = Math.min(100, Math.round((xpCur / Math.max(1, xpMax)) * 100));
  const stage = user.growth_stage;
  const studentName =
    `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || t('student.dashboard.defaultName');

  const primaryClass = classes[0];
  const schoolLine = primaryClass ? kidsClassLocationLine(primaryClass) : null;
  const classmateCount = primaryClass?.student_count ?? 0;
  const extraClassmates = Math.max(0, classmateCount - 3);

  const topMilestones = useMemo(() => {
    if (!roadmap?.milestones?.length) return [];
    return [...roadmap.milestones].sort((a, b) => a.order - b.order).slice(0, 3);
  }, [roadmap]);

  const featured = useMemo(() => pickFeaturedAssignment(assignments), [assignments]);
  const countdownIso = featured?.submission_closes_at ?? null;
  const secLeft = useSecondsUntil(countdownIso);
  const hh = secLeft !== null ? String(Math.floor(secLeft / 3600)).padStart(2, '0') : '--';
  const mm = secLeft !== null ? String(Math.floor((secLeft % 3600) / 60)).padStart(2, '0') : '--';
  const ss = secLeft !== null ? String(secLeft % 60).padStart(2, '0') : '--';

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-1 pb-8 sm:px-2">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 shadow-md dark:border-zinc-800 dark:bg-zinc-900/90 md:p-8 lg:col-span-8">
          <div className="relative z-10 max-w-xl pr-0 md:pr-44">
            <h1 className="font-logo text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-4xl">
              {t('student.dashboard.greeting').replace(
                '{name}',
                user.first_name || t('student.dashboard.greetingHeroFallback'),
              )}{' '}
              <span aria-hidden>👋</span>
            </h1>
            <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600 dark:text-zinc-400">
              {t('student.dashboard.heroBodyPanel')}
            </p>
            <div className="mt-6 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300">
                <Rocket className="h-5 w-5" aria-hidden />
              </span>
              <span className="font-logo text-sm font-black text-violet-700 dark:text-violet-300">
                {localizedGrowthStageTitle(stage, t, 'student.dashboard.discoveryTraveler')}
              </span>
            </div>
            {stage?.subtitle ? (
              <p className="mt-1 text-xs font-medium text-slate-500 dark:text-zinc-500">{stage.subtitle}</p>
            ) : null}
            <div className="mt-5">
              <div className="relative h-4 overflow-hidden rounded-full bg-slate-200 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-linear-to-r from-violet-600 to-fuchsia-500 transition-[width] duration-700"
                  style={{ width: `${xpBarPct}%` }}
                />
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] font-black tabular-nums text-slate-800 drop-shadow-sm dark:text-white">
                  {xpCur} / {xpMax} XP
                </span>
              </div>
              <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-zinc-400">
                {t('student.dashboard.growthLabel')} <strong className="text-slate-800 dark:text-zinc-200">{gp}</strong>
                {' · '}
                {growthNextHint(gp, t)}
              </p>
            </div>
          </div>
          <div className="relative z-0 mt-8 flex justify-center md:absolute md:right-4 md:top-1/2 md:mt-0 md:w-[42%] md:-translate-y-1/2 md:justify-end">
            <div className="relative h-48 w-full max-w-[220px] overflow-hidden rounded-2xl bg-slate-900 shadow-inner md:h-56 md:max-w-none">
              <NextImage
                src={PANEL_COACH_IMAGE}
                alt=""
                fill
                className="object-cover object-top"
                sizes="(max-width: 1024px) 220px, 280px"
              />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-md dark:border-zinc-800 dark:bg-zinc-900/90 lg:col-span-4">
          {loading ? (
            <p className="animate-pulse text-sm text-slate-500">{t('student.dashboard.classesLoading')}</p>
          ) : !primaryClass ? (
            <p className="text-sm text-slate-600 dark:text-zinc-400">{t('student.dashboard.classesEmpty')}</p>
          ) : (
            <>
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-pink-100 text-pink-600 dark:bg-pink-950/50 dark:text-pink-300">
                  <GraduationCap className="h-7 w-7" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-logo text-lg font-black text-slate-900 dark:text-white">{primaryClass.name}</p>
                  <p className="mt-1 text-sm font-medium text-slate-500 dark:text-zinc-400">
                    {schoolLine || primaryClass.school?.name || '—'}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5 dark:border-zinc-800">
                <div className="flex -space-x-2">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-linear-to-br from-violet-200 to-fuchsia-300 text-xs font-black text-violet-900 dark:border-zinc-900 dark:from-violet-800 dark:to-fuchsia-700 dark:text-white"
                      aria-hidden
                    >
                      {String.fromCharCode(65 + i)}
                    </div>
                  ))}
                  {extraClassmates > 0 ? (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-xs font-black text-slate-700 dark:border-zinc-900 dark:bg-zinc-800 dark:text-zinc-200">
                      +{extraClassmates > 99 ? '99+' : extraClassmates}
                    </div>
                  ) : null}
                </div>
                <Link
                  href={`${pathPrefix}/ogrenci/projeler`}
                  className="text-sm font-bold text-violet-600 hover:underline dark:text-violet-400"
                >
                  {t('student.dashboard.classListLink')}
                </Link>
              </div>
              {classes.length > 1 ? (
                <p className="mt-3 text-xs text-slate-500 dark:text-zinc-500">
                  +{classes.length - 1} {t('student.dashboard.moreClassesHint')}
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-md dark:border-zinc-800 dark:bg-zinc-900/90">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-logo text-lg font-black text-slate-900 dark:text-white">
              {t('student.dashboard.badgesTitle')}
            </h2>
            <Link
              href={`${pathPrefix}/ogrenci/yol`}
              className="text-sm font-bold text-violet-600 hover:underline dark:text-violet-400"
            >
              {t('student.dashboard.badgesSeeAll')}
            </Link>
          </div>
          {topMilestones.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500 dark:text-zinc-400">{t('student.dashboard.badgesEmpty')}</p>
          ) : (
            <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {topMilestones.map((m, i) => (
                <li
                  key={m.key}
                  className="flex flex-col items-center rounded-2xl border border-slate-100 bg-slate-50/90 p-4 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950/50"
                >
                  <div
                    className={`flex h-16 w-16 items-center justify-center rounded-full ${badgeCardShells[i % badgeCardShells.length]}`}
                  >
                    <span className="scale-110">{milestoneIcon(m.icon)}</span>
                  </div>
                  <p className="mt-3 text-sm font-black text-slate-900 dark:text-white">{m.title}</p>
                  <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-zinc-500">
                    {m.unlocked ? t('student.dashboard.badgeUnlocked') : t('student.dashboard.badgeLocked')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <AchievementCertificates certificates={certificates} studentName={studentName} t={t} />
      </div>

      <section className="overflow-hidden rounded-3xl bg-linear-to-r from-violet-600 via-violet-600 to-indigo-700 p-6 shadow-xl md:p-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
              <Timer className="h-10 w-10 text-white" aria-hidden />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-logo text-xl font-black text-white md:text-2xl">
                  {t('student.dashboard.dailyChallengeTitle')}
                </h2>
                {countdownIso ? (
                  <span className="rounded-full bg-white/20 px-3 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
                    {t('student.dashboard.timeLimitedBadge')}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-lg font-black text-white md:text-xl">
                {featured?.title || t('student.dashboard.dailyChallengeFallbackTitle')}
              </p>
              <p className="mt-2 max-w-xl text-sm font-medium text-violet-100">
                {featured
                  ? t('student.dashboard.dailyChallengeBodyWithXp')
                  : t('student.dashboard.dailyChallengeFallbackBody')}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-5 lg:items-end">
            {countdownIso ? (
              <div className="flex gap-3">
                {[
                  { v: hh, lab: t('student.dashboard.countdownHour') },
                  { v: mm, lab: t('student.dashboard.countdownMinute') },
                  { v: ss, lab: t('student.dashboard.countdownSecond') },
                ].map((x) => (
                  <div key={x.lab} className="text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-900/40 text-lg font-black tabular-nums text-white md:h-16 md:w-16 md:text-xl">
                      {x.v}
                    </div>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-violet-200">{x.lab}</p>
                  </div>
                ))}
              </div>
            ) : null}
            <Link
              href={
                featured
                  ? `${pathPrefix}/ogrenci/proje/${featured.id}`
                  : `${pathPrefix}/ogrenci/projeler`
              }
              className="inline-flex min-h-12 w-full min-w-[200px] items-center justify-center rounded-full bg-white px-8 py-3 text-center text-sm font-black text-violet-700 shadow-lg transition hover:scale-[1.02] active:scale-[0.98] lg:w-auto"
            >
              {t('student.dashboard.dailyChallengeCta')}
            </Link>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
        <Link
          href={`${pathPrefix}/ogrenci/yol`}
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl border-2 border-violet-200 bg-violet-50 px-6 py-3 text-sm font-black text-violet-900 transition hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-100 sm:min-w-[200px] sm:flex-none"
        >
          <Map className="mr-2 h-4 w-4" aria-hidden /> {t('student.dashboard.navRoadmap')}
        </Link>
        <Link
          href={`${pathPrefix}/ogrenci/oyun-merkezi`}
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-6 py-3 text-sm font-black text-emerald-900 transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100 sm:min-w-[200px] sm:flex-none"
        >
          <Gamepad2 className="mr-2 h-4 w-4" aria-hidden /> {t('student.dashboard.navGameCenter')}
        </Link>
        <Link
          href={`${pathPrefix}/ogrenci/projeler`}
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl border-2 border-fuchsia-200 bg-fuchsia-50 px-6 py-3 text-sm font-black text-fuchsia-900 transition hover:bg-fuchsia-100 dark:border-fuchsia-900 dark:bg-fuchsia-950/30 dark:text-fuchsia-100 sm:min-w-[200px] sm:flex-none"
        >
          <Backpack className="mr-2 h-4 w-4" aria-hidden /> {t('student.dashboard.challengesTitle')}
        </Link>
      </div>
    </div>
  );
}
