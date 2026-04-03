'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import type { MediaItem } from '@/src/lib/extract-media';

const MediaLightbox = dynamic(() => import('@/src/components/media-lightbox').then((m) => ({ default: m.MediaLightbox })), { ssr: false });

interface MediaSliderProps {
  items: MediaItem[];
  className?: string;
  /** SEO/erişilebilirlik: görsel açıklaması (örn. gönderi başlığı) */
  alt?: string;
  fit?: 'contain' | 'cover';
  onDeleteAtIndex?: (index: number) => void;
  deleteDisabled?: boolean;
}

function sliderFileName(url: string, type: MediaItem['type'], index: number): string {
  try {
    const parsed = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    const raw = parsed.pathname.split('/').pop() || '';
    if (raw) return decodeURIComponent(raw);
  } catch {
    // fallback below
  }
  const ext = type === 'video' ? 'mp4' : 'jpg';
  return `media-${index + 1}.${ext}`;
}

export function MediaSlider({
  items,
  className = '',
  alt,
  fit = 'contain',
  onDeleteAtIndex,
  deleteDisabled = false,
}: MediaSliderProps) {
  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (items.length === 0) return;
    setIndex((i) => Math.max(0, Math.min(i, items.length - 1)));
  }, [items.length]);

  if (items.length === 0) return null;

  const safeIndex = Math.max(0, Math.min(index, items.length - 1));
  const current = items[safeIndex];
  if (!current) return null;

  const currentDownloadName = sliderFileName(current.url, current.type, safeIndex);
  const prev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIndex((i) => (i <= 0 ? items.length - 1 : i - 1));
  };
  const next = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIndex((i) => (i >= items.length - 1 ? 0 : i + 1));
  };

  return (
    <>
      <div
        className={`relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 ${className}`}
      >
        <div
          className={`relative flex items-center justify-center cursor-pointer group ${className ? 'w-full h-full' : 'aspect-video min-h-[200px]'}`}
          onClick={() => setLightboxOpen(true)}
        >
          {current.type === 'image' ? (
            <img src={current.url} alt={alt ?? 'Gönderi görseli'} className={`w-full h-full ${fit === 'cover' ? 'object-cover' : 'object-contain'}`} />
        ) : (
          <video src={current.url} controls className={`w-full h-full ${fit === 'cover' ? 'object-cover' : 'object-contain'}`} playsInline onClick={(e) => e.stopPropagation()} />
        )}
        {items.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); prev(e); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
              aria-label="Önceki"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); next(e); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
              aria-label="Sonraki"
            >
              ›
            </button>
          </>
        )}
          <div
            className="absolute top-2 right-2 z-20 w-9 h-9 rounded-lg bg-black/50 hover:bg-black/70 text-white flex items-center justify-center opacity-70 group-hover:opacity-100 transition-opacity cursor-pointer"
            onClick={(e) => { e.stopPropagation(); setLightboxOpen(true); }}
            title="Tam ekran"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </div>
          <a
            href={current.url}
            download={currentDownloadName}
            onClick={(e) => e.stopPropagation()}
            className="absolute top-2 left-2 z-20 rounded-lg bg-black/50 px-2.5 py-1 text-[11px] font-semibold text-white opacity-70 transition-opacity hover:bg-black/70 group-hover:opacity-100"
            title="Indir"
          >
            Indir
          </a>
          {onDeleteAtIndex ? (
            <button
              type="button"
              disabled={deleteDisabled}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onDeleteAtIndex(safeIndex);
              }}
              className="absolute top-2 left-16 z-20 rounded-lg border border-rose-300 bg-rose-500/80 px-2.5 py-1 text-[11px] font-semibold text-white opacity-80 transition-opacity hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50 group-hover:opacity-100"
              title="Sil"
            >
              Sil
            </button>
          ) : null}
      </div>
      {items.length > 1 && (
        <div className="flex items-center justify-center gap-1 px-3 py-2 border-t border-gray-200 dark:border-gray-700" onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}>
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); setIndex(i); }}
              className={`w-2 h-2 rounded-full transition-colors ${i === safeIndex ? 'bg-brand' : 'bg-gray-400 dark:bg-gray-600 hover:bg-gray-500'}`}
              aria-label={`Medya ${i + 1}`}
            />
          ))}
          <span className="ml-2 text-xs text-gray-500">{safeIndex + 1} / {items.length}</span>
        </div>
      )}
    </div>
    {lightboxOpen && (
      <MediaLightbox
        items={items}
        currentIndex={safeIndex}
        onClose={() => setLightboxOpen(false)}
        onDeleteAtIndex={onDeleteAtIndex}
        deleteDisabled={deleteDisabled}
      />
    )}
    </>
  );
}
