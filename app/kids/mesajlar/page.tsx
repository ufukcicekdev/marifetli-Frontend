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

export default function KidsMessagesPage() {
  const router = useRouter();
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();
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
        setError(e instanceof Error ? e.message : 'Mesajlar yüklenemedi');
      } finally {
        setLoading(false);
      }
    })();
  }, [accessReady, user]);

  async function verifyPasswordAndUnlock() {
    const pass = password.trim();
    setPasswordError(null);
    if (!pass) {
      setPasswordError('Lütfen şifreni gir.');
      return;
    }
    setPasswordBusy(true);
    try {
      await kidsParentVerifyPassword(pass);
      kidsParentMessagesMarkUnlockedNow();
      setAccessReady(true);
      setPassword('');
    } catch (e) {
      setPasswordError(e instanceof Error ? e.message : 'Şifre doğrulanamadı');
    } finally {
      setPasswordBusy(false);
    }
  }

  if (authLoading || !user) {
    return <p className="text-center text-sm text-violet-800 dark:text-violet-200">Yükleniyor…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="font-logo text-2xl font-bold text-violet-950 dark:text-violet-50">Mesajlar</h1>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Veli ve öğretmen bağlamlı konuşmalar burada listelenir.
      </p>
      {loading ? <p className="text-sm text-slate-500">Yükleniyor…</p> : null}
      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      {!loading && !error && rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-violet-300 bg-violet-50/50 p-6 text-sm text-violet-900 dark:border-violet-800 dark:bg-violet-950/20 dark:text-violet-100">
          Henüz konuşma yok.
        </div>
      ) : null}
      <ul className="space-y-2">
        {rows.map((c) => (
          <li key={c.id}>
            <Link
              href={`${pathPrefix}/mesajlar/${c.id}`}
              className="block rounded-2xl border-2 border-violet-200 bg-white/90 px-4 py-3 hover:border-fuchsia-300 dark:border-violet-800 dark:bg-gray-900/70"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-violet-950 dark:text-violet-100">
                  {c.topic?.trim() || `Konuşma #${c.id}`}
                </p>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {c.last_message_at
                    ? new Date(c.last_message_at).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })
                    : 'Henüz mesaj yok'}
                </span>
              </div>
              <p className="mt-1 text-xs font-semibold text-fuchsia-700 dark:text-fuchsia-300">
                Okunmamış: {c.unread_count}
              </p>
            </Link>
          </li>
        ))}
      </ul>
      {user.role === 'parent' && !accessReady ? (
        <KidsCenteredModal title="Mesajlar için şifre doğrulaması" onClose={() => router.replace(`${pathPrefix}/veli/panel`)}>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Veli mesajlarını görüntülemek için hesabının şifresini gir. Bu doğrulama 15 dakika boyunca geçerli olur.
          </p>
          <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-violet-800 dark:text-violet-200">
            Hesap şifren
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
              Vazgeç
            </KidsSecondaryButton>
            <KidsPrimaryButton type="button" disabled={passwordBusy} onClick={() => void verifyPasswordAndUnlock()}>
              {passwordBusy ? 'Doğrulanıyor…' : 'Devam et'}
            </KidsPrimaryButton>
          </div>
        </KidsCenteredModal>
      ) : null}
    </div>
  );
}
