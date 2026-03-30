'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import { kidsClassTestReport, kidsGetTest, type KidsTest } from '@/src/lib/kids-api';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';

type ReportData = Awaited<ReturnType<typeof kidsClassTestReport>>;

export default function KidsTeacherTestReportPage() {
  const params = useParams();
  const testId = Number(params.id);
  const router = useRouter();
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();
  const [test, setTest] = useState<KidsTest | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [openStudentId, setOpenStudentId] = useState<number | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      router.replace(kidsLoginPortalHref(pathPrefix, 'ogretmen'));
      return;
    }
    if (!Number.isFinite(testId) || testId <= 0) {
      router.replace(`${pathPrefix}/ogretmen/testler`);
      return;
    }
    void (async () => {
      setLoading(true);
      try {
        const testRow = await kidsGetTest(testId);
        const rep = await kidsClassTestReport(testRow.kids_class, testRow.id);
        setTest(testRow);
        setReport(rep);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Rapor yüklenemedi');
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, user, testId, router, pathPrefix]);

  if (authLoading || loading) return <p className="text-center text-sm">Yükleniyor…</p>;
  if (!report) return <p className="text-center text-sm">Rapor bulunamadı.</p>;

  function formatSolveDuration(seconds: number | null): string {
    if (seconds == null) return 'Süre yok';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins <= 0) return `${secs} sn`;
    return secs === 0 ? `${mins} dk` : `${mins} dk ${secs} sn`;
  }

  function formatDateTime(value: string | null): string {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('tr-TR');
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
    const html = `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><title>${escapeHtml(reportTitle)}</title>
<style>
body{font-family:Arial,sans-serif;padding:24px;color:#111} h1,h2{margin:0 0 10px}
.top{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:8px;margin-bottom:12px}
.top img{width:56px;height:56px}
table{width:100%;border-collapse:collapse;margin-top:8px} th,td{border:1px solid #ddd;padding:8px;font-size:12px;text-align:left}
.cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:10px 0 16px}
.card{border:1px solid #ddd;padding:10px;border-radius:8px}
</style></head><body>
<div class="top"><img src="${logoUrl}" alt="Logo"><div><h1>${escapeHtml(reportTitle)}</h1><div>Marifetli Kids</div></div></div>
<div class="cards">
<div class="card"><b>Toplam öğrenci:</b> ${r.students_total}</div>
<div class="card"><b>Testi gönderen:</b> ${r.students_submitted}</div>
<div class="card"><b>Ortalama skor:</b> ${r.average_score.toFixed(2)}/100</div>
</div>
<h2>Öğrenci Sonuçları</h2>
<table><thead><tr><th>Öğrenci</th><th>Doğru</th><th>Puan</th><th>Süre</th></tr></thead><tbody>${studentRows}</tbody></table>
<h2 style="margin-top:18px">Soru Başarı Oranları</h2>
<table><thead><tr><th>Soru</th><th>Doğru/Deneme</th><th>Başarı</th></tr></thead><tbody>${questionRows}</tbody></table>
</body></html>`;
    const fileName = `rapor-${fileSafe(r.class_name)}-${fileSafe(r.title)}-${r.test_id}.html`;
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

  const actionBtnClass =
    'inline-flex min-h-10 items-center rounded-xl border border-violet-300 bg-white px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm transition hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-violet-300/60 dark:border-violet-700 dark:bg-gray-900 dark:text-violet-200 dark:hover:bg-violet-950/40';
  const primaryBtnClass =
    'inline-flex min-h-10 items-center rounded-xl bg-fuchsia-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/60';

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-logo text-2xl font-bold text-violet-950 dark:text-violet-50">{report.title} · Rapor</h1>
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
          <Link href={`${pathPrefix}/ogretmen/testler`} className={actionBtnClass}>
            ← Testler
          </Link>
        </div>
      </div>
      <div className="hidden items-center gap-2 rounded-lg border border-violet-200 bg-white p-2 print:flex dark:border-violet-800 dark:bg-gray-900/70">
        <img src="/favicon.svg" alt="Marifetli logo" className="h-8 w-8" />
        <p className="text-sm font-bold">Marifetli Kids - Test Raporu</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-violet-200 bg-white p-3 dark:border-violet-800 dark:bg-gray-900/70">
          <p className="text-xs text-slate-500">Toplam öğrenci</p>
          <p className="text-xl font-black">{report.students_total}</p>
        </div>
        <div className="rounded-xl border border-violet-200 bg-white p-3 dark:border-violet-800 dark:bg-gray-900/70">
          <p className="text-xs text-slate-500">Testi gönderen</p>
          <p className="text-xl font-black">{report.students_submitted}</p>
        </div>
        <div className="rounded-xl border border-violet-200 bg-white p-3 dark:border-violet-800 dark:bg-gray-900/70">
          <p className="text-xs text-slate-500">Ortalama skor (100 üzerinden)</p>
          <p className="text-xl font-black">{report.average_score.toFixed(2)}</p>
        </div>
      </div>
      <section className="rounded-xl border border-violet-200 bg-white p-3 dark:border-violet-800 dark:bg-gray-900/70">
        <h2 className="mb-2 text-sm font-bold">Öğrenci Sonuçları</h2>
        {report.students.length === 0 ? (
          <p className="text-xs text-slate-500">Henüz test gönderen öğrenci yok.</p>
        ) : (
          <ul className="space-y-2">
            {report.students.map((s) => {
              const isOpen = openStudentId === s.student_id;
              return (
                <li key={s.student_id} className="rounded-lg border border-violet-100 dark:border-violet-800">
                  <div className="flex items-center justify-between gap-2 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{s.student_name}</span>
                      <Link
                        href={`${pathPrefix}/ogretmen/testler/${testId}/ogrenci/${s.student_id}`}
                        className="inline-flex rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-bold text-violet-800 dark:bg-violet-900/40 dark:text-violet-200"
                      >
                        Öğrenci detayı
                      </Link>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpenStudentId((prev) => (prev === s.student_id ? null : s.student_id))}
                      className="text-xs text-slate-600 dark:text-slate-300"
                    >
                      {s.total_correct}/{s.total_questions} · {s.score.toFixed(2)}/100 · {formatSolveDuration(s.duration_seconds)} {isOpen ? '▲' : '▼'}
                    </button>
                  </div>
                  {isOpen ? (
                    <div className="border-t border-violet-100 px-3 py-2 text-xs text-slate-600 dark:border-violet-800 dark:text-slate-300">
                      <p>Başlama: {formatDateTime(s.started_at)}</p>
                      <p>Teslim: {formatDateTime(s.submitted_at)}</p>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <section className="rounded-xl border border-violet-200 bg-white p-3 dark:border-violet-800 dark:bg-gray-900/70">
        <h2 className="mb-2 text-sm font-bold">Soru Başarı Oranları</h2>
        <ul className="space-y-2">
          {report.question_stats.map((q) => (
            <li key={q.question_id} className="rounded-lg border border-violet-100 px-3 py-2 text-xs dark:border-violet-800">
              {q.order}. soru · {q.correct_count}/{q.attempt_count} doğru · %{(q.success_rate * 100).toFixed(1)}
            </li>
          ))}
        </ul>
      </section>
      {test ? (
        <section className="rounded-xl border border-violet-200 bg-white p-3 dark:border-violet-800 dark:bg-gray-900/70">
          <h2 className="mb-2 text-sm font-bold">Test Detayları</h2>
          <div className="space-y-3">
            {test.questions.map((q) => (
              <div key={q.id} className="rounded-lg border border-violet-100 px-3 py-2 dark:border-violet-800">
                <p className="text-sm font-semibold">
                  {q.order}. {q.stem}
                </p>
                <ul className="mt-1 grid gap-1 sm:grid-cols-2">
                  {q.choices.map((c) => (
                    <li
                      key={`${q.id}-${c.key}`}
                      className={`rounded-md px-2 py-1 text-xs ${
                        c.key === q.correct_choice_key
                          ? 'bg-emerald-100 font-bold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                          : 'bg-slate-50 text-slate-700 dark:bg-slate-900/60 dark:text-slate-300'
                      }`}
                    >
                      {c.key}) {c.text}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
