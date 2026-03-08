'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/src/lib/api';
import { useAuthStore } from '@/src/stores/auth-store';

export interface CategoryItem {
  id: number;
  name: string;
  slug: string;
  parent: number | null;
}

export default function ToplulukOlusturPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.getCategories();
      const raw = res.data;
      const list = Array.isArray(raw) ? raw : (raw as { results?: CategoryItem[] })?.results ?? [];
      return (list as CategoryItem[]).filter((c) => !c.parent);
    },
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.createCommunity({
        name: name.trim(),
        description: description.trim() || undefined,
        category: Number(categoryId),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      router.push(`/topluluk/${data.data.slug}`);
    },
  });

  const categories = categoriesData ?? [];
  const canSubmit = name.trim().length >= 2 && categoryId !== '';

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
            <select
              id="category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value === '' ? '' : Number(e.target.value))}
              required
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
            >
              <option value="">Kategori seçin</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
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
