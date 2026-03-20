'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/src/lib/api';
import { useAuthStore } from '@/src/stores/auth-store';
import { useAuthModalStore } from '@/src/stores/auth-modal-store';

type CategoryItem = { id: number; name: string; slug: string; subcategories?: CategoryItem[] };

export default function UzmanPage() {
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthStore();
  const openAuth = useAuthModalStore((s) => s.open);
  const [mainId, setMainId] = useState<number | ''>('');
  const [subId, setSubId] = useState<number | ''>('');
  const [question, setQuestion] = useState('');
  const [lastAnswer, setLastAnswer] = useState<string | null>(null);

  const { data: cfg, isLoading: cfgLoading } = useQuery({
    queryKey: ['category-experts-config', user?.id ?? 'anon'],
    queryFn: () => api.getCategoryExpertsConfig(),
    staleTime: 30_000,
  });

  const { data: categoriesRaw } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories().then((r) => r.data),
    enabled: Boolean(cfg?.enabled && cfg.categories?.length),
  });

  const subsForMain = useMemo(() => {
    if (!mainId || !categoriesRaw) return [];
    const raw = categoriesRaw as { results?: CategoryItem[] } | CategoryItem[] | undefined;
    const list = Array.isArray(raw)
      ? raw
      : raw && typeof raw === 'object' && Array.isArray((raw as { results?: CategoryItem[] }).results)
        ? (raw as { results: CategoryItem[] }).results
        : [];
    const main = (list as CategoryItem[]).find((c) => c.id === mainId);
    return main?.subcategories ?? [];
  }, [categoriesRaw, mainId]);

  const askMutation = useMutation({
    mutationFn: () =>
      api.askCategoryExpert({
        main_category_id: Number(mainId),
        subcategory_id: subId === '' ? null : Number(subId),
        question: question.trim(),
      }),
    onSuccess: (data) => {
      setLastAnswer(data.answer);
      queryClient.invalidateQueries({ queryKey: ['category-experts-config'] });
      queryClient.invalidateQueries({ queryKey: ['category-expert-history'] });
      toast.success('Yanıt hazır.');
    },
    onError: (err: unknown) => {
      const ax = err as { response?: { status?: number; data?: { detail?: string; code?: string } } };
      const d = ax.response?.data;
      if (ax.response?.status === 429) {
        toast.error(d?.detail || 'Soru hakkınız doldu.');
        return;
      }
      if (ax.response?.status === 503) {
        toast.error(d?.detail || 'Özellik şu an kullanılamıyor.');
        return;
      }
      toast.error(d?.detail || 'Bir hata oluştu.');
    },
  });

  const { data: history } = useQuery({
    queryKey: ['category-expert-history'],
    queryFn: () => api.getCategoryExpertHistory(),
    enabled: Boolean(isAuthenticated && user?.is_verified && cfg?.enabled),
  });

  if (cfgLoading || !cfg) {
    return (
      <div className="container mx-auto px-4 py-10 text-center text-gray-500 dark:text-gray-400">Yükleniyor…</div>
    );
  }

  if (!cfg.enabled) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-lg">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Kategori uzmanı</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Bu özellik şu an kapalı. Yönetici olarak açmak için sunucuda{' '}
          <code className="text-sm bg-gray-100 dark:bg-gray-800 px-1 rounded">CATEGORY_EXPERT_ENABLED=True</code> ayarlayın.
        </p>
        <Link href="/sorular" className="inline-block mt-6 text-brand hover:text-brand-hover font-medium">
          ← Sorulara dön
        </Link>
      </div>
    );
  }

  if (!cfg.backend_ready) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-lg">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Kategori uzmanı</h1>
        <p className="text-amber-700 dark:text-amber-300">
          Özellik açık ancak yanıt üreticisi hazır değil (ör. Gemini API anahtarı veya sağlayıcı yapılandırması).
        </p>
        <Link href="/sorular" className="inline-block mt-6 text-brand hover:text-brand-hover font-medium">
          ← Sorulara dön
        </Link>
      </div>
    );
  }

  const remaining = cfg.authenticated ? cfg.remaining_questions ?? 0 : null;
  const maxQ = cfg.max_questions_for_user ?? cfg.max_questions_per_user;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      openAuth('login');
      return;
    }
    if (!user?.is_verified) {
      toast.error('E-postanızı doğrulamanız gerekir.');
      return;
    }
    if (mainId === '') {
      toast.error('Kategori seçin.');
      return;
    }
    if (question.trim().length < 3) {
      toast.error('Sorunuzu yazın (en az birkaç karakter).');
      return;
    }
    askMutation.mutate();
  };

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-3xl">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Kategori uzmanı</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Ana kategorilere özel yardımcı; yanıtlar yapay zeka ile üretilir. Marifetli uzmanı olarak samimi, uygulanabilir öneriler
            sunması beklenir.
          </p>
        </div>
        <Link href="/sorular" className="text-sm font-medium text-brand hover:text-brand-hover shrink-0">
          ← Sorular
        </Link>
      </div>

      {!isAuthenticated && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-900 dark:text-amber-100">
          Soru sormak için{' '}
          <button type="button" onClick={() => openAuth('login')} className="font-semibold underline">
            giriş yapın
          </button>
          .
        </div>
      )}

      {isAuthenticated && !user?.is_verified && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm">
          Bu özellik için e-posta doğrulaması gerekir.
        </div>
      )}

      {cfg.authenticated && maxQ > 0 && (
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Kalan soru hakkınız: <strong className="text-gray-900 dark:text-white">{remaining}</strong> / {maxQ}
          {cfg.limit_period === 'day' && ' (bugün)'}
          {cfg.limit_period === 'month' && ' (bu ay)'}
          {cfg.limit_period === 'all_time' && ' (toplam)'}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ana kategori</label>
          <select
            value={mainId}
            onChange={(e) => {
              const v = e.target.value;
              setMainId(v === '' ? '' : Number(v));
              setSubId('');
              setLastAnswer(null);
            }}
            className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            required
          >
            <option value="">Seçin…</option>
            {cfg.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.expert_display_name}
              </option>
            ))}
          </select>
        </div>

        {subsForMain.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Alt kategori <span className="text-gray-400 font-normal">(isteğe bağlı)</span>
            </label>
            <select
              value={subId}
              onChange={(e) => {
                const v = e.target.value;
                setSubId(v === '' ? '' : Number(v));
              }}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="">— Tümü / genel —</option>
              {subsForMain.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sorunuz</label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={5}
            maxLength={4000}
            placeholder="Örn: İlk defa tığ örgüye başlıyorum, hangi malzemeleri almalıyım?"
            className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 resize-y min-h-[120px]"
          />
        </div>

        <button
          type="submit"
          disabled={
            askMutation.isPending || !isAuthenticated || !user?.is_verified || (maxQ > 0 && (remaining ?? 0) <= 0)
          }
          className="w-full sm:w-auto px-6 py-3 rounded-lg bg-brand hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium"
        >
          {askMutation.isPending ? 'Yanıt bekleniyor…' : 'Uzmana sor'}
        </button>
      </form>

      {lastAnswer && (
        <div className="mt-6 p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Yanıt</h2>
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-gray-900 dark:text-gray-100">
            {lastAnswer}
          </div>
        </div>
      )}

      {history?.results?.length ? (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Son sorularınız</h2>
          <ul className="space-y-3">
            {history.results.map((row) => (
              <li
                key={row.id}
                className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              >
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {row.main_category}
                  {row.subcategory ? ` › ${row.subcategory}` : ''}
                  {' · '}
                  {new Date(row.created_at).toLocaleString('tr-TR')}
                </p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{row.question}</p>
                <p className="mt-2 text-gray-600 dark:text-gray-300 whitespace-pre-wrap line-clamp-4">{row.answer}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
