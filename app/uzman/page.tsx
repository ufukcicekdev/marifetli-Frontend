'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Brain,
  GraduationCap,
  Image as ImageIcon,
  MoreHorizontal,
  Palette,
  Paperclip,
  Send,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/src/lib/api';
import { useAuthStore } from '@/src/stores/auth-store';
import { useAuthModalStore } from '@/src/stores/auth-modal-store';
import type { CategoryExpertHistoryItem } from '@/src/types';
import { buildCategoriesTree, type CategoryWithSubs } from '@/src/components/category-dropdown';
import { ExpertFlatDropdown } from '@/src/components/expert-flat-dropdown';

type CategoryItem = { id: number; name: string; slug: string; subcategories?: CategoryItem[] };

const EXPERT_ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;
const EXPERT_ATTACHMENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;

function validateExpertAttachment(f: File): string | null {
  if (f.size > EXPERT_ATTACHMENT_MAX_BYTES) return 'Görsel en fazla 5 MB olabilir.';
  if (!EXPERT_ATTACHMENT_TYPES.includes(f.type as (typeof EXPERT_ATTACHMENT_TYPES)[number])) {
    return 'Sadece JPEG, PNG, WebP veya GIF yükleyebilirsiniz.';
  }
  return null;
}

const QUESTION_MAX_LEN = 4000;

const CATEGORY_CARD_ICONS = [Brain, GraduationCap, Palette, MoreHorizontal] as const;

function categoryDisplayLabel(fullName: string): string {
  const i = fullName.indexOf(' — ');
  if (i === -1) return fullName.trim();
  return fullName.slice(0, i).trim();
}

function CategoryCardIcon({
  displayName,
  slug,
  index,
  selected,
}: {
  displayName: string;
  slug: string;
  index: number;
  selected: boolean;
}) {
  const t = `${displayName} ${slug}`.toLowerCase();
  let Icon = CATEGORY_CARD_ICONS[index % CATEGORY_CARD_ICONS.length]!;
  if (/gelişim|gelisim|development|beyin/i.test(t)) Icon = Brain;
  else if (/eğitim|egitim|education|okul|kids/i.test(t)) Icon = GraduationCap;
  else if (/sanat|art|resim|müzik|muzik|hobi/i.test(t)) Icon = Palette;
  else if (/diğer|diger|other|genel/i.test(t)) Icon = MoreHorizontal;
  return (
    <Icon
      className={`mx-auto h-9 w-9 sm:h-10 sm:w-10 ${selected ? 'text-white' : 'text-violet-600 dark:text-violet-400'}`}
      strokeWidth={1.75}
      aria-hidden
    />
  );
}

export default function UzmanPage() {
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const kidsMode = pathname.startsWith('/kids/');
  const { isAuthenticated, user } = useAuthStore();
  const openAuth = useAuthModalStore((s) => s.open);
  const [mainId, setMainId] = useState<number | ''>('');
  const [subId, setSubId] = useState<number | ''>('');
  const [question, setQuestion] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const [lastAnswer, setLastAnswer] = useState<string | null>(null);
  const [historyDetail, setHistoryDetail] = useState<CategoryExpertHistoryItem | null>(null);
  const [showAllHistory, setShowAllHistory] = useState(false);

  const { data: cfg, isLoading: cfgLoading } = useQuery({
    queryKey: ['category-experts-config', user?.id ?? 'anon'],
    queryFn: () => api.getCategoryExpertsConfig(),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const { data: categoriesRaw, isLoading: categoriesLoading } = useQuery({
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

  /** Tam sayfa uzman: sadece uzmanı olan ana kategoriler; isimde uzman etiketi */
  const expertMainTree = useMemo((): CategoryWithSubs[] => {
    if (!categoriesRaw || !cfg?.categories?.length) return [];
    const all = buildCategoriesTree(categoriesRaw);
    const byId = new Map(all.map((m) => [m.id, m]));
    const filteredCfg = kidsMode
      ? cfg.categories.filter((c) => (c.slug || '').startsWith('kids-'))
      : cfg.categories;
    return filteredCfg.flatMap((c) => {
      const m = byId.get(c.id);
      if (!m) return [];
      const node: CategoryWithSubs = {
        id: m.id,
        slug: m.slug,
        name: `${m.name} — ${c.expert_display_name}`,
        subcategories: [],
      };
      return [node];
    });
  }, [categoriesRaw, cfg?.categories, kidsMode]);

  const askMutation = useMutation({
    mutationFn: () =>
      api.askCategoryExpert({
        main_category_id: Number(mainId),
        subcategory_id: subId === '' ? null : Number(subId),
        question: question.trim(),
        attachment: attachmentFile ?? undefined,
      }),
    onSuccess: (data) => {
      setLastAnswer(data.answer);
      setAttachmentFile(null);
      if (attachmentInputRef.current) attachmentInputRef.current.value = '';
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

  useEffect(() => {
    if (!historyDetail) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setHistoryDetail(null);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [historyDetail]);

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
        <Link href={kidsMode ? '/kids' : '/sorular'} className="inline-block mt-6 text-brand hover:text-brand-hover font-medium">
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
        <Link href={kidsMode ? '/kids' : '/sorular'} className="inline-block mt-6 text-brand hover:text-brand-hover font-medium">
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
    const q = question.trim();
    if (!attachmentFile && q.length < 3) {
      toast.error('Sorunuzu yazın (en az birkaç karakter).');
      return;
    }
    if (attachmentFile && q.length < 1) {
      toast.error('Görsel eklediyseniz kısa bir soru da yazın.');
      return;
    }
    askMutation.mutate();
  };

  const historyResults = history?.results ?? [];
  const historyPreviewLimit = 3;
  const visibleHistory = showAllHistory ? historyResults : historyResults.slice(0, historyPreviewLimit);
  const hasMoreHistory = historyResults.length > historyPreviewLimit;

  function openAttachmentPicker() {
    attachmentInputRef.current?.click();
  }

  return (
    <>
      <div className="mx-auto min-h-[calc(100dvh-4rem)] max-w-6xl px-4 py-8 pb-12 sm:px-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 max-w-2xl">
            <h1
              id="uzman-main-heading"
              className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl"
            >
              Uzmana sor
            </h1>
            <p id="uzman-hero-lead" className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Kategori seç, sorunu yaz ve uzmanımızdan yanıt bekleyin. Eğitmenlerimiz en kısa sürede seninle iletişime
              geçecek. Yanıtlar yapay zeka ile üretilir; samimi ve uygulanabilir öneriler sunulur.
            </p>
          </div>
          <Link
            href={kidsMode ? '/kids' : '/sorular'}
            className="shrink-0 text-sm font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
          >
            ← {kidsMode ? 'Kids Anasayfa' : 'Sorular'}
          </Link>
        </div>

        {!isAuthenticated && (
          <div className="mb-6 rounded-2xl border border-amber-200/80 bg-amber-50/90 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
            Soru sormak için{' '}
            <button type="button" onClick={() => openAuth('login')} className="font-bold underline underline-offset-2">
              giriş yapın
            </button>
            .
          </div>
        )}

        {isAuthenticated && !user?.is_verified && (
          <div className="mb-6 rounded-2xl border border-amber-200/80 bg-amber-50/90 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
            Bu özellik için e-posta doğrulaması gerekir.
          </div>
        )}

        {cfg.authenticated && maxQ > 0 ? (
          <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
            Kalan soru hakkınız: <strong className="text-slate-900 dark:text-white">{remaining}</strong> / {maxQ}
            {cfg.limit_period === 'day' && ' (bugün)'}
            {cfg.limit_period === 'month' && ' (bu ay)'}
            {cfg.limit_period === 'all_time' && ' (toplam)'}
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:items-start">
          <div className="space-y-5">
            <div>
              <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-violet-600 dark:text-violet-400">
                Kategori seçimi
              </h2>
              {categoriesLoading && expertMainTree.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Kategoriler yükleniyor…</p>
              ) : expertMainTree.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Uygun kategori bulunamadı.</p>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-3 sm:gap-4">
                  {expertMainTree.map((cat, index) => {
                    const label = categoryDisplayLabel(cat.name);
                    const selected = mainId === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        disabled={categoriesLoading}
                        onClick={() => {
                          setMainId(cat.id);
                          setSubId('');
                          setLastAnswer(null);
                        }}
                        className={`flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-2xl p-4 text-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-950 disabled:opacity-60 ${
                          selected
                            ? 'bg-gradient-to-br from-violet-600 to-purple-700 text-white shadow-lg shadow-violet-500/30'
                            : 'border border-slate-200/90 bg-white shadow-sm hover:border-violet-200 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900/80 dark:hover:border-violet-700'
                        }`}
                      >
                        <CategoryCardIcon
                          displayName={label}
                          slug={cat.slug}
                          index={index}
                          selected={selected}
                        />
                        <span
                          className={`text-xs font-bold leading-tight sm:text-sm ${selected ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`}
                        >
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {subsForMain.length > 0 ? (
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
                <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-violet-600 dark:text-violet-400">
                  Alt kategori <span className="font-semibold normal-case text-slate-400">(isteğe bağlı)</span>
                </label>
                <div className="mt-2">
                  <ExpertFlatDropdown
                    className="w-full"
                    value={subId === '' ? null : subId}
                    onChange={(id) => setSubId(id == null ? '' : id)}
                    options={subsForMain.map((s) => ({ id: s.id, name: s.name }))}
                    placeholder="— Tümü / genel —"
                    disabled={mainId === ''}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-[1.25rem] border border-slate-200/90 bg-white p-5 shadow-[0_8px_30px_-12px_rgba(124,58,237,0.18)] dark:border-zinc-700 dark:bg-zinc-900/85 sm:p-6">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-violet-600 dark:text-violet-400">
              Sorunuzu detaylandırın
            </h2>
            <div className="relative mt-4">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={8}
                maxLength={QUESTION_MAX_LEN}
                placeholder="Sorunuzu buraya yazın..."
                className="min-h-[200px] w-full resize-y rounded-2xl border-0 bg-slate-100/90 px-4 py-3 pb-9 text-sm text-slate-900 shadow-inner shadow-slate-200/60 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-violet-400/35 dark:bg-zinc-800/90 dark:text-slate-100 dark:shadow-none dark:placeholder:text-zinc-500 dark:focus:bg-zinc-900 dark:focus:ring-violet-600/40"
                aria-label="Sorunuz"
              />
              <span className="pointer-events-none absolute bottom-3 right-4 text-xs font-medium text-slate-400 dark:text-zinc-500">
                {question.length} / {QUESTION_MAX_LEN}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Görsel eklerseniz kısa bir soru yeterli; uzman yanıtı görsele göre üretilir.
            </p>

            <input
              ref={attachmentInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) {
                  setAttachmentFile(null);
                  return;
                }
                const err = validateExpertAttachment(f);
                if (err) {
                  toast.error(err);
                  e.target.value = '';
                  setAttachmentFile(null);
                  return;
                }
                setAttachmentFile(f);
              }}
            />

            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={openAttachmentPicker}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-purple-700 text-white shadow-md shadow-violet-500/25 transition hover:brightness-105"
                  aria-label="Dosya ekle"
                >
                  <Paperclip className="h-5 w-5" strokeWidth={2} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={openAttachmentPicker}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-lime-600 to-emerald-700 text-white shadow-md shadow-emerald-500/20 transition hover:brightness-105"
                  aria-label="Görsel ekle"
                >
                  <ImageIcon className="h-5 w-5" strokeWidth={2} aria-hidden />
                </button>
                {attachmentFile ? (
                  <div className="flex min-w-0 max-w-[200px] flex-col gap-1 sm:max-w-xs">
                    <span className="truncate text-xs font-medium text-slate-600 dark:text-slate-300">
                      {attachmentFile.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAttachmentFile(null);
                        if (attachmentInputRef.current) attachmentInputRef.current.value = '';
                      }}
                      className="w-fit text-xs font-bold text-violet-600 underline dark:text-violet-400"
                    >
                      Kaldır
                    </button>
                  </div>
                ) : null}
              </div>
              <button
                type="submit"
                disabled={
                  askMutation.isPending || !isAuthenticated || !user?.is_verified || (maxQ > 0 && (remaining ?? 0) <= 0)
                }
                className="inline-flex min-h-[3rem] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 px-8 text-sm font-bold text-white shadow-lg shadow-violet-500/30 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[200px]"
              >
                {askMutation.isPending ? 'Yanıt bekleniyor…' : 'Soruyu gönder'}
                <Send className="h-5 w-5 shrink-0" strokeWidth={2.25} aria-hidden />
              </button>
            </div>
          </div>
        </form>

        {lastAnswer ? (
          <div className="mt-10 rounded-[1.25rem] border border-violet-200/80 bg-white p-5 shadow-md dark:border-violet-900/40 dark:bg-zinc-900/80 sm:p-6">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-violet-600 dark:text-violet-400">
              Yanıt
            </h2>
            <div className="prose prose-sm mt-3 max-w-none whitespace-pre-wrap text-slate-800 dark:prose-invert dark:text-slate-100">
              {lastAnswer}
            </div>
          </div>
        ) : null}

        {historyResults.length > 0 ? (
          <div className="mt-12">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Son sorularınız</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Geçmişte sorduğunuz sorular ve uzman yanıtları.
                </p>
              </div>
              {hasMoreHistory ? (
                <button
                  type="button"
                  onClick={() => setShowAllHistory((v) => !v)}
                  className="text-sm font-bold text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
                >
                  {showAllHistory ? 'Daha az göster' : 'Hepsini gör →'}
                </button>
              ) : null}
            </div>
            <ul className="space-y-4">
              {visibleHistory.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => setHistoryDetail(row)}
                    className="w-full rounded-2xl border border-slate-200/90 border-t-4 border-t-violet-600 bg-white p-4 text-left shadow-sm transition hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900/90 dark:border-t-violet-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                  >
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {row.main_category}
                      {row.subcategory ? ` › ${row.subcategory}` : ''}
                      {' · '}
                      {new Date(row.created_at).toLocaleString('tr-TR')}
                    </p>
                    <p className="mt-2 font-semibold text-slate-900 line-clamp-2 dark:text-white">{row.question}</p>
                    <p className="mt-2 text-sm text-slate-600 line-clamp-3 dark:text-slate-300 whitespace-pre-wrap">
                      {row.answer}
                    </p>
                    <span className="mt-3 inline-block text-xs font-bold text-violet-600 dark:text-violet-400">
                      Tam metin →
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {historyDetail ? (
        <>
          <div
            className="fixed inset-0 z-100 bg-black/60 backdrop-blur-sm"
            aria-hidden
            onClick={() => setHistoryDetail(null)}
          />
          <div
            className="fixed left-1/2 top-1/2 z-101 w-[min(92vw,560px)] max-h-[min(88vh,720px)] -translate-x-1/2 -translate-y-1/2 flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="expert-history-modal-title"
          >
            <div className="shrink-0 flex items-start justify-between gap-3 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
              <div className="min-w-0">
                <h3 id="expert-history-modal-title" className="text-base font-semibold text-gray-900 dark:text-white">
                  Soru detayı
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {historyDetail.main_category}
                  {historyDetail.subcategory ? ` › ${historyDetail.subcategory}` : ''}
                  {' · '}
                  {new Date(historyDetail.created_at).toLocaleString('tr-TR')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryDetail(null)}
                className="shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Kapat"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 space-y-4">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Sorunuz
                </h4>
                <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{historyDetail.question}</p>
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Uzman yanıtı
                </h4>
                <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{historyDetail.answer}</p>
              </div>
            </div>
            <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 px-4 py-3">
              <button
                type="button"
                onClick={() => setHistoryDetail(null)}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                Kapat
              </button>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
