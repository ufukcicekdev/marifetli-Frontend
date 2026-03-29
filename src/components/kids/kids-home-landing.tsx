'use client';

import {
  Backpack,
  ArrowRight,
  CalendarDays,
  DoorOpen,
  GraduationCap,
  Mic2,
  PartyPopper,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Trophy,
  Users,
  Images,
  MessageCircle,
  Rocket,
  Wand2,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useId, useState, type ReactNode } from 'react';
import { KidsRoleLoginForm } from '@/src/components/kids/kids-role-login-form';
import { KidsCenteredModal, KidsPrimaryButton, KidsSecondaryButton } from '@/src/components/kids/kids-ui';
import { kidsHomeHref } from '@/src/lib/kids-config';

type LoginTab = 'student' | 'teacher' | 'parent';

function KidsLandingRolePickCard({
  label,
  icon,
  circleClass,
  onPick,
}: {
  label: string;
  icon: ReactNode;
  circleClass: string;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-label={`${label} olarak giriş yap`}
      className="group flex min-h-0 w-full min-w-0 flex-col items-center gap-2 rounded-3xl border border-slate-200/90 bg-white/95 px-2 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300/90 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 sm:gap-3 sm:px-4 sm:py-6 dark:border-slate-600/80 dark:bg-gray-900/90 dark:hover:border-sky-600/70"
    >
      <span
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full shadow-inner sm:h-[4.5rem] sm:w-[4.5rem] ${circleClass}`}
        aria-hidden
      >
        {icon}
      </span>
      <span className="font-logo text-center text-xs font-black leading-tight text-slate-900 sm:text-base dark:text-white">
        {label}
      </span>
      <ArrowRight
        className="h-4 w-4 shrink-0 text-sky-500 transition group-hover:translate-x-1 sm:h-5 sm:w-5 dark:text-sky-400"
        strokeWidth={2.5}
        aria-hidden
      />
    </button>
  );
}

/** `frontend/public/kids/landing/` → her zaman kökten `/kids/landing/...` */
const KIDS_LANDING_IMAGE = (file: string) => `/kids/landing/${file}`;

/** Üretilen PNG’ler 16:10; grid içinde `fill` yerine sabit oran kullanıyoruz (yükseme sıfır hatası). */
const KIDS_LANDING_IMG_WIDTH = 1600;
const KIDS_LANDING_IMG_HEIGHT = 1000;

/** Görsel–metin zig-zag: `imageFirst` true → solda görsel; false → solda metin (md+). */
function KidsLandingZigzagRow({
  title,
  body,
  imageSrc,
  imageAlt,
  iconWrapClass,
  icon,
  imageFirst,
  imageBackdropClass,
}: {
  title: string;
  body: string;
  imageSrc: string;
  imageAlt: string;
  iconWrapClass: string;
  icon: ReactNode;
  imageFirst: boolean;
  /** Yumuşak “blob” leke (örn. lime veya pembe) — referans görseldeki gibi */
  imageBackdropClass?: string;
}) {
  const imageFrame = (
    <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white/90 shadow-lg shadow-slate-200/40 dark:border-slate-600/60 dark:bg-slate-900/80 dark:shadow-black/20">
      <Image
        src={imageSrc}
        alt={imageAlt}
        width={KIDS_LANDING_IMG_WIDTH}
        height={KIDS_LANDING_IMG_HEIGHT}
        className="h-auto w-full object-cover"
        sizes="(max-width: 767px) 100vw, 50vw"
        priority={false}
      />
    </div>
  );

  const imageCol = (
    <div className="w-full min-w-0 md:max-w-none">
      {imageBackdropClass ? (
        <div className="relative isolate py-2 md:py-4">
          <div
            className={`pointer-events-none absolute left-1/2 top-[55%] z-0 h-[95%] w-[98%] -translate-x-1/2 -translate-y-1/2 scale-[1.06] rounded-[42%_58%_50%_50%/48%_52%_55%_45%] opacity-95 blur-[0.5px] ${imageBackdropClass}`}
            aria-hidden
          />
          <div className="relative z-10">{imageFrame}</div>
        </div>
      ) : (
        imageFrame
      )}
    </div>
  );

  const textCol = (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex items-start gap-4 sm:gap-5">
        <div
          className={`mt-1 shrink-0 inline-flex h-11 w-11 items-center justify-center rounded-full text-white shadow-md sm:h-12 sm:w-12 ${iconWrapClass}`}
          aria-hidden
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <h2 className="font-logo text-xl font-black leading-tight text-slate-900 dark:text-white sm:text-2xl lg:text-3xl">
            {title}
          </h2>
          <p className="max-w-xl text-base font-medium leading-relaxed text-slate-600 dark:text-gray-300">
            {body}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid gap-8 md:grid-cols-2 md:items-start md:gap-10 lg:gap-14">
      {imageFirst ? (
        <>
          {imageCol}
          {textCol}
        </>
      ) : (
        <>
          {textCol}
          {imageCol}
        </>
      )}
    </div>
  );
}

export function KidsHomeLanding({ pathPrefix }: { pathPrefix: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loginOpen, setLoginOpen] = useState(false);
  const [tab, setTab] = useState<LoginTab>('student');
  /** Modal içi: girişte üst bilgi kutusu; şifre sıfırlamada gizlenir */
  const [modalAuthPhase, setModalAuthPhase] = useState<'login' | 'forgot' | 'sent'>('login');
  const tabListId = useId();

  const closeLogin = useCallback(() => {
    setLoginOpen(false);
    setModalAuthPhase('login');
  }, []);

  useEffect(() => {
    setModalAuthPhase('login');
  }, [tab]);

  useEffect(() => {
    const g = searchParams.get('giris');
    if (g === 'ogrenci') {
      setTab('student');
      setLoginOpen(true);
    } else if (g === 'ogretmen') {
      setTab('teacher');
      setLoginOpen(true);
    } else if (g === 'veli') {
      setTab('parent');
      setLoginOpen(true);
    } else if (g === '1') {
      setLoginOpen(true);
    } else {
      return;
    }
    const home = kidsHomeHref(pathPrefix);
    router.replace(home, { scroll: false });
  }, [searchParams, pathPrefix, router]);

  return (
    <div className="relative mx-auto max-w-5xl overflow-hidden pb-8">
      {/* Dekor: yumuşak lekeler */}
      <div
        className="pointer-events-none absolute -left-24 top-8 h-56 w-56 rounded-full bg-fuchsia-400/30 blur-3xl dark:bg-fuchsia-600/20"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 bottom-32 h-64 w-64 rounded-full bg-amber-300/35 blur-3xl dark:bg-amber-500/15"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-40 w-40 -translate-x-1/2 rounded-full bg-sky-400/25 blur-2xl dark:bg-sky-600/15"
        aria-hidden
      />

      <div className="relative space-y-10">
        {/* Üst şerit */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-violet-200 bg-white/90 px-3 py-1 text-xs font-bold text-violet-800 shadow-sm dark:border-violet-800 dark:bg-violet-950/60 dark:text-violet-100">
            <Sparkles className="inline-block h-3.5 w-3.5 animate-pulse" aria-hidden />
            Güvenli alan
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border-2 border-amber-200 bg-amber-50/90 px-3 py-1 text-xs font-bold text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Eğlenerek öğren
          </span>
        </div>

        {/* Ana kahraman */}
        <div className="relative">
          <PartyPopper className="pointer-events-none absolute -top-2 right-4 h-8 w-8 animate-bounce text-fuchsia-400 sm:right-12 sm:h-10 sm:w-10" aria-hidden />
          <Star className="pointer-events-none absolute bottom-8 left-2 h-7 w-7 animate-pulse text-amber-400 sm:left-8 sm:h-8 sm:w-8" aria-hidden />

          <div className="rounded-[2rem] border-4 border-white/90 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-amber-400 p-1.5 shadow-2xl shadow-fuchsia-500/30 dark:border-violet-900/60 dark:from-violet-800 dark:via-fuchsia-800 dark:to-amber-700">
            <div className="rounded-[1.65rem] bg-white/95 px-6 py-10 dark:bg-gray-950/95 sm:px-12 sm:py-14">
              <p className="text-center text-sm font-black uppercase tracking-[0.2em] text-fuchsia-600 dark:text-fuchsia-400">
                Marifetli Kids
              </p>
              <h1 className="font-logo mt-3 text-center text-4xl font-black leading-tight text-violet-950 dark:text-white sm:text-6xl">
                Renkli challenges,
                <br />
                <span className="bg-gradient-to-r from-fuchsia-600 to-amber-500 bg-clip-text text-transparent dark:from-fuchsia-400 dark:to-amber-400">
                  senin köşen!
                </span>
              </h1>
              <p className="mx-auto mt-5 max-w-lg text-center text-base font-medium leading-relaxed text-slate-600 dark:text-gray-300 sm:text-lg">
                Öğretmeninin verdiği challenge’ları tamamla, serbest kürsüde parla, rozet yolunda ilerle — hepsi tek yerde,
                çocuk dostu ve güvenli.
              </p>

              <div className="mx-auto mt-10 w-full max-w-3xl px-0 sm:px-2">
                <p className="text-center text-lg font-black text-slate-900 dark:text-white sm:text-xl">
                  Şunlardan hangisisiniz?
                </p>
                <div className="mt-6 grid w-full grid-cols-3 gap-2 sm:gap-4 md:gap-5">
                  <KidsLandingRolePickCard
                    label="Öğretmen"
                    icon={<GraduationCap className="h-7 w-7 text-rose-600 sm:h-8 sm:w-8 dark:text-rose-200" />}
                    circleClass="bg-amber-300/90 text-rose-600 dark:bg-amber-400/40 dark:text-rose-200"
                    onPick={() => {
                      setTab('teacher');
                      setLoginOpen(true);
                    }}
                  />
                  <KidsLandingRolePickCard
                    label="Veli"
                    icon={<Users className="h-7 w-7 text-sky-800 sm:h-8 sm:w-8 dark:text-sky-100" />}
                    circleClass="bg-sky-200/95 text-sky-800 dark:bg-sky-900/50 dark:text-sky-100"
                    onPick={() => {
                      setTab('parent');
                      setLoginOpen(true);
                    }}
                  />
                  <KidsLandingRolePickCard
                    label="Öğrenci"
                    icon={<Backpack className="h-7 w-7 text-emerald-800 sm:h-8 sm:w-8 dark:text-lime-100" />}
                    circleClass="bg-lime-300/90 text-emerald-800 dark:bg-lime-900/40 dark:text-lime-100"
                    onPick={() => {
                      setTab('student');
                      setLoginOpen(true);
                    }}
                  />
                </div>
                <div
                  className="mt-8 flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-4"
                  aria-label="Güven ve topluluk"
                >
                  <div className="flex items-center gap-0.5 text-amber-400" aria-hidden>
                    <span className="text-xl leading-none sm:text-2xl">★</span>
                    <span className="text-xl leading-none sm:text-2xl">★</span>
                    <span className="text-xl leading-none sm:text-2xl">★</span>
                    <span className="text-xl leading-none sm:text-2xl">★</span>
                    <span className="text-xl leading-none text-amber-400/45 sm:text-2xl">★</span>
                  </div>
                  <p className="text-center text-sm font-medium text-slate-500 dark:text-slate-400">
                    Veli onaylı kayıt · Güvenli sınıf ortamı
                  </p>
                </div>
              </div>

              <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <KidsPrimaryButton
                  type="button"
                  className="min-h-14 w-full max-w-xs rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-base font-black shadow-lg shadow-fuchsia-500/35 ring-4 ring-fuchsia-200/50 hover:from-violet-500 hover:to-fuchsia-500 dark:ring-fuchsia-900/40"
                  onClick={() => setLoginOpen(true)}
                >
                  <Rocket className="h-4 w-4" aria-hidden /> Giriş yap
                </KidsPrimaryButton>
                <KidsSecondaryButton
                  type="button"
                  className="min-h-12 w-full max-w-xs rounded-2xl border-2 border-violet-300 font-bold text-violet-900 dark:border-violet-700 dark:text-violet-100"
                  onClick={() => setLoginOpen(true)}
                >
                  Zaten hesabım var
                </KidsSecondaryButton>
              </div>
              
            </div>
          </div>
        </div>

        {/* Bento özellikler */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="group rounded-3xl border-2 border-sky-200 bg-gradient-to-br from-sky-50 to-white p-5 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg dark:border-sky-800/50 dark:from-sky-950/40 dark:to-gray-900/90">
            <span className="text-3xl transition group-hover:scale-110" aria-hidden>
              <Target className="h-7 w-7 text-sky-600" />
            </span>
            <h2 className="font-logo mt-2 text-lg font-bold text-sky-900 dark:text-sky-100">Challenges</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-sky-900/80 dark:text-sky-100/80">
              Metin, görsel veya video ile teslim; öğretmen geri bildirimi hemen panelinde.
            </p>
          </div>
          <div className="group rounded-3xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg dark:border-amber-800/50 dark:from-amber-950/40 dark:to-gray-900/90">
            <span className="text-3xl transition group-hover:rotate-6" aria-hidden>
              <Mic2 className="h-7 w-7 text-amber-600" />
            </span>
            <h2 className="font-logo mt-2 text-lg font-bold text-amber-900 dark:text-amber-100">Serbest kürsü</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-amber-900/80 dark:text-amber-100/80">
              Kendi fikirlerini paylaş; sınıfın ötesinde de parlayabilirsin.
            </p>
          </div>
          <div className="group rounded-3xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg dark:border-violet-800/50 dark:from-violet-950/40 dark:to-gray-900/90 sm:col-span-1">
            <span className="text-3xl transition group-hover:scale-110" aria-hidden>
              <Trophy className="h-7 w-7 text-violet-600" />
            </span>
            <h2 className="font-logo mt-2 text-lg font-bold text-violet-900 dark:text-violet-100">Rozet yolu</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-violet-900/80 dark:text-violet-100/80">
              İlerle, kutla, motive ol — oyunlaştırılmış küçük zaferler.
            </p>
          </div>
        </div>

        {/* Zig-zag + Oyun merkezi + öğrenci/öğretmen kartları; orta çizgi aynı relative blokta (yarım kalmaması için) */}
        <div className="relative space-y-10">
          <section
            className="relative py-10 sm:py-14"
            aria-labelledby="kids-landing-features-heading"
          >
            <h2 id="kids-landing-features-heading" className="sr-only">
              Marifetli Kids özellikleri
            </h2>

            <div className="relative flex flex-col gap-16 sm:gap-20 md:gap-28 lg:gap-32">
            <KidsLandingZigzagRow
              imageFirst
              title="Hemen bağlantı kurun"
              body="Öğretmen, veli ve öğrenci rolleriyle panelde bir aradasınız: challenge geri bildirimleri, onaylar ve bildirimler tek akışta — sınıfı kaçırmadan takip edin."
              imageSrc={KIDS_LANDING_IMAGE('kids-landing-messages.png')}
              imageAlt="Sohbet balonları ve okul iletişimi illüstrasyonu"
              iconWrapClass="bg-sky-500 ring-4 ring-sky-100 dark:ring-sky-900/50"
              icon={<MessageCircle className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2.25} aria-hidden />}
            />
            <KidsLandingZigzagRow
              imageFirst={false}
              title="Onun dünyasına açılan bir pencere sunun"
              body="Challenge teslimleri ve serbest kürsü paylaşımlarıyla sınıf enerjisini yakalayın; veliler çocuklarının üretimini güvenli, kontrollü bir ortamda görebilir."
              imageSrc={KIDS_LANDING_IMAGE('kids-landing-stories.png')}
              imageAlt="Sınıf anlarını gösteren kartlar illüstrasyonu"
              iconWrapClass="bg-amber-500 ring-4 ring-amber-100 dark:ring-amber-900/50"
              icon={<Images className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2.25} aria-hidden />}
            />
            <KidsLandingZigzagRow
              imageFirst
              title="Duyduk, duymadık demeyin!"
              body="Yaklaşan teslim tarihleri, duyurular ve etkinlikleri takvim mantığıyla düşünün: herkes ne zaman ne yapacağını bilir; hatırlatıcılarla iş düşmez."
              imageSrc={KIDS_LANDING_IMAGE('kids-landing-events.png')}
              imageAlt="Etkinlik kartları ve takvim illüstrasyonu"
              iconWrapClass="bg-violet-600 ring-4 ring-violet-100 dark:ring-violet-900/50"
              icon={<CalendarDays className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2.25} aria-hidden />}
            />
            <KidsLandingZigzagRow
              imageFirst={false}
              title="Kendi yöntemleriyle büyümelerine yardımcı olun"
              body="Rozet yolu, challenge ilerlemesi ve oyun merkezi skorlarıyla çocuklar kendi hızında ilerler; küçük kutlamalar motivasyonu tazeliyor — renkli, güvenli bir challenge dünyası."
              imageSrc={KIDS_LANDING_IMAGE('kids-landing-grow.png')}
              imageAlt="Rozet ve gelişim illüstrasyonu: sevimli maskotlar ve rozetler"
              iconWrapClass="bg-lime-500 ring-4 ring-lime-100 dark:ring-lime-900/50"
              icon={<Rocket className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2.25} aria-hidden />}
              imageBackdropClass="bg-lime-200/55 dark:bg-emerald-900/35"
            />
            <KidsLandingZigzagRow
              imageFirst
              title="Şimdiye kadarki en iyi sınıfı oluşturun"
              body="Davet linkleri, sınıf ve challenge yönetimi, teslimleri değerlendirme ve haftanın yıldızı gibi parçalar tek öğretmen panelinde — sınıfınızı toparlayın, zaman kazanın."
              imageSrc={KIDS_LANDING_IMAGE('kids-landing-toolkit.png')}
              imageAlt="Öğretmen araçları illüstrasyonu: sınıf maskotu ve araç ikonları"
              iconWrapClass="bg-rose-500 ring-4 ring-rose-100 dark:ring-rose-900/50"
              icon={<Wand2 className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2.25} aria-hidden />}
              imageBackdropClass="bg-rose-200/50 dark:bg-rose-950/30"
            />
            </div>
          </section>

          {/* Oyun merkezi tanıtımı */}
          <div className="relative z-[3] rounded-3xl border-2 border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 via-violet-50 to-sky-50 p-6 shadow-md dark:border-fuchsia-800/50 dark:from-fuchsia-950/30 dark:via-violet-950/30 dark:to-sky-950/30">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-1 rounded-full border border-fuchsia-300 bg-white/80 px-2.5 py-1 text-xs font-black text-fuchsia-700 dark:border-fuchsia-700 dark:bg-fuchsia-950/40 dark:text-fuchsia-200">
                <Backpack className="h-3.5 w-3.5" aria-hidden /> Yeni: Oyun merkezi
              </p>
              <h2 className="font-logo mt-3 text-2xl font-black text-violet-950 dark:text-violet-50 sm:text-3xl">
                Oyunlarla daha kolay öğrenin
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-200 sm:text-base">
                Hafıza, toplama, çıkarma, çarpma ve bölme oyunlarıyla eğlenerek öğren.
                Seviye atla, combo yap, günlük görevleri tamamla ve rozet kazan.
              </p>
            </div>
            <div className="text-5xl sm:text-6xl" aria-hidden>
              <Trophy className="h-10 w-10 text-amber-500" />
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <KidsPrimaryButton
              type="button"
              className="min-h-12 rounded-2xl"
              onClick={() => router.push(`${pathPrefix}/ogrenci/oyun-merkezi`)}
            >
              Oyunu keşfet
            </KidsPrimaryButton>
            <KidsSecondaryButton
              type="button"
              className="min-h-12 rounded-2xl"
              onClick={() => {
                setTab('student');
                setLoginOpen(true);
              }}
            >
              Öğrenci olarak giriş yap
            </KidsSecondaryButton>
          </div>
          </div>

          {/* Öğrenci / öğretmen — aynı blokta orta çizgi sütun aralığına kadar uzanır */}
          <div className="relative z-[1] grid gap-5 sm:grid-cols-2">
            <div className="rounded-3xl border-2 border-sky-200/90 bg-white/80 p-6 dark:border-sky-800/60 dark:bg-gray-900/70">
              <div className="flex items-center gap-3">
                <span className="text-3xl" aria-hidden>
                  <Backpack className="h-7 w-7 text-sky-600" />
                </span>
                <h2 className="font-logo text-xl font-bold text-sky-900 dark:text-sky-100">Öğrenci misin?</h2>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-gray-300">
                Davet linkiyle kayıt ol, sınıfına katıl. Giriş için aşağıdaki düğmeyi veya modalı kullan.
              </p>
              <button
                type="button"
                onClick={() => {
                  setTab('student');
                  setLoginOpen(true);
                }}
                className="mt-4 text-sm font-bold text-sky-700 underline underline-offset-2 hover:text-fuchsia-600 dark:text-sky-300"
              >
                Öğrenci girişi →
              </button>
            </div>
            <div className="rounded-3xl border-2 border-emerald-200/90 bg-white/80 p-6 dark:border-emerald-800/60 dark:bg-gray-900/70">
              <div className="flex items-center gap-3">
                <span className="text-3xl" aria-hidden>
                  <GraduationCap className="h-7 w-7 text-emerald-600" />
                </span>
                <h2 className="font-logo text-xl font-bold text-emerald-900 dark:text-emerald-100">Öğretmen misin?</h2>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-gray-300">
                Sınıf ve challenge yönetimi, davetler ve haftanın yıldızı — hesabın yönetici tarafından açılır.
              </p>
              <button
                type="button"
                onClick={() => {
                  setTab('teacher');
                  setLoginOpen(true);
                }}
                className="mt-4 text-sm font-bold text-emerald-700 underline underline-offset-2 hover:text-fuchsia-600 dark:text-emerald-300"
              >
                Öğretmen girişi →
              </button>
            </div>
          </div>

          {/* md+: net görünen kıvrımlı orta çizgi */}
          <div className="pointer-events-none absolute left-1/2 top-6 bottom-6 z-[2] hidden w-8 -translate-x-1/2 md:block dark:opacity-90" aria-hidden>
            <svg className="h-full w-full" viewBox="0 0 28 240" preserveAspectRatio="none">
              <path
                d="M14 0 C 3 16, 25 32, 14 48 C 3 64, 25 80, 14 96 C 3 112, 25 128, 14 144 C 3 160, 25 176, 14 192 C 3 208, 25 224, 14 240"
                fill="none"
                stroke="rgb(14 165 233 / 0.84)"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        <p className="text-center text-sm font-semibold text-violet-800/90 dark:text-violet-200/90">
          Veli onaylı kayıt · Kişisel verine saygı · İyi eğlenceler
        </p>
      </div>

      {loginOpen ? (
        <KidsCenteredModal
          title={
            <span className="flex items-center gap-2">
              <DoorOpen className="h-4 w-4" aria-hidden />
              Giriş
            </span>
          }
          onClose={closeLogin}
          maxWidthClass="max-w-md"
          panelClassName="max-h-[88dvh]"
        >
          <p className="text-sm text-slate-600 dark:text-gray-400">
            Sekmeyi seç, giriş bilgilerini yaz — ayrı giriş sayfası yok.
          </p>

          <div
            id={tabListId}
            className="mt-4 rounded-2xl bg-gradient-to-r from-violet-200/80 via-fuchsia-200/70 to-amber-200/80 p-1.5 dark:from-violet-900/50 dark:via-fuchsia-900/50 dark:to-amber-900/40"
            role="tablist"
            aria-label="Giriş türü"
          >
            <div className="grid grid-cols-3 gap-1">
              <button
                type="button"
                role="tab"
                id={`${tabListId}-student`}
                aria-selected={tab === 'student'}
                aria-controls={`${tabListId}-panel-student`}
                onClick={() => setTab('student')}
                className={`rounded-xl px-2 py-3 text-xs font-black transition sm:px-3 sm:text-sm sm:py-3.5 ${
                  tab === 'student'
                    ? 'bg-white text-violet-950 shadow-md ring-2 ring-fuchsia-400/60 dark:bg-gray-950 dark:text-white dark:ring-fuchsia-500/40'
                    : 'text-violet-900/80 hover:bg-white/70 dark:text-violet-100/80 dark:hover:bg-violet-950/40'
                }`}
              >
                <span className="mr-1" aria-hidden>
                  <Backpack className="inline h-3.5 w-3.5" />
                </span>
                Öğrenci
              </button>
              <button
                type="button"
                role="tab"
                id={`${tabListId}-parent`}
                aria-selected={tab === 'parent'}
                aria-controls={`${tabListId}-panel-parent`}
                onClick={() => setTab('parent')}
                className={`rounded-xl px-2 py-3 text-xs font-black transition sm:px-3 sm:text-sm sm:py-3.5 ${
                  tab === 'parent'
                    ? 'bg-white text-amber-950 shadow-md ring-2 ring-amber-400/60 dark:bg-gray-950 dark:text-amber-50 dark:ring-amber-500/40'
                    : 'text-amber-900/80 hover:bg-white/70 dark:text-amber-100/80 dark:hover:bg-amber-950/30'
                }`}
              >
                <span className="mr-1" aria-hidden>
                  <Users className="inline h-3.5 w-3.5" />
                </span>
                Veli
              </button>
              <button
                type="button"
                role="tab"
                id={`${tabListId}-teacher`}
                aria-selected={tab === 'teacher'}
                aria-controls={`${tabListId}-panel-teacher`}
                onClick={() => setTab('teacher')}
                className={`rounded-xl px-2 py-3 text-xs font-black transition sm:px-3 sm:text-sm sm:py-3.5 ${
                  tab === 'teacher'
                    ? 'bg-white text-emerald-950 shadow-md ring-2 ring-emerald-400/60 dark:bg-gray-950 dark:text-emerald-50 dark:ring-emerald-500/40'
                    : 'text-emerald-900/80 hover:bg-white/70 dark:text-emerald-100/80 dark:hover:bg-emerald-950/30'
                }`}
              >
                <span className="mr-1" aria-hidden>
                  <GraduationCap className="inline h-3.5 w-3.5" />
                </span>
                Öğretmen
              </button>
            </div>
          </div>

          {tab === 'student' ? (
            <div
              id={`${tabListId}-panel-student`}
              role="tabpanel"
              aria-labelledby={`${tabListId}-student`}
              className="mt-5 space-y-4"
            >
              {modalAuthPhase === 'login' ? (
                <div className="rounded-2xl border-2 border-sky-200 bg-sky-50/80 p-3 dark:border-sky-800/60 dark:bg-sky-950/35">
                  <p className="text-xs leading-relaxed text-sky-900/90 dark:text-sky-100/90">
                    Hesabın yoksa öğretmeninden gelen <strong className="font-semibold">davet linkiyle</strong> kayıt olursun.
                    Kendi e-postan olmasa bile: veli <strong>Veli</strong> sekmesinden giriş yapıp seni{' '}
                    <strong>çocuk paneline</strong> yönlendirebilir. İstersen kullanıcı adı + çocuk şifresi de kullanılır.
                  </p>
                </div>
              ) : null}
              <KidsRoleLoginForm
                embedded
                fieldIdSuffix="student"
                title="Öğrenci girişi"
                subtitle="Kayıt yalnızca öğretmen davetiyle yapılır."
                identifierLabel="E-posta veya kullanıcı adı"
                identifierPlaceholder="ornek@email.com veya ayse_yilmaz_ab12"
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
              className="mt-5 space-y-4"
            >
              {modalAuthPhase === 'login' ? (
                <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/80 p-3 dark:border-amber-800/60 dark:bg-amber-950/35">
                  <p className="text-xs leading-relaxed text-amber-900/90 dark:text-amber-100/90">
                    Veli hesabın, sınıf davetiyle kayıt sırasında oluşturduğun <strong>e-posta ve şifre</strong> ile açılır.
                    Çocuk onayları ve bağlı hesaplar burada görünecek.
                  </p>
                </div>
              ) : null}
              <KidsRoleLoginForm
                embedded
                fieldIdSuffix="parent"
                title="Veli girişi"
                subtitle="Davet formunda belirlediğin veli e-postası ve şifre."
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
              className="mt-5 space-y-4"
            >
              {modalAuthPhase === 'login' ? (
                <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/80 p-3 dark:border-emerald-800/60 dark:bg-emerald-950/35">
                  <p className="text-xs leading-relaxed text-emerald-900/90 dark:text-emerald-100/90">
                    Hesabın yönetici tarafından açılmış olmalıdır.
                  </p>
                </div>
              ) : null}
              <KidsRoleLoginForm
                embedded
                fieldIdSuffix="teacher"
                title="Öğretmen girişi"
                subtitle="E-posta ve şifrenle sınıf ve challenge yönetimine gir."
                allowedRoles={['teacher', 'admin']}
                redirectTo="/ogretmen/panel"
                onEmbeddedForgotPhaseChange={setModalAuthPhase}
              />
            </div>
          )}
        </KidsCenteredModal>
      ) : null}
    </div>
  );
}
