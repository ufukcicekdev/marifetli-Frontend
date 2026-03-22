import Link from 'next/link';
import { headers } from 'next/headers';
import { kidsPathPrefixFromHost } from '@/src/lib/kids-config';

export default async function KidsGirisHubPage() {
  const host = (await headers()).get('host') ?? '';
  const p = kidsPathPrefixFromHost(host);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Giriş</h1>
        <p className="mt-1 text-slate-600 dark:text-gray-300">
          Hesabın türüne uygun giriş sayfasını seç.
        </p>
      </div>
      <div className="grid gap-4">
        <Link
          href={`${p}/giris/ogretmen`}
          className="block rounded-2xl border-2 border-emerald-200 bg-emerald-50/90 p-6 transition hover:border-emerald-400 dark:border-emerald-800/60 dark:bg-emerald-950/40"
        >
          <span className="text-2xl">👩‍🏫</span>
          <h2 className="mt-2 text-lg font-semibold text-emerald-900 dark:text-emerald-100">Öğretmen girişi</h2>
          <p className="mt-1 text-sm text-emerald-800/90 dark:text-emerald-200/80">
            Yöneticinin oluşturduğu öğretmen hesabı ile sınıf ve ödev yönetimi.
          </p>
        </Link>
        <Link
          href={`${p}/giris/ogrenci`}
          className="block rounded-2xl border-2 border-sky-200 bg-sky-50/90 p-6 transition hover:border-sky-400 dark:border-sky-800/60 dark:bg-sky-950/40"
        >
          <span className="text-2xl">🎒</span>
          <h2 className="mt-2 text-lg font-semibold text-sky-900 dark:text-sky-100">Öğrenci girişi</h2>
          <p className="mt-1 text-sm text-sky-800/90 dark:text-sky-200/80">
            Davet linkiyle oluşturduğun hesap ile ödev ve serbest kürsü.
          </p>
        </Link>
      </div>
      <p className="text-center text-sm text-slate-500 dark:text-gray-400">
        Öğrenci hesabın yok mu?{' '}
        <span className="text-slate-700 dark:text-gray-300">Öğretmeninden gelen davet linkini kullan.</span>
      </p>
    </div>
  );
}
