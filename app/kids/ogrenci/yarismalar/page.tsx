'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import {
  kidsDatetimeLocalToIso,
  kidsProposePeerChallenge,
  kidsRespondPeerChallengeInvite,
  kidsStudentDashboard,
  kidsStudentPeerChallengesList,
  type KidsClass,
  type KidsPeerChallenge,
  type KidsPeerChallengeInviteRow,
  type KidsPeerChallengeStatus,
} from '@/src/lib/kids-api';
import { isPeerStudentChallengeWindowOpen } from '@/src/lib/kids-peer-challenge-time';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';
import { useKidsI18n } from '@/src/providers/kids-language-provider';
import { KidsDateTimeField } from '@/src/components/kids/kids-datetime-field';
import {
  KidsCard,
  KidsFormField,
  KidsPanelMax,
  KidsPrimaryButton,
  KidsSecondaryButton,
  KidsSelect,
  kidsInputClass,
  kidsTextareaClass,
  type KidsSelectOption,
} from '@/src/components/kids/kids-ui';

function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function peerChallengeStatusTr(s: KidsPeerChallengeStatus, t: (key: string) => string): string {
  switch (s) {
    case 'pending_teacher':
      return t('competitions.status.pendingTeacher');
    case 'pending_parent':
      return t('competitions.status.pendingParent');
    case 'rejected':
      return t('competitions.status.rejected');
    case 'active':
      return t('competitions.status.active');
    case 'ended':
      return t('competitions.status.ended');
    default:
      return s;
  }
}

function challengeScopeLabel(c: KidsPeerChallenge, t: (key: string) => string): string {
  return (c.peer_scope ?? 'class_peer') === 'free_parent'
    ? t('competitions.scope.free')
    : c.kids_class_name || t('competitions.scope.class');
}

export default function KidsStudentPeerChallengesPage() {
  const router = useRouter();
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();
  const { t, language } = useKidsI18n();
  const [classes, setClasses] = useState<KidsClass[]>([]);
  const [challenges, setChallenges] = useState<KidsPeerChallenge[]>([]);
  const [invites, setInvites] = useState<KidsPeerChallengeInviteRow[]>([]);
  const [allowFreeChallenge, setAllowFreeChallenge] = useState(true);
  const [loading, setLoading] = useState(true);
  const [competitionMode, setCompetitionMode] = useState<'class' | 'free'>('class');
  const [classId, setClassId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState('');
  const [submissionRounds, setSubmissionRounds] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [startsAtLocal, setStartsAtLocal] = useState('');
  const [endsAtLocal, setEndsAtLocal] = useState('');
  const [saving, setSaving] = useState(false);
  const [respondingId, setRespondingId] = useState<number | null>(null);

  const classSelectId = useId();
  const titleId = useId();
  const roundsId = useId();
  const startsId = useId();
  const endsId = useId();
  const dateDefaultsSet = useRef(false);
  const peerSubmissionRoundsOptions = useMemo<KidsSelectOption[]>(
    () =>
      [1, 2, 3, 4, 5].map((v) => ({
        value: String(v),
        label: `${v} ${t('competitions.challengeUnit')}`,
      })),
    [t],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dash, peer] = await Promise.all([
        kidsStudentDashboard(),
        kidsStudentPeerChallengesList(),
      ]);
      setClasses(dash.classes);
      setChallenges(peer.challenges);
      setInvites(peer.pending_invites);
      setAllowFreeChallenge(peer.allow_free_parent_challenge !== false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('competitions.listLoadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (competitionMode === 'free' && !allowFreeChallenge) {
      setCompetitionMode('class');
    }
  }, [competitionMode, allowFreeChallenge]);

  useEffect(() => {
    if (competitionMode !== 'class') return;
    if (classes.length === 1 && classId === '') {
      setClassId(String(classes[0].id));
    }
  }, [classes, classId, competitionMode]);

  useEffect(() => {
    if (dateDefaultsSet.current) return;
    dateDefaultsSet.current = true;
    const s = new Date();
    s.setHours(s.getHours() + 1, 0, 0, 0);
    const e = new Date(s);
    e.setDate(e.getDate() + 7);
    setStartsAtLocal(toDatetimeLocalValue(s));
    setEndsAtLocal(toDatetimeLocalValue(e));
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(kidsLoginPortalHref(pathPrefix, 'ogrenci'));
      return;
    }
    if (user.role !== 'student') {
      router.replace(kidsLoginPortalHref(pathPrefix));
      return;
    }
    void load();
  }, [authLoading, user, router, pathPrefix, load]);

  async function onPropose(e: React.FormEvent) {
    e.preventDefault();
    const cid = Number(classId);
    if (competitionMode === 'class' && (!Number.isFinite(cid) || cid <= 0)) {
      toast.error(t('competitions.mustSelectClass'));
      return;
    }
    if (!title.trim()) {
      toast.error(t('competitions.mustEnterTitle'));
      return;
    }
    if (!startsAtLocal || !endsAtLocal) {
      toast.error(t('competitions.mustSelectDates'));
      return;
    }
    const startsIso = kidsDatetimeLocalToIso(startsAtLocal);
    const endsIso = kidsDatetimeLocalToIso(endsAtLocal);
    if (!startsIso || !endsIso) {
      toast.error(t('competitions.mustSelectValidDatetime'));
      return;
    }
    const startMs = new Date(startsIso).getTime();
    const endMs = new Date(endsIso).getTime();
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
      toast.error(t('competitions.mustSelectValidDatetime'));
      return;
    }
    if (endMs <= startMs) {
      toast.error(t('competitions.endAfterStart'));
      return;
    }
    if (endMs - startMs < 30 * 60 * 1000) {
      toast.error(t('competitions.minDuration'));
      return;
    }
    if (endMs <= Date.now()) {
      toast.error(t('competitions.endInFuture'));
      return;
    }
    setSaving(true);
    try {
      await kidsProposePeerChallenge({
        peer_scope: competitionMode === 'free' ? 'free_parent' : 'class_peer',
        kids_class_id: competitionMode === 'class' ? cid : undefined,
        title: title.trim(),
        description,
        rules_or_goal: rules,
        submission_rounds: submissionRounds,
        starts_at: startsIso,
        ends_at: endsIso,
      });
      toast.success(
        competitionMode === 'free'
          ? t('competitions.sentToParent')
          : t('competitions.sentToTeacher'),
      );
      setTitle('');
      setDescription('');
      setRules('');
      setSubmissionRounds(1);
      const s = new Date();
      s.setHours(s.getHours() + 1, 0, 0, 0);
      const e = new Date(s);
      e.setDate(e.getDate() + 7);
      setStartsAtLocal(toDatetimeLocalValue(s));
      setEndsAtLocal(toDatetimeLocalValue(e));
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('competitions.sendFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function respondInvite(id: number, action: 'accept' | 'decline') {
    setRespondingId(id);
    try {
      await kidsRespondPeerChallengeInvite(id, action);
      toast.success(action === 'accept' ? t('competitions.joined') : t('competitions.declinedInvite'));
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('competitions.respondFailed'));
    } finally {
      setRespondingId(null);
    }
  }

  if (authLoading || !user || user.role !== 'student') {
    return (
      <KidsPanelMax className="max-w-6xl">
        <p className="text-center text-violet-800 dark:text-violet-200">{t('common.loading')}</p>
      </KidsPanelMax>
    );
  }

  return (
    <KidsPanelMax className="max-w-6xl">
      <div className="mb-6">
        <Link
          href={`${pathPrefix}/ogrenci/panel`}
          className="inline-flex items-center gap-2 text-sm font-bold text-violet-700 hover:text-fuchsia-600 dark:text-violet-300"
        >
          <span aria-hidden>←</span> {t('competitions.backPanel')}
        </Link>
      </div>

      <header className="mb-8">
        <h1 className="font-logo text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">
          🏆 {t('competitions.title')}
        </h1>
        <p className="mt-2 max-w-2xl text-slate-600 dark:text-gray-300">
          <strong className="font-semibold text-slate-800 dark:text-gray-200">{t('competitions.classComp')}</strong>{' '}
          {t('competitions.classCompBody')}{' '}
          {allowFreeChallenge ? (
            <>
              <strong className="font-semibold text-slate-800 dark:text-gray-200">{t('competitions.freeComp')}</strong>{' '}
              {t('competitions.freeCompBody')}
            </>
          ) : (
            <span className="font-semibold text-amber-800 dark:text-amber-200">{t('competitions.freeClosed')}</span>
          )}{' '}
          {t('competitions.teacherHomeworkNote')}
        </p>
      </header>

      {loading ? (
        <p className="text-center text-violet-800 dark:text-violet-200">{t('common.loading')}</p>
      ) : (
        <div className="space-y-8">
          {invites.length > 0 ? (
            <KidsCard tone="sky">
              <h2 className="font-logo text-lg font-bold text-sky-950 dark:text-sky-50">{t('competitions.invitesTitle')}</h2>
              <ul className="mt-4 space-y-4">
                {invites.map((inv) => {
                  const windowOpen = isPeerStudentChallengeWindowOpen(inv.challenge);
                  return (
                  <li
                    key={inv.id}
                    className="rounded-2xl border-2 border-sky-200/80 bg-white/80 p-4 dark:border-sky-800 dark:bg-sky-950/30"
                  >
                    <p className="font-bold text-slate-900 dark:text-white">{inv.challenge.title}</p>
                    <p className="text-xs text-slate-500 dark:text-gray-400">
                      {challengeScopeLabel(inv.challenge, t)}
                    </p>
                    {inv.challenge.starts_at || inv.challenge.ends_at ? (
                      <p className="mt-1 text-xs text-slate-600 dark:text-gray-400">
                        {inv.challenge.starts_at
                          ? `${t('competitions.start')}: ${new Date(inv.challenge.starts_at).toLocaleString(language)}`
                          : null}
                        {inv.challenge.starts_at && inv.challenge.ends_at ? ' · ' : null}
                        {inv.challenge.ends_at
                          ? `${t('competitions.end')}: ${new Date(inv.challenge.ends_at).toLocaleString(language)}`
                          : null}
                      </p>
                    ) : null}
                    <p className="mt-2 text-sm text-slate-700 dark:text-gray-300">
                      <strong>{[inv.inviter.first_name, inv.inviter.last_name].filter(Boolean).join(' ') || inv.inviter.email}</strong>{' '}
                      {t('competitions.invitedYou')}
                    </p>
                    {inv.personal_message ? (
                      <p className="mt-2 rounded-xl bg-sky-50 px-3 py-2 text-sm dark:bg-sky-950/50">
                        {inv.personal_message}
                      </p>
                    ) : null}
                    {!windowOpen ? (
                      <p className="mt-2 text-sm font-semibold text-amber-800 dark:text-amber-200">
                        {t('competitions.windowClosed')}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <KidsPrimaryButton
                        type="button"
                        disabled={respondingId === inv.id || !windowOpen}
                        onClick={() => void respondInvite(inv.id, 'accept')}
                      >
                        {respondingId === inv.id ? '...' : t('competitions.accept')}
                      </KidsPrimaryButton>
                      <KidsSecondaryButton
                        type="button"
                        disabled={respondingId === inv.id}
                        onClick={() => void respondInvite(inv.id, 'decline')}
                      >
                        {t('competitions.decline')}
                      </KidsSecondaryButton>
                    </div>
                  </li>
                  );
                })}
              </ul>
            </KidsCard>
          ) : null}

          {/* lg+: solda öneri formu, sağda yarışma listesi; mobilde önce form, sonra liste */}
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2 lg:gap-10">
            <KidsCard tone="amber" className="min-w-0 lg:order-1">
              <h2 className="font-logo text-lg font-bold text-amber-950 dark:text-amber-50">{t('competitions.newProposal')}</h2>
              <p className="mt-1 text-sm text-amber-900/85 dark:text-amber-100/85">
                {t('competitions.proposalHint')}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCompetitionMode('class')}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                    competitionMode === 'class'
                      ? 'bg-amber-600 text-white shadow-md dark:bg-amber-500'
                      : 'border-2 border-amber-300/80 bg-white/80 text-amber-950 hover:bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-50'
                  }`}
                >
                  {t('competitions.classCompButton')}
                </button>
                {allowFreeChallenge ? (
                  <button
                    type="button"
                    onClick={() => setCompetitionMode('free')}
                    className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                      competitionMode === 'free'
                        ? 'bg-fuchsia-600 text-white shadow-md dark:bg-fuchsia-500'
                        : 'border-2 border-fuchsia-300/80 bg-white/80 text-fuchsia-950 hover:bg-fuchsia-50 dark:border-fuchsia-700 dark:bg-fuchsia-950/30 dark:text-fuchsia-50'
                    }`}
                  >
                    {t('competitions.freeCompButton')}
                  </button>
                ) : null}
              </div>
              {competitionMode === 'class' && classes.length === 0 ? (
                <p className="mt-4 text-sm font-semibold text-amber-900 dark:text-amber-100">
                  {t('competitions.classModeRequiresClass')}
                </p>
              ) : competitionMode === 'free' ? (
                <p className="mt-4 rounded-xl border border-fuchsia-200/90 bg-fuchsia-50/80 px-3 py-2 text-sm text-fuchsia-950 dark:border-fuchsia-800 dark:bg-fuchsia-950/40 dark:text-fuchsia-100">
                  {t('competitions.freeModeHint')}
                </p>
              ) : null}
              {competitionMode === 'class' && classes.length === 0 ? null : (
                <form className="mt-5 space-y-4" onSubmit={onPropose}>
                  {competitionMode === 'class' ? (
                    <KidsFormField id={classSelectId} label={t('announcements.class')} required>
                      <KidsSelect
                        id={classSelectId}
                        value={classId}
                        onChange={setClassId}
                        options={classes.map((c) => ({ value: String(c.id), label: c.name }))}
                      />
                    </KidsFormField>
                  ) : null}
                  <KidsFormField
                    id={titleId}
                    label={t('competitions.topicLabel')}
                    required
                    hint={t('competitions.topicHint')}
                  >
                    <input
                      id={titleId}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className={kidsInputClass}
                      placeholder={t('competitions.topicPlaceholder')}
                      maxLength={200}
                    />
                  </KidsFormField>
                  <KidsFormField
                    id={roundsId}
                    label={t('competitions.roundCountLabel')}
                    hint={t('competitions.roundCountHint')}
                  >
                    <KidsSelect
                      id={roundsId}
                      value={String(submissionRounds)}
                      onChange={(v) => setSubmissionRounds(Number(v) as 1 | 2 | 3 | 4 | 5)}
                      options={peerSubmissionRoundsOptions}
                      searchable={false}
                    />
                  </KidsFormField>
                  <KidsFormField
                    id={startsId}
                    label={t('competitions.startDateTime')}
                    hint={t('competitions.startDateTimeHint')}
                    required
                  >
                    <KidsDateTimeField
                      id={startsId}
                      value={startsAtLocal}
                      onChange={setStartsAtLocal}
                      required
                      disabled={saving}
                      placeholder={t('competitions.startDateTimePlaceholder')}
                    />
                  </KidsFormField>
                  <KidsFormField
                    id={endsId}
                    label={t('competitions.endDateTime')}
                    hint={t('competitions.endDateTimeHint')}
                    required
                  >
                    <KidsDateTimeField
                      id={endsId}
                      value={endsAtLocal}
                      onChange={setEndsAtLocal}
                      required
                      disabled={saving}
                      placeholder={t('competitions.endDateTimePlaceholder')}
                    />
                  </KidsFormField>
                  <KidsFormField id="pc-desc" label={t('competitions.descriptionOptional')}>
                    <textarea
                      id="pc-desc"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className={kidsTextareaClass}
                      rows={3}
                    />
                  </KidsFormField>
                  <KidsFormField id="pc-rules" label={t('competitions.rulesOptional')}>
                    <textarea
                      id="pc-rules"
                      value={rules}
                      onChange={(e) => setRules(e.target.value)}
                      className={kidsTextareaClass}
                      rows={2}
                    />
                  </KidsFormField>
                  <KidsPrimaryButton type="submit" disabled={saving}>
                    {saving ? t('competitions.sending') : competitionMode === 'free' ? t('competitions.sendToParent') : t('competitions.sendToTeacher')}
                  </KidsPrimaryButton>
                </form>
              )}
            </KidsCard>

            <div className="min-w-0 lg:order-2 lg:sticky lg:top-28 lg:self-start">
              <KidsCard>
                <h2 className="font-logo text-lg font-bold text-slate-900 dark:text-white">{t('competitions.yours')}</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-gray-400 lg:hidden">
                  {t('competitions.yoursHint')}
                </p>
                {challenges.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-600 dark:text-gray-400">
                    {t('competitions.emptyYours')}
                  </p>
                ) : (
                  <ul className="mt-4 max-h-[min(70vh,32rem)] space-y-3 overflow-y-auto pr-1 lg:max-h-[calc(100vh-12rem)]">
                    {challenges.map((c) => (
                      <li key={c.id}>
                        <Link
                          href={`${pathPrefix}/ogrenci/yarismalar/${c.id}`}
                          className="block rounded-2xl border-2 border-violet-200/80 bg-gradient-to-br from-violet-50/90 to-white px-4 py-3 transition hover:border-fuchsia-400 dark:border-violet-800 dark:from-violet-950/40 dark:to-gray-900/80"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-bold text-slate-900 dark:text-white">{c.title}</span>
                            <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-bold text-violet-900 dark:bg-violet-900/60 dark:text-violet-100">
                              {peerChallengeStatusTr(c.status, t)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
                            {challengeScopeLabel(c, t)}
                            {(c.submission_rounds ?? 1) > 1 ? (
                              <span className="ml-2 font-semibold text-violet-700 dark:text-violet-300">
                                · {c.submission_rounds} {t('competitions.challengeUnit')}
                              </span>
                            ) : null}
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </KidsCard>
            </div>
          </div>
        </div>
      )}
    </KidsPanelMax>
  );
}
