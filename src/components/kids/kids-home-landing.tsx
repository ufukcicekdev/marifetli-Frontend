'use client';

import {
  ArrowRight,
  Award,
  BarChart2,
  Bell,
  BellPlus,
  Brain,
  Briefcase,
  GraduationCap,
  Image as ImageIcon,
  Info,
  LineChart,
  ListChecks,
  Lock,
  Megaphone,
  Rocket,
  Settings,
  Star,
  Timer,
  Trophy,
  Users,
  UsersRound,
  Zap,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { KidsRoleLoginForm } from '@/src/components/kids/kids-role-login-form';
import { KidsCenteredModal } from '@/src/components/kids/kids-ui';
import { useKidsI18n } from '@/src/providers/kids-language-provider';

const KIDS_LANDING_IMG_WIDTH = 1200;
const KIDS_LANDING_IMG_HEIGHT = 800;

/** Mockup görselleri — `next/image` remotePatterns */
const HOME_V2_IMG = {
  hero: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDx9WDdHS0xLIjAHeEctnK7HhAwn-6oZDcy1cLNaETqoHpERPTrcpy4MO1tG6UmZDIeIsCVZVWsWtCUsuEYzUmfjMPVj92IiqYvmNoKPn_XytVf73-uqs9eX9Nc_dQE8G6ZhviQAsf1yv27PFVGXvwM_gN8_I07kQb_zIuRXTu539sqp_ndjsZhANonJDIX4wZfBFUSxH6eMX1sxjIQwFlGl_Pz2A6428GNdYUBtHl8JipofcaeGtGu9JiniM4YCzwiu_KowGQQiwq4',
  z1: 'https://lh3.googleusercontent.com/aida-public/AB6AXuATps57d3DgEPJp9lPwaTD5jf713gQZRR_Z4RbZtXHleaFkWujMkf023oK9SIu4cnTmtq8rQMmm3uWZA1bYyCnInzFx1h4B9u-mopxiq0aEUX3neyn3JhtHKH2jHpz1ypsJqR5wwdv1Hh164jTdclO1ULcfffJEKcUZc3Zdckg06LdYdjWSt7OKHNjvqOJ652v3XozYzIyKhVjJMBq0K6bMtn8lUag2Uqw61OjyQ2ud18QoNI9eSjqduGrujQf-j7DI2wDhrISH1Jt6',
  z2: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDYzwwvpe9Atp762KAGOlmzTCfkpUbUXjwua13ReUKOA2i2bqzHSXOq10BPsbEyjYRwyCQp-eFijzGVIAZuLBr4GkIMvsCn6GTz6Pc_QCiO61BPBjty2tT3st8sThhdgbkizHqdt9EVJHqBLxTJaX2iTBxjKVYXjniH2wB9Vv22ruru4BckhkVgk-gqwzTrWfHVvN2cR9B4ETWMjasp2rU-gmCbRjCBXlrKxrfZcEGhhPMA5_2VMFUfM6p8GDBZxi9wDGQq3Q0vs_s_',
  z3: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDCOXEl38LIlhTowGtL362uJ2LUC3HsqDj_lI4ttFeR_T4O6g32kdU7146liibFKOQae4s7B3qJj89nemVmHoyZlAIf4jNqVX_4fA7bI-dFTDFEm8M-yF0NuW1XiL7Ok_o4C_gDxTZ-tAG0HxmFIQWhZ4Dp0V7NGS07JZHxWV3UBj0MsSlw9UTKf3217QIGLqtYrlzGb95WPcjG0IXeAim0F5WuCZSw59ffi2pGxBMYGvGe5Ba7MJhql4P4Yb_Bp2TGN1Y0Q4IXZJoh',
  z4: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDdtFx7ckufeVvOi8jgdC8WRMzvyhOg-hD6_OYx2Y4U2WVWNI2oK0c2xcrrdrPyOVQmCIJrsA8ulCC5yjviBnP9RSXCns7dvkP0UrTRfTri00ZNBnUy5n6-ADAUsRMs1aXwDahUMjMm-cOcBpI37xuQb4BCFn6qZTtuhF_gqVBuIrDZItH68DRcazGipmMTEAKxdhX-evM8Nc8HLSwZPvIIs1l4iffDgXWUdbSjdkTvidM9_7n6mG3tCGIH4SieLGjNUMDnjJRZ4MNm',
  bento: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDZ6aXX4cFfuXkk2h_yQvClDBOVwW0E5qhz8UVp5kSku4lYUxMOgycxBo29K4hbEWU1lX8b02mfVHJL-YN1X8Vij95BxnqrAVduph9FVbZwT-zkMmUpdjYcUz0VU0ORMB8nitj8GL_Ge02KrR8gTwbDBfa2x6fJ77qDtQUTN4OpR1JrJlm94TZpEGKpAJ18H0XX6zRYUzf8zZtLjEWtM_vN6fK52ZRlsoNuzrdo_uc1oU8dHC6ftSXSCIAgvSGYDSpMDr8VYxQDnM8S',
} as const;

type LoginTab = 'student' | 'teacher' | 'parent';

function KidsLoginBrandLockup({ ariaLabel }: { ariaLabel: string }) {
  return (
    <div role="img" aria-label={ariaLabel} className="flex flex-col items-center">
      <div className="font-logo flex flex-wrap items-center justify-center gap-0 text-xl font-semibold tracking-tight sm:text-2xl md:text-[1.65rem]">
        <Image
          src="/logo.png"
          alt=""
          width={52}
          height={52}
          className="-mr-1 h-11 w-11 shrink-0 object-contain sm:h-12 sm:w-12 md:h-14 md:w-14"
          priority
        />
        <span
          lang="en"
          className="bg-linear-to-r from-violet-600 via-fuchsia-500 to-amber-500 bg-clip-text leading-none text-transparent dark:from-violet-300 dark:via-fuchsia-300 dark:to-amber-300"
        >
          arifetli
        </span>
        <span
          lang="en"
          className="ml-1.5 rounded-xl bg-linear-to-r from-amber-400 to-orange-400 px-2 py-0.5 text-[10px] font-extrabold tracking-wide text-white shadow-sm sm:text-xs"
        >
          KIDS
        </span>
      </div>
    </div>
  );
}

export function KidsHomeLanding({ pathPrefix }: { pathPrefix: string }) {
  const { t } = useKidsI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loginOpen, setLoginOpen] = useState(false);
  const [tab, setTab] = useState<LoginTab>('student');
  const [modalAuthPhase, setModalAuthPhase] = useState<'login' | 'forgot' | 'sent'>('login');
  const featuresRef = useRef<HTMLDivElement>(null);
  const tabListId = useId();

  const closeLogin = useCallback(() => {
    setLoginOpen(false);
    setModalAuthPhase('login');
    const next = new URLSearchParams(searchParams.toString());
    next.delete('giris');
    const q = next.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    const g = searchParams.get('giris');
    if (!g) return;
    if (g === 'ogrenci') setTab('student');
    else if (g === 'veli') setTab('parent');
    else if (g === 'ogretmen') setTab('teacher');
    setLoginOpen(true);
  }, [searchParams]);

  return (
    <>
        <div className="relative mx-auto max-w-7xl overflow-hidden px-3 pb-14 sm:px-6">
          <div
            className="pointer-events-none absolute -left-24 top-8 h-56 w-56 rounded-full bg-fuchsia-400/25 blur-3xl dark:bg-fuchsia-600/15"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -right-16 bottom-32 h-64 w-64 rounded-full bg-amber-300/30 blur-3xl dark:bg-amber-500/12"
            aria-hidden
          />

          <div className="relative space-y-16 pt-2">
            {/* Hero — tam genişlik görsel */}
            <section className="px-1 md:px-0">
              <div className="relative mx-auto max-w-7xl overflow-hidden rounded-2xl bg-slate-900 shadow-2xl shadow-violet-500/10">
                <div className="relative min-h-[min(520px,85vh)] w-full md:min-h-[480px]">
                  <Image
                    src={HOME_V2_IMG.hero}
                    alt=""
                    fill
                    priority
                    className="object-cover opacity-70"
                    sizes="(max-width: 1280px) 100vw, 1280px"
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/60 to-transparent"
                    aria-hidden
                  />
                  <div className="relative z-10 flex min-h-[min(520px,85vh)] items-center px-6 py-12 md:min-h-[480px] md:px-16 md:py-14 lg:px-20">
                    <div className="max-w-2xl">
                      <div className="mb-8 inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur-md">
                        <span className="h-2 w-2 shrink-0 animate-ping rounded-full bg-amber-400" aria-hidden />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white">
                          {t('landing.homeV2.immersiveBadge')}
                        </span>
                      </div>
                      <h2 className="mb-6 font-logo text-4xl font-black leading-tight text-white md:text-6xl lg:text-7xl">
                        {t('landing.homeV2.immersiveTitle1')}
                        <br />
                        {t('landing.homeV2.immersiveTitle2')}
                      </h2>
                      <p className="mb-10 text-lg font-medium leading-relaxed text-slate-300 md:text-xl">
                        {t('landing.homeV2.immersiveBody')}
                      </p>
                      <div className="flex flex-col gap-5 sm:flex-row">
                        <button
                          type="button"
                          onClick={() => {
                            setTab('student');
                            setLoginOpen(true);
                          }}
                          className="inline-flex items-center justify-center gap-3 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-8 py-4 text-lg font-black text-white shadow-xl shadow-violet-500/30 transition hover:scale-[1.03] active:scale-[0.99]"
                        >
                          {t('landing.login')}
                          <Rocket className="h-5 w-5 shrink-0" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => setLoginOpen(true)}
                          className="rounded-full border border-white/20 bg-white/10 px-8 py-4 text-lg font-bold text-white backdrop-blur-md transition hover:bg-white/20"
                        >
                          {t('landing.alreadyHaveAccount')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Bento — serbest kurs + rozet yolu */}
            <section className="px-1 pb-2 md:px-0 md:pb-4">
              <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 md:grid-cols-3">
                <div className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-8 shadow-md transition-all duration-500 hover:shadow-xl dark:border-zinc-700 dark:bg-zinc-900 md:col-span-2 md:p-10">
                  <div
                    className="absolute right-0 top-0 h-32 w-32 rounded-bl-full bg-violet-500/5"
                    aria-hidden
                  />
                  <div className="relative z-10 flex flex-col items-center gap-10 md:flex-row">
                    <div className="flex-1">
                      <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                        <Rocket className="h-10 w-10" strokeWidth={2} aria-hidden />
                      </div>
                      <h3 className="mb-4 font-logo text-2xl font-black text-slate-900 dark:text-white md:text-3xl">
                        {t('landing.homeV2.bentoCourseTitle')}
                      </h3>
                      <p className="mb-8 text-lg leading-relaxed text-slate-600 dark:text-slate-300">
                        {t('landing.homeV2.bentoCourseBody')}
                      </p>
                      <Link
                        href={`${pathPrefix}/ogrenci/kursu`}
                        className="inline-flex items-center gap-3 text-lg font-black text-violet-600 transition-all group-hover:gap-6 dark:text-violet-400"
                      >
                        {t('landing.homeV2.bentoCourseCta')}
                        <ArrowRight className="h-5 w-5 shrink-0" aria-hidden />
                      </Link>
                    </div>
                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl shadow-2xl shadow-black/10 md:w-80 md:shrink-0">
                      <Image
                        src={HOME_V2_IMG.bento}
                        alt=""
                        width={640}
                        height={480}
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                        sizes="(max-width: 768px) 100vw, 320px"
                      />
                    </div>
                  </div>
                </div>

                <Link
                  href={`${pathPrefix}/ogrenci/yol`}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 p-8 text-white shadow-xl shadow-violet-500/20 md:p-10"
                >
                  <div
                    className="absolute -bottom-10 -right-10 h-48 w-48 rounded-full bg-white/10 blur-3xl"
                    aria-hidden
                  />
                  <div className="relative z-10">
                    <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 text-white">
                      <Award className="h-10 w-10" strokeWidth={2} aria-hidden />
                    </div>
                    <h3 className="mb-4 font-logo text-2xl font-black md:text-3xl">{t('landing.homeV2.bentoBadgeTitle')}</h3>
                    <p className="text-lg leading-relaxed text-white/80">{t('landing.homeV2.bentoBadgeBody')}</p>
                  </div>
                  <div className="relative z-10 mt-10 flex -space-x-4" aria-hidden>
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/30 bg-amber-400 text-amber-950 shadow-lg transition-transform delay-0 duration-300 group-hover:-translate-y-2">
                      <Award className="h-8 w-8" strokeWidth={2} />
                    </div>
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/30 bg-fuchsia-500 text-white shadow-lg transition-transform delay-75 duration-300 group-hover:-translate-y-2">
                      <Star className="h-8 w-8 fill-current" strokeWidth={2} />
                    </div>
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/30 bg-violet-200 text-violet-800 shadow-lg transition-transform delay-150 duration-300 group-hover:-translate-y-2">
                      <Trophy className="h-8 w-8" strokeWidth={2} />
                    </div>
                  </div>
                </Link>
              </div>
            </section>

            {/* Zig-zag özellikler */}
            <div ref={featuresRef} className="space-y-24 overflow-hidden py-6">
              {/* 1 — AI test */}
              <section className="mx-auto max-w-7xl">
                <div className="grid items-center gap-12 md:grid-cols-2">
                  <div className="relative order-2 md:order-1">
                    <div className="absolute inset-0 -rotate-3 rounded-[2.5rem] bg-violet-500/10" aria-hidden />
                    <Image
                      src={HOME_V2_IMG.z1}
                      alt=""
                      width={KIDS_LANDING_IMG_WIDTH}
                      height={KIDS_LANDING_IMG_HEIGHT}
                      className="relative z-10 h-[420px] w-full rounded-[2.5rem] object-cover shadow-lg"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  </div>
                  <div className="order-1 space-y-5 md:order-2 md:pl-8">
                    <h2 className="font-logo text-3xl font-bold text-slate-900 dark:text-white md:text-4xl md:leading-tight">
                      {t('landing.homeV2.z1.title')}
                    </h2>
                    <p className="text-lg leading-relaxed text-slate-600 dark:text-slate-300">
                      {t('landing.homeV2.z1.body')}
                    </p>
                    <ul className="space-y-3">
                      <li className="flex items-center gap-3 font-semibold text-violet-700 dark:text-violet-300">
                        <Zap className="h-5 w-5 shrink-0" aria-hidden /> {t('landing.homeV2.z1.b1')}
                      </li>
                      <li className="flex items-center gap-3 font-semibold text-violet-700 dark:text-violet-300">
                        <BarChart2 className="h-5 w-5 shrink-0" aria-hidden /> {t('landing.homeV2.z1.b2')}
                      </li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 2 — Ödev */}
              <section className="rounded-[2rem] bg-slate-100/80 py-16 dark:bg-zinc-900/50">
                <div className="mx-auto max-w-7xl px-2">
                  <div className="grid items-center gap-12 md:grid-cols-2">
                    <div className="space-y-5 md:pr-8">
                      <h2 className="font-logo text-3xl font-bold text-slate-900 dark:text-white md:text-4xl">
                        {t('landing.homeV2.z2.title')}
                      </h2>
                      <p className="text-lg leading-relaxed text-slate-600 dark:text-slate-300">
                        {t('landing.homeV2.z2.body')}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setTab('teacher');
                          setLoginOpen(true);
                        }}
                        className="flex items-center gap-2 font-bold text-violet-700 transition hover:translate-x-1 dark:text-violet-300"
                      >
                        {t('landing.homeV2.z2.cta')} <ArrowRight className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-0 rotate-3 rounded-[2.5rem] bg-rose-500/10" aria-hidden />
                      <Image
                        src={HOME_V2_IMG.z2}
                        alt=""
                        width={KIDS_LANDING_IMG_WIDTH}
                        height={KIDS_LANDING_IMG_HEIGHT}
                        className="relative z-10 h-[420px] w-full rounded-[2.5rem] object-cover shadow-lg"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* 3 — Veli */}
              <section className="mx-auto max-w-7xl">
                <div className="grid items-center gap-12 md:grid-cols-2">
                  <div className="relative order-2 md:order-1">
                    <div className="absolute inset-0 -rotate-2 rounded-[2.5rem] bg-amber-400/15" aria-hidden />
                    <Image
                      src={HOME_V2_IMG.z3}
                      alt=""
                      width={KIDS_LANDING_IMG_WIDTH}
                      height={KIDS_LANDING_IMG_HEIGHT}
                      className="relative z-10 h-[420px] w-full rounded-[2.5rem] object-cover shadow-lg"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  </div>
                  <div className="order-1 space-y-5 md:order-2 md:pl-8">
                    <h2 className="font-logo text-3xl font-bold text-slate-900 dark:text-white md:text-4xl">
                      {t('landing.homeV2.z3.title')}
                    </h2>
                    <p className="text-lg leading-relaxed text-slate-600 dark:text-slate-300">
                      {t('landing.homeV2.z3.body')}
                    </p>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-800">
                        <Lock className="mb-2 h-8 w-8 text-fuchsia-600" aria-hidden />
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{t('landing.homeV2.z3.card1')}</p>
                      </div>
                      <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-800">
                        <ImageIcon className="mb-2 h-8 w-8 text-fuchsia-600" aria-hidden />
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{t('landing.homeV2.z3.card2')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* 4 — Uzman */}
              <section className="rounded-[2rem] bg-violet-500/5 py-16 dark:bg-violet-950/20">
                <div className="mx-auto max-w-7xl px-2">
                  <div className="grid items-center gap-12 md:grid-cols-2">
                    <div className="space-y-5 md:pr-8">
                      <h2 className="font-logo text-3xl font-bold text-slate-900 dark:text-white md:text-4xl">
                        {t('landing.homeV2.z4.title')}
                      </h2>
                      <p className="text-lg leading-relaxed text-slate-600 dark:text-slate-300">
                        {t('landing.homeV2.z4.body')}
                      </p>
                      <div className="flex items-center gap-4 rounded-3xl bg-white p-4 shadow-sm dark:bg-zinc-800">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-300 text-amber-950">
                          <Brain className="h-6 w-6" aria-hidden />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{t('landing.homeV2.z4.expertTitle')}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{t('landing.homeV2.z4.expertSub')}</p>
                        </div>
                      </div>
                    </div>
                    <div className="relative">
                      <Image
                        src={HOME_V2_IMG.z4}
                        alt=""
                        width={KIDS_LANDING_IMG_WIDTH}
                        height={KIDS_LANDING_IMG_HEIGHT}
                        className="relative z-10 h-[420px] w-full rounded-[2.5rem] object-cover shadow-2xl"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* 5 — Sınıf duyuruları */}
              <section className="mx-auto max-w-7xl px-1 md:px-0">
                <div className="flex flex-col items-center gap-12 md:flex-row md:items-stretch">
                  <div className="w-full flex-1">
                    <div className="group rounded-2xl border border-slate-100 bg-white p-8 shadow-md transition-all hover:border-amber-500/20 dark:border-zinc-700 dark:bg-zinc-900 md:p-12">
                      <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 transition-transform group-hover:scale-110 dark:bg-amber-950/50 dark:text-amber-300">
                        <Megaphone className="h-10 w-10" strokeWidth={2} aria-hidden />
                      </div>
                      <h3 className="mb-4 font-logo text-2xl font-black text-slate-900 dark:text-white md:text-3xl">
                        {t('landing.homeV2.z5.title')}
                      </h3>
                      <p className="mb-8 text-lg font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                        {t('landing.homeV2.z5.body')}
                      </p>
                      <Link
                        href={`${pathPrefix}/duyurular`}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-50 py-4 text-sm font-bold text-amber-700 transition-all hover:bg-amber-600 hover:text-white dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-600 dark:hover:text-white"
                      >
                        {t('landing.homeV2.z5.cta')}
                        <BellPlus className="h-4 w-4 shrink-0" aria-hidden />
                      </Link>
                    </div>
                  </div>
                  <div className="flex w-full flex-1 items-center justify-center">
                    <div className="relative flex aspect-square w-full max-w-md items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/5 to-amber-500/20">
                      <div className="relative z-10 flex w-72 max-w-[85vw] rotate-2 flex-col rounded-2xl border-2 border-amber-200/50 bg-white/80 p-6 shadow-xl backdrop-blur-md transition-transform duration-500 hover:rotate-0 dark:border-amber-800/50 dark:bg-zinc-900/85">
                        <div className="mb-4 flex items-center gap-3">
                          <Bell className="h-6 w-6 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                          <div className="h-3 w-40 rounded-full bg-amber-100 dark:bg-amber-900/50" aria-hidden />
                        </div>
                        <div className="space-y-2" aria-hidden>
                          <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-700" />
                          <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-700" />
                          <div className="h-2 w-1/2 rounded-full bg-slate-100 dark:bg-slate-700" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Veli kontrollü oyun merkezi */}
            <section className="mx-auto max-w-7xl px-1 pb-12 pt-2 md:px-2">
              <div className="group relative overflow-hidden rounded-2xl bg-slate-900 p-8 shadow-2xl shadow-slate-900/20 md:p-12">
                <div
                  className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-violet-500/20 blur-3xl"
                  aria-hidden
                />
                <div className="relative z-10 flex flex-col items-center gap-12 md:flex-row">
                  <div className="flex-1">
                    <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/20 px-5 py-2 backdrop-blur-md">
                      <UsersRound className="h-4 w-4 shrink-0 text-violet-300" aria-hidden />
                      <span className="text-[10px] font-black uppercase tracking-widest text-violet-300">
                        {t('landing.homeV2.parentBadge')}
                      </span>
                    </div>
                    <h3 className="mb-6 font-logo text-3xl font-black text-white md:text-4xl">
                      {t('landing.homeV2.parentTitle')}
                    </h3>
                    <p className="mb-10 text-lg leading-relaxed text-slate-400 md:text-xl">
                      {t('landing.homeV2.parentBody')}
                    </p>
                    <Link
                      href={`${pathPrefix}/veli/ebeveyn-kontrolleri`}
                      className="inline-flex w-fit items-center gap-3 rounded-2xl bg-white px-8 py-4 text-sm font-black text-slate-900 transition hover:bg-violet-500 hover:text-white"
                    >
                      {t('landing.homeV2.parentCta')}
                      <Settings className="h-4 w-4 shrink-0" aria-hidden />
                    </Link>
                  </div>
                  <div className="flex w-full justify-center md:w-auto">
                    <div className="relative flex aspect-[4/3] w-full max-w-sm flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white/10 transition-colors group-hover:bg-violet-500/30">
                          <Timer className="h-10 w-10 text-violet-300" aria-hidden />
                        </div>
                        <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white/10 transition-colors group-hover:bg-fuchsia-500/30">
                          <Lock className="h-10 w-10 text-fuchsia-300" aria-hidden />
                        </div>
                        <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white/10 transition-colors group-hover:bg-amber-400/30">
                          <LineChart className="h-10 w-10 text-amber-300" aria-hidden />
                        </div>
                        <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white/10 transition-colors group-hover:bg-blue-400/30">
                          <ListChecks className="h-10 w-10 text-blue-400" aria-hidden />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

          </div>
        </div>

      {loginOpen ? (
        <KidsCenteredModal
          title={null}
          onClose={closeLogin}
          chrome="login"
          closeLabel={t('kidsLogin.closeModal')}
          maxWidthClass="max-w-md sm:max-w-lg"
          panelClassName="max-h-[90dvh]"
        >
          <div className="relative min-h-0 overflow-hidden px-5 pb-10 pt-14 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:z-0 before:h-40 before:bg-gradient-to-b before:from-fuchsia-100/50 before:via-violet-100/35 before:to-transparent dark:before:from-fuchsia-950/35 dark:before:via-violet-950/25 sm:px-8 sm:pb-12 sm:pt-16">
            <div className="relative z-[1] flex flex-col items-center">
              <KidsLoginBrandLockup ariaLabel={t('landing.loginBrandTitle')} />
              <p className="mt-3 max-w-[18rem] bg-gradient-to-r from-violet-600 via-fuchsia-600 to-amber-500 bg-clip-text text-center text-[10px] font-bold uppercase leading-relaxed tracking-[0.18em] text-transparent dark:from-violet-300 dark:via-fuchsia-300 dark:to-amber-300 sm:mt-4 sm:max-w-none sm:text-[11px] sm:tracking-[0.2em]">
                {t('landing.loginBrandTagline')}
              </p>
            </div>

            <div
              id={tabListId}
              className="relative z-[1] mt-6 rounded-full bg-gradient-to-r from-violet-200/80 via-zinc-200/90 to-fuchsia-200/75 p-1 shadow-inner dark:from-violet-900/55 dark:via-zinc-800/95 dark:to-fuchsia-900/50"
              role="tablist"
              aria-label={t('landing.loginType')}
            >
              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  role="tab"
                  id={`${tabListId}-student`}
                  aria-selected={tab === 'student'}
                  aria-controls={`${tabListId}-panel-student`}
                  onClick={() => setTab('student')}
                  className={`flex items-center justify-center gap-1.5 rounded-full px-2 py-3 text-[11px] font-black transition sm:text-xs ${
                    tab === 'student'
                      ? 'bg-white text-violet-800 shadow-[0_4px_18px_-2px_rgba(139,92,246,0.45)] ring-2 ring-violet-300/80 dark:bg-violet-950/85 dark:text-violet-100 dark:ring-violet-500/45'
                      : 'text-violet-800 hover:bg-white/80 dark:text-violet-200 dark:hover:bg-violet-950/40'
                  }`}
                >
                  <GraduationCap
                    className={`h-4 w-4 shrink-0 sm:h-4 sm:w-4 ${tab === 'student' ? 'text-violet-600 dark:text-violet-300' : 'text-violet-500 dark:text-violet-400'}`}
                    strokeWidth={tab === 'student' ? 2.75 : 2.25}
                    aria-hidden
                  />
                  <span className="leading-tight">{t('landing.role.student')}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  id={`${tabListId}-parent`}
                  aria-selected={tab === 'parent'}
                  aria-controls={`${tabListId}-panel-parent`}
                  onClick={() => setTab('parent')}
                  className={`flex items-center justify-center gap-1.5 rounded-full px-2 py-3 text-[11px] font-black transition sm:text-xs ${
                    tab === 'parent'
                      ? 'bg-white text-emerald-900 shadow-[0_4px_18px_-2px_rgba(16,185,129,0.42)] ring-2 ring-emerald-300/80 dark:bg-emerald-950/70 dark:text-emerald-100 dark:ring-emerald-500/40'
                      : 'text-emerald-800 hover:bg-white/80 dark:text-emerald-200 dark:hover:bg-emerald-950/35'
                  }`}
                >
                  <Users
                    className={`h-4 w-4 shrink-0 ${tab === 'parent' ? 'text-emerald-600 dark:text-emerald-300' : 'text-emerald-500 dark:text-emerald-400'}`}
                    strokeWidth={tab === 'parent' ? 2.75 : 2.25}
                    aria-hidden
                  />
                  <span className="leading-tight">{t('landing.role.parent')}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  id={`${tabListId}-teacher`}
                  aria-selected={tab === 'teacher'}
                  aria-controls={`${tabListId}-panel-teacher`}
                  onClick={() => setTab('teacher')}
                  className={`flex items-center justify-center gap-1.5 rounded-full px-2 py-3 text-[11px] font-black transition sm:text-xs ${
                    tab === 'teacher'
                      ? 'bg-white text-sky-900 shadow-[0_4px_18px_-2px_rgba(14,165,233,0.42)] ring-2 ring-sky-300/80 dark:bg-sky-950/70 dark:text-sky-100 dark:ring-sky-500/40'
                      : 'text-sky-800 hover:bg-white/80 dark:text-sky-200 dark:hover:bg-sky-950/35'
                  }`}
                >
                  <Briefcase
                    className={`h-4 w-4 shrink-0 ${tab === 'teacher' ? 'text-sky-600 dark:text-sky-300' : 'text-sky-500 dark:text-sky-400'}`}
                    strokeWidth={tab === 'teacher' ? 2.75 : 2.25}
                    aria-hidden
                  />
                  <span className="leading-tight">{t('landing.role.teacher')}</span>
                </button>
              </div>
            </div>

            {tab === 'student' ? (
              <div
                id={`${tabListId}-panel-student`}
                role="tabpanel"
                aria-labelledby={`${tabListId}-student`}
                className="relative z-[1] mt-5 space-y-4"
              >
                {modalAuthPhase === 'login' ? (
                  <div className="flex gap-3 rounded-xl border-2 border-sky-300/70 bg-[#EBF5FF]/95 p-4 shadow-md shadow-sky-200/45 dark:border-sky-600/50 dark:bg-sky-950/55 dark:shadow-sky-950/30">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-white shadow-md shadow-sky-400/35"
                      aria-hidden
                    >
                      <Info className="h-5 w-5" strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sky-950 dark:text-sky-50">{t('landing.loginWelcomeTitle')}</p>
                      <p className="mt-1 text-xs leading-relaxed text-sky-900/90 dark:text-sky-100/85">
                        {t('landing.studentModalHint')}
                      </p>
                    </div>
                  </div>
                ) : null}
                <KidsRoleLoginForm
                  embedded
                  surfaceVariant="card"
                  fieldIdSuffix="student"
                  title={t('landing.studentLoginTitle')}
                  subtitle={t('landing.studentLoginSubtitle')}
                  identifierLabel={t('landing.studentIdentifierLabel')}
                  identifierPlaceholder={t('landing.studentIdentifierPlaceholder')}
                  identifierInputType="text"
                  allowedRoles={['student']}
                  redirectTo="/ogrenci/panel"
                  onEmbeddedForgotPhaseChange={setModalAuthPhase}
                />
              </div>
            ) : tab === 'parent' ? (
              <div
                id={`${tabListId}-panel-parent`}
                role="tabpanel"
                aria-labelledby={`${tabListId}-parent`}
                className="relative z-[1] mt-5 space-y-4"
              >
                {modalAuthPhase === 'login' ? (
                  <div className="flex gap-3 rounded-xl border-2 border-sky-300/70 bg-[#EBF5FF]/95 p-4 shadow-md shadow-sky-200/45 dark:border-sky-600/50 dark:bg-sky-950/55 dark:shadow-sky-950/30">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-white shadow-md shadow-sky-400/35"
                      aria-hidden
                    >
                      <Info className="h-5 w-5" strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sky-950 dark:text-sky-50">{t('landing.loginWelcomeTitle')}</p>
                      <p className="mt-1 text-xs leading-relaxed text-sky-900/90 dark:text-sky-100/85">
                        {t('landing.parentModalHint')}
                      </p>
                    </div>
                  </div>
                ) : null}
                <KidsRoleLoginForm
                  embedded
                  surfaceVariant="card"
                  fieldIdSuffix="parent"
                  title={t('landing.parentLoginTitle')}
                  subtitle={t('landing.parentLoginSubtitle')}
                  allowedRoles={['parent']}
                  redirectTo="/veli/panel"
                  onEmbeddedForgotPhaseChange={setModalAuthPhase}
                />
              </div>
            ) : (
              <div
                id={`${tabListId}-panel-teacher`}
                role="tabpanel"
                aria-labelledby={`${tabListId}-teacher`}
                className="relative z-[1] mt-5 space-y-4"
              >
                {modalAuthPhase === 'login' ? (
                  <div className="flex gap-3 rounded-xl border-2 border-sky-300/70 bg-[#EBF5FF]/95 p-4 shadow-md shadow-sky-200/45 dark:border-sky-600/50 dark:bg-sky-950/55 dark:shadow-sky-950/30">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-white shadow-md shadow-sky-400/35"
                      aria-hidden
                    >
                      <Info className="h-5 w-5" strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sky-950 dark:text-sky-50">{t('landing.loginWelcomeTitle')}</p>
                      <p className="mt-1 text-xs leading-relaxed text-sky-900/90 dark:text-sky-100/85">
                        {t('landing.teacherModalHint')}
                      </p>
                    </div>
                  </div>
                ) : null}
                <KidsRoleLoginForm
                  embedded
                  surfaceVariant="card"
                  fieldIdSuffix="teacher"
                  title={t('landing.teacherLoginTitle')}
                  subtitle={t('landing.teacherLoginSubtitle')}
                  allowedRoles={['teacher', 'admin']}
                  redirectTo="/ogretmen/panel"
                  onEmbeddedForgotPhaseChange={setModalAuthPhase}
                />
              </div>
            )}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-36 overflow-hidden" aria-hidden>
              <div className="absolute -bottom-10 left-[4%] h-44 w-52 -rotate-6 rounded-[55%_45%_50%_50%] bg-gradient-to-tr from-orange-300/65 to-amber-200/50 blur-2xl dark:from-amber-600/25 dark:to-orange-900/20" />
              <div className="absolute -bottom-8 right-[2%] h-40 w-48 rotate-6 rounded-[50%_50%_45%_55%] bg-gradient-to-bl from-fuchsia-400/50 to-violet-400/45 blur-2xl dark:from-fuchsia-700/20 dark:to-violet-900/25" />
              <div className="absolute -bottom-4 left-1/3 h-28 w-36 rounded-full bg-cyan-300/35 blur-2xl dark:bg-cyan-800/15" />
              <div className="absolute bottom-0 left-1/2 h-28 w-[90%] -translate-x-1/2 rounded-t-[100%] bg-gradient-to-t from-fuchsia-300/35 via-violet-200/20 to-transparent dark:from-fuchsia-900/30 dark:via-transparent" />
            </div>
          </div>
        </KidsCenteredModal>
      ) : null}
    </>
  );
}
