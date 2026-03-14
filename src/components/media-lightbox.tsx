'use client';

import { useEffect, useState } from 'react';
import type { MediaItem } from '@/src/lib/extract-media';

interface MediaLightboxProps {
  items: MediaItem[];
  currentIndex?: number;
  onClose: () => void;
}

export function MediaLightbox({ items, currentIndex = 0, onClose }: MediaLightboxProps) {
  const [index, setIndex] = useState(currentIndex);
  const item = items[index];
  const hasMultiple = items.length > 1;

  useEffect(() => {
    setIndex(currentIndex);
  }, [currentIndex]);

  const goPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIndex((i) => (i <= 0 ? items.length - 1 : i - 1));
  };

  const goNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIndex((i) => (i >= items.length - 1 ? 0 : i + 1));
  };

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

  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
      onClick={onClose}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
        aria-label="Kapat"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={goPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-50 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-2xl transition-colors"
            aria-label="Önceki"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={goNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-50 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-2xl transition-colors"
            aria-label="Sonraki"
          >
            ›
          </button>
          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 px-3 py-1 rounded-full bg-black/50 text-white text-sm">
            {index + 1} / {items.length}
          </span>
        </>
      )}
      <div
        className="max-w-[95vw] max-h-[95vh] flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {item.type === 'image' ? (
          <img src={item.url} alt="Gönderi görseli" className="max-w-full max-h-[95vh] object-contain rounded" />
        ) : (
          <video
            src={item.url}
            controls
            autoPlay
            playsInline
            className="max-w-full max-h-[95vh] object-contain rounded"
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </div>
    </div>
  );
}
