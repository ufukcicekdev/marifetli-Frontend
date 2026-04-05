'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import {
  kidsListConversations,
  kidsParentVerifyPassword,
  type KidsConversation,
} from '@/src/lib/kids-api';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';
import {
  kidsParentMessagesHasRecentUnlock,
  kidsParentMessagesMarkUnlockedNow,
} from '@/src/lib/kids-parent-message-gate';
import { KidsCenteredModal, KidsPrimaryButton, KidsSecondaryButton } from '@/src/components/kids/kids-ui';
import { useKidsI18n } from '@/src/providers/kids-language-provider';

export default function KidsMessagesPage() {
  const router = useRouter();
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();
  const { t, language } = useKidsI18n();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<KidsConversation[]>([]);
  const [error, setError] = useState('');
  const [accessReady, setAccessReady] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(kidsLoginPortalHref(pathPrefix));
      return;
    }
    if (user.role === 'student') {
      router.replace(`${pathPrefix}/ogrenci/panel`);
      return;
    }
    if (user.role === 'parent') {
      setAccessReady(kidsParentMessagesHasRecentUnlock());
      return;
    }
    setAccessReady(true);
  }, [authLoading, user, pathPrefix, router]);

  useEffect(() => {
    if (!accessReady) return;
    if (!user) return;
    void (async () => {
      setLoading(true);
      setError('');
      try {
        const list = await kidsListConversations();
        setRows(list);
      } catch (e) {
        setError(e instanceof Error ? e.message : t('messages.loadError'));
      } finally {
        setLoading(false);
      }
    })();
  }, [accessReady, user, t]);

  async function verifyPasswordAndUnlock() {
    const pass = password.trim();
    setPasswordError(null);
    if (!pass) {
      setPasswordError(t('messages.enterPassword'));
      return;
    }
    setPasswordBusy(true);
    try {
      await kidsParentVerifyPassword(pass);
      kidsParentMessagesMarkUnlockedNow();
      setAccessReady(true);
      setPassword('');
    } catch (e) {
      setPasswordError(e instanceof Error ? e.message : t('messages.passwordVerifyFailed'));
    } finally {
      setPasswordBusy(false);
    }
  }

  if (authLoading || !user) {
    return <p className="text-center text-sm text-violet-800 dark:text-violet-200">{t('common.loading')}</p>;
  }

  function topicInitials(topic: string): string {
    const parts = (topic || '').trim().split(/\s+/).filter(Boolean).slice(0, 2);
    if (parts.length === 0) return '?';
    return parts.map((p) => (p[0] || '').toUpperCase()).join('').slice(0, 2);
  }

  function formatListTime(iso: string | null): string {
    if (!iso) return t('messages.noMessageYet');
    const d = new Date(iso);
    const locale = language === 'tr' ? 'tr-TR' : language === 'ge' ? 'de-DE' : 'en-US';
    const today = new Date();
    const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const startMsg = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diffDays = Math.round((startToday - startMsg) / 86400000);
    if (diffDays === 0) return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return t('messageDetail.yesterday');
    if (diffDays < 7) return d.toLocaleDateString(locale, { weekday: 'short' });
    return d.toLocaleDateString(locale, { dateStyle: 'short' });
  }

  return (
    <div className="mx-auto max-w-lg space-y-5 px-1 pb-10 sm:max-w-xl">
      <header>
        <h1 className="font-logo text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{t('messages.title')}</h1>
        <div className="mt-2 h-1 w-14 rounded-full bg-violet-600" aria-hidden />
        <p className="mt-3 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{t('messages.subtitle')}</p>
      </header>
      {loading ? <p className="text-sm text-zinc-500">{t('common.loading')}</p> : null}
      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      {!loading && !error && rows.length === 0 ? (
        <div className="rounded-[1.75rem] border border-dashed border-violet-200 bg-zinc-50/80 p-8 text-center text-sm text-zinc-600 dark:border-violet-800 dark:bg-zinc-900/40 dark:text-zinc-300">
          {t('messages.empty')}
        </div>
      ) : null}
      <ul className="space-y-3">
        {rows.map((c) => {
          const name = c.topic?.trim() || t('messages.conversationFallback').replace('{id}', String(c.id));
          return (
            <li key={c.id}>
              <Link
                href={`${pathPrefix}/mesajlar/${c.id}`}
                className="flex gap-3 rounded-[1.35rem] border-2 border-transparent bg-white p-4 shadow-md shadow-zinc-200/40 transition hover:border-violet-300/80 dark:bg-zinc-900 dark:shadow-black/20"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-black text-white shadow-inner">
                  {topicInitials(name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate font-bold text-slate-900 dark:text-white">{name}</p>
                    <span className="shrink-0 text-xs tabular-nums text-zinc-400">{formatListTime(c.last_message_at)}</span>
                  </div>
                  <p className="mt-1 truncate text-sm text-zinc-500 dark:text-zinc-400">
                    {c.unread_count > 0
                      ? `${t('messages.unread')}: ${c.unread_count}`
                      : t('messages.listPreview')}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      {user.role === 'parent' && !accessReady ? (
        <KidsCenteredModal title={t('messages.passwordModalTitle')} onClose={() => router.replace(`${pathPrefix}/veli/panel`)}>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {t('messages.passwordModalBody')}
          </p>
          <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-violet-800 dark:text-violet-200">
            {t('messages.accountPassword')}
          </label>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (passwordError) setPasswordError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (!passwordBusy) void verifyPasswordAndUnlock();
              }
            }}
            disabled={passwordBusy}
            className="mt-2 w-full rounded-xl border-2 border-violet-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-400/25 dark:border-violet-700 dark:bg-gray-800 dark:text-white"
            placeholder="••••••••"
          />
          {passwordError ? (
            <p className="mt-2 rounded-lg border border-rose-300 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
              {passwordError}
            </p>
          ) : null}
          <div className="mt-4 flex justify-end gap-2">
            <KidsSecondaryButton type="button" disabled={passwordBusy} onClick={() => router.replace(`${pathPrefix}/veli/panel`)}>
              {t('common.cancel')}
            </KidsSecondaryButton>
            <KidsPrimaryButton type="button" disabled={passwordBusy} onClick={() => void verifyPasswordAndUnlock()}>
              {passwordBusy ? t('messages.verifying') : t('messages.continue')}
            </KidsPrimaryButton>
          </div>
        </KidsCenteredModal>
      ) : null}
    </div>
  );
}
