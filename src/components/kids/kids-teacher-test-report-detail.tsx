'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, ChevronDown, FileCode, FileSpreadsheet, FileText, MessageCircle, Play, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { kidsClassTestReport, type KidsTest, type KidsTestQuestion } from '@/src/lib/kids-api';
import { useKidsI18n } from '@/src/providers/kids-language-provider';

export type KidsTeacherReportData = Awaited<ReturnType<typeof kidsClassTestReport>>;

const R = 34;
const CIRC = 2 * Math.PI * R;

function ProgressRing({
  percent,
  label,
  strokeClass,
}: {
  percent: number;
  label: string;
  strokeClass: string;
}) {
  const pct = Math.min(100, Math.max(0, percent));
  const dashOffset = CIRC * (1 - pct / 100);
  return (
    <div className="relative h-[76px] w-[76px] shrink-0">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 80 80" aria-hidden>
        <circle cx="40" cy="40" r={R} fill="none" className="text-zinc-200 dark:text-zinc-700" stroke="currentColor" strokeWidth="7" />
        <circle
          cx="40"
          cy="40"
          r={R}
          fill="none"
          className={strokeClass}
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-base font-black leading-none text-violet-900 dark:text-violet-100">{Math.round(pct)}%</span>
        <span className="mt-0.5 max-w-16 text-center text-[7px] font-black uppercase leading-tight text-zinc-500 dark:text-zinc-400">
          {label}
        </span>
      </div>
    </div>
  );
}

type Props = {
  report: KidsTeacherReportData;
  test: KidsTest | null;
  testId: number;
  pathPrefix: string;
  embedded?: boolean;
};

export function KidsTeacherTestReportDetail({
  report,
  test,
  testId,
  pathPrefix,
  embedded = false,
}: Props) {
  const { t, language } = useKidsI18n();
  const [openStudentId, setOpenStudentId] = useState<number | null>(null);

  const statByQuestionId = useMemo(() => new Map(report.question_stats.map((s) => [s.question_id, s])), [report]);

  const completionPct =
    report.students_total > 0 ? Math.round((report.students_submitted / report.students_total) * 100) : 0;
  const avgPct = Math.round(Math.min(100, Math.max(0, report.average_score)));
  const classWideAvgPct = useMemo(() => {
    const sum = report.students.reduce((acc, s) => acc + s.score, 0);
    if (report.students_total <= 0) return 0;
    return Math.round(Math.min(100, Math.max(0, sum / report.students_total)));
  }, [report.students, report.students_total]);

  function formatSolveDuration(seconds: number | null): string {
    if (seconds == null) return t('tests.report.noDuration');
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins <= 0) return `${secs} sn`;
    return secs === 0 ? `${mins} dk` : `${mins} dk ${secs} sn`;
  }

  function formatDateTime(value: string | null): string {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleString(language === 'tr' ? 'tr-TR' : language === 'ge' ? 'de-DE' : 'en-US');
  }

  function escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function buildExport(): { html: string; fileName: string } | null {
    const r = report;
    const logoUrl = `${window.location.origin}/favicon.svg`;
    const fileSafe = (value: string) =>
      value
        .trim()
        .toLowerCase()
        .replaceAll(/\s+/g, '-')
        .replaceAll(/[^a-z0-9\-_]/g, '');
    const studentRows = r.students
      .map(
        (s) =>
          `<tr>
            <td>${escapeHtml(s.student_name)}</td>
            <td>${s.total_correct}/${s.total_questions}</td>
            <td>${s.score.toFixed(2)}/100</td>
            <td>${escapeHtml(formatSolveDuration(s.duration_seconds))}</td>
          </tr>`,
      )
      .join('');
    const questionRows = r.question_stats
      .map(
        (q) =>
          `<tr>
            <td>${q.order}</td>
            <td>${q.correct_count}/${q.attempt_count}</td>
            <td>%${(q.success_rate * 100).toFixed(1)}</td>
          </tr>`,
      )
      .join('');
    const reportTitle = `${r.class_name} - ${r.title} Rapor`;
    const sumScores = r.students.reduce((acc, s) => acc + s.score, 0);
    const classWideAvg = r.students_total > 0 ? sumScores / r.students_total : 0;
    const html = `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><title>${escapeHtml(reportTitle)}</title>
<style>
body{font-family:Arial,sans-serif;padding:24px;color:#111} h1,h2{margin:0 0 10px}
.top{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:8px;margin-bottom:12px}
.top img{width:56px;height:56px}
table{width:100%;border-collapse:collapse;margin-top:8px} th,td{border:1px solid #ddd;padding:8px;font-size:12px;text-align:left}
.cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:10px 0 16px}
@media(min-width:640px){.cards{grid-template-columns:repeat(4,minmax(0,1fr))}}
.card{border:1px solid #ddd;padding:10px;border-radius:8px}
</style></head><body>
<div class="top"><img src="${logoUrl}" alt="Logo"><div><h1>${escapeHtml(reportTitle)}</h1><div>Marifetli Kids</div></div></div>
<div class="cards">
<div class="card"><b>${escapeHtml(t('tests.report.totalStudents'))}:</b> ${r.students_total}</div>
<div class="card"><b>${escapeHtml(t('tests.report.submittedStudents'))}:</b> ${r.students_submitted}</div>
<div class="card"><b>${escapeHtml(t('tests.report.averageScore'))}:</b> ${r.average_score.toFixed(2)}/100<br><small>${escapeHtml(t('tests.report.avgAmongSubmittersHint'))}</small></div>
<div class="card"><b>${escapeHtml(t('tests.report.classWideAverageLabel'))}:</b> ${classWideAvg.toFixed(2)}/100<br><small>${escapeHtml(t('tests.report.classWideAverageHint'))}</small></div>
</div>
<h2>${escapeHtml(t('tests.report.studentResults'))}</h2>
<table><thead><tr><th>${escapeHtml(t('tests.report.thStudent'))}</th><th>${escapeHtml(t('tests.report.thCorrect'))}</th><th>${escapeHtml(t('tests.report.thScore'))}</th><th>${escapeHtml(t('tests.report.thDuration'))}</th></tr></thead><tbody>${studentRows}</tbody></table>
<h2 style="margin-top:18px">${escapeHtml(t('tests.report.questionRates'))}</h2>
<table><thead><tr><th>${escapeHtml(t('tests.report.thQuestion'))}</th><th>${escapeHtml(t('tests.report.thAttempts'))}</th><th>${escapeHtml(t('tests.report.thSuccess'))}</th></tr></thead><tbody>${questionRows}</tbody></table>
</body></html>`;
    const fileName = `rapor-${fileSafe(r.class_name)}-${fileSafe(r.title)}-${r.test_id}.html`;
    return { html, fileName };
  }

  function onPrint() {
    const built = buildExport();
    if (!built) return;
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
      iframe.remove();
      toast.error(t('tests.report.printStartFailed'));
      return;
    }
    doc.open();
    doc.write(built.html);
    doc.close();
    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      window.setTimeout(() => iframe.remove(), 1000);
    };
  }

  function onDownloadHtml() {
    const built = buildExport();
    if (!built) return;
    const blob = new Blob([built.html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = built.fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadReportCsv() {
    const r = report;
    const header = ['student', 'correct', 'total', 'score', 'duration'];
    const srows = r.students.map((s) => [
      s.student_name,
      String(s.total_correct),
      String(s.total_questions),
      s.score.toFixed(2),
      formatSolveDuration(s.duration_seconds),
    ]);
    const qheader = ['question_order', 'correct_count', 'attempt_count', 'success_pct'];
    const qrows = r.question_stats.map((q) => [
      String(q.order),
      String(q.correct_count),
      String(q.attempt_count),
      (q.success_rate * 100).toFixed(1),
    ]);
    const esc = (cell: string) => `"${cell.replaceAll('"', '""')}"`;
    const lines = [
      ['class', r.class_name],
      ['test', r.title],
      [],
      header.join(','),
      ...srows.map((row) => row.map(esc).join(',')),
      [],
      qheader.join(','),
      ...qrows.map((row) => row.map(esc).join(',')),
    ];
    const body = lines.map((line) => (Array.isArray(line) ? line.join(',') : line)).join('\n');
    const blob = new Blob([`\uFEFF${body}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapor-${r.test_id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function questionTitle(q: KidsTestQuestion): string {
    const topic = q.topic?.trim();
    if (topic) return topic;
    return t('tests.report.questionLabel').replace('{n}', String(q.order));
  }

  const sortedQuestions = test ? [...test.questions].sort((a, b) => a.order - b.order) : [];

  const wrapClass = embedded ? 'relative space-y-5 pb-24' : 'relative min-h-[calc(100dvh-4rem)] pb-28';

  return (
    <div className={wrapClass} id="kids-teacher-report-detail">
      <div className={embedded ? 'space-y-5' : 'mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6'}>
        <div className="flex flex-col gap-4 rounded-[1.25rem] border border-violet-100/90 bg-white p-4 shadow-[0_8px_30px_-12px_rgba(124,58,237,0.18)] dark:border-violet-900/50 dark:bg-zinc-900/85 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-violet-600 dark:text-violet-300">
                {t('tests.report.pageTitleSuffix')}
              </p>
              <h2 className="font-logo mt-1 text-lg font-black leading-tight text-slate-900 dark:text-white sm:text-xl">
                {t('tests.report.classAndTest').replace('{className}', report.class_name).replace('{testTitle}', report.title)}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <button
                type="button"
                onClick={onPrint}
                title={t('tests.report.print')}
                className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-slate-200 bg-white text-rose-600 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-rose-400"
                aria-label={t('tests.report.print')}
              >
                <FileText className="h-5 w-5" strokeWidth={2.25} />
              </button>
              <button
                type="button"
                onClick={downloadReportCsv}
                title={t('tests.report.exportCsv')}
                className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-slate-200 bg-white text-emerald-600 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-emerald-400"
                aria-label={t('tests.report.exportCsv')}
              >
                <FileSpreadsheet className="h-5 w-5" strokeWidth={2.25} />
              </button>
              <button
                type="button"
                onClick={onDownloadHtml}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-violet-200 bg-violet-50 px-4 py-2 text-xs font-bold text-violet-800 transition hover:bg-violet-100 dark:border-violet-700 dark:bg-violet-950/50 dark:text-violet-200 dark:hover:bg-violet-900/40"
              >
                <FileCode className="h-5 w-5 shrink-0 text-violet-600 dark:text-violet-300" strokeWidth={2.25} aria-hidden />
                {t('tests.report.downloadHtml')}
              </button>
              {!embedded ? (
                <Link
                  href={`${pathPrefix}/ogretmen/testler/raporlar`}
                  className="rounded-full border-2 border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-slate-200"
                >
                  {t('tests.report.backTests')}
                </Link>
              ) : null}
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-lg border border-violet-200 bg-white p-2 print:flex dark:border-violet-800 dark:bg-gray-900/70">
            <img src="/favicon.svg" alt="Marifetli logo" className="h-8 w-8" />
            <p className="text-sm font-bold">{t('tests.report.printHeader')}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
              <div className="w-1 shrink-0 rounded-full bg-violet-600" aria-hidden />
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300">
                  <Users className="h-6 w-6" strokeWidth={2.25} />
                </span>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {t('tests.report.totalStudents')}
                  </p>
                  <p className="text-2xl font-black text-violet-900 dark:text-violet-100">{report.students_total}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
              <div className="w-1 shrink-0 rounded-full bg-fuchsia-500" aria-hidden />
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-950/50 dark:text-fuchsia-300">
                  <Play className="h-6 w-6" strokeWidth={2.25} />
                </span>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {t('tests.report.participation')}
                  </p>
                  <p className="text-2xl font-black text-fuchsia-900 dark:text-fuchsia-100">
                    {report.students_submitted} / {report.students_total}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
              <div className="w-1 shrink-0 rounded-full bg-amber-400" aria-hidden />
              <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {t('tests.report.generalSuccess')}
                  </p>
                  <p className="text-2xl font-black text-amber-900 dark:text-amber-100">%{avgPct}</p>
                  <p className="mt-1 text-[10px] font-semibold leading-snug text-slate-500 dark:text-slate-400">
                    {t('tests.report.avgAmongSubmittersHint')}
                  </p>
                  <p className="mt-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    {t('tests.report.classWideAverageLine').replace('{pct}', String(classWideAvgPct))}
                  </p>
                </div>
                <ProgressRing percent={avgPct} label={t('tests.report.gaugeSuccess')} strokeClass="text-amber-500" />
              </div>
            </div>

            <div className="flex gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
              <div className="w-1 shrink-0 rounded-full bg-violet-600" aria-hidden />
              <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {t('tests.report.completion')}
                  </p>
                  <p className="text-2xl font-black text-violet-900 dark:text-violet-100">%{completionPct}</p>
                </div>
                <ProgressRing percent={completionPct} label={t('tests.report.gaugeDone')} strokeClass="text-violet-500" />
              </div>
            </div>
          </div>

          <details
            open
            className="group rounded-[1.25rem] border border-slate-200/90 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 sm:px-5 sm:py-4 [&::-webkit-details-marker]:hidden">
              <h3 className="text-sm font-black uppercase tracking-wide text-slate-800 dark:text-slate-100">
                {t('tests.report.questionAnalysisTitle')}
              </h3>
              <ChevronDown
                className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180 dark:text-slate-500"
                aria-hidden
              />
            </summary>
            <div className="border-t border-slate-200/90 px-4 pb-4 pt-1 dark:border-zinc-600 sm:px-5 sm:pb-5">
              <div className="mb-3 flex justify-end">
                <a
                  href="#report-test-details"
                  className="text-xs font-black text-violet-600 underline-offset-2 hover:underline dark:text-violet-400"
                >
                  {t('tests.report.viewAll')}
                </a>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {sortedQuestions.map((q) => {
                  const st = statByQuestionId.get(q.id);
                  const attempt = st?.attempt_count ?? 0;
                  const correct = st?.correct_count ?? 0;
                  const rate = st?.success_rate ?? 0;
                  const pct = Math.round(rate * 100);
                  const wrong = Math.max(0, attempt - correct);
                  const correctW = attempt > 0 ? (correct / attempt) * 100 : 0;
                  const wrongW = attempt > 0 ? (wrong / attempt) * 100 : 0;
                  return (
                    <div
                      key={q.id}
                      className="rounded-2xl border border-slate-200/80 bg-[#F8F9FA]/90 p-3 dark:border-zinc-600 dark:bg-zinc-800/40"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[11px] font-black text-slate-500 dark:text-slate-400">
                          {t('tests.report.questionLabel').replace('{n}', String(q.order))}
                        </span>
                        <span className="text-sm font-black text-violet-700 dark:text-violet-300">%{pct}</span>
                      </div>
                      <div
                        className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-zinc-700"
                        role="img"
                        aria-label={t('tests.report.questionDistributionAria').replace('{correct}', String(correct)).replace('{wrong}', String(wrong)).replace('{attempt}', String(attempt))}
                      >
                        {attempt > 0 ? (
                          <>
                            <div className="bg-emerald-500 transition-all" style={{ width: `${correctW}%` }} />
                            <div className="bg-rose-400 transition-all dark:bg-rose-500/90" style={{ width: `${wrongW}%` }} />
                          </>
                        ) : null}
                      </div>
                      <p className="mt-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        {t('tests.report.correctWrongCounts').replace('{correct}', String(correct)).replace('{wrong}', String(wrong))}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </details>

          {test ? (
            <details
              open
              id="report-test-details"
              className="group scroll-mt-24 rounded-[1.25rem] border border-slate-200/90 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 sm:px-5 sm:py-4 [&::-webkit-details-marker]:hidden">
                <h3 className="text-sm font-black uppercase tracking-wide text-slate-800 dark:text-slate-100">
                  {t('tests.report.testDetailsAnswers')}
                </h3>
                <ChevronDown
                  className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180 dark:text-slate-500"
                  aria-hidden
                />
              </summary>
              <div className="border-t border-slate-200/90 px-4 pb-4 pt-2 dark:border-zinc-600 sm:px-5 sm:pb-5">
              <div className="grid gap-4 lg:grid-cols-2">
                {sortedQuestions.map((q) => (
                  <div
                    key={q.id}
                    className="relative rounded-2xl border border-slate-200/90 bg-[#F8F9FA]/50 p-4 dark:border-zinc-600 dark:bg-zinc-800/30"
                  >
                    <div className="flex gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-sm font-black text-white shadow-md shadow-violet-500/30">
                        {q.order}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-slate-900 dark:text-white">{questionTitle(q)}</p>
                        <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{q.stem}</p>
                      </div>
                    </div>
                    <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                      {q.choices.map((c) => {
                        const isCorrect = c.key === q.correct_choice_key;
                        return (
                          <li
                            key={`${q.id}-${c.key}`}
                            className={`relative flex items-center justify-between gap-2 rounded-xl border-2 px-3 py-2.5 text-sm ${
                              isCorrect
                                ? 'border-emerald-400 bg-emerald-50 font-semibold text-emerald-900 dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-100'
                                : 'border-slate-200/90 bg-white text-slate-700 dark:border-zinc-600 dark:bg-zinc-900/60 dark:text-slate-200'
                            }`}
                          >
                            <span>
                              <span className="font-black text-violet-600 dark:text-violet-400">{c.key})</span> {c.text}
                            </span>
                            {isCorrect ? (
                              <Check className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
              </div>
            </details>
          ) : null}

          <details
            open
            className="group rounded-[1.25rem] border border-slate-200/90 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 sm:px-5 sm:py-4 [&::-webkit-details-marker]:hidden">
              <h3 className="text-sm font-black uppercase tracking-wide text-slate-800 dark:text-slate-100">
                {t('tests.report.studentResults')}
              </h3>
              <ChevronDown
                className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180 dark:text-slate-500"
                aria-hidden
              />
            </summary>
            <div className="border-t border-slate-200/90 px-4 pb-4 pt-2 dark:border-zinc-600 sm:px-5 sm:pb-5">
            {report.students.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('tests.report.noStudentSubmission')}</p>
            ) : (
              <ul className="space-y-2">
                {report.students.map((s) => {
                  const isOpen = openStudentId === s.student_id;
                  return (
                    <li
                      key={s.student_id}
                      className="overflow-hidden rounded-2xl border border-slate-200/90 bg-[#F8F9FA]/60 dark:border-zinc-600 dark:bg-zinc-800/40"
                    >
                      <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                          <button
                            type="button"
                            aria-expanded={isOpen}
                            aria-label={t('tests.report.toggleStudentRow')}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-violet-600 transition hover:bg-violet-100/80 dark:text-violet-400 dark:hover:bg-violet-950/50"
                            onClick={() =>
                              setOpenStudentId((prev) => (prev === s.student_id ? null : s.student_id))
                            }
                          >
                            <ChevronDown
                              className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                              aria-hidden
                            />
                          </button>
                          <span className="text-sm font-bold text-slate-900 dark:text-white">{s.student_name}</span>
                          <Link
                            href={`${pathPrefix}/ogretmen/testler/${testId}/ogrenci/${s.student_id}`}
                            className="inline-flex rounded-full bg-violet-600 px-3 py-1 text-[11px] font-black text-white shadow-sm"
                          >
                            {t('tests.report.studentDetail')}
                          </Link>
                        </div>
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          className="w-full rounded-xl py-1.5 text-left text-xs font-semibold text-violet-700 sm:w-auto sm:text-right dark:text-violet-300"
                          onClick={() =>
                            setOpenStudentId((prev) => (prev === s.student_id ? null : s.student_id))
                          }
                        >
                          {s.total_correct}/{s.total_questions} · {s.score.toFixed(2)}/100 ·{' '}
                          {formatSolveDuration(s.duration_seconds)}
                        </button>
                      </div>
                      {isOpen ? (
                        <div className="border-t border-slate-200 px-4 py-2 text-xs text-slate-600 dark:border-zinc-600 dark:text-slate-300">
                          <p>
                            {t('tests.report.startedAt')}: {formatDateTime(s.started_at)}
                          </p>
                          <p>
                            {t('tests.report.submittedAt')}: {formatDateTime(s.submitted_at)}
                          </p>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
            </div>
          </details>
      </div>

      <Link
        href={`${pathPrefix}/mesajlar`}
        className="print:hidden fixed bottom-6 right-6 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/40 transition hover:brightness-105 sm:bottom-8 sm:right-8"
        aria-label={t('tests.report.messagesFab')}
      >
        <MessageCircle className="h-7 w-7" strokeWidth={2.25} />
      </Link>
    </div>
  );
}
