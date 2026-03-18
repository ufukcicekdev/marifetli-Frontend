'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * Navbar'ın hemen altında, ortada: logo altındaki "soru sor" alanı yerine arama çubuğu (referans: KızlarSoruyor).
 */
export function HeaderSearchBar() {
  const router = useRouter();
  const [q, setQ] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    if (term) {
      router.push(`/sorular?search=${encodeURIComponent(term)}`);
    } else {
      router.push('/sorular');
    }
  };

  return (
    <div className="w-full bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700 px-3 sm:px-4 py-3">
      <div className="container mx-auto max-w-2xl">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Bir şey ara..."
            className="flex-1 min-w-0 px-4 py-3 rounded-xl border-0 bg-white/95 dark:bg-gray-900/95 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50 text-sm transition-colors shadow-sm"
            aria-label="Arama"
          />
          <button
            type="submit"
            className="shrink-0 px-5 py-3 rounded-xl bg-white text-brand font-medium text-sm hover:bg-white/95 transition-colors shadow-sm"
          >
            Ara
          </button>
        </form>
      </div>
    </div>
  );
}
