'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Flame,
  ArrowRight,
  MessageCircle,
  CheckCircle2,
  Sparkles,
  Users,
  HelpCircle,
  MessageSquare,
  TrendingUp,
  ChevronRight,
  Rocket,
} from 'lucide-react';
import api from '@/src/lib/api';
import { UzmanFullPageLink } from '@/src/components/uzman-full-page-link';
import { SITE_KIDS_HREF } from '@/src/lib/site-kids';
import { NavIcon, type NavIconName } from '@/src/components/nav-icon';
import { useQuestions } from '@/src/hooks/use-questions';
import type { Question } from '@/src/types';

/* ------------------------------------------------------------------ */
/* Config                                                               */
/* ------------------------------------------------------------------ */

const VALUE_ITEMS: {
  title: string;
  description: string;
  href: string;
  icon: NavIconName;
  iconBg: string;
  cardBorder: string;
  cardBg: string;
  accentColor: string;
}[] = [
  {
    title: 'Soru sor',
    description: 'Merak ettiğin her şeyi topluluğa sor, uzmanlardan cevap al.',
    href: '/soru-sor',
    icon: 'questions',
    iconBg: 'bg-sky-500',
    cardBg: 'bg-sky-50 dark:bg-sky-950/20',
    cardBorder: 'border-sky-200 dark:border-sky-900/50',
    accentColor: 'text-sky-600 dark:text-sky-400',
  },
  {
    title: 'Cevapla',
    description: 'Bildiklerini paylaş, bilgiyle başkalarına yol göster.',
    href: '/sorular',
    icon: 'popular',
    iconBg: 'bg-orange-500',
    cardBg: 'bg-orange-50 dark:bg-orange-950/20',
    cardBorder: 'border-orange-200 dark:border-orange-900/50',
    accentColor: 'text-orange-600 dark:text-orange-400',
  },
  {
    title: 'Topluluklar',
    description: 'El işleri, yemek, müzik, sanat… İlgi alanına göre katıl.',
    href: '/topluluklar',
    icon: 'discover',
    iconBg: 'bg-cyan-500',
    cardBg: 'bg-cyan-50 dark:bg-cyan-950/20',
    cardBorder: 'border-cyan-200 dark:border-cyan-900/50',
    accentColor: 'text-cyan-600 dark:text-cyan-400',
  },
  {
    title: 'Tasarım paylaş',
    description: 'El emeği ürünlerini sergilediğin açık galeri.',
    href: '/tasarimlar',
    icon: 'designs',
    iconBg: 'bg-fuchsia-500',
    cardBg: 'bg-fuchsia-50 dark:bg-fuchsia-950/20',
    cardBorder: 'border-fuchsia-200 dark:border-fuchsia-900/50',
    accentColor: 'text-fuchsia-600 dark:text-fuchsia-400',
  },
];

const CATEGORY_ACCENT: Record<string, { icon: NavIconName; bg: string; border: string; text: string }> = {
  'el-isleri':         { icon: 'designs',    bg: 'bg-rose-50 dark:bg-rose-950/30',       border: 'border-rose-200 dark:border-rose-800',     text: 'text-rose-700 dark:text-rose-300' },
  'dikis-moda':        { icon: 'designs',    bg: 'bg-violet-50 dark:bg-violet-950/30',   border: 'border-violet-200 dark:border-violet-800', text: 'text-violet-700 dark:text-violet-300' },
  'ev-dekorasyonu':    { icon: 'home',       bg: 'bg-amber-50 dark:bg-amber-950/30',     border: 'border-amber-200 dark:border-amber-800',   text: 'text-amber-700 dark:text-amber-300' },
  'yemek-marifetleri': { icon: 'popular',    bg: 'bg-orange-50 dark:bg-orange-950/30',   border: 'border-orange-200 dark:border-orange-800', text: 'text-orange-700 dark:text-orange-300' },
  'muzik':             { icon: 'popular',    bg: 'bg-blue-50 dark:bg-blue-950/30',       border: 'border-blue-200 dark:border-blue-800',     text: 'text-blue-700 dark:text-blue-300' },
  'sanat':             { icon: 'designs',    bg: 'bg-pink-50 dark:bg-pink-950/30',       border: 'border-pink-200 dark:border-pink-800',     text: 'text-pink-700 dark:text-pink-300' },
  'fotograf-video':    { icon: 'discover',   bg: 'bg-slate-100 dark:bg-slate-800/50',    border: 'border-slate-200 dark:border-slate-700',   text: 'text-slate-700 dark:text-slate-300' },
  'hobiler':           { icon: 'discover',   bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800',text: 'text-emerald-700 dark:text-emerald-300' },
  'dijital-beceriler': { icon: 'categories', bg: 'bg-cyan-50 dark:bg-cyan-950/30',       border: 'border-cyan-200 dark:border-cyan-800',     text: 'text-cyan-700 dark:text-cyan-300' },
};
const defaultAccent = { icon: 'categories' as NavIconName, bg: 'bg-gray-100 dark:bg-gray-800', border: 'border-gray-200 dark:border-gray-700', text: 'text-gray-700 dark:text-gray-300' };

function getCategoryAccent(slug: string) {
  return CATEGORY_ACCENT[slug] ?? defaultAccent;
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                       */
/* ------------------------------------------------------------------ */

function HeroSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/sorular?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push('/sorular');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-2xl gap-2">
      <div className="relative flex-1">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"
          aria-hidden
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Örgü desenleri, yemek tarifleri, müzik dersleri..."
          aria-label="Soru ara"
          className="w-full pl-11 pr-4 py-3 text-sm rounded-2xl border border-white/60 dark:border-gray-600 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all shadow-md"
        />
      </div>
      <button
        type="submit"
        className="px-6 py-3 rounded-2xl bg-brand hover:bg-brand-hover text-white font-semibold text-sm transition-colors shadow-md shrink-0"
      >
        Ara
      </button>
    </form>
  );
}

function LiveStats() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['site-stats'],
    queryFn: () => api.getSiteStats(),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || !stats) return null;

  const items = [
    {
      label: 'üye',
      value: stats.user_count ?? 0,
      icon: <Users className="h-3.5 w-3.5" />,
      color: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/60',
    },
    {
      label: 'soru',
      value: stats.question_count ?? 0,
      icon: <HelpCircle className="h-3.5 w-3.5" />,
      color: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800/60',
    },
    {
      label: 'cevap',
      value: stats.answer_count ?? 0,
      icon: <MessageSquare className="h-3.5 w-3.5" />,
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60',
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((item) => (
        <span
          key={item.label}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium ${item.color}`}
        >
          {item.icon}
          <span className="font-bold">
            {item.value.toLocaleString('tr-TR')}
          </span>
          {item.label}
        </span>
      ))}
    </div>
  );
}

function TrendingQuestionsPreview() {
  const { data, isLoading } = useQuestions({ ordering: '-hot_score', page_size: 5 });

  const raw = data?.results;
  const questions = (
    Array.isArray(raw)
      ? (raw as unknown[]).filter(
          (q): q is Question =>
            q != null && typeof (q as { id?: unknown }).id === 'number',
        )
      : []
  ).slice(0, 5);

  if (isLoading) {
    return (
      <ul className="space-y-2.5" aria-busy="true" aria-label="Yükleniyor">
        {[1, 2, 3, 4, 5].map((i) => (
          <li key={i} className="h-12 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
        ))}
      </ul>
    );
  }

  if (questions.length === 0) return null;

  const rankColors = [
    'bg-orange-500 text-white',
    'bg-orange-400 text-white',
    'bg-amber-400 text-white',
    'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300',
    'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
  ];

  return (
    <ul className="space-y-2">
      {questions.map((q, idx) => (
        <li key={q.id}>
          <Link
            href={`/soru/${q.slug}`}
            className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/50 hover:border-brand/30 hover:bg-brand-pink/30 dark:hover:bg-brand/5 hover:shadow-sm transition-all group"
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${rankColors[idx] ?? rankColors[4]}`}
              aria-hidden
            >
              {idx + 1}
            </span>
            <span className="flex-1 text-sm text-gray-800 dark:text-gray-200 line-clamp-2 leading-snug group-hover:text-brand transition-colors">
              {q.title}
            </span>
            <span className="flex items-center gap-1.5 shrink-0">
              {q.is_resolved && (
                <CheckCircle2
                  className="h-3.5 w-3.5 text-emerald-500"
                  aria-label="Çözüldü"
                />
              )}
              {q.answer_count > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full whitespace-nowrap">
                  <MessageCircle className="h-3 w-3" aria-hidden />
                  {q.answer_count}
                </span>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Main export                                                          */
/* ------------------------------------------------------------------ */

/**
 * Anasayfa hero bölümü: arama, CTA, feature cards, trending sorular, kategoriler, Kids CTA.
 */
export function HomeHero() {
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories().then((r) => r.data),
  });

  const raw = categoriesData as
    | { id: number; name: string; slug: string }[]
    | { results?: { id: number; name: string; slug: string }[] }
    | undefined;
  const categoriesList = Array.isArray(raw) ? raw : (raw?.results ?? []);
  const topCategories = categoriesList.slice(0, 9);

  return (
    <section className="mb-6 sm:mb-8 space-y-4 sm:space-y-5">

      {/* ============================================================ */}
      {/* MARIFETLI KIDS — HERO (mockup: dark space theme)            */}
      {/* ============================================================ */}
      <div className="relative min-h-[420px] sm:min-h-[480px] rounded-2xl overflow-hidden bg-slate-900 flex flex-col justify-center shadow-2xl">
        {/* Arka plan gradyan + yıldız efekti */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 pointer-events-none" aria-hidden />
        {/* Nebula blob'ları */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-violet-600/20 blur-3xl pointer-events-none" aria-hidden />
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" aria-hidden />
        <div className="absolute top-1/3 right-1/4 w-48 h-48 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" aria-hidden />
        {/* Küçük yıldız noktaları */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          {[...Array(18)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                width: i % 3 === 0 ? 3 : 2,
                height: i % 3 === 0 ? 3 : 2,
                top: `${5 + (i * 17) % 85}%`,
                left: `${(i * 23 + 10) % 95}%`,
                opacity: 0.3 + (i % 4) * 0.15,
              }}
            />
          ))}
        </div>
        {/* Sağ taraf büyük parlayan roket ikonu */}
        <div className="absolute right-8 sm:right-16 top-1/2 -translate-y-1/2 hidden sm:flex items-center justify-center opacity-10 pointer-events-none" aria-hidden>
          <Rocket className="h-64 w-64 text-cyan-300" />
        </div>

        <div className="relative px-6 sm:px-12 py-10 sm:py-16 max-w-2xl">
          {/* Rozet */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 mb-6">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" aria-hidden />
            <span className="text-xs font-bold tracking-widest uppercase text-white/90">Yeni Macera Başlıyor</span>
          </div>

          {/* Başlık */}
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-[1.1] tracking-tight text-white mb-5">
            Marifetli Kids{' '}
            <br />
            <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
              Dünyasına Hoş Geldin
            </span>
          </h2>

          {/* Açıklama */}
          <p className="text-base sm:text-lg text-slate-300 font-medium leading-relaxed max-w-lg mb-8">
            Geleceğin mucitleri, sanatçıları ve kâşifleri burada buluşuyor.
            Kendi yolunu çiz, becerilerini geliştir ve topluluğun bir parçası ol.
          </p>

          {/* CTA */}
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={SITE_KIDS_HREF}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 text-white font-bold text-base shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-105 transition-all"
            >
              <Sparkles className="h-5 w-5" aria-hidden />
              Keşfet
            </Link>
            <Link
              href={SITE_KIDS_HREF}
              className="inline-flex items-center gap-1.5 px-5 py-3.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white font-semibold text-sm hover:bg-white/20 transition-all"
            >
              Daha fazla bilgi
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* HERO BLOCK                                                    */}
      {/* ============================================================ */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-md">
        {/* Background gradient */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-brand-pink via-white to-sky-50 dark:from-gray-800/95 dark:via-gray-800/80 dark:to-gray-900/90 pointer-events-none"
          aria-hidden
        />
        {/* Decorative blobs */}
        <div
          className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-brand/8 dark:bg-brand/5 blur-3xl pointer-events-none"
          aria-hidden
        />
        <div
          className="absolute -bottom-12 -left-12 w-56 h-56 rounded-full bg-sky-300/20 dark:bg-sky-800/15 blur-3xl pointer-events-none"
          aria-hidden
        />
        <div
          className="absolute top-1/2 right-1/4 w-32 h-32 rounded-full bg-fuchsia-300/10 dark:bg-fuchsia-800/10 blur-2xl pointer-events-none"
          aria-hidden
        />

        <div className="relative px-5 sm:px-8 py-8 sm:py-12">
          {/* Üst rozet */}
          <div className="mb-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand/10 dark:bg-brand/15 border border-brand/20 dark:border-brand/30 text-brand dark:text-brand text-xs font-semibold tracking-wide">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Türkiye&apos;nin el işleri ve hobi topluluğu
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3 max-w-2xl leading-tight">
            El emeğinin, merakın ve{' '}
            <span className="text-brand relative">
              bilginin
              <span className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-brand/30 rounded-full" aria-hidden />
            </span>
            {' '}buluşma noktası
          </h1>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-xl mb-6 leading-relaxed">
            Örgü, dikiş, yemek, müzik, sanat, fotoğraf ve daha fazlası.
            Topluluğuna sor, cevapla, paylaş — birlikte öğreniyoruz.
          </p>

          {/* Search bar */}
          <div className="mb-6">
            <HeroSearch />
          </div>

          {/* CTA buttons */}
          <div className="flex flex-wrap items-center gap-2.5 mb-6">
            <Link
              href="/soru-sor"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-brand hover:bg-brand-hover text-white transition-colors shadow-sm"
            >
              <span aria-hidden>+</span>
              Soru sor
            </Link>
            <UzmanFullPageLink className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-brand hover:opacity-95 text-white shadow-sm transition-opacity">
              <NavIcon name="expert" className="h-4 w-4 text-white" />
              Uzmana sor
            </UzmanFullPageLink>
            <Link
              href="/topluluklar"
              className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-white/80 dark:hover:bg-gray-800 transition-colors"
            >
              Topluluklar
            </Link>
            <Link
              href="/tasarimlar"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-fuchsia-700 dark:text-fuchsia-400 border border-fuchsia-200 dark:border-fuchsia-800/50 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-950/30 transition-colors"
            >
              Tasarımlar
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
            <Link
              href={SITE_KIDS_HREF}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-950/30 hover:bg-sky-100 dark:hover:bg-sky-900/40 transition-colors"
            >
              <NavIcon name="student" className="h-4 w-4" />
              Kids
            </Link>
          </div>

          {/* Live stats */}
          <LiveStats />
        </div>
      </div>

      {/* ============================================================ */}
      {/* VALUE CARDS                                                   */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {VALUE_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`group relative rounded-xl border p-4 sm:p-5 transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${item.cardBg} ${item.cardBorder}`}
          >
            <span
              className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${item.iconBg} text-white shadow-sm group-hover:scale-110 transition-transform duration-200`}
              aria-hidden
            >
              <NavIcon name={item.icon} className="h-5 w-5 text-white" />
            </span>
            <h2 className={`text-sm font-bold text-gray-900 dark:text-white group-hover:${item.accentColor.split(' ')[0]} transition-colors`}>
              {item.title}
            </h2>
            <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400 leading-snug">
              {item.description}
            </p>
            <span
              className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-hidden
            >
              <ArrowRight className={`h-3.5 w-3.5 ${item.accentColor}`} />
            </span>
          </Link>
        ))}
      </div>

      {/* ============================================================ */}
      {/* TRENDING QUESTIONS                                            */}
      {/* ============================================================ */}
      <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-300" aria-hidden />
        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-950/50">
                <Flame className="h-4 w-4 text-orange-500" aria-hidden />
              </span>
              Popüler sorular
              <span className="ml-1 inline-flex items-center gap-1 text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60 px-2 py-0.5 rounded-full">
                <TrendingUp className="h-3 w-3" aria-hidden />
                Gündem
              </span>
            </h2>
            <Link
              href="/sorular"
              className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:text-brand-hover transition-colors"
            >
              Tüm sorular
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
          <TrendingQuestionsPreview />
        </div>
      </div>

      {/* ============================================================ */}
      {/* CATEGORIES                                                    */}
      {/* ============================================================ */}
      {topCategories.length > 0 && (
        <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-pink dark:bg-brand/10">
                  <NavIcon name="categories" className="h-4 w-4 text-brand" />
                </span>
                Kategorileri keşfet
              </h2>
              <Link
                href="/kategoriler"
                className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:text-brand-hover transition-colors"
              >
                Tümünü gör
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {topCategories.map((c) => {
                const style = getCategoryAccent(c.slug);
                return (
                  <Link
                    key={c.id}
                    href={`/t/${c.slug}`}
                    className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl text-center text-xs font-medium border transition-all hover:shadow-sm hover:scale-[1.03] hover:border-brand/40 ${style.bg} ${style.border}`}
                  >
                    <span className={`flex h-8 w-8 items-center justify-center rounded-lg bg-white/70 dark:bg-gray-900/50 shadow-sm`} aria-hidden>
                      <NavIcon name={style.icon} className={`h-4 w-4 ${style.text}`} />
                    </span>
                    <span className={`leading-tight ${style.text}`}>{c.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </section>
  );
}
