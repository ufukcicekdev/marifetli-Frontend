import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <p className="text-8xl font-bold text-brand/20 dark:text-brand/30">404</p>
        <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-100">
          Sayfa bulunamadı
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Aradığınız sayfa mevcut değil veya taşınmış olabilir.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-5 py-2.5 bg-brand hover:bg-brand-hover text-white font-medium rounded-lg transition-colors"
          >
            Ana sayfaya dön
          </Link>
          <Link
            href="/sorular"
            className="inline-flex items-center justify-center px-5 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Sorulara göz at
          </Link>
        </div>
      </div>
    </div>
  );
}
