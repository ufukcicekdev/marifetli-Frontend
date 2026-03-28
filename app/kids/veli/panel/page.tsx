'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import {
  kidsParentChildrenOverview,
  kidsParentSwitchToStudent,
  type KidsParentChildOverview,
} from '@/src/lib/kids-api';
import { KidsCard, KidsPanelMax, KidsPrimaryButton, KidsSecondaryButton } from '@/src/components/kids/kids-ui';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';

function challengeStatusTr(status: string): string {
  const m: Record<string, string> = {
    pending_teacher: 'Öğretmen onayı bekliyor',
    pending_parent: 'Veli onayı bekliyor',
    rejected: 'Reddedildi',
    active: 'Devam ediyor',
    ended: 'Sona erdi',
  };
  return m[status] ?? status;
}

export default function KidsParentPanelPage() {
  const router = useRouter();
  const { user, loading, pathPrefix, setUserFromServer } = useKidsAuth();
  const [switchingId, setSwitchingId] = useState<number | null>(null);
  const [overview, setOverview] = useState<KidsParentChildOverview[] | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    setOverviewError(null);
    try {
      const { children } = await kidsParentChildrenOverview();
      setOverview(children);
    } catch (e) {
      setOverviewError(e instanceof Error ? e.message : 'Özet alınamadı');
      setOverview(null);
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(kidsLoginPortalHref(pathPrefix, 'veli'));
      return;
    }
    // Veli → çocuk geçişi: önce state öğrenci olur, sayfa hâlâ /veli/panel üzerindeyken
    // burada login’e atarsak router.push(ogrenci/panel) ezilir. Öğrenciyi panele yönlendir.
    if (user.role === 'student') {
      router.replace(`${pathPrefix}/ogrenci/panel`);
      return;
    }
    if (user.role !== 'parent') {
      router.replace(kidsLoginPortalHref(pathPrefix));
      return;
    }
    void loadOverview();
  }, [user, loading, pathPrefix, router, loadOverview]);

  async function goToChildPanel(studentId: number) {
    setSwitchingId(studentId);
    try {
      const childUser = await kidsParentSwitchToStudent(studentId);
      setUserFromServer(childUser);
      toast.success('Çocuk paneline geçildi.');
      router.replace(`${pathPrefix}/ogrenci/panel`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Geçiş yapılamadı');
    } finally {
      setSwitchingId(null);
    }
  }

  if (loading || !user || user.role !== 'parent') {
    return (
      <KidsPanelMax>
        <p className="text-center text-violet-800 dark:text-violet-200">Yükleniyor…</p>
      </KidsPanelMax>
    );
  }

  const childrenList = overview ?? [];
  const showFromMeFallback = overview === null && overviewError && (user.linked_students?.length ?? 0) > 0;

  return (
    <KidsPanelMax>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-logo text-2xl font-bold text-slate-900 dark:text-white">Veli paneli</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-gray-400">
            Çocuklarının sınıflarını, büyüme puanını, rozetleri ve öğretmen geri bildirimlerinin kısa özetini burada
            görürsün. Çocuğun e-postası olmasa da <strong>Veli girişi</strong> ile panele geçirebilirsin.
          </p>
        </div>
        <KidsSecondaryButton
          type="button"
          disabled={overviewLoading}
          onClick={() => {
            void loadOverview();
          }}
        >
          {overviewLoading ? 'Yenileniyor…' : 'Özeti yenile'}
        </KidsSecondaryButton>
      </div>
      <KidsCard tone="emerald" className="mt-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-logo text-base font-bold text-emerald-950 dark:text-emerald-50">Oyun suresi kontrolu</h2>
            <p className="mt-2 text-sm text-emerald-900/85 dark:text-emerald-100/85">
              Gunluk dakika limiti, saat araligi ve oyun bazli izinleri cocuk bazinda ayarla.
            </p>
          </div>
          <Link
            href={`${pathPrefix}/veli/ebeveyn-kontrolleri`}
            className="inline-flex min-h-12 w-full shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 px-8 text-sm font-bold text-white shadow-lg transition hover:from-emerald-500 hover:to-teal-500 sm:w-auto"
          >
            Ebeveyn kontrolleri
          </Link>
        </div>
      </KidsCard>

      {overviewError ? (
        <p className="mt-4 rounded-xl border border-amber-300/80 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
          {overviewError}
        </p>
      ) : null}

      {overviewLoading && childrenList.length === 0 ? (
        <p className="mt-6 text-center text-violet-800 dark:text-violet-200">Çocuk özetleri yükleniyor…</p>
      ) : null}

      {!overviewLoading && childrenList.length === 0 && !showFromMeFallback && !overviewError ? (
        <KidsCard tone="amber" className="mt-6">
          <p className="text-sm text-amber-900/85 dark:text-amber-100/85">
            Henüz bağlı çocuk özeti yok. Öğretmen davetiyle kayıt tamamlandıysa sayfayı yenile; sorun sürerse destek
            ile iletişime geç.
          </p>
        </KidsCard>
      ) : null}

      {showFromMeFallback ? (
        <KidsCard tone="amber" className="mt-6">
          <p className="text-sm font-medium text-amber-950 dark:text-amber-50">Çocuk listesi (özet yüklenemedi)</p>
          <ul className="mt-3 space-y-2">
            {(user.linked_students ?? []).map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-slate-900 dark:text-white">
                  {c.first_name} {c.last_name}
                </span>
                <KidsPrimaryButton
                  type="button"
                  className="!min-h-10 !px-4 !text-xs"
                  disabled={switchingId !== null}
                  onClick={() => void goToChildPanel(c.id)}
                >
                  {switchingId === c.id ? '…' : 'Çocuk paneline geç'}
                </KidsPrimaryButton>
              </li>
            ))}
          </ul>
        </KidsCard>
      ) : null}

      <div className="mt-8 space-y-8">
        {childrenList.map((c) => {
          const pendingActions = c.pending_parent_actions ?? [];
          return (
            <KidsCard key={c.id} tone="amber" className="border-2 border-amber-200/90 dark:border-amber-800/60">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-logo text-xl font-bold text-slate-900 dark:text-white">
                    {c.first_name} {c.last_name}
                  </h2>
                  <p className="mt-1 text-sm text-amber-900/90 dark:text-amber-100/85">
                    Büyüme puanı:{' '}
                    <strong className="text-amber-950 dark:text-amber-50">{c.growth_points}</strong>
                    {c.growth_stage ? (
                      <>
                        {' '}
                        · <span className="font-semibold">{c.growth_stage.title}</span>
                        <span className="text-amber-800/90 dark:text-amber-200/80"> — {c.growth_stage.subtitle}</span>
                      </>
                    ) : null}
                  </p>
                  {c.student_login_name ? (
                    <p className="mt-1 text-xs text-amber-900/80 dark:text-amber-200/75">
                      (İsteğe bağlı) Kendi başına giriş:{' '}
                      <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono dark:bg-amber-900/50">
                        {c.student_login_name}
                      </code>
                    </p>
                  ) : null}
                </div>
                <KidsPrimaryButton
                  type="button"
                  className="shrink-0"
                  disabled={switchingId !== null}
                  onClick={() => void goToChildPanel(c.id)}
                >
                  {switchingId === c.id ? 'Geçiliyor…' : 'Çocuk paneline geç'}
                </KidsPrimaryButton>
              </div>

              {pendingActions.length > 0 ? (
                <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50/80 px-3 py-2 dark:border-violet-800 dark:bg-violet-950/40">
                  <p className="text-xs font-bold text-violet-900 dark:text-violet-100">Onay bekleyenler</p>
                  <p className="mt-2 text-sm text-violet-900 dark:text-violet-100">
                    {pendingActions.length} kayıt — detay ekranı bir sonraki sürümde açılacak.
                  </p>
                </div>
              ) : null}

              {c.classes.length > 0 ? (
                <div className="mt-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">Sınıflar</p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {c.classes.map((cl) => (
                      <li
                        key={cl.id}
                        className="rounded-full border border-amber-200/90 bg-white/90 px-3 py-1 text-xs font-medium text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-50"
                      >
                        {cl.name}
                        {cl.school_name ? (
                          <span className="text-amber-800/80 dark:text-amber-200/70"> · {cl.school_name}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {c.badges.length > 0 ? (
                <div className="mt-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                    Rozetler
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {c.badges.map((b) => (
                      <li
                        key={`${b.key}-${b.earned_at}`}
                        className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-2.5 py-1 text-xs text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-50"
                        title={b.earned_at}
                      >
                        {b.label || b.key}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="mt-4 text-xs text-amber-900/70 dark:text-amber-200/60">Henüz rozet yok.</p>
              )}

              {c.challenges.length > 0 ? (
                <div className="mt-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                    Yarışmalar
                  </p>
                  <ul className="mt-2 space-y-1.5 text-sm text-slate-800 dark:text-gray-200">
                    {c.challenges.map((ch, idx) => (
                      <li key={`${ch.title}-${idx}`}>
                        <span className="font-medium">{ch.title}</span>
                        <span className="text-slate-600 dark:text-gray-400">
                          {' '}
                          ({ch.class_name}) — {challengeStatusTr(ch.status)}
                          {ch.is_initiator ? ' · Öneren' : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="mt-5">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                  Projeler / geri bildirim
                </p>
                {c.assignments_recent.length === 0 ? (
                  <p className="mt-2 text-sm text-amber-900/75 dark:text-amber-100/70">
                    Görünen açık proje özeti yok.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {c.assignments_recent.map((a) => (
                      <li
                        key={a.id}
                        className="rounded-xl border border-amber-200/70 bg-white/85 px-3 py-2.5 dark:border-amber-800/50 dark:bg-gray-900/50"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-900 dark:text-white">{a.title}</span>
                          {a.got_teacher_star ? (
                            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Yıldız</span>
                          ) : null}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-gray-400">
                          {a.class_name}
                          {a.submission_closes_at
                            ? ` · Son teslim: ${new Date(a.submission_closes_at).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}`
                            : ''}
                        </p>
                        <p className="mt-1 text-xs text-slate-700 dark:text-gray-300">
                          Teslim: {a.rounds_submitted} / {a.submission_rounds} adım
                          {!a.has_submissions ? ' · Henüz teslim yok' : ''}
                          {a.has_submissions && a.awaiting_teacher_feedback
                            ? ' · Öğretmen geri bildirimi bekleniyor'
                            : ''}
                          {a.has_submissions && !a.awaiting_teacher_feedback && a.teacher_feedback_preview
                            ? ' · Geri bildirim geldi'
                            : ''}
                        </p>
                        {a.teacher_feedback_preview ? (
                          <p className="mt-2 rounded-lg bg-amber-100/60 px-2 py-1.5 text-xs italic text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
                            “{a.teacher_feedback_preview}”
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </KidsCard>
          );
        })}
      </div>
    </KidsPanelMax>
  );
}
