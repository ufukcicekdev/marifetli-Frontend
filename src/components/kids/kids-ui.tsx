'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

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
}: {
  tabs: TabDef[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div
      className="mb-6 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="tablist"
      aria-label="Sınıf bölümleri"
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

/** Kids temasına uygun özel açılır liste. */
export function KidsSelect({
  id,
  value,
  onChange,
  options,
  disabled,
  className = '',
  buttonClassName = '',
}: {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  options: KidsSelectOption[];
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

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

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        id={id}
        type="button"
        disabled={disabled}
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
      {open && !disabled ? (
        <ul
          className="absolute left-0 right-0 top-full z-[80] mt-1 max-h-60 overflow-auto rounded-2xl border-2 border-violet-200 bg-white py-1 shadow-xl shadow-violet-500/15 dark:border-violet-800 dark:bg-gray-900"
          role="listbox"
        >
          {options.map((opt) => {
            const isOn = opt.value === value;
            return (
              <li key={opt.value} role="option" aria-selected={isOn}>
                <button
                  type="button"
                  className={`w-full px-4 py-2.5 text-left text-sm font-medium transition hover:bg-violet-50 dark:hover:bg-violet-950/60 ${
                    isOn ? 'bg-violet-100/90 text-violet-950 dark:bg-violet-900/50 dark:text-violet-50' : 'text-slate-800 dark:text-gray-100'
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
          })}
        </ul>
      ) : null}
    </div>
  );
}
