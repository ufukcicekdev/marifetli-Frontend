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
  Award,
  ThumbsUp,
  BookOpen,
  Cpu,
  Palette,
  FlaskConical,
  Scissors,
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
          placeholder="Topluluğa sor, cevapla, paylaş..."
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

function FeedTabs() {
  const [activeTab, setActiveTab] = useState<'recent' | 'trending' | 'solved'>('recent');

  const ordering = activeTab === 'trending' ? '-hot_score' : '-created_at';
  const filters = activeTab === 'solved' ? { is_resolved: true, ordering: '-created_at' } : { ordering };

  const { data, isLoading } = useQuestions({ ...filters, page_size: 5 });
  const raw = data?.results;
  const questions = (
    Array.isArray(raw)
      ? (raw as unknown[]).filter(
          (q): q is Question =>
            q != null && typeof (q as { id?: unknown }).id === 'number',
        )
      : []
  ).slice(0, 5);

  const tabs = [
    { key: 'recent' as const, label: 'Son Tartışmalar' },
    { key: 'trending' as const, label: 'Trend' },
    { key: 'solved' as const, label: 'Çözüldü' },
  ];

  return (
    <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
      {/* Sekmeler */}
      <div className="flex gap-1 border-b border-gray-100 dark:border-gray-800 px-5 pt-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${
              activeTab === tab.key
                ? 'text-brand border-b-2 border-brand'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Kartlar */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {isLoading &&
          [1, 2, 3].map((i) => (
            <div key={i} className="p-6 animate-pulse">
              <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
            </div>
          ))}
        {!isLoading && questions.length === 0 && (
          <p className="p-6 text-sm text-gray-400 text-center">Henüz içerik yok.</p>
        )}
        {!isLoading &&
          questions.map((q) => (
            <div key={q.id} className="group relative p-5 sm:p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors overflow-hidden">
              {/* Sol hover çizgisi */}
              <div className="absolute top-0 left-0 w-1 h-full bg-brand opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden />

              <div className="flex gap-4">
                {/* Oy sayısı */}
                <div className="hidden sm:flex flex-col items-center gap-0.5 shrink-0 pt-1">
                  <ThumbsUp className="h-4 w-4 text-gray-300 dark:text-gray-600" aria-hidden />
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{q.like_count}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <Link
                    href={`/soru/${q.slug}`}
                    className="text-base font-bold text-gray-900 dark:text-white hover:text-brand dark:hover:text-brand transition-colors line-clamp-2 leading-snug"
                  >
                    {q.title}
                  </Link>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                      <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                      {q.answer_count} cevap
                    </span>
                    {q.is_resolved && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="h-3 w-3" aria-hidden />
                        Çözüldü
                      </span>
                    )}
                    {q.tags?.[0] && (
                      <span className="text-xs font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-full">
                        {q.tags[0].name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
      </div>

      <div className="p-4 border-t border-gray-100 dark:border-gray-800">
        <Link
          href="/sorular"
          className="flex w-full items-center justify-center py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Tüm soruları keşfet
        </Link>
      </div>
    </div>
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
      {/* HERO BLOCK — glass card üzerinde gradient arka plan          */}
      {/* ============================================================ */}
      <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-brand/10">
        {/* Arka plan gradyan */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-brand to-pink-500 dark:from-violet-900 dark:via-indigo-900 dark:to-slate-900" aria-hidden />
        {/* Dekoratif blob'lar */}
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-pink-400/30 blur-3xl pointer-events-none" aria-hidden />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none" aria-hidden />
        <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none hidden sm:block" aria-hidden>
          <Sparkles className="h-40 w-40 text-white" />
        </div>

        {/* İçerik — sabit yükseklik yerine padding ile */}
        <div className="relative px-5 sm:px-10 py-8 sm:py-12">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white mb-3 tracking-tight leading-tight max-w-lg">
            Türkiye&apos;nin aile boyu{' '}
            <span className="bg-gradient-to-r from-yellow-300 to-pink-300 bg-clip-text text-transparent">
              ilgi alanı ve gelişim noktası.
            </span>
          </h1>
          <p className="text-sm sm:text-base text-white/80 mb-5 font-medium leading-relaxed max-w-md">
            Öğren, paylaş, ödüller kazan — tüm aile birlikte büyüsün.
          </p>
          <div className="mb-5 max-w-md">
            <HeroSearch />
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/soru-sor"
              className="inline-flex items-center gap-2 bg-white text-brand px-6 py-3 rounded-full font-bold shadow-lg hover:scale-105 transition-transform text-sm"
            >
              Soru Sor
            </Link>
            <Link
              href="/sorular?ordering=-hot_score"
              className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-full font-bold transition-all text-sm border border-white/20"
            >
              <TrendingUp className="h-4 w-4" aria-hidden />
              Trendler
            </Link>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* KATEGORİLERİ KEŞFET — bento grid                            */}
      {/* ============================================================ */}
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Kategorileri Keşfet
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Uzmanlaşmış öğrenme alanlarına dal</p>
          </div>
          <Link
            href="/kategoriler"
            className="inline-flex items-center gap-1 text-sm font-bold text-brand hover:text-brand-hover transition-colors"
          >
            Tüm konular
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        {topCategories.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 sm:gap-5">
            {topCategories.map((c) => {
              const style = getCategoryAccent(c.slug);
              return (
                <Link
                  key={c.id}
                  href={`/t/${c.slug}`}
                  className={`group flex flex-col items-center text-center p-4 sm:p-6 rounded-2xl border shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 ${style.bg} ${style.border}`}
                >
                  <span className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-white/70 dark:bg-gray-900/50 shadow-sm mb-3 group-hover:scale-110 transition-transform`} aria-hidden>
                    <NavIcon name={style.icon} className={`h-7 w-7 ${style.text}`} />
                  </span>
                  <h3 className={`font-bold text-sm leading-snug ${style.text}`}>{c.name}</h3>
                </Link>
              );
            })}
          </div>
        ) : (
          /* Fallback statik kategoriler */
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 sm:gap-5">
            {[
              { label: 'El İşleri', icon: <Scissors className="h-7 w-7 text-rose-600" />, bg: 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800', href: '/t/el-isleri' },
              { label: 'Deneyler', icon: <FlaskConical className="h-7 w-7 text-emerald-600" />, bg: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800', href: '/sorular?q=deney' },
              { label: 'Kodlama', icon: <Cpu className="h-7 w-7 text-violet-600" />, bg: 'bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800', href: '/sorular?q=kodlama' },
              { label: 'Tasarım', icon: <Palette className="h-7 w-7 text-pink-600" />, bg: 'bg-pink-50 dark:bg-pink-950/20 border-pink-200 dark:border-pink-800', href: '/tasarimlar' },
              { label: 'Hobi', icon: <BookOpen className="h-7 w-7 text-amber-600" />, bg: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800', href: '/sorular?q=hobi' },
            ].map((item) => (
              <Link key={item.label} href={item.href} className={`group flex flex-col items-center text-center p-5 rounded-2xl border shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 ${item.bg}`}>
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/70 dark:bg-gray-900/50 shadow-sm mb-3 group-hover:scale-110 transition-transform" aria-hidden>{item.icon}</span>
                <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200">{item.label}</h3>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* TOPLULUK AKIŞI + SIDEBAR                                     */}
      {/* ============================================================ */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Sol: Feed */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Sekmeler */}
          <FeedTabs />
        </div>

        {/* Sağ: Sidebar */}
        <aside className="w-full lg:w-80 xl:w-96 shrink-0 space-y-5">
          {/* İstatistikler */}
          <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
            <h3 className="font-extrabold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-pink dark:bg-brand/10">
                <Award className="h-4 w-4 text-brand" aria-hidden />
              </span>
              Topluluk İstatistikleri
            </h3>
            <LiveStats />
          </div>

          {/* Uzman köşesi */}
          <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
            <h3 className="font-extrabold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950/40">
                <NavIcon name="expert" className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </span>
              Uzman Cevapları
            </h3>
            <UzmanFullPageLink className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-brand text-white font-bold text-sm hover:opacity-90 transition-opacity shadow-sm">
              <NavIcon name="expert" className="h-4 w-4 text-white" />
              Uzmana Sor
            </UzmanFullPageLink>
          </div>

          {/* Popüler sorular */}
          <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
            <div className="h-1 w-full bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-300" aria-hidden />
            <div className="p-5">
              <h3 className="font-extrabold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-950/50">
                  <Flame className="h-4 w-4 text-orange-500" aria-hidden />
                </span>
                Popüler Şu An
              </h3>
              <TrendingQuestionsPreview />
              <Link
                href="/sorular"
                className="mt-4 flex w-full items-center justify-center py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Tüm soruları keşfet
              </Link>
            </div>
          </div>
        </aside>
      </div>

    </section>
  );
}
