'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

function scrollableAncestors(el: HTMLElement | null): HTMLElement[] {
  const out: HTMLElement[] = [];
  let p: HTMLElement | null = el?.parentElement ?? null;
  while (p && p !== document.body) {
    const s = getComputedStyle(p);
    const ox = s.overflowX;
    const oy = s.overflowY;
    if (/(auto|scroll|overlay)/.test(ox) || /(auto|scroll|overlay)/.test(oy)) out.push(p);
    p = p.parentElement;
  }
  out.push(document.documentElement);
  return out;
}

/** Kids formlarında tutarlı odak halkası ve köşe yuvarlaklığı */
export const kidsInputClass =
  'w-full rounded-2xl border-2 border-violet-200/80 bg-white px-4 py-3 text-base text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-400/25 dark:border-violet-800/60 dark:bg-gray-800/90 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-violet-400 dark:focus:ring-violet-500/20';

export const kidsTextareaClass = `${kidsInputClass} min-h-[88px] resize-y`;

export const kidsLabelClass =
  'text-sm font-bold text-slate-800 dark:text-gray-100';

export function KidsPanelMax({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-5xl ${className}`}>{children}</div>;
}

export function KidsPageHeader({
  emoji,
  title,
  subtitle,
}: {
  emoji: string;
  title: string;
  subtitle: string;
}) {
  return (
    <header className="mb-8 sm:mb-10">
      <div className="flex flex-wrap items-start gap-4 sm:gap-5">
        <span
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 via-fuchsia-400 to-amber-400 text-3xl shadow-lg shadow-fuchsia-500/30 ring-4 ring-white/50 dark:ring-violet-950/50"
          aria-hidden
        >
          {emoji}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="font-logo text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            {title}
          </h1>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-slate-600 dark:text-gray-300">
            {subtitle}
          </p>
        </div>
      </div>
    </header>
  );
}

export function KidsCard({
  children,
  className = '',
  tone = 'default',
}: {
  children: ReactNode;
  className?: string;
  tone?: 'default' | 'emerald' | 'sky' | 'amber';
}) {
  const tones = {
    default:
      'border-violet-200/70 bg-white/90 shadow-md shadow-violet-500/10 dark:border-violet-900/40 dark:bg-gray-900/75',
    emerald:
      'border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 to-white dark:from-emerald-950/50 dark:to-gray-900/80 dark:border-emerald-800/50',
    sky: 'border-sky-200/80 bg-gradient-to-br from-sky-50/90 to-white dark:from-sky-950/40 dark:to-gray-900/80 dark:border-sky-800/50',
    amber:
      'border-amber-200/80 bg-gradient-to-br from-amber-50/90 to-white dark:from-amber-950/40 dark:to-gray-900/80 dark:border-amber-800/50',
  };
  return (
    <div
      className={`rounded-3xl border-2 p-6 sm:p-7 ${tones[tone]} backdrop-blur-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function KidsFormField({
  id,
  label,
  hint,
  required,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className={`flex items-center gap-1.5 ${kidsLabelClass}`}>
        {label}
        {required ? <span className="text-rose-500">*</span> : null}
      </label>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className="text-sm leading-snug text-slate-500 dark:text-gray-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function KidsPrimaryButton({
  children,
  className = '',
  disabled,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-8 text-sm font-bold text-white shadow-lg shadow-fuchsia-500/25 transition hover:from-violet-500 hover:to-fuchsia-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:pointer-events-none disabled:opacity-50 dark:shadow-fuchsia-900/40 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function KidsSecondaryButton({
  children,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-11 items-center justify-center rounded-full border-2 border-violet-300 bg-white/80 px-5 text-sm font-semibold text-violet-800 transition hover:bg-violet-50 dark:border-violet-700 dark:bg-gray-800/80 dark:text-violet-200 dark:hover:bg-violet-950/50 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

type TabDef = { id: string; label: string; icon: string };

export function KidsTabs({
  tabs,
  active,
  onChange,
  ariaLabel = 'Sekmeler',
}: {
  tabs: TabDef[];
  active: string;
  onChange: (id: string) => void;
  /** role="tablist" için erişilebilir ad */
  ariaLabel?: string;
}) {
  return (
    <div
      className="mb-6 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="tablist"
      aria-label={ariaLabel}
    >
      {tabs.map((t) => {
        const isOn = active === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isOn}
            onClick={() => onChange(t.id)}
            className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-bold transition ${
              isOn
                ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md shadow-fuchsia-500/20'
                : 'border-2 border-transparent bg-white/70 text-slate-700 hover:border-violet-200 hover:bg-white dark:bg-gray-800/70 dark:text-gray-200 dark:hover:border-violet-800'
            }`}
          >
            <span className="mr-1.5" aria-hidden>
              {t.icon}
            </span>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export function KidsEmptyState({
  emoji,
  title,
  description,
}: {
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-3xl border-2 border-dashed border-violet-200 bg-violet-50/50 px-6 py-12 text-center dark:border-violet-900/50 dark:bg-violet-950/20">
      <span className="text-5xl" aria-hidden>
        {emoji}
      </span>
      <p className="mt-4 font-logo text-lg font-bold text-slate-800 dark:text-white">{title}</p>
      <p className="mt-2 max-w-sm text-sm text-slate-600 dark:text-gray-400">{description}</p>
    </div>
  );
}

export type KidsSelectOption = { value: string; label: string };

type PanelCoords = { top: number; left: number; width: number; maxH: number };

/** Kids temasına uygun özel açılır liste (panel body’de portal + sabit yükseklik; blur/şeffaf karttan etkilenmez). */
export function KidsSelect({
  id,
  value,
  onChange,
  options,
  disabled,
  className = '',
  buttonClassName = '',
  searchable,
  /** Tüm panel (arama + liste) için üst sınır (px). */
  panelMaxHeightPx = 260,
}: {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  options: KidsSelectOption[];
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  /** Açıldığında üstte arama kutusu. `undefined` ise 8’den fazla seçenekte açılır. */
  searchable?: boolean;
  panelMaxHeightPx?: number;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<PanelCoords | null>(null);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const selected = options.find((o) => o.value === value) ?? options[0];

  const searchEnabled = searchable ?? options.length > 8;

  const filteredOptions = useMemo(() => {
    if (!searchEnabled || !query.trim()) return options;
    const q = query.trim().toLocaleLowerCase('tr-TR');
    return options.filter((o) => o.label.toLocaleLowerCase('tr-TR').includes(q));
  }, [options, query, searchEnabled]);

  const updatePosition = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const gap = 6;
    const pad = 8;
    const below = window.innerHeight - r.bottom - gap - pad;
    const maxH = Math.max(140, Math.min(panelMaxHeightPx, below));
    let left = r.left;
    const w = r.width;
    if (left + w > window.innerWidth - pad) left = Math.max(pad, window.innerWidth - w - pad);
    if (left < pad) left = pad;
    setCoords({ top: r.bottom + gap, left, width: w, maxH });
  }, [panelMaxHeightPx]);

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!open || disabled) {
      setCoords(null);
      return;
    }
    updatePosition();
  }, [open, disabled, updatePosition, options.length, searchEnabled]);

  useEffect(() => {
    if (!open || disabled) return;
    const onScrollOrResize = () => updatePosition();
    const parents = scrollableAncestors(rootRef.current);
    parents.forEach((p) => p.addEventListener('scroll', onScrollOrResize, true));
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      parents.forEach((p) => p.removeEventListener('scroll', onScrollOrResize, true));
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open, disabled, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }
    if (!searchEnabled) return;
    const idRaf = requestAnimationFrame(() => searchInputRef.current?.focus());
    return () => cancelAnimationFrame(idRaf);
  }, [open, searchEnabled]);

  if (options.length === 0) {
    return (
      <div
        id={id}
        className={`flex min-h-[48px] items-center rounded-2xl border-2 border-violet-200/60 bg-violet-50/50 px-4 py-3 text-sm text-slate-500 dark:border-violet-900/50 dark:bg-violet-950/20 dark:text-gray-400 ${className}`}
      >
        Liste boş
      </div>
    );
  }

  const dropdown =
    mounted && open && !disabled && coords
      ? createPortal(
          <div
            ref={panelRef}
            role="presentation"
            className="fixed z-[9999] flex min-h-0 flex-col overflow-hidden rounded-2xl border-2 border-violet-300 bg-white shadow-2xl ring-1 ring-black/10 dark:border-violet-600 dark:bg-zinc-950 dark:ring-white/15"
            style={{
              top: coords.top,
              left: coords.left,
              width: coords.width,
              maxHeight: coords.maxH,
            }}
          >
            {searchEnabled ? (
              <div className="shrink-0 border-b-2 border-violet-200 bg-white p-2 dark:border-violet-800 dark:bg-zinc-950">
                <input
                  ref={searchInputRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ara…"
                  aria-label="Listede ara"
                  className="w-full rounded-xl border-2 border-violet-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-violet-500 dark:border-violet-700 dark:bg-zinc-900 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-violet-500"
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </div>
            ) : null}
            <ul
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white py-1 dark:bg-zinc-950"
              role="listbox"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {filteredOptions.length === 0 ? (
                <li className="px-4 py-3 text-sm text-slate-500 dark:text-gray-400">Eşleşme yok</li>
              ) : (
                filteredOptions.map((opt, idx) => {
                  const isOn = opt.value === value;
                  return (
                    <li key={`${opt.value}-${idx}`} role="option" aria-selected={isOn}>
                      <button
                        type="button"
                        className={`w-full px-4 py-2.5 text-left text-sm font-medium transition hover:bg-violet-100 dark:hover:bg-violet-900 ${
                          isOn
                            ? 'bg-violet-200 text-violet-950 dark:bg-violet-800 dark:text-violet-50'
                            : 'bg-white text-slate-800 dark:bg-zinc-950 dark:text-gray-100'
                        }`}
                        onClick={() => {
                          onChange(opt.value);
                          setOpen(false);
                        }}
                      >
                        {opt.label}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        disabled={disabled}
        title={selected?.label ?? undefined}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`flex w-full min-h-[48px] items-center justify-between gap-2 rounded-2xl border-2 border-violet-200/80 bg-white px-4 py-3 text-left text-base font-medium text-slate-900 shadow-sm outline-none transition hover:border-violet-300 focus:border-violet-500 focus:ring-4 focus:ring-violet-400/25 disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-800/60 dark:bg-gray-800/90 dark:text-white dark:hover:border-violet-700 dark:focus:border-violet-400 dark:focus:ring-violet-500/20 ${buttonClassName}`}
      >
        <span className="min-w-0 truncate">{selected?.label ?? '—'}</span>
        <svg
          className={`h-5 w-5 shrink-0 text-violet-600 transition dark:text-violet-300 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {dropdown}
    </div>
  );
}

/**
 * Kids ortalı modal: mobil + masaüstünde kart viewport ortasında.
 * `<dialog showModal()>` → top layer; `kids-dialog-backdrop--centered` ile hizalama.
 *
 * Kullanım: `{open && <KidsCenteredModal title="…" onClose={() => setOpen(false)}>…</KidsCenteredModal>}`
 */
export function KidsCenteredModal({
  title,
  children,
  footer,
  onClose,
  panelClassName = '',
  maxWidthClass = 'max-w-lg',
}: {
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  /** Panel dış sarmalayıcı (örn. max-h) */
  panelClassName?: string;
  /** Kart genişliği: max-w-md | max-w-lg | max-w-2xl */
  maxWidthClass?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (!el.open) el.showModal();
    return () => {
      el.close();
    };
  }, []);

  return createPortal(
    <dialog
      ref={dialogRef}
      className="kids-dialog-overlay bg-transparent"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="kids-dialog-fill">
        <div
          className="kids-dialog-backdrop kids-dialog-backdrop--centered bg-violet-950/60 backdrop-blur-sm"
          role="presentation"
          onClick={onClose}
        >
          <div
            className={`flex max-h-[85dvh] w-full min-w-0 shrink-0 flex-col overflow-hidden rounded-2xl border-2 border-violet-300 bg-white shadow-2xl shadow-fuchsia-500/20 dark:border-violet-700 dark:bg-gray-900 sm:max-h-[90dvh] sm:rounded-3xl ${maxWidthClass} ${panelClassName}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b-2 border-violet-100 bg-gradient-to-r from-violet-100 via-fuchsia-100 to-amber-100 px-4 py-3 dark:border-violet-900 dark:from-violet-950 dark:via-fuchsia-950 dark:to-amber-950/80">
              <h2 className="min-w-0 font-logo text-lg font-bold tracking-tight text-violet-950 dark:text-violet-100">
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-full border-2 border-violet-300 bg-white px-3 py-1.5 text-sm font-black text-violet-800 shadow-sm hover:bg-violet-50 dark:border-violet-700 dark:bg-gray-800 dark:text-violet-200 dark:hover:bg-violet-950"
              >
                ✕ Kapat
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4 [-webkit-overflow-scrolling:touch]">
              {children}
            </div>
            {footer ? (
              <div className="shrink-0 border-t-2 border-violet-100 bg-violet-50/50 p-4 dark:border-violet-900 dark:bg-violet-950/40">
                {footer}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </dialog>,
    document.body,
  );
}
