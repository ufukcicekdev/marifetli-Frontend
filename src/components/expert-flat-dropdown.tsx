'use client';

import { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';

type Option = { id: number; name: string };

/**
 * Tek düz liste + arama (uzman paneli alt kategori vb.).
 * Konum: tetikleyiciye göre fixed + portal (overflow kırpılmasını önler).
 */
export function ExpertFlatDropdown({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  className,
}: {
  value: number | null;
  onChange: (id: number | null) => void;
  options: Option[];
  placeholder: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [box, setBox] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);

  const selectedLabel = value != null ? options.find((o) => o.id === value)?.name ?? placeholder : null;
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.name.toLowerCase().includes(q));
  }, [options, search]);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el || !open) return;
    const rect = el.getBoundingClientRect();
    const margin = 4;
    const top = rect.bottom + margin;
    const space = window.innerHeight - top - 8;
    const maxH = Math.min(Math.max(space, 120), 280);
    setBox({ top, left: rect.left, width: rect.width, maxHeight: maxH });
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      setBox(null);
      return;
    }
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    if (open) {
      setSearch('');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const portal =
    open &&
    box &&
    typeof document !== 'undefined' &&
    createPortal(
      <div
        ref={menuRef}
        className="fixed z-[100] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl flex flex-col overflow-hidden"
        style={{
          top: box.top,
          left: box.left,
          width: box.width,
          maxHeight: box.maxHeight,
        }}
      >
        <div className="p-2 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            placeholder="Ara..."
            className="w-full px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            aria-label="Liste ara"
          />
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1" role="listbox">
          <li>
            <button
              type="button"
              role="option"
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                value == null ? 'bg-brand-pink/50 dark:bg-brand/10 text-brand font-medium' : 'text-gray-600 dark:text-gray-400'
              }`}
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              {placeholder}
            </button>
          </li>
          {filtered.map((o) => (
            <li key={o.id} role="option" aria-selected={value === o.id}>
              <button
                type="button"
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  value === o.id ? 'bg-brand-pink/80 dark:bg-brand/10 text-brand font-medium' : 'text-gray-900 dark:text-gray-100'
                }`}
                onClick={() => {
                  onChange(o.id);
                  setOpen(false);
                }}
              >
                {o.name}
              </button>
            </li>
          ))}
        </ul>
      </div>,
      document.body
    );

  return (
    <div className={className}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-left text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-brand focus:border-transparent disabled:opacity-50"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selectedLabel ? '' : 'text-gray-500 dark:text-gray-400'}>
          {selectedLabel ?? placeholder}
        </span>
        <svg
          className={`w-4 h-4 shrink-0 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {portal}
    </div>
  );
}
