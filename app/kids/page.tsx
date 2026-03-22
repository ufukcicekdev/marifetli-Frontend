import Link from 'next/link';
import { headers } from 'next/headers';
import { kidsPathPrefixFromHost } from '@/src/lib/kids-config';

export default async function KidsHomePage() {
  const host = (await headers()).get('host') ?? '';
  const prefix = kidsPathPrefixFromHost(host);

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <div className="relative overflow-hidden rounded-[2rem] border-4 border-white/80 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-amber-400 p-1 shadow-2xl shadow-fuchsia-500/25 dark:border-violet-900/50 dark:from-violet-700 dark:via-fuchsia-700 dark:to-amber-600">
        <div className="rounded-[1.65rem] bg-white/95 px-6 py-10 dark:bg-gray-900/95 sm:px-10 sm:py-12">
          <p className="text-center text-sm font-extrabold uppercase tracking-widest text-fuchsia-600 dark:text-fuchsia-400">
            ✨ Hoş geldin ✨
          </p>
          <h1 className="font-logo mt-3 text-center text-4xl font-bold text-violet-950 dark:text-white sm:text-5xl">
            Marifetli Kids
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-center text-lg leading-relaxed text-slate-600 dark:text-gray-300">
            Ödevini yap, projeni paylaş, serbest kürsüde parla. Burası senin renkli ve güvenli köşen.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href={`${prefix}/giris`}
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-8 text-sm font-bold text-white shadow-lg hover:from-violet-500 hover:to-fuchsia-500"
            >
              Giriş
            </Link>
            <Link
              href={`${prefix}/giris/ogretmen`}
              className="inline-flex min-h-12 items-center justify-center rounded-full border-2 border-emerald-400 bg-emerald-50 px-6 text-sm font-bold text-emerald-900 hover:bg-emerald-100 dark:border-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-100 dark:hover:bg-emerald-900/60"
            >
              👩‍🏫 Öğretmen
            </Link>
            <Link
              href={`${prefix}/giris/ogrenci`}
              className="inline-flex min-h-12 items-center justify-center rounded-full border-2 border-sky-400 bg-sky-50 px-6 text-sm font-bold text-sky-900 hover:bg-sky-100 dark:border-sky-600 dark:bg-sky-950/50 dark:text-sky-100 dark:hover:bg-sky-900/60"
            >
              🎒 Öğrenci
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="rounded-3xl border-2 border-sky-200 bg-gradient-to-br from-sky-50 to-white p-6 shadow-lg dark:border-sky-800/60 dark:from-sky-950/50 dark:to-gray-900/80">
          <span className="text-3xl" aria-hidden>
            🎒
          </span>
          <h2 className="font-logo mt-3 text-xl font-bold text-sky-900 dark:text-sky-100">Öğrenci</h2>
          <p className="mt-2 text-sm leading-relaxed text-sky-900/85 dark:text-sky-100/85">
            Öğretmeninin gönderdiği davet linkiyle kayıt ol; ödevleri tamamla, serbest kürsüde kendi
            projelerini göster.
          </p>
        </div>
        <div className="rounded-3xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-lg dark:border-emerald-800/60 dark:from-emerald-950/50 dark:to-gray-900/80">
          <span className="text-3xl" aria-hidden>
            🍎
          </span>
          <h2 className="font-logo mt-3 text-xl font-bold text-emerald-900 dark:text-emerald-100">Öğretmen</h2>
          <p className="mt-2 text-sm leading-relaxed text-emerald-900/85 dark:text-emerald-100/85">
            Hesabın yönetici tarafından açılır. Sınıf kur, davet gönder, ödev ver ve haftanın yıldızını
            kutla.
          </p>
        </div>
      </div>

      <p className="text-center text-sm font-medium text-violet-800/80 dark:text-violet-200/80">
        🌈 Güvenli alan · Veli onaylı kayıt · Eğlenerek öğren
      </p>
    </div>
  );
}
