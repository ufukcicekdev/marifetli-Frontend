'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import { kidsListConversations, type KidsConversation } from '@/src/lib/kids-api';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';

export default function KidsMessagesPage() {
  const router = useRouter();
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<KidsConversation[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(kidsLoginPortalHref(pathPrefix));
      return;
    }
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
  }, [authLoading, user, pathPrefix, router]);

  if (authLoading || !user) {
    return <p className="text-center text-sm text-violet-800 dark:text-violet-200">Yükleniyor…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="font-logo text-2xl font-bold text-violet-950 dark:text-violet-50">Mesajlar</h1>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Veli, öğretmen ve öğrenci bağlamlı konuşmalar burada listelenir.
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
    </div>
  );
}
