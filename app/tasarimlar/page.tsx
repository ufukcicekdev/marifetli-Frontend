'use client';

import dynamic from 'next/dynamic';

function TasarimlarFallback() {
  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-6xl">
      <div className="h-9 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mb-6" />
      <div className="h-4 w-full max-w-xl bg-gray-200 dark:bg-gray-800 rounded animate-pulse mb-6" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="aspect-square rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

const TasarimlarContentClient = dynamic(
  () => import('./tasarimlar-content-client').then((m) => m.default),
  { ssr: false, loading: () => <TasarimlarFallback /> }
);

export default function TasarimlarPage() {
  return <TasarimlarContentClient />;
}
