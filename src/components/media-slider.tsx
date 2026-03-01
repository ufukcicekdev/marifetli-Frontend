'use client';

import { useState } from 'react';
import type { MediaItem } from '@/src/lib/extract-media';

interface MediaSliderProps {
  items: MediaItem[];
  className?: string;
}

export function MediaSlider({ items, className = '' }: MediaSliderProps) {
  const [index, setIndex] = useState(0);

  if (items.length === 0) return null;

  const current = items[index];
  const prev = () => setIndex((i) => (i <= 0 ? items.length - 1 : i - 1));
  const next = () => setIndex((i) => (i >= items.length - 1 ? 0 : i + 1));

  return (
    <div className={`relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="aspect-video min-h-[200px] relative flex items-center justify-center">
        {current.type === 'image' ? (
          <img src={current.url} alt="" className="w-full h-full object-contain" />
        ) : (
          <video src={current.url} controls className="w-full h-full object-contain" playsInline />
        )}
        {items.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); prev(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
              aria-label="Önceki"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); next(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
              aria-label="Sonraki"
            >
              ›
            </button>
          </>
        )}
      </div>
      {items.length > 1 && (
        <div className="flex items-center justify-center gap-1 px-3 py-2 border-t border-gray-200 dark:border-gray-700" onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}>
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); setIndex(i); }}
              className={`w-2 h-2 rounded-full transition-colors ${i === index ? 'bg-orange-500' : 'bg-gray-400 dark:bg-gray-600 hover:bg-gray-500'}`}
              aria-label={`Medya ${i + 1}`}
            />
          ))}
          <span className="ml-2 text-xs text-gray-500">{index + 1} / {items.length}</span>
        </div>
      )}
    </div>
  );
}
