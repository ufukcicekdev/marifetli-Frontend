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

/** Avatar köşesinde (LinkedIn benzeri) gösterilen rozet özeti */
export type AvatarBadgeChip = {
  slug: string;
  name: string;
  icon: string;
};

/** `header`: üst bar — küçük, beyaz halka, düşük kontrast; `default`: içerik alanları */
export type AvatarCornerTone = 'default' | 'header';

type OptimizedAvatarProps = {
  src: string | null | undefined;
  alt?: string;
  size?: 24 | 32 | 40 | 48 | 80 | 96;
  className?: string;
  priority?: boolean;
  /** Son kazanılan rozetler (API: user.avatar_badges) */
  badges?: AvatarBadgeChip[] | null;
  /** Rozet yoksa köşede yıldız + tooltip ile rütbe (API: current_level_title) */
  levelTitleFallback?: string | null;
  /** Üst bar avatarında daha sade köşe rozeti */
  cornerTone?: AvatarCornerTone;
};

/** Profil fotoğrafı olmayan harf avatarları için aynı rozet yığını */
function cornerPositionClass(tone: AvatarCornerTone) {
  return tone === 'header'
    ? 'bottom-0 right-0 translate-x-[2px] translate-y-[2px]'
    : '-bottom-0.5 -right-0.5';
}

export function AvatarCornerBadges({
  badges,
  size,
  /** Rozet yokken köşede tek satırda rütbe özeti (tam metin tooltip’te) */
  levelTitleFallback,
  cornerTone = 'default',
}: {
  badges: AvatarBadgeChip[] | null | undefined;
  size: number;
  levelTitleFallback?: string | null;
  cornerTone?: AvatarCornerTone;
}) {
  const maxShow = size >= 48 ? 3 : size >= 32 ? 2 : 1;
  const chips = (badges ?? []).slice(0, maxShow);
  const levelTrim = levelTitleFallback?.trim();
  const pos = cornerPositionClass(cornerTone);

  if (!chips.length && levelTrim) {
    const chipClass =
      cornerTone === 'header'
        ? 'h-[11px] w-[11px] min-w-[11px] min-h-[11px] text-[7px] leading-none ring-[1.5px] ring-white dark:ring-gray-900'
        : size <= 24
          ? 'min-w-[14px] min-h-[14px] w-[14px] h-[14px] text-[8px] leading-none'
          : size <= 32
            ? 'min-w-4 min-h-4 w-4 h-4 text-[10px] leading-none'
            : size <= 48
              ? 'min-w-[18px] min-h-[18px] w-[18px] h-[18px] text-xs leading-none'
              : 'min-w-5 min-h-5 w-5 h-5 text-sm leading-none';

    const levelVisual =
      cornerTone === 'header'
        ? `${chipClass} rounded-full bg-white dark:bg-zinc-800 border border-amber-300/70 dark:border-amber-500/45 shadow-sm flex items-center justify-center text-amber-600 dark:text-amber-400`
        : `${chipClass} rounded-full bg-amber-50 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-600 shadow-md flex items-center justify-center font-bold text-amber-800 dark:text-amber-200`;

    return (
      <span className={`absolute ${pos} flex flex-row-reverse items-end pointer-events-none z-10`} aria-hidden>
        <span title={levelTrim} className={levelVisual}>
          ★
        </span>
      </span>
    );
  }
  if (!chips.length) return null;

  const chipClass =
    cornerTone === 'header'
      ? 'h-[11px] w-[11px] min-w-[11px] min-h-[11px] text-[7px] leading-none ring-[1.5px] ring-white dark:ring-gray-900 rounded-full bg-white dark:bg-zinc-800 border border-amber-200/80 dark:border-amber-600/50 shadow-sm flex items-center justify-center overflow-hidden'
      : size <= 24
        ? 'min-w-[14px] min-h-[14px] w-[14px] h-[14px] text-[8px] leading-none'
        : size <= 32
          ? 'min-w-4 min-h-4 w-4 h-4 text-[10px] leading-none'
          : size <= 48
            ? 'min-w-[18px] min-h-[18px] w-[18px] h-[18px] text-xs leading-none'
            : 'min-w-5 min-h-5 w-5 h-5 text-sm leading-none';

  const chipExtra =
    cornerTone === 'header'
      ? ''
      : `${chipClass} rounded-full bg-white dark:bg-gray-900 border border-amber-200/90 dark:border-amber-700/80 shadow-md flex items-center justify-center overflow-hidden`;

  return (
    <span className={`absolute ${pos} flex flex-row-reverse items-end gap-0 pointer-events-none z-10`} aria-hidden>
      {chips.map((b, i) => (
        <span
          key={`${b.slug}-${i}`}
          title={b.name}
          className={cornerTone === 'header' ? chipClass : chipExtra}
          style={{ marginLeft: i > 0 ? (cornerTone === 'header' ? -3 : -4) : 0 }}
        >
          <span className={`select-none ${cornerTone === 'header' ? 'scale-[0.72]' : 'scale-90'}`} aria-hidden>
            {(b.icon || '⭐').trim() || '⭐'}
          </span>
        </span>
      ))}
    </span>
  );
}

export function OptimizedAvatar({
  src,
  alt = '',
  size = 40,
  className = '',
  priority = false,
  badges,
  levelTitleFallback,
  cornerTone = 'default',
}: OptimizedAvatarProps) {
  const s = size;
  const url = src || GRAY_PLACEHOLDER;
  const canOptimize = isOptimizable(src);
  const hasCorner =
    (badges?.length ?? 0) > 0 || Boolean(levelTitleFallback?.trim());

  const imgClassName = `rounded-full object-cover shrink-0 ${className}`;

  const inner = canOptimize ? (
    <Image
      src={url}
      alt={alt}
      width={s}
      height={s}
      className={imgClassName}
      sizes={`${s}px`}
      priority={priority}
    />
  ) : (
    <img
      src={url}
      alt={alt}
      width={s}
      height={s}
      className={imgClassName}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : undefined}
    />
  );

  if (!hasCorner) {
    return inner;
  }

  return (
    <span className="relative inline-flex shrink-0">
      {inner}
      <AvatarCornerBadges
        badges={badges}
        size={s}
        levelTitleFallback={levelTitleFallback}
        cornerTone={cornerTone}
      />
    </span>
  );
}
