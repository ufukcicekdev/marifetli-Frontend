'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <p className="text-8xl font-bold text-red-500/20 dark:text-red-500/30">500</p>
        <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-100">
          Bir şeyler yanlış gitti
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin veya ana sayfaya dönün.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center justify-center px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
          >
            Tekrar dene
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-5 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Ana sayfaya dön
          </Link>
        </div>
      </div>
    </div>
  );
}
