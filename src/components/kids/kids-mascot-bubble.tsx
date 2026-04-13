'use client';

/**
 * KidsMascotBubble — Marfi'nin konusma balonlu gorunumu.
 *
 * Kullanim:
 *   <KidsMascotBubble mood="happy" messageKey="marfi.dashboard.morning0" dismissible />
 *   <KidsMascotBubble mood="idle" message="Merhaba!" onDismiss={() => ...} />
 *
 * "dismissible" ise sessionStorage'a kaydeder (ayni oturum icinde bir daha cikmaz).
 * storageKey verilmezse messageKey kullanilir.
 */

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { KidsMascot, type MascoMood } from '@/src/components/kids/kids-mascot';
import { useKidsI18n } from '@/src/providers/kids-language-provider';

type Placement = 'left' | 'right';

interface Props {
  mood?: MascoMood;
  /** i18n key — message verilmemisse bu key'den cevrilir */
  messageKey?: string;
  /** Direkt metin (i18n key yerine) */
  message?: string;
  /** Baslik (opsiyonel) */
  titleKey?: string;
  title?: string;
  /** Dismiss butonu gosterilsin mi? */
  dismissible?: boolean;
  /** sessionStorage anahtari — dismiss'i hatirlamak icin */
  storageKey?: string;
  /** Balonun maskota gore yonu */
  placement?: Placement;
  /** Maskot buyuklugu */
  mascotSize?: number;
  /** Ekstra class */
  className?: string;
  /** Dismiss callback */
  onDismiss?: () => void;
  /** Dismiss buton metni (opsiyonel — verilmezse X ikonu) */
  dismissLabelKey?: string;
}

export function KidsMascotBubble({
  mood = 'happy',
  messageKey,
  message,
  titleKey,
  title,
  dismissible = false,
  storageKey,
  placement = 'right',
  mascotSize = 100,
  className = '',
  onDismiss,
  dismissLabelKey,
}: Props) {
  const { t } = useKidsI18n();
  const sKey = storageKey ?? messageKey ?? 'marfi-bubble-default';
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!dismissible) { setVisible(true); return; }
    try {
      if (!sessionStorage.getItem(sKey)) setVisible(true);
    } catch { setVisible(true); }
  }, [dismissible, sKey]);

  const handleDismiss = () => {
    setVisible(false);
    if (dismissible) {
      try { sessionStorage.setItem(sKey, '1'); } catch { /* ignore */ }
    }
    onDismiss?.();
  };

  if (!visible) return null;

  const text = message ?? (messageKey ? t(messageKey) : '');
  const heading = title ?? (titleKey ? t(titleKey) : '');
  const dismissLabel = dismissLabelKey ? t(dismissLabelKey) : null;

  /* Balon ok yonu */
  const tailLeft = placement === 'left'
    ? 'before:right-[-10px] before:border-l-white dark:before:border-l-zinc-800 before:border-r-0 before:border-y-transparent before:border-y-[10px] before:border-l-[12px]'
    : 'before:left-[-10px] before:border-r-white dark:before:border-r-zinc-800 before:border-l-0 before:border-y-transparent before:border-y-[10px] before:border-r-[12px]';

  const mascotEl = (
    <div className="relative shrink-0 self-end">
      <div className="absolute inset-0 -m-3 rounded-full bg-violet-400/15 blur-xl" aria-hidden />
      <KidsMascot mood={mood} size={mascotSize} />
    </div>
  );

  const bubbleEl = (
    <div
      className={`relative min-w-0 flex-1 rounded-2xl border border-white/80 bg-white px-4 py-3 shadow-lg
        before:absolute before:top-6 before:h-0 before:w-0 before:content-['']
        dark:border-zinc-700/60 dark:bg-zinc-800 ${tailLeft}`}
    >
      {heading && (
        <p className="mb-1 font-logo text-sm font-extrabold text-violet-700 dark:text-violet-300">{heading}</p>
      )}
      <p className="text-sm font-semibold leading-relaxed text-slate-700 dark:text-zinc-200">{text}</p>

      {dismissible && (
        <div className="mt-3 flex justify-end">
          {dismissLabel ? (
            <button
              onClick={handleDismiss}
              className="rounded-full bg-violet-100 px-4 py-1.5 text-xs font-bold text-violet-700 transition hover:bg-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:hover:bg-violet-900/60"
            >
              {dismissLabel}
            </button>
          ) : (
            <button
              onClick={handleDismiss}
              aria-label="Kapat"
              className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition hover:bg-slate-200 dark:bg-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className={`flex items-end gap-3 ${placement === 'left' ? 'flex-row-reverse' : 'flex-row'} ${className}`}>
      {mascotEl}
      {bubbleEl}
    </div>
  );
}

/* ─── Giris Karsilama Modali ──────────────────────────────────── */

interface LoginWelcomeProps {
  userName?: string;
  onContinue: () => void;
}

/**
 * Ogrenci girisi sonrasi bir kerelik karsilama modali.
 * Her session'da bir kez gosterilir.
 */
export function KidsMarfiLoginWelcome({ userName, onContinue }: LoginWelcomeProps) {
  const { t } = useKidsI18n();
  const [visible, setVisible] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    try {
      if (!sessionStorage.getItem('marfi-login-welcome')) {
        const bodies = [
          t('marfi.loginWelcome.body0'),
          t('marfi.loginWelcome.body1'),
          t('marfi.loginWelcome.body2'),
          t('marfi.loginWelcome.body3'),
        ];
        setMsg(bodies[Math.floor(Math.random() * bodies.length)] ?? bodies[0]!);
        setVisible(true);
      }
    } catch { /* ignore */ }
  }, [t]);

  const handleContinue = () => {
    try { sessionStorage.setItem('marfi-login-welcome', '1'); } catch { /* ignore */ }
    setVisible(false);
    onContinue();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-gradient-to-br from-violet-50 to-fuchsia-50 p-6 shadow-2xl dark:from-zinc-900 dark:to-violet-950/60">
        {/* Dekor */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-violet-200/40 blur-3xl dark:bg-violet-700/20" />
        <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-fuchsia-200/30 blur-2xl dark:bg-fuchsia-700/15" />

        <div className="relative z-10 flex flex-col items-center gap-4 text-center">
          {/* Marfi */}
          <div className="relative">
            <div className="absolute inset-0 -m-4 rounded-full bg-gradient-to-br from-violet-300/40 to-fuchsia-300/30 blur-2xl" aria-hidden />
            <KidsMascot mood="excited" size={140} />
          </div>

          {/* Baslik */}
          <div>
            <h2 className="font-logo text-2xl font-extrabold text-violet-800 dark:text-violet-200">
              {t('marfi.loginWelcome.title')}
              {userName ? ` ${userName}!` : '!'}
            </h2>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600 dark:text-zinc-300">{msg}</p>
          </div>

          {/* Buton */}
          <button
            onClick={handleContinue}
            className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 font-logo text-base font-extrabold text-white shadow-lg shadow-violet-400/30 transition hover:opacity-90 active:scale-95"
          >
            {t('marfi.loginWelcome.btn')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Saate gore mesaj secici ─────────────────────────────────── */

export function pickMarfiDashboardMessage(t: (key: string) => string): string {
  const h = new Date().getHours();
  let pool: string[];
  if (h < 12) {
    pool = [t('marfi.dashboard.morning0'), t('marfi.dashboard.morning1')];
  } else if (h < 18) {
    pool = [t('marfi.dashboard.afternoon0'), t('marfi.dashboard.afternoon1')];
  } else {
    pool = [t('marfi.dashboard.evening0'), t('marfi.dashboard.evening1')];
  }
  return pool[Math.floor(Math.random() * pool.length)] ?? pool[0]!;
}

export function pickMarfiTip(t: (key: string) => string): string {
  const keys = [
    'marfi.bubble.tip0',
    'marfi.bubble.tip1',
    'marfi.bubble.tip2',
    'marfi.bubble.tip3',
    'marfi.bubble.tip4',
  ];
  const k = keys[Math.floor(Math.random() * keys.length)] ?? keys[0]!;
  return t(k);
}
