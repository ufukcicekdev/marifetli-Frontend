'use client';

import Image from 'next/image';

const GRAY_PLACEHOLDER =
  'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" fill="%23e5e7eb"/></svg>');

function isOptimizable(src: string | null | undefined): boolean {
  if (!src || typeof src !== 'string') return false;
  if (src.startsWith('data:') || src.startsWith('blob:')) return false;
  try {
    const u = new URL(src);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

type OptimizedAvatarProps = {
  src: string | null | undefined;
  alt?: string;
  size?: 24 | 32 | 40 | 48 | 80 | 96;
  className?: string;
  priority?: boolean;
};

export function OptimizedAvatar({ src, alt = '', size = 40, className = '', priority = false }: OptimizedAvatarProps) {
  const s = size;
  const url = src || GRAY_PLACEHOLDER;
  const canOptimize = isOptimizable(src);

  if (canOptimize) {
    return (
      <Image
        src={url}
        alt={alt}
        width={s}
        height={s}
        className={`rounded-full object-cover shrink-0 ${className}`}
        sizes={`${s}px`}
        priority={priority}
      />
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      width={s}
      height={s}
      className={`rounded-full object-cover shrink-0 ${className}`}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : undefined}
    />
  );
}
