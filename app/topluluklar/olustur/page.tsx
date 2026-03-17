'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/src/lib/api';
import { useAuthStore } from '@/src/stores/auth-store';

type CategoryWithSubs = { id: number; name: string; slug: string; subcategories?: { id: number; name: string; slug: string }[] };

function findCategoryName(tree: CategoryWithSubs[], id: number | null): string | null {
  if (id == null) return null;
  for (const main of tree) {
    if (main.id === id) return main.name;
    for (const sub of main.subcategories || []) {
      if (sub.id === id) return `${main.name} › ${sub.name}`;
    }
  }
  return null;
}

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

function CategoryDropdown({
  categoriesTree,
  value,
  onChange,
  placeholder,
}: {
  categoriesTree: CategoryWithSubs[];
  value: number | null;
  onChange: (id: number | null) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedName = findCategoryName(categoriesTree, value);
  const filteredTree = useMemo(() => filterCategoriesBySearch(categoriesTree, searchQuery), [categoriesTree, searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) {
      setSearchQuery('');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-left text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selectedName ? '' : 'text-gray-500 dark:text-gray-400'}>{selectedName ?? placeholder}</span>
        <svg className={`w-5 h-5 shrink-0 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg z-20 overflow-hidden">
          <div className="p-2 border-b border-gray-100 dark:border-gray-700">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="Kategori ara..."
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              aria-label="Kategori ara"
            />
          </div>
          <ul className="max-h-56 overflow-y-auto py-1" role="listbox">
            {filteredTree.map((main) => (
              <li key={main.id}>
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
                  {main.name}
                </div>
                <ul className="py-0.5">
                  <li role="option" aria-selected={value === main.id}>
                    <button
                      type="button"
                      onClick={() => { onChange(main.id); setOpen(false); }}
                      className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${value === main.id ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 font-medium' : 'text-gray-900 dark:text-gray-100'}`}
                    >
                      {main.name}
                    </button>
                  </li>
                  {(main.subcategories || []).map((sub) => (
                    <li key={sub.id} role="option" aria-selected={value === sub.id}>
                      <button
                        type="button"
                        onClick={() => { onChange(sub.id); setOpen(false); }}
                        className={`block w-full text-left pl-6 pr-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${value === sub.id ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 font-medium' : 'text-gray-900 dark:text-gray-100'}`}
                      >
                        {sub.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export interface CategoryItem {
  id: number;
  name: string;
  slug: string;
  parent?: number | null;
  subcategories?: { id: number; name: string; slug: string }[];
}

export default function ToplulukOlusturPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [rules, setRules] = useState<string[]>(['']);
  const [joinType, setJoinType] = useState<'open' | 'approval'>('open');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.getCategories();
      const raw = res.data;
      const list = Array.isArray(raw) ? raw : (raw as { results?: CategoryItem[] })?.results ?? [];
      return (list as CategoryItem[]).filter((c) => !c.parent) as CategoryWithSubs[];
    },
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.createCommunity({
        name: name.trim(),
        description: description.trim() || undefined,
        category: categoryId!,
        rules: rules.filter((r) => r.trim()).length ? rules.filter((r) => r.trim()) : undefined,
        join_type: joinType,
        avatar: avatarFile ?? undefined,
        cover_image: coverFile ?? undefined,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      const slug = (data as { data?: { slug?: string } }).data?.slug;
      if (slug) router.push(`/topluluk/${slug}`);
      else router.push('/topluluklar');
    },
  });

  const categoriesTree = categoriesData ?? [];
  const canSubmit = name.trim().length >= 2 && categoryId != null;

  const addRule = () => setRules((prev) => [...prev, '']);
  const updateRule = (i: number, v: string) =>
    setRules((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
  const removeRule = (i: number) =>
    setRules((prev) => (prev.length > 1 ? prev.filter((_, j) => j !== i) : prev));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || createMutation.isPending) return;
    createMutation.mutate();
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Topluluk oluşturmak için giriş yapmalısınız.</p>
          <Link href="/topluluklar" className="mt-4 inline-block text-orange-500 hover:underline">
            ← Topluluklara dön
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-xl">
        <Link href="/topluluklar" className="text-sm text-orange-500 hover:underline mb-6 inline-block">
          ← Topluluklara dön
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Topluluk oluştur</h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
          Bir kategori seçin ve topluluğunuzun adını verin. Oluşturduğunuz topluluk seçtiğiniz kategoride listelenecektir.
        </p>

        <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 space-y-4">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Kategori <span className="text-red-500">*</span>
            </label>
            <CategoryDropdown
              categoriesTree={categoriesTree}
              value={categoryId}
              onChange={setCategoryId}
              placeholder="Kategori seçin"
            />
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Topluluk adı <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn. Amigurumi Severler"
              minLength={2}
              maxLength={100}
              required
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
            />
            <p className="mt-1 text-xs text-gray-500">{name.length}/100</p>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Açıklama (isteğe bağlı)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Topluluğunuzu kısaca tanımlayın."
              rows={3}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Katılım türü
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="joinType"
                  checked={joinType === 'open'}
                  onChange={() => setJoinType('open')}
                  className="text-orange-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Herkes doğrudan katılabilir</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="joinType"
                  checked={joinType === 'approval'}
                  onChange={() => setJoinType('approval')}
                  className="text-orange-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Yönetici onayı gerekir</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Topluluk kuralları (isteğe bağlı)
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">1, 2, 3... şeklinde kurallar ekleyin.</p>
            <div className="space-y-2">
              {rules.map((rule, i) => (
                <div key={i} className="flex gap-2">
                  <span className="flex items-center text-sm text-gray-500 w-6">{i + 1}.</span>
                  <input
                    type="text"
                    value={rule}
                    onChange={(e) => updateRule(i, e.target.value)}
                    placeholder={`Kural ${i + 1}`}
                    className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeRule(i)}
                    className="text-gray-400 hover:text-red-500 px-1"
                    aria-label="Kuralı kaldır"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button type="button" onClick={addRule} className="text-sm text-orange-500 hover:text-orange-600">
                + Kural ekle
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Profil resmi (isteğe bağlı)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-gray-600 dark:text-gray-400 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-orange-50 file:text-orange-700 dark:file:bg-orange-900/30 dark:file:text-orange-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Kapak resmi (isteğe bağlı)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-gray-600 dark:text-gray-400 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-orange-50 file:text-orange-700 dark:file:bg-orange-900/30 dark:file:text-orange-300"
              />
            </div>
          </div>

          {createMutation.isError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {(createMutation.error as { response?: { data?: { name?: string[]; category?: string[] } } })?.response?.data?.name?.[0]
                ?? (createMutation.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail
                ?? 'Oluşturulamadı. Lütfen tekrar deneyin.'}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={!canSubmit || createMutation.isPending}
              className="rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Oluşturuluyor…' : 'Oluştur'}
            </button>
            <Link
              href="/topluluklar"
              className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              İptal
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
