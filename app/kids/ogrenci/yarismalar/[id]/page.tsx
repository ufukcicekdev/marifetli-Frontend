'use client';

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import {
  kidsClassmates,
  kidsGetPeerChallenge,
  kidsInviteAllClassmatesToPeerChallenge,
  kidsInvitePeerChallenge,
  kidsRevokePeerChallengeInvite,
  type KidsPeerChallenge,
  type KidsPeerChallengeStatus,
  type KidsUser,
} from '@/src/lib/kids-api';
import { isPeerStudentChallengeWindowOpen } from '@/src/lib/kids-peer-challenge-time';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';
import { useKidsI18n } from '@/src/providers/kids-language-provider';
import {
  KidsCard,
  KidsFormField,
  KidsPanelMax,
  KidsPrimaryButton,
  KidsSecondaryButton,
  kidsTextareaClass,
} from '@/src/components/kids/kids-ui';

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

function shortName(u: KidsUser) {
  const n = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
  return n || u.email;
}

export default function KidsStudentPeerChallengeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const challengeId = Number(params.id);
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();
  const { t, language } = useKidsI18n();
  const [ch, setCh] = useState<KidsPeerChallenge | null>(null);
  const [classmates, setClassmates] = useState<KidsUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteMsg, setInviteMsg] = useState('');
  const [invitingId, setInvitingId] = useState<number | null>(null);
  const [invitingAll, setInvitingAll] = useState(false);
  const [revokingInviteId, setRevokingInviteId] = useState<number | null>(null);
  const msgId = useId();

  const load = useCallback(async (opts?: { soft?: boolean }) => {
    if (!Number.isFinite(challengeId)) return;
    const soft = Boolean(opts?.soft);
    if (!soft) setLoading(true);
    try {
      const c = await kidsGetPeerChallenge(challengeId);
      setCh(c);
      const isFree = (c.peer_scope ?? 'class_peer') === 'free_parent';
      if (c.status === 'active' && c.kids_class != null && !isFree) {
        const cm = await kidsClassmates(c.kids_class).catch(() => []);
        setClassmates(cm);
      } else {
        setClassmates([]);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('competitionDetail.loadError'));
      if (!soft) setCh(null);
    } finally {
      if (!soft) setLoading(false);
    }
  }, [challengeId, t]);

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

  const isMember = useMemo(() => {
    if (!user || !ch) return false;
    return ch.members.some((m) => m.student.id === user.id);
  }, [ch, user]);

  const isInitiator = Boolean(user && ch && ch.created_by_student === user.id);

  const memberIds = useMemo(() => new Set(ch?.members.map((m) => m.student.id) ?? []), [ch]);

  const pendingInviteByInviteeId = useMemo(() => {
    const m = new Map<number, number>();
    for (const row of ch?.outgoing_pending_invites ?? []) {
      m.set(row.invitee.id, row.id);
    }
    return m;
  }, [ch?.outgoing_pending_invites]);

  const isFreeParentChallenge = useMemo(
    () => (ch ? (ch.peer_scope ?? 'class_peer') === 'free_parent' : false),
    [ch],
  );

  const peerWindowOpen = useMemo(() => (ch ? isPeerStudentChallengeWindowOpen(ch) : false), [ch]);

  const classmateInviteTargets = useMemo(
    () =>
      classmates.filter((cm) => !memberIds.has(cm.id) && !pendingInviteByInviteeId.has(cm.id)),
    [classmates, memberIds, pendingInviteByInviteeId],
  );

  async function sendInvite(classmateId: number) {
    if (!ch) return;
    setInvitingId(classmateId);
    try {
      await kidsInvitePeerChallenge(ch.id, {
        invitee_user_id: classmateId,
        personal_message: inviteMsg,
      });
      toast.success(t('competitionDetail.inviteSent'));
      setInviteMsg('');
      await load({ soft: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('competitionDetail.inviteSendFailed'));
    } finally {
      setInvitingId(null);
    }
  }

  async function sendInviteAll() {
    if (!ch) return;
    setInvitingAll(true);
    try {
      const r = await kidsInviteAllClassmatesToPeerChallenge(ch.id, { personal_message: inviteMsg });
      const parts = [
        t('competitionDetail.bulkInvite.invited').replace('{count}', String(r.invited_count)),
        r.skipped_already_in_challenge > 0
          ? t('competitionDetail.bulkInvite.alreadyIn').replace('{count}', String(r.skipped_already_in_challenge))
          : null,
        r.skipped_pending_invite > 0
          ? t('competitionDetail.bulkInvite.pending').replace('{count}', String(r.skipped_pending_invite))
          : null,
      ].filter(Boolean);
      toast.success(parts.join(' · '));
      setInviteMsg('');
      await load({ soft: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('competitionDetail.inviteAllFailed'));
    } finally {
      setInvitingAll(false);
    }
  }

  async function revokeInvite(inviteId: number) {
    setRevokingInviteId(inviteId);
    try {
      await kidsRevokePeerChallengeInvite(inviteId);
      toast.success(t('competitionDetail.inviteRevoked'));
      await load({ soft: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('competitionDetail.inviteRevokeFailed'));
    } finally {
      setRevokingInviteId(null);
    }
  }

  if (authLoading || !user || user.role !== 'student') {
    return (
      <KidsPanelMax>
        <p className="text-center text-violet-800 dark:text-violet-200">{t('common.loading')}</p>
      </KidsPanelMax>
    );
  }

  return (
    <KidsPanelMax>
      <div className="mb-6">
        <Link
          href={`${pathPrefix}/ogrenci/yarismalar`}
          className="inline-flex items-center gap-2 text-sm font-bold text-violet-700 hover:text-fuchsia-600 dark:text-violet-300"
        >
          <span aria-hidden>←</span> {t('competitionDetail.backCompetitions')}
        </Link>
      </div>

      {loading ? (
        <p className="text-center text-violet-800 dark:text-violet-200">{t('common.loading')}</p>
      ) : !ch ? (
        <KidsCard>
          <p className="text-slate-700 dark:text-gray-300">{t('competitionDetail.notFoundOrUnauthorized')}</p>
        </KidsCard>
      ) : (
        <div className="space-y-6">
          <KidsCard>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-fuchsia-600 dark:text-fuchsia-400">
                  {isFreeParentChallenge ? t('competitionDetail.freeCompetition') : ch.kids_class_name || t('announcements.class')}
                </p>
                <h1 className="font-logo mt-1 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
                  {ch.title}
                </h1>
              </div>
              <span className="rounded-full bg-violet-100 px-3 py-1 text-sm font-bold text-violet-900 dark:bg-violet-900/60 dark:text-violet-100">
                {peerChallengeStatusTr(ch.status, t)}
              </span>
            </div>
            <p className="mt-3 text-sm font-semibold text-violet-800 dark:text-violet-200">
              {Math.max(1, ch.submission_rounds ?? 1) <= 1 ? (
                <>📋 {t('competitionDetail.roundInfo.single')}</>
              ) : (
                <>
                  📋 {t('competitionDetail.roundInfo.multiPrefix')}{' '}
                  <strong className="font-black">{Math.max(1, ch.submission_rounds ?? 1)}</strong>{' '}
                  {t('competitionDetail.roundInfo.multiSuffix')}
                </>
              )}
            </p>
            {ch.description ? (
              <p className="mt-4 whitespace-pre-wrap text-slate-700 dark:text-gray-300">{ch.description}</p>
            ) : null}
            {ch.rules_or_goal ? (
              <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50/50 p-3 dark:border-violet-900 dark:bg-violet-950/30">
                <p className="text-xs font-bold text-violet-800 dark:text-violet-200">{t('competitions.rulesOptional')}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-gray-300">{ch.rules_or_goal}</p>
              </div>
            ) : null}
            {ch.source === 'student' && (ch.starts_at || ch.ends_at) ? (
              <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-gray-300">
                {ch.starts_at ? (
                  <>{t('competitions.start')}: {new Date(ch.starts_at).toLocaleString(language)}</>
                ) : null}
                {ch.starts_at && ch.ends_at ? ' · ' : null}
                {ch.ends_at ? <>{t('competitions.end')}: {new Date(ch.ends_at).toLocaleString(language)}</> : null}
              </p>
            ) : null}
            {ch.status === 'pending_teacher' && isInitiator ? (
              <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
                {t('competitionDetail.pendingTeacherHint')}
              </p>
            ) : null}
            {ch.status === 'pending_parent' && isInitiator ? (
              <p className="mt-4 rounded-xl bg-fuchsia-50 px-3 py-2 text-sm font-semibold text-fuchsia-950 dark:bg-fuchsia-950/40 dark:text-fuchsia-100">
                {t('competitionDetail.pendingParentHint')}
              </p>
            ) : null}
            {ch.status === 'rejected' && isInitiator ? (
              <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
                {t('competitionDetail.rejectedHint')}
                {isFreeParentChallenge && (ch.parent_rejection_note || '').trim() ? (
                  <>
                    <br />
                    <span className="font-semibold">{t('competitionDetail.parentNote')}:</span> {ch.parent_rejection_note}
                  </>
                ) : null}
                {!isFreeParentChallenge && ch.teacher_rejection_note ? (
                  <>
                    <br />
                    <span className="font-semibold">{t('competitionDetail.note')}:</span> {ch.teacher_rejection_note}
                  </>
                ) : null}
              </p>
            ) : null}
          </KidsCard>

          {ch.status === 'active' && isMember && isFreeParentChallenge ? (
            <KidsCard className="border-fuchsia-300/90 bg-gradient-to-br from-fuchsia-50/90 to-white dark:border-fuchsia-800 dark:from-fuchsia-950/40 dark:to-gray-900/80">
              <h2 className="font-logo text-lg font-bold text-fuchsia-950 dark:text-fuchsia-50">{t('competitionDetail.freeTitle')}</h2>
              <p className="mt-2 text-sm text-fuchsia-900/90 dark:text-fuchsia-100/85">
                {t('competitionDetail.freeBody')}
              </p>
            </KidsCard>
          ) : null}

          {ch.status === 'active' && isMember && !isFreeParentChallenge ? (
            <KidsCard tone="sky">
              <h2 className="font-logo text-lg font-bold text-sky-950 dark:text-sky-50">{t('competitionDetail.inviteFriendsTitle')}</h2>
              <p className="mt-1 text-sm text-sky-900/85 dark:text-sky-100/85">
                {t('competitionDetail.inviteFriendsBody')}
              </p>
              {!peerWindowOpen && ch.source === 'student' ? (
                <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
                  {t('competitionDetail.inviteWindowClosed')}
                </p>
              ) : null}
              <KidsFormField id={msgId} label={t('competitionDetail.personalMessage')} hint={t('competitionDetail.personalMessageHint')}>
                <textarea
                  id={msgId}
                  value={inviteMsg}
                  onChange={(e) => setInviteMsg(e.target.value)}
                  className={kidsTextareaClass}
                  rows={2}
                  maxLength={500}
                  disabled={ch.source === 'student' && !peerWindowOpen}
                />
              </KidsFormField>
              {classmates.length > 0 && classmateInviteTargets.length > 0 ? (
                <div className="mt-4">
                  <KidsPrimaryButton
                    type="button"
                    disabled={
                      invitingAll ||
                      invitingId !== null ||
                      revokingInviteId !== null ||
                      (ch.source === 'student' && !peerWindowOpen)
                    }
                    onClick={() => void sendInviteAll()}
                  >
                    {invitingAll
                      ? t('competitionDetail.sending')
                      : t('competitionDetail.inviteAll').replace('{count}', String(classmateInviteTargets.length))}
                  </KidsPrimaryButton>
                  <p className="mt-2 text-xs text-sky-800/85 dark:text-sky-200/75">
                    {t('competitionDetail.inviteAllHint')}
                  </p>
                </div>
              ) : null}
              {classmates.length === 0 ? (
                <p className="mt-3 text-sm text-slate-600 dark:text-gray-400">{t('competitionDetail.classmatesEmpty')}</p>
              ) : (
                <ul className="mt-6 space-y-2">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-sky-900 dark:text-sky-100">
                    {t('competitionDetail.selectIndividually')}
                  </p>
                  {classmates.map((cm) => {
                    const inChallenge = memberIds.has(cm.id);
                    const pendingInviteId = pendingInviteByInviteeId.get(cm.id);
                    return (
                      <li
                        key={cm.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sky-200/80 bg-white/80 px-3 py-2 dark:border-sky-800 dark:bg-sky-950/20"
                      >
                        <span className="font-medium text-slate-900 dark:text-white">{shortName(cm)}</span>
                        {inChallenge ? (
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">{t('competitionDetail.joined')}</span>
                        ) : pendingInviteId != null ? (
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <span className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                              {t('competitionDetail.invitePending')}
                            </span>
                            <KidsSecondaryButton
                              type="button"
                              className="text-xs border-amber-300 text-amber-900 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-100 dark:hover:bg-amber-950/40"
                              disabled={
                                revokingInviteId === pendingInviteId ||
                                invitingAll ||
                                invitingId !== null ||
                                (ch.source === 'student' && !peerWindowOpen)
                              }
                              onClick={() => void revokeInvite(pendingInviteId)}
                            >
                              {revokingInviteId === pendingInviteId ? '…' : t('competitionDetail.revokeInvite')}
                            </KidsSecondaryButton>
                          </div>
                        ) : (
                          <KidsSecondaryButton
                            type="button"
                            className="text-xs"
                            disabled={
                              invitingId === cm.id ||
                              invitingAll ||
                              revokingInviteId !== null ||
                              (ch.source === 'student' && !peerWindowOpen)
                            }
                            onClick={() => void sendInvite(cm.id)}
                          >
                            {invitingId === cm.id ? '…' : t('competitionDetail.sendInvite')}
                          </KidsSecondaryButton>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </KidsCard>
          ) : null}

          {ch.status === 'active' ? (
            <KidsCard>
              <h2 className="font-logo text-lg font-bold text-slate-900 dark:text-white">{t('competitionDetail.membersTitle')}</h2>
              {ch.members.length === 0 ? (
                <p className="mt-2 text-sm text-slate-600 dark:text-gray-400">{t('competitionDetail.membersEmpty')}</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {ch.members.map((m) => (
                    <li key={m.id} className="text-sm text-slate-800 dark:text-gray-200">
                      {shortName(m.student)}
                      {m.is_initiator ? (
                        <span className="ml-2 text-xs font-bold text-fuchsia-600 dark:text-fuchsia-400">{t('competitionDetail.initiator')}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </KidsCard>
          ) : null}

          {ch.status === 'active' && !isMember ? (
            <KidsCard tone="amber">
              <p className="text-sm text-amber-950 dark:text-amber-50">
                {t('competitionDetail.notMemberHint')}
              </p>
            </KidsCard>
          ) : null}
        </div>
      )}
    </KidsPanelMax>
  );
}
