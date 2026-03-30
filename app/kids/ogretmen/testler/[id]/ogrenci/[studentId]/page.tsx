'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import { kidsClassTestStudentReport, kidsGetTest } from '@/src/lib/kids-api';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';

type StudentReportData = Awaited<ReturnType<typeof kidsClassTestStudentReport>>;

export default function KidsTeacherTestStudentDetailPage() {
  const params = useParams();
  const testId = Number(params.id);
  const studentId = Number(params.studentId);
  const router = useRouter();
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<StudentReportData | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      router.replace(kidsLoginPortalHref(pathPrefix, 'ogretmen'));
      return;
    }
    if (!Number.isFinite(testId) || testId <= 0 || !Number.isFinite(studentId) || studentId <= 0) {
      router.replace(`${pathPrefix}/ogretmen/testler`);
      return;
    }
    void (async () => {
      setLoading(true);
      try {
        const test = await kidsGetTest(testId);
        const detail = await kidsClassTestStudentReport(test.kids_class, test.id, studentId);
        setReport(detail);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Öğrenci detayı yüklenemedi');
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, user, testId, studentId, router, pathPrefix]);

  const wrongCount = useMemo(() => {
    if (!report?.attempt) return 0;
    return Math.max(0, report.attempt.total_questions - report.attempt.total_correct);
  }, [report]);

  function formatDateTime(value: string | null): string {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('tr-TR');
  }

  function formatSolveDuration(seconds: number | null): string {
    if (seconds == null) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins <= 0) return `${secs} sn`;
    return secs === 0 ? `${mins} dk` : `${mins} dk ${secs} sn`;
  }

  function escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
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
      toast.error('Yazdırma başlatılamadı.');
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

  function buildExport(): { html: string; fileName: string } | null {
    if (!report) return null;
    const r = report;
    const logoUrl = `${window.location.origin}/favicon.svg`;
    const fileSafe = (value: string) =>
      value
        .trim()
        .toLowerCase()
        .replaceAll(/\s+/g, '-')
        .replaceAll(/[^a-z0-9\-_]/g, '');
    const questionRows = r.questions
      .map(
        (q) =>
          `<tr>
            <td>${q.order}</td>
            <td>${escapeHtml(q.selected_choice_key || 'Boş')}</td>
            <td>${escapeHtml(q.correct_choice_key || '—')}</td>
            <td>${q.selected_choice_key ? (q.is_correct ? 'Doğru' : 'Yanlış') : 'Cevap yok'}</td>
          </tr>`,
      )
      .join('');
    const reportTitle = `${r.class_name} - ${r.test_title} - ${r.student.name} Ogrenci Detayi`;
    const html = `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><title>${escapeHtml(reportTitle)}</title>
<style>
body{font-family:Arial,sans-serif;padding:24px;color:#111} h1,h2{margin:0 0 10px}
.top{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:8px;margin-bottom:12px}
.top img{width:56px;height:56px}
table{width:100%;border-collapse:collapse;margin-top:8px} th,td{border:1px solid #ddd;padding:8px;font-size:12px;text-align:left}
</style></head><body>
<div class="top"><img src="${logoUrl}" alt="Logo"><div><h1>${escapeHtml(reportTitle)}</h1><div>Marifetli Kids</div></div></div>
<p><b>Skor:</b> ${r.attempt ? `${r.attempt.score.toFixed(2)}/100` : '—'}</p>
<p><b>Sure:</b> ${r.attempt ? escapeHtml(formatSolveDuration(r.attempt.duration_seconds)) : '—'}</p>
<h2>Soru Bazli Detay</h2>
<table><thead><tr><th>Soru</th><th>Isaretlenen</th><th>Dogru</th><th>Durum</th></tr></thead><tbody>${questionRows}</tbody></table>
</body></html>`;
    const fileName = `ogrenci-raporu-${fileSafe(r.class_name)}-${fileSafe(r.test_title)}-${r.student.id}.html`;
    return { html, fileName };
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

  if (authLoading || loading) return <p className="text-center text-sm">Yükleniyor…</p>;
  if (!report) return <p className="text-center text-sm">Öğrenci detayı bulunamadı.</p>;
  const actionBtnClass =
    'inline-flex items-center rounded-lg border border-violet-300 bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 shadow-sm transition hover:bg-violet-50 dark:border-violet-700 dark:bg-gray-900 dark:text-violet-200 dark:hover:bg-violet-950/40';
  const primaryBtnClass =
    'inline-flex items-center rounded-lg bg-fuchsia-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-fuchsia-500';

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-logo text-2xl font-bold text-violet-950 dark:text-violet-50">
          {report.student.name} · Öğrenci Detayı
        </h1>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={onPrint}
            className={actionBtnClass}
          >
            Yazdır
          </button>
          <button
            type="button"
            onClick={onDownloadHtml}
            className={primaryBtnClass}
          >
            İndir (HTML)
          </button>
          <Link
            href={`${pathPrefix}/ogretmen/testler/${testId}`}
            className={actionBtnClass}
          >
            ← Rapor
          </Link>
        </div>
      </div>
      <div className="hidden items-center gap-2 rounded-lg border border-violet-200 bg-white p-2 print:flex dark:border-violet-800 dark:bg-gray-900/70">
        <img src="/favicon.svg" alt="Marifetli logo" className="h-8 w-8" />
        <p className="text-sm font-bold">Marifetli Kids - Ogrenci Raporu</p>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-300">{report.test_title}</p>

      {report.attempt ? (
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-violet-200 bg-white p-3 dark:border-violet-800 dark:bg-gray-900/70">
            <p className="text-xs text-slate-500">Skor</p>
            <p className="text-xl font-black">{report.attempt.score.toFixed(2)}/100</p>
          </div>
          <div className="rounded-xl border border-violet-200 bg-white p-3 dark:border-violet-800 dark:bg-gray-900/70">
            <p className="text-xs text-slate-500">Doğru / Yanlış</p>
            <p className="text-xl font-black">
              {report.attempt.total_correct} / {wrongCount}
            </p>
          </div>
          <div className="rounded-xl border border-violet-200 bg-white p-3 dark:border-violet-800 dark:bg-gray-900/70">
            <p className="text-xs text-slate-500">Süre</p>
            <p className="text-xl font-black">{formatSolveDuration(report.attempt.duration_seconds)}</p>
          </div>
          <div className="rounded-xl border border-violet-200 bg-white p-3 dark:border-violet-800 dark:bg-gray-900/70">
            <p className="text-xs text-slate-500">Teslim</p>
            <p className="text-sm font-semibold">{formatDateTime(report.attempt.submitted_at)}</p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          Bu öğrenci testi henüz göndermemiş.
        </div>
      )}

      <section className="rounded-xl border border-violet-200 bg-white p-3 dark:border-violet-800 dark:bg-gray-900/70">
        <h2 className="mb-2 text-sm font-bold">Soru Bazlı Detay</h2>
        <ul className="space-y-2">
          {report.questions.map((q) => (
            <li key={q.question_id} className="rounded-lg border border-violet-100 p-3 dark:border-violet-800">
              <p className="text-sm font-semibold">
                {q.order}. {q.stem}
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                İşaretlenen: {q.selected_choice_key || 'Boş'} · Doğru: {q.correct_choice_key || '—'} ·{' '}
                <span className={q.selected_choice_key ? (q.is_correct ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300') : ''}>
                  {q.selected_choice_key ? (q.is_correct ? 'Doğru' : 'Yanlış') : 'Cevap yok'}
                </span>
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
