'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/src/lib/api';
import { useAuthStore } from '@/src/stores/auth-store';
import { useAuthModalStore } from '@/src/stores/auth-modal-store';
import { useCategoryExpertPanelStore } from '@/src/stores/category-expert-panel-store';
import { CategoryDropdown, buildCategoriesTree, type CategoryWithSubs } from '@/src/components/category-dropdown';
import { ExpertFlatDropdown } from '@/src/components/expert-flat-dropdown';

type CategoryItem = { id: number; name: string; slug: string; subcategories?: CategoryItem[] };

type ChatMsg = { id: string; role: 'user' | 'assistant'; text: string };

/**
 * Sağda sabit chatbot paneli + kapalıyken “Uzmana sor” FAB.
 * Özellik kapalıysa hiç render etmez.
 */
export function CategoryExpertChatPanel() {
  const pathname = usePathname();
  const isKidsPortal = pathname === '/kids' || pathname.startsWith('/kids/');
  const topOffset = isKidsPortal ? 52 : 104;
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const bottomOffset = isMobileViewport ? 'calc(4.75rem + env(safe-area-inset-bottom))' : '0px';
  const fullPageHref = isKidsPortal ? '/kids/uzman' : '/uzman';
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthStore();
  const openAuth = useAuthModalStore((s) => s.open);

  const open = useCategoryExpertPanelStore((s) => s.open);
  const closePanel = useCategoryExpertPanelStore((s) => s.closePanel);
  const togglePanel = useCategoryExpertPanelStore((s) => s.togglePanel);
  const preselectMainCategoryId = useCategoryExpertPanelStore((s) => s.preselectMainCategoryId);
  const clearPreselect = useCategoryExpertPanelStore((s) => s.clearPreselect);

  const [mainId, setMainId] = useState<number | ''>('');
  const [subId, setSubId] = useState<number | ''>('');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [fabHidden, setFabHidden] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const { data: cfg, isLoading: cfgLoading } = useQuery({
    queryKey: ['category-experts-config', user?.id ?? 'anon'],
    queryFn: () => api.getCategoryExpertsConfig(),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const { data: categoriesRaw } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories().then((r) => r.data),
    enabled: Boolean(cfg?.enabled && cfg?.categories?.length),
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

  /** Sadece uzmanı olan ana kategoriler; altlar seçimde yok (tek liste) */
  const expertMainTree = useMemo((): CategoryWithSubs[] => {
    if (!categoriesRaw || !cfg?.categories?.length) return [];
    const all = buildCategoriesTree(categoriesRaw);
    const byId = new Map(all.map((m) => [m.id, m]));
    const cfgCategories = isKidsPortal
      ? cfg.categories.filter((c) => (c.slug || '').startsWith('kids-'))
      : cfg.categories;
    return cfgCategories
      .map((c) => byId.get(c.id))
      .filter((m): m is CategoryWithSubs => Boolean(m))
      .map((m) => ({ ...m, subcategories: [] }));
  }, [categoriesRaw, cfg?.categories, isKidsPortal]);

  useEffect(() => {
    if (!open || preselectMainCategoryId == null) return;
    setMainId(preselectMainCategoryId);
    setSubId('');
    clearPreselect();
  }, [open, preselectMainCategoryId, clearPreselect]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, closePanel]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    const updateViewport = () => {
      if (typeof window === 'undefined') return;
      setIsMobileViewport(window.matchMedia('(max-width: 767px)').matches);
    };
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const remaining = cfg?.authenticated ? cfg.remaining_questions ?? 0 : null;
  const maxQ = cfg?.max_questions_for_user ?? cfg?.max_questions_per_user ?? 3;

  const askMutation = useMutation({
    mutationFn: (q: string) =>
      api.askCategoryExpert({
        main_category_id: Number(mainId),
        subcategory_id: subId === '' ? null : Number(subId),
        question: q.trim(),
      }),
    onSuccess: (data, q) => {
      setMessages((m) => [
        ...m,
        { id: `a-${Date.now()}`, role: 'assistant', text: data.answer },
      ]);
      setInput('');
      queryClient.invalidateQueries({ queryKey: ['category-experts-config'] });
      queryClient.invalidateQueries({ queryKey: ['category-expert-history'] });
    },
    onError: (err: unknown) => {
      setMessages((m) => (m.length && m[m.length - 1]?.role === 'user' ? m.slice(0, -1) : m));
      const ax = err as { response?: { status?: number; data?: { detail?: string } } };
      const d = ax.response?.data;
      if (ax.response?.status === 429) toast.error(d?.detail || 'Soru hakkınız doldu.');
      else if (ax.response?.status === 503) toast.error(d?.detail || 'Özellik kullanılamıyor.');
      else toast.error(d?.detail || 'Bir hata oluştu.');
    },
  });

  const send = useCallback(() => {
    if (!isAuthenticated) {
      openAuth('login');
      return;
    }
    if (!user?.is_verified) {
      toast.error('E-postanızı doğrulamanız gerekir.');
      return;
    }
    if (mainId === '') {
      toast.error('Önce kategori seçin.');
      return;
    }
    const q = input.trim();
    if (q.length < 3) {
      toast.error('Sorunuzu yazın.');
      return;
    }
    if (maxQ > 0 && (remaining ?? 0) <= 0) {
      toast.error('Soru hakkınız doldu.');
      return;
    }
    setMessages((m) => [...m, { id: `u-${Date.now()}`, role: 'user', text: q }]);
    askMutation.mutate(q);
  }, [isAuthenticated, user?.is_verified, mainId, input, maxQ, remaining, openAuth, askMutation]);

  const newChat = () => {
    setMessages([]);
    setInput('');
  };

  if (cfgLoading || !cfg?.enabled || !cfg?.backend_ready) {
    return null;
  }

  return (
    <>
      {/* FAB */}
      {!open && !fabHidden && (
        <button
          type="button"
          onClick={() => togglePanel()}
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-88 flex items-center gap-2 rounded-full border border-white/20 bg-brand px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-brand-hover sm:bottom-6 sm:right-6"
          aria-expanded={open}
          aria-controls="category-expert-chat-panel"
        >
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setFabHidden(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                setFabHidden(true);
              }
            }}
            className="-ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[11px] leading-none hover:bg-white/30"
            aria-label="Uzmana sor düğmesini gizle"
          >
            ×
          </span>
          <span className="text-lg leading-none" aria-hidden>
            🧠
          </span>
          Uzmana sor
        </button>
      )}

      {/* Arka plan (mobil) */}
      {open && (
        <button
          type="button"
          aria-label="Paneli kapat"
          className="fixed inset-0 z-92 bg-black/40 md:hidden"
          style={{ top: topOffset, bottom: bottomOffset }}
          onClick={closePanel}
        />
      )}

      {/* Panel */}
      <aside
        id="category-expert-chat-panel"
        className={`fixed right-0 bottom-0 z-93 w-full max-w-md flex flex-col bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-2xl transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
        style={{ top: topOffset, bottom: bottomOffset }}
        aria-hidden={!open}
      >
        <header className="shrink-0 flex items-start gap-2 p-3 border-b border-gray-200 dark:border-gray-800">
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Kategori uzmanı</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Marifetli AI yardımcısı — kategori seçip yazın.
            </p>
            {cfg.authenticated && maxQ > 0 && (
              <p className="text-xs text-brand mt-1">
                Kalan: <strong>{remaining}</strong> / {maxQ}
                {cfg.limit_period === 'day' && ' (bugün)'}
                {cfg.limit_period === 'month' && ' (bu ay)'}
                {cfg.limit_period === 'all_time' && ' (toplam)'}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <button
              type="button"
              onClick={closePanel}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
              aria-label="Kapat"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <Link
              href={fullPageHref}
              onClick={closePanel}
              className="text-xs font-medium text-brand hover:underline whitespace-nowrap"
            >
              Tam sayfa →
            </Link>
          </div>
        </header>

        <div className="shrink-0 p-3 space-y-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/40">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="min-w-0">
              <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">Ana kategori</label>
              <CategoryDropdown
                categoriesTree={expertMainTree}
                value={mainId === '' ? null : mainId}
                onChange={(id) => {
                  setMainId(id == null ? '' : id);
                  setSubId('');
                  newChat();
                }}
                placeholder="Seçin…"
                allowClear
                clearLabel="Seçin…"
              />
            </div>
            {subsForMain.length > 0 && (
              <div className="min-w-0">
                <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">Alt konu</label>
                <ExpertFlatDropdown
                  value={subId === '' ? null : subId}
                  onChange={(id) => setSubId(id == null ? '' : id)}
                  options={subsForMain.map((s) => ({ id: s.id, name: s.name }))}
                  placeholder="— Genel —"
                />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={newChat}
            className="text-xs text-gray-600 dark:text-gray-400 hover:text-brand underline"
          >
            Yeni sohbet
          </button>
        </div>

        <div
          ref={listRef}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-3 [scrollbar-gutter:stable]"
        >
          {messages.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8 px-2">
              {!isAuthenticated && 'Giriş yapın ve kategori seçerek sorunuzu yazın.'}
              {isAuthenticated && !user?.is_verified && 'E-posta doğrulaması gerekir.'}
              {isAuthenticated && user?.is_verified && 'Merhaba! Aşağıdan sorunuzu yazabilirsiniz.'}
            </p>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-brand text-white rounded-br-md'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {askMutation.isPending && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-md px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-500 animate-pulse">
                Uzman yazıyor…
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 p-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={2}
              maxLength={4000}
              placeholder="Sorunuzu yazın…"
              className="flex-1 min-w-0 text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
              disabled={askMutation.isPending}
            />
            <button
              type="button"
              onClick={send}
              disabled={
                askMutation.isPending || !isAuthenticated || !user?.is_verified || (maxQ > 0 && (remaining ?? 0) <= 0)
              }
              className="shrink-0 self-end px-4 py-2 rounded-xl bg-brand hover:bg-brand-hover disabled:opacity-50 text-white text-sm font-medium"
            >
              Gönder
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
