'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import {
  kidsParentFreeChallengesOverview,
  kidsParentReviewFreeChallenge,
  type KidsParentPendingFreeChallengeItem,
} from '@/src/lib/kids-api';
import {
  KidsCard,
  KidsPanelMax,
  KidsPrimaryButton,
  KidsSecondaryButton,
} from '@/src/components/kids/kids-ui';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';

type Tab = 'pending' | 'history';

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

function historyOutcomeTr(status: string): string {
  switch (status) {
    case 'active':
      return 'Onaylandı · devam ediyor';
    case 'ended':
      return 'Onaylandı · sona erdi';
    case 'rejected':
      return 'Reddedildi';
    default:
      return challengeStatusTr(status);
  }
}

function childLabel(child: KidsParentPendingFreeChallengeItem['child']): string {
  if (!child) return 'Çocuk';
  const n = [child.first_name, child.last_name].filter(Boolean).join(' ').trim();
  return n || `Öğrenci #${child.id}`;
}

export default function KidsParentFreeChallengesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();

  const [tab, setTab] = useState<Tab>(() =>
    searchParams.get('tab') === 'history' ? 'history' : 'pending',
  );
  const [pending, setPending] = useState<KidsParentPendingFreeChallengeItem[]>([]);
  const [history, setHistory] = useState<KidsParentPendingFreeChallengeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [rejectForId, setRejectForId] = useState<number | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  const basePath = `${pathPrefix}/veli/yarismalar`;

  useEffect(() => {
    const t = searchParams.get('tab') === 'history' ? 'history' : 'pending';
    setTab(t);
  }, [searchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await kidsParentFreeChallengesOverview();
      setPending(d.pending);
      setHistory(d.history);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Liste yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(kidsLoginPortalHref(pathPrefix, 'veli'));
      return;
    }
    if (user.role === 'student') {
      router.replace(`${pathPrefix}/ogrenci/panel`);
      return;
    }
    if (user.role !== 'parent') {
      router.replace(kidsLoginPortalHref(pathPrefix));
      return;
    }
    void load();
  }, [authLoading, user, router, pathPrefix, load]);

  const setTabNavigate = useCallback(
    (t: Tab) => {
      setTab(t);
      const q = t === 'history' ? '?tab=history' : '';
      router.replace(`${basePath}${q}`, { scroll: false });
    },
    [router, basePath],
  );

  const pendingCount = pending.length;
  const historyCount = history.length;

  if (authLoading || !user || user.role !== 'parent') {
    return (
      <KidsPanelMax>
        <p className="text-center text-violet-800 dark:text-violet-200">Yükleniyor…</p>
      </KidsPanelMax>
    );
  }

  return (
    <KidsPanelMax className="max-w-5xl">
      <div className="mb-6">
        <Link
          href={`${pathPrefix}/veli/panel`}
          className="inline-flex items-center gap-2 text-sm font-bold text-violet-700 hover:text-fuchsia-600 dark:text-violet-300"
        >
          <span aria-hidden>←</span> Veli paneline dön
        </Link>
      </div>

      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="font-logo text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
            Serbest yarışmalar
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-gray-400">
            Solda onay bekleyen öneriler; sağda daha önce verdiğin onay veya red kayıtları. Büyük ekranda iki sütun yan
            yana; telefonda üstteki sekmelerle geçiş yapabilirsin.
          </p>
        </div>
        <KidsSecondaryButton
          type="button"
          disabled={loading}
          onClick={() => void load()}
          className="w-full shrink-0 sm:mt-1 sm:w-auto"
        >
          {loading ? 'Yenileniyor…' : 'Listeyi yenile'}
        </KidsSecondaryButton>
      </header>

      <div className="mb-6 flex gap-2 lg:hidden">
        <button
          type="button"
          onClick={() => setTabNavigate('pending')}
          className={`rounded-full px-4 py-2 text-sm font-bold transition ${
            tab === 'pending'
              ? 'bg-sky-600 text-white shadow-md dark:bg-sky-500'
              : 'border-2 border-sky-300/80 bg-white text-sky-950 dark:border-sky-700 dark:bg-sky-950/30 dark:text-sky-50'
          }`}
        >
          Bekleyen ({pendingCount})
        </button>
        <button
          type="button"
          onClick={() => setTabNavigate('history')}
          className={`rounded-full px-4 py-2 text-sm font-bold transition ${
            tab === 'history'
              ? 'bg-violet-600 text-white shadow-md dark:bg-violet-500'
              : 'border-2 border-violet-300/80 bg-white text-violet-950 dark:border-violet-700 dark:bg-violet-950/30 dark:text-violet-50'
          }`}
        >
          Geçmiş ({historyCount})
        </button>
      </div>

      <KidsCard className="border-sky-200/60 dark:border-sky-900/40">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-8">
          <section
            className={
              tab === 'pending' ? 'block min-w-0' : 'hidden min-w-0 lg:block'
            }
          >
            <h2 className="font-logo mb-4 text-lg font-bold text-sky-950 dark:text-sky-50">
              Onay bekleyenler
              <span className="ml-2 text-sm font-semibold text-sky-700 dark:text-sky-300">
                ({pendingCount})
              </span>
            </h2>
            {loading ? (
              <p className="text-sm text-slate-600 dark:text-gray-400">Yükleniyor…</p>
            ) : pendingCount === 0 ? (
              <p className="rounded-2xl border border-sky-200/80 bg-white/80 px-4 py-6 text-sm text-slate-600 dark:border-sky-800 dark:bg-sky-950/20 dark:text-gray-400">
                Bekleyen serbest yarışma önerisi yok.
              </p>
            ) : (
              <ul className="space-y-4">
                {pending.map(({ challenge: ch, child }) => (
                  <li
                    key={ch.id}
                    className="rounded-2xl border-2 border-sky-200/80 bg-white/90 p-4 dark:border-sky-800 dark:bg-sky-950/25"
                  >
                    <p className="text-xs font-bold uppercase tracking-wide text-sky-800 dark:text-sky-200">
                      {childLabel(child)}
                    </p>
                    <p className="mt-1 font-bold text-slate-900 dark:text-white">{ch.title}</p>
                    <p className="text-xs text-slate-500 dark:text-gray-400">{challengeStatusTr(ch.status)}</p>
                    {ch.starts_at || ch.ends_at ? (
                      <p className="mt-2 text-xs text-slate-600 dark:text-gray-400">
                        {ch.starts_at ? `Başlangıç: ${new Date(ch.starts_at).toLocaleString('tr-TR')}` : null}
                        {ch.starts_at && ch.ends_at ? ' · ' : null}
                        {ch.ends_at ? `Bitiş: ${new Date(ch.ends_at).toLocaleString('tr-TR')}` : null}
                      </p>
                    ) : null}
                    {rejectForId === ch.id ? (
                      <div className="mt-3 space-y-2">
                        <label className="block text-xs font-bold text-sky-900 dark:text-sky-100">
                          Red nedeni (isteğe bağlı)
                        </label>
                        <textarea
                          value={rejectNote}
                          onChange={(e) => setRejectNote(e.target.value)}
                          rows={2}
                          maxLength={600}
                          className="w-full rounded-xl border-2 border-sky-200 bg-white px-3 py-2 text-sm dark:border-sky-800 dark:bg-slate-900"
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={reviewingId === ch.id}
                            className="inline-flex min-h-12 items-center justify-center rounded-full bg-rose-600 px-6 text-sm font-bold text-white shadow-md transition hover:bg-rose-700 disabled:pointer-events-none disabled:opacity-50 dark:hover:bg-rose-500"
                            onClick={() => {
                              setReviewingId(ch.id);
                              void (async () => {
                                try {
                                  await kidsParentReviewFreeChallenge(ch.id, {
                                    decision: 'reject',
                                    rejection_note: rejectNote,
                                  });
                                  toast.success('Öneri reddedildi.');
                                  setRejectForId(null);
                                  setRejectNote('');
                                  await load();
                                } catch (e) {
                                  toast.error(e instanceof Error ? e.message : 'Reddedilemedi');
                                } finally {
                                  setReviewingId(null);
                                }
                              })();
                            }}
                          >
                            {reviewingId === ch.id ? '…' : 'Reddi gönder'}
                          </button>
                          <KidsSecondaryButton
                            type="button"
                            disabled={reviewingId === ch.id}
                            onClick={() => {
                              setRejectForId(null);
                              setRejectNote('');
                            }}
                          >
                            İptal
                          </KidsSecondaryButton>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <KidsPrimaryButton
                          type="button"
                          disabled={reviewingId !== null}
                          onClick={() => {
                            setReviewingId(ch.id);
                            void (async () => {
                              try {
                                await kidsParentReviewFreeChallenge(ch.id, { decision: 'approve' });
                                toast.success('Yarışma onaylandı.');
                                await load();
                              } catch (e) {
                                toast.error(e instanceof Error ? e.message : 'Onaylanamadı');
                              } finally {
                                setReviewingId(null);
                              }
                            })();
                          }}
                        >
                          {reviewingId === ch.id ? '…' : 'Onayla'}
                        </KidsPrimaryButton>
                        <KidsSecondaryButton
                          type="button"
                          disabled={reviewingId !== null}
                          onClick={() => {
                            setRejectForId(ch.id);
                            setRejectNote('');
                          }}
                        >
                          Reddet
                        </KidsSecondaryButton>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section
            className={
              tab === 'history' ? 'block min-w-0' : 'hidden min-w-0 lg:block'
            }
          >
            <h2 className="font-logo mb-4 text-lg font-bold text-slate-900 dark:text-white">
              Geçmiş
              <span className="ml-2 text-sm font-semibold text-slate-600 dark:text-gray-400">
                ({historyCount})
              </span>
            </h2>
            <p className="mb-4 text-sm text-slate-600 dark:text-gray-400">
              Senin onayladığın veya reddettiğin serbest yarışmalar (son kayıtlar).
            </p>
            {loading ? (
              <p className="text-sm text-slate-600 dark:text-gray-400">Yükleniyor…</p>
            ) : historyCount === 0 ? (
              <p className="rounded-2xl border border-violet-200/80 bg-violet-50/50 px-4 py-6 text-sm text-slate-600 dark:border-violet-800 dark:bg-violet-950/20 dark:text-gray-400">
                Henüz geçmiş kayıt yok.
              </p>
            ) : (
              <ul className="space-y-3">
                {history.map(({ challenge: ch, child }) => (
                  <li
                    key={ch.id}
                    className="rounded-2xl border border-violet-200/80 bg-white/90 px-4 py-3 dark:border-violet-800 dark:bg-violet-950/20"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-violet-800 dark:text-violet-200">
                          {childLabel(child)}
                        </p>
                        <p className="font-semibold text-slate-900 dark:text-white">{ch.title}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-bold text-violet-900 dark:bg-violet-900/50 dark:text-violet-100">
                        {historyOutcomeTr(ch.status)}
                      </span>
                    </div>
                    {ch.reviewed_at ? (
                      <p className="mt-2 text-xs text-slate-500 dark:text-gray-400">
                        Karar: {new Date(ch.reviewed_at).toLocaleString('tr-TR')}
                      </p>
                    ) : null}
                    {ch.status === 'rejected' && (ch.parent_rejection_note || '').trim() ? (
                      <p className="mt-2 text-xs text-rose-800 dark:text-rose-200">
                        <span className="font-semibold">Not:</span> {ch.parent_rejection_note}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </KidsCard>
    </KidsPanelMax>
  );
}
