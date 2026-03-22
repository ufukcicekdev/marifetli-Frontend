'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import { kidsFreestyleCreate, kidsFreestyleList, type FreestyleItem } from '@/src/lib/kids-api';

export default function KidsFreestylePage() {
  const router = useRouter();
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();
  const [items, setItems] = useState<FreestyleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [urlsRaw, setUrlsRaw] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await kidsFreestyleList();
      setItems(list);
    } catch {
      toast.error('Galeri yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(`${pathPrefix}/giris/ogrenci`);
      return;
    }
    if (user.role !== 'student') {
      router.replace(`${pathPrefix}/giris`);
      return;
    }
    load();
  }, [authLoading, user, router, pathPrefix, load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const media_urls = urlsRaw
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      await kidsFreestyleCreate({ title: title.trim(), description: description.trim(), media_urls });
      setTitle('');
      setDescription('');
      setUrlsRaw('');
      toast.success('Paylaşıldı');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kaydedilemedi');
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || !user) {
    return <p className="text-center text-gray-600">Yükleniyor…</p>;
  }
  if (user.role !== 'student') {
    return <p className="text-center text-gray-600">Yönlendiriliyorsun…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Serbest kürsü</h1>
        <p className="text-slate-600 dark:text-gray-300">Ödev dışı projelerini burada paylaş.</p>
      </div>

      <section className="rounded-2xl border border-amber-200 bg-white p-6 dark:border-amber-800/50 dark:bg-gray-900/80">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Yeni paylaşım</h2>
        <form className="mt-4 space-y-3" onSubmit={onCreate}>
          <input
            required
            placeholder="Başlık"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
          <textarea
            placeholder="Açıklama"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
          <textarea
            placeholder="Görsel / video bağlantıları (satır veya virgülle ayır)"
            value={urlsRaw}
            onChange={(e) => setUrlsRaw(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-amber-500 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
          >
            {saving ? 'Paylaşılıyor…' : 'Yayınla'}
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Galeri</h2>
        {loading ? (
          <p className="mt-2 text-gray-500">Yükleniyor…</p>
        ) : items.length === 0 ? (
          <p className="mt-2 text-gray-500 dark:text-gray-400">Henüz paylaşım yok.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {items.map((it) => (
              <li
                key={it.id}
                className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/80"
              >
                <p className="font-medium text-slate-900 dark:text-white">{it.title}</p>
                <p className="text-xs text-gray-500">{it.student_name}</p>
                {it.description ? (
                  <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{it.description}</p>
                ) : null}
                {it.media_urls?.length ? (
                  <ul className="mt-2 list-inside list-disc text-sm text-brand">
                    {it.media_urls.map((u) => (
                      <li key={u}>
                        <a href={u} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {u.slice(0, 48)}…
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
