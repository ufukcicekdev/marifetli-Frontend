'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import { kidsClassLocationLine, kidsStudentDashboard, type KidsAssignment, type KidsClass } from '@/src/lib/kids-api';

export default function KidsStudentPanelPage() {
  const router = useRouter();
  const { user, loading: authLoading, pathPrefix } = useKidsAuth();
  const [classes, setClasses] = useState<KidsClass[]>([]);
  const [assignments, setAssignments] = useState<KidsAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await kidsStudentDashboard();
      setClasses(data.classes);
      setAssignments(data.assignments);
    } catch {
      toast.error('Panel yüklenemedi');
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

  if (authLoading || !user) {
    return <p className="text-center text-gray-600 dark:text-gray-400">Yükleniyor…</p>;
  }
  if (user.role !== 'student') {
    return <p className="text-center text-gray-600">Yönlendiriliyorsun…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Öğrenci paneli</h1>
        <p className="text-slate-600 dark:text-gray-300">
          Merhaba {user.first_name || user.email} — ödevlerini tamamla, serbest kürsüye göz at.
        </p>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900/80">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Sınıflarım</h2>
        {loading ? (
          <p className="mt-2 text-gray-500">Yükleniyor…</p>
        ) : classes.length === 0 ? (
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Henüz bir sınıfa kayıtlı değilsin. Öğretmeninin davet linkini kullan.
          </p>
        ) : (
          <ul className="mt-3 space-y-1 text-sm text-slate-800 dark:text-gray-200">
            {classes.map((c) => {
              const loc = kidsClassLocationLine(c);
              return (
                <li key={c.id} className="leading-relaxed">
                  <span className="font-medium">· {c.name}</span>
                  {loc ? (
                    <span className="mt-0.5 block pl-3 text-xs text-gray-500 dark:text-gray-400">{loc}</span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900/80">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Ödevler</h2>
        {loading ? (
          <p className="mt-2 text-gray-500">Yükleniyor…</p>
        ) : assignments.length === 0 ? (
          <p className="mt-2 text-gray-500 dark:text-gray-400">Şu an yayında ödev yok.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {assignments.map((a) => (
              <li key={a.id}>
                <Link
                  href={`${pathPrefix}/ogrenci/odev/${a.id}`}
                  className="flex flex-col rounded-xl border border-gray-200 px-4 py-3 transition hover:border-sky-300 dark:border-gray-700 dark:hover:border-sky-700"
                >
                  <span className="font-medium text-slate-900 dark:text-white">{a.title}</span>
                  <span className="text-xs text-gray-500">
                    Video en fazla {a.video_max_seconds} sn
                    {a.require_image ? ' · Görsel gerekli' : ''}
                    {a.require_video ? ' · Video gerekli' : ''}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link
        href={`${pathPrefix}/ogrenci/kursu`}
        className="inline-flex rounded-full border-2 border-amber-300 px-5 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-950/40"
      >
        Serbest kürsüye git →
      </Link>
    </div>
  );
}
