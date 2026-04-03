'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { MediaItem } from '@/src/lib/extract-media';

interface MediaLightboxProps {
  items: MediaItem[];
  currentIndex?: number;
  onClose: () => void;
  onDeleteAtIndex?: (index: number) => void;
  deleteDisabled?: boolean;
}

function lightboxFileName(url: string, type: MediaItem['type'], index: number): string {
  try {
    const parsed = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    const raw = parsed.pathname.split('/').pop() || '';
    if (raw) return decodeURIComponent(raw);
  } catch {
    // ignore malformed urls and use fallback name
  }
  const ext = type === 'video' ? 'mp4' : 'jpg';
  return `media-${index + 1}.${ext}`;
}

export function MediaLightbox({ items, currentIndex = 0, onClose, onDeleteAtIndex, deleteDisabled = false }: MediaLightboxProps) {
  const [index, setIndex] = useState(currentIndex);
  const [mounted, setMounted] = useState(false);
  const safeIndex = items.length > 0 ? Math.max(0, Math.min(index, items.length - 1)) : 0;
  const item = items[safeIndex];
  const hasMultiple = items.length > 1;
  const downloadName = lightboxFileName(item?.url || '', item?.type || 'image', safeIndex);

  useEffect(() => {
    setIndex(currentIndex);
  }, [currentIndex]);

  useEffect(() => {
    if (items.length === 0) {
      onClose();
      return;
    }
    setIndex((i) => Math.max(0, Math.min(i, items.length - 1)));
    // onClose stabil olmayabilir; sadece liste uzunluğu değişince clamp/close yeterli
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  const goPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIndex((i) => (i <= 0 ? items.length - 1 : i - 1));
  };

  const goNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIndex((i) => (i >= items.length - 1 ? 0 : i + 1));
  };

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  if (!item || !mounted) return null;

  const content = (
    <div
      className="fixed inset-0 z-2147483647 flex h-screen w-screen items-center justify-center bg-black/95 p-0 backdrop-blur-sm"
      onClick={onClose}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      aria-label="Tam ekran medya"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        aria-label="Kapat"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <div
        className="absolute left-4 top-4 z-50 flex flex-wrap items-center gap-2"
        onClick={(e) => e.stopPropagation()}
        role="presentation"
      >
        <a
          href={item.url}
          download={downloadName}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex h-10 items-center justify-center rounded-full bg-white/10 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/20"
        >
          Indir
        </a>
        {onDeleteAtIndex ? (
          <button
            type="button"
            disabled={deleteDisabled}
            onClick={(e) => {
              e.stopPropagation();
              onDeleteAtIndex(safeIndex);
            }}
            className="inline-flex h-10 items-center justify-center rounded-full border border-rose-300/80 bg-rose-500/85 px-4 text-sm font-semibold text-white transition-colors hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Sil
          </button>
        ) : null}
      </div>
      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={goPrev}
            className="absolute left-4 top-1/2 z-50 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-2xl text-white transition-colors hover:bg-white/20"
            aria-label="Önceki"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={goNext}
            className="absolute right-4 top-1/2 z-50 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-2xl text-white transition-colors hover:bg-white/20"
            aria-label="Sonraki"
          >
            ›
          </button>
          <span className="absolute bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
            {safeIndex + 1} / {items.length}
          </span>
        </>
      )}
      <div className="flex h-full w-full items-center justify-center p-0" onClick={(e) => e.stopPropagation()}>
        {item.type === 'image' ? (
          <img src={item.url} alt="Gonderi gorseli" className="max-h-full max-w-full object-contain" />
        ) : (
          <video
            src={item.url}
            controls
            autoPlay
            playsInline
            className="max-h-full max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
