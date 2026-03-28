'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import {
  kidsCreateAnnouncement,
  kidsListAnnouncements,
  type KidsAnnouncement,
} from '@/src/lib/kids-api';
import { kidsLoginPortalHref } from '@/src/lib/kids-config';
import { KidsPrimaryButton, kidsInputClass, kidsTextareaClass } from '@/src/components/kids/kids-ui';

export default function KidsAnnouncementsPage() {
  const router = useRouter();
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();
  const [rows, setRows] = useState<KidsAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const canCreate = user?.role === 'teacher' || user?.role === 'admin';

  async function load() {
    setLoading(true);
    try {
      const list = await kidsListAnnouncements();
      setRows(list);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Duyurular yüklenemedi');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(kidsLoginPortalHref(pathPrefix));
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, router, pathPrefix]);

  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const at = a.published_at ? new Date(a.published_at).getTime() : 0;
        const bt = b.published_at ? new Date(b.published_at).getTime() : 0;
        return bt - at;
      }),
    [rows],
  );

  async function onCreate() {
    const t = title.trim();
    const b = body.trim();
    if (!t || !b) return;
    setSaving(true);
    try {
      await kidsCreateAnnouncement({
        scope: 'class',
        title: t,
        body: b,
        is_published: true,
        target_role: 'all',
      });
      setTitle('');
      setBody('');
      toast.success('Duyuru yayınlandı');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Duyuru oluşturulamadı');
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || !user) {
    return <p className="text-center text-sm text-violet-800 dark:text-violet-200">Yükleniyor…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="font-logo text-2xl font-bold text-violet-950 dark:text-violet-50">Duyurular</h1>
      {canCreate ? (
        <div className="space-y-2 rounded-2xl border-2 border-violet-200 bg-white/90 p-4 dark:border-violet-800 dark:bg-gray-900/70">
          <p className="text-sm font-semibold text-violet-900 dark:text-violet-100">Yeni duyuru</p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Başlık"
            className={kidsInputClass}
          />
          <textarea
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Duyuru metni"
            className={kidsTextareaClass}
          />
          <div className="flex justify-end">
            <KidsPrimaryButton type="button" onClick={() => void onCreate()} disabled={saving || !title.trim() || !body.trim()}>
              {saving ? 'Yayınlanıyor…' : 'Yayınla'}
            </KidsPrimaryButton>
          </div>
        </div>
      ) : null}
      {loading ? <p className="text-sm text-slate-500">Yükleniyor…</p> : null}
      {!loading && sorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-violet-300 bg-violet-50/50 p-6 text-sm text-violet-900 dark:border-violet-800 dark:bg-violet-950/20 dark:text-violet-100">
          Henüz duyuru yok.
        </div>
      ) : null}
      <ul className="space-y-2">
        {sorted.map((a) => (
          <li key={a.id} className="rounded-2xl border-2 border-violet-200 bg-white/90 px-4 py-3 dark:border-violet-800 dark:bg-gray-900/70">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-violet-950 dark:text-violet-100">{a.title}</p>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {a.published_at
                  ? new Date(a.published_at).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })
                  : 'Taslak'}
              </span>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{a.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
