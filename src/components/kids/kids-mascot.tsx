'use client';

import Image from 'next/image';

export type MascoMood = 'idle' | 'happy' | 'excited' | 'proud' | 'thinking';

interface KidsMascotProps {
  mood?: MascoMood;
  size?: number;
  className?: string;
  'aria-hidden'?: boolean;
}

export function KidsMascot({
  mood = 'idle',
  size = 120,
  className = '',
  'aria-hidden': ariaHidden = true,
}: KidsMascotProps) {
  return (
    <Image
      src={`/kids/mascot/${mood}.gif`}
      alt="Zep maskotu"
      width={size}
      height={Math.round(size * 1.1)}
      className={className}
      aria-hidden={ariaHidden}
      unoptimized
    />
  );
}
