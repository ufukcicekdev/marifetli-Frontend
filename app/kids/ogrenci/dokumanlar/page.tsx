'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, FileImage, FileText, FolderOpen, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';
import { kidsStudentListDocuments, type KidsClassDocument } from '@/src/lib/kids-api';
import { KidsPanelMax } from '@/src/components/kids/kids-ui';
import { useKidsI18n } from '@/src/providers/kids-language-provider';

function localeForLang(lang: string): string {
  if (lang === 'en') return 'en-GB';
  if (lang === 'ge') return 'de-DE';
  return 'tr-TR';
}

function formatDocumentAgo(iso: string, t: (k: string) => string, lang: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  const now = Date.now();
  const diffMs = Math.max(0, now - d.getTime());
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return t('lessonDocs.justNow');
  if (min < 60) return t('lessonDocs.minutesAgo').replace('{n}', String(min));
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return t('lessonDocs.hoursAgo').replace('{n}', String(hrs));
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  const startYesterday = new Date(startToday);
  startYesterday.setDate(startYesterday.getDate() - 1);
  if (d >= startYesterday && d < startToday) {
    const time = d.toLocaleTimeString(localeForLang(lang), { hour: '2-digit', minute: '2-digit' });
    return t('lessonDocs.yesterdayTime').replace('{time}', time);
  }
  const days = Math.max(1, Math.floor(min / 1440));
  return t('lessonDocs.daysAgo').replace('{n}', String(days));
}

function typeLabel(kind: string, t: (k: string) => string): string {
  if (kind === 'pdf') return t('lessonDocs.typePdf');
  if (kind === 'word') return t('lessonDocs.typeWord');
  if (kind === 'image') return t('lessonDocs.typeImage');
  if (kind === 'presentation') return t('lessonDocs.typePresentation');
  return t('lessonDocs.typeFile');
}

function TypeIcon({ kind }: { kind: string }) {
  const cls = 'h-5 w-5 text-white';
  if (kind === 'image') return <FileImage className={cls} aria-hidden />;
  return <FileText className={cls} aria-hidden />;
}

function iconBg(kind: string): string {
  if (kind === 'pdf') return 'bg-rose-500';
  if (kind === 'word') return 'bg-blue-600';
  if (kind === 'image') return 'bg-amber-500';
  return 'bg-violet-500';
}

export default function KidsStudentDocumentsPage() {
  const router = useRouter();
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();
  const { t, language } = useKidsI18n();
  const [rows, setRows] = useState<KidsClassDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await kidsStudentListDocuments();
      setRows(list);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('lessonDocs.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'student') {
      router.replace(kidsLoginPortalHref(pathPrefix, 'ogrenci'));
      return;
    }
    void load();
  }, [authLoading, user, router, pathPrefix, load]);

  const groups = useMemo(() => {
    const m = new Map<string, KidsClassDocument[]>();
    for (const doc of rows) {
      const key = (doc.folder_name || '').trim();
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(doc);
    }
    const keys = [...m.keys()].sort((a, b) => {
      if (!a && b) return 1;
      if (a && !b) return -1;
      return a.localeCompare(b, 'tr');
    });
    return keys.map((key) => ({ key, docs: m.get(key)! }));
  }, [rows]);

  if (authLoading || loading) {
    return (
      <KidsPanelMax>
        <p className="py-12 text-center text-sm text-slate-600 dark:text-slate-400">{t('common.loading')}</p>
      </KidsPanelMax>
    );
  }
  if (!user || user.role !== 'student') return null;

  return (
    <KidsPanelMax className="pb-16">
      <header className="mb-8">
        <h1 className="font-logo text-2xl font-bold text-violet-950 dark:text-violet-50 md:text-3xl">
          {t('lessonDocs.studentTitle')}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t('lessonDocs.studentSubtitle')}</p>
      </header>
      {rows.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-violet-200 py-16 text-center text-sm text-slate-500 dark:border-violet-800 dark:text-slate-400">
          {t('lessonDocs.emptyStudent')}
        </div>
      ) : (
        <div className="space-y-10">
          {groups.map(({ key, docs }) => (
            <section key={key || '__none'}>
              <h2 className="flex items-center gap-2 border-b border-violet-200 pb-2 text-sm font-bold text-violet-900 dark:border-violet-800 dark:text-violet-100">
                <FolderOpen className="h-4 w-4 shrink-0 text-violet-500" aria-hidden />
                {key ? key : t('lessonDocs.noFolder')}
              </h2>
              <ul className="mt-4 space-y-4">
                {docs.map((doc) => (
                  <li
                    key={doc.id}
                    className="rounded-2xl border border-violet-200/90 bg-white p-4 shadow-sm dark:border-violet-800 dark:bg-gray-900/60"
                  >
                    <div className="flex gap-3">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconBg(doc.file_kind)}`}
                      >
                        <TypeIcon kind={doc.file_kind} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          <span>{typeLabel(doc.file_kind, t)}</span>
                          <span>·</span>
                          <span>{formatDocumentAgo(doc.created_at, t, language)}</span>
                        </div>
                        <p className="mt-1 font-bold text-slate-900 dark:text-white">{doc.title}</p>
                        {doc.description ? (
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{doc.description}</p>
                        ) : null}
                        <p className="mt-2 inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
                          <GraduationCap className="h-3.5 w-3.5" aria-hidden />
                          {doc.class_name}
                        </p>
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-xs font-bold text-white shadow-md"
                        >
                          <Download className="h-3.5 w-3.5" />
                          {t('lessonDocs.download')}
                        </a>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </KidsPanelMax>
  );
}
