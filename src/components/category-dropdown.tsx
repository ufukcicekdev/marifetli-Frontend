'use client';

import { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';

export type CategoryWithSubs = {
  id: number;
  name: string;
  slug: string;
  subcategories?: { id: number; name: string; slug: string }[];
};

/** API cevabından sadece ana kategorileri (altlarıyla) üretir */
export function buildCategoriesTree(categoriesRaw: unknown): CategoryWithSubs[] {
  const list = Array.isArray(categoriesRaw)
    ? categoriesRaw
    : categoriesRaw && typeof categoriesRaw === 'object' && Array.isArray((categoriesRaw as { results?: unknown[] }).results)
      ? (categoriesRaw as { results: unknown[] }).results
      : [];
  return (list as CategoryWithSubs[]).filter((c) => !(c as { parent?: number }).parent);
}

/** Seçili kategori adını ağaçtan bulur */
export function findCategoryName(tree: CategoryWithSubs[], id: number | null): string | null {
  if (id == null) return null;
  for (const main of tree) {
    if (main.id === id) return main.name;
    for (const sub of main.subcategories || []) {
      if (sub.id === id) return `${main.name} › ${sub.name}`;
    }
  }
  return null;
}

/** Sorular sayfası scope etiketi: t/slug */
export function findCategoryTopicSlug(tree: CategoryWithSubs[], id: number | null): string | null {
  if (id == null) return null;
  for (const main of tree) {
    if (main.id === id) return main.slug;
    for (const sub of main.subcategories || []) {
      if (sub.id === id) return sub.slug;
    }
  }
  return null;
}

/** Arama metnine göre kategori listesini filtreler (ana + alt adı) */
function filterCategoriesBySearch(tree: CategoryWithSubs[], q: string): CategoryWithSubs[] {
  const term = q.trim().toLowerCase();
  if (!term) return tree;
  const result: CategoryWithSubs[] = [];
  for (const main of tree) {
    const mainMatch = main.name.toLowerCase().includes(term);
    const subs = (main.subcategories ?? []).filter((sub) => mainMatch || sub.name.toLowerCase().includes(term));
    if (mainMatch) {
      result.push({ ...main, subcategories: main.subcategories ?? [] });
    } else if (subs.length > 0) {
      result.push({ ...main, subcategories: subs });
    }
  }
  return result;
}

/** Ana kategori / alt kategori gruplu dropdown + arama (soru sorma ile aynı) */
export function CategoryDropdown({
  categoriesTree,
  value,
  onChange,
  placeholder,
  disabled,
  allowClear,
  clearLabel = 'Tüm kategoriler',
}: {
  categoriesTree: CategoryWithSubs[];
  value: number | null;
  onChange: (id: number | null) => void;
  placeholder: string;
  disabled?: boolean;
  /** true: listede üstte "tümü" seçeneği */
  allowClear?: boolean;
  clearLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [menuBox, setMenuBox] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const selectedName = findCategoryName(categoriesTree, value);
  const filteredTree = useMemo(() => filterCategoriesBySearch(categoriesTree, searchQuery), [categoriesTree, searchQuery]);

  const updateMenuPosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el || !open) return;
    const rect = el.getBoundingClientRect();
    const margin = 4;
    const top = rect.bottom + margin;
    const spaceBelow = window.innerHeight - top - 8;
    const capPx = 22 * 16; // ~22rem
    const maxHeight = Math.min(Math.max(spaceBelow, 96), capPx);
    setMenuBox({
      top,
      left: rect.left,
      width: rect.width,
      maxHeight,
    });
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      setMenuBox(null);
      return;
    }
    updateMenuPosition();
    window.addEventListener('scroll', updateMenuPosition, true);
    window.addEventListener('resize', updateMenuPosition);
    return () => {
      window.removeEventListener('scroll', updateMenuPosition, true);
      window.removeEventListener('resize', updateMenuPosition);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      setSearchQuery('');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const menuPortal =
    open &&
    menuBox &&
    typeof document !== 'undefined' &&
    createPortal(
      <div
        ref={menuRef}
        role="presentation"
        className="fixed z-[100] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl flex flex-col overflow-hidden"
        style={{
          top: menuBox.top,
          left: menuBox.left,
          width: menuBox.width,
          maxHeight: menuBox.maxHeight,
        }}
      >
        <div className="p-2 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            placeholder="Kategori ara..."
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-brand focus:border-transparent"
            aria-label="Kategori ara"
          />
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1" role="listbox">
          {allowClear && (
            <li>
              <button
                type="button"
                role="option"
                aria-selected={value == null}
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className={`block w-full text-left px-4 py-2.5 text-sm border-b border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  value == null ? 'bg-brand-pink/50 dark:bg-brand/10 text-brand font-medium' : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                {clearLabel}
              </button>
            </li>
          )}
          {filteredTree.map((main) => {
            const subs = main.subcategories ?? [];
            const hasSubs = subs.length > 0;
            return (
              <li key={main.id}>
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
                  {main.name}
                </div>
                <ul className="py-0.5">
                  {hasSubs ? (
                    subs.map((sub) => (
                      <li key={sub.id} role="option" aria-selected={value === sub.id}>
                        <button
                          type="button"
                          onClick={() => {
                            onChange(sub.id);
                            setOpen(false);
                          }}
                          className={`block w-full text-left pl-6 pr-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                            value === sub.id ? 'bg-brand-pink/80 dark:bg-brand/10 text-brand font-medium' : 'text-gray-900 dark:text-gray-100'
                          }`}
                        >
                          {sub.name}
                        </button>
                      </li>
                    ))
                  ) : (
                    <li role="option" aria-selected={value === main.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onChange(main.id);
                          setOpen(false);
                        }}
                        className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                          value === main.id ? 'bg-brand-pink/80 dark:bg-brand/10 text-brand font-medium' : 'text-gray-900 dark:text-gray-100'
                        }`}
                      >
                        {main.name}
                      </button>
                    </li>
                  )}
                </ul>
              </li>
            );
          })}
        </ul>
      </div>,
      document.body
    );

  return (
    <div className="relative z-10">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-left text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-brand focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selectedName ? '' : 'text-gray-500 dark:text-gray-400'}>{selectedName ?? placeholder}</span>
        <svg className={`w-5 h-5 shrink-0 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {menuPortal}
    </div>
  );
}
