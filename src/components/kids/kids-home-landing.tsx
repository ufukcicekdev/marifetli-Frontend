'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useId, useState } from 'react';
import { KidsRoleLoginForm } from '@/src/components/kids/kids-role-login-form';
import { KidsCenteredModal, KidsPrimaryButton, KidsSecondaryButton } from '@/src/components/kids/kids-ui';
import { kidsHomeHref } from '@/src/lib/kids-config';

type LoginTab = 'student' | 'teacher';

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
            <span className="inline-block animate-pulse" aria-hidden>
              ✨
            </span>
            Güvenli alan
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border-2 border-amber-200 bg-amber-50/90 px-3 py-1 text-xs font-bold text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100">
            🌈 Eğlenerek öğren
          </span>
        </div>

        {/* Ana kahraman */}
        <div className="relative">
          <p
            className="pointer-events-none absolute -top-2 right-4 animate-bounce text-4xl sm:right-12 sm:text-5xl"
            aria-hidden
          >
            🎈
          </p>
          <p
            className="pointer-events-none absolute bottom-8 left-2 animate-pulse text-3xl sm:left-8 sm:text-4xl"
            aria-hidden
          >
            ⭐
          </p>

          <div className="rounded-[2rem] border-4 border-white/90 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-amber-400 p-1.5 shadow-2xl shadow-fuchsia-500/30 dark:border-violet-900/60 dark:from-violet-800 dark:via-fuchsia-800 dark:to-amber-700">
            <div className="rounded-[1.65rem] bg-white/95 px-6 py-10 dark:bg-gray-950/95 sm:px-12 sm:py-14">
              <p className="text-center text-sm font-black uppercase tracking-[0.2em] text-fuchsia-600 dark:text-fuchsia-400">
                Marifetli Kids
              </p>
              <h1 className="font-logo mt-3 text-center text-4xl font-black leading-tight text-violet-950 dark:text-white sm:text-6xl">
                Renkli projeler,
                <br />
                <span className="bg-gradient-to-r from-fuchsia-600 to-amber-500 bg-clip-text text-transparent dark:from-fuchsia-400 dark:to-amber-400">
                  senin köşen!
                </span>
              </h1>
              <p className="mx-auto mt-5 max-w-lg text-center text-base font-medium leading-relaxed text-slate-600 dark:text-gray-300 sm:text-lg">
                Öğretmeninin verdiği projeleri tamamla, serbest kürsüde parla, rozet yolunda ilerle — hepsi tek yerde,
                çocuk dostu ve güvenli.
              </p>

              <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <KidsPrimaryButton
                  type="button"
                  className="min-h-14 w-full max-w-xs rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-base font-black shadow-lg shadow-fuchsia-500/35 ring-4 ring-fuchsia-200/50 hover:from-violet-500 hover:to-fuchsia-500 dark:ring-fuchsia-900/40"
                  onClick={() => setLoginOpen(true)}
                >
                  🚀 Giriş yap
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
              🎒
            </span>
            <h2 className="font-logo mt-2 text-lg font-bold text-sky-900 dark:text-sky-100">Projeler</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-sky-900/80 dark:text-sky-100/80">
              Metin, görsel veya video ile teslim; öğretmen geri bildirimi hemen panelinde.
            </p>
          </div>
          <div className="group rounded-3xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg dark:border-amber-800/50 dark:from-amber-950/40 dark:to-gray-900/90">
            <span className="text-3xl transition group-hover:rotate-6" aria-hidden>
              🎤
            </span>
            <h2 className="font-logo mt-2 text-lg font-bold text-amber-900 dark:text-amber-100">Serbest kürsü</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-amber-900/80 dark:text-amber-100/80">
              Kendi fikirlerini paylaş; sınıfın ötesinde de parlayabilirsin.
            </p>
          </div>
          <div className="group rounded-3xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg dark:border-violet-800/50 dark:from-violet-950/40 dark:to-gray-900/90 sm:col-span-1">
            <span className="text-3xl transition group-hover:scale-110" aria-hidden>
              🏅
            </span>
            <h2 className="font-logo mt-2 text-lg font-bold text-violet-900 dark:text-violet-100">Rozet yolu</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-violet-900/80 dark:text-violet-100/80">
              İlerle, kutla, motive ol — oyunlaştırılmış küçük zaferler.
            </p>
          </div>
        </div>

        {/* Öğrenci / öğretmen özet kartları */}
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="rounded-3xl border-2 border-sky-200/90 bg-white/80 p-6 dark:border-sky-800/60 dark:bg-gray-900/70">
            <div className="flex items-center gap-3">
              <span className="text-3xl" aria-hidden>
                🧒
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
                👩‍🏫
              </span>
              <h2 className="font-logo text-xl font-bold text-emerald-900 dark:text-emerald-100">Öğretmen misin?</h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-gray-300">
              Sınıf ve proje yönetimi, davetler ve haftanın yıldızı — hesabın yönetici tarafından açılır.
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

        <p className="text-center text-sm font-semibold text-violet-800/90 dark:text-violet-200/90">
          Veli onaylı kayıt · Kişisel verine saygı · 🌟 İyi eğlenceler
        </p>
      </div>

      {loginOpen ? (
        <KidsCenteredModal
          title={
            <span className="flex items-center gap-2">
              <span aria-hidden>🚪</span>
              Giriş
            </span>
          }
          onClose={closeLogin}
          maxWidthClass="max-w-md"
          panelClassName="max-h-[88dvh]"
        >
          <p className="text-sm text-slate-600 dark:text-gray-400">
            Sekmeyi seç, e-posta ve şifreni yaz — ayrı giriş sayfası yok.
          </p>

          <div
            id={tabListId}
            className="mt-4 rounded-2xl bg-gradient-to-r from-violet-200/80 via-fuchsia-200/70 to-amber-200/80 p-1.5 dark:from-violet-900/50 dark:via-fuchsia-900/50 dark:to-amber-900/40"
            role="tablist"
            aria-label="Giriş türü"
          >
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                role="tab"
                id={`${tabListId}-student`}
                aria-selected={tab === 'student'}
                aria-controls={`${tabListId}-panel-student`}
                onClick={() => setTab('student')}
                className={`rounded-xl px-3 py-3 text-sm font-black transition sm:py-3.5 ${
                  tab === 'student'
                    ? 'bg-white text-violet-950 shadow-md ring-2 ring-fuchsia-400/60 dark:bg-gray-950 dark:text-white dark:ring-fuchsia-500/40'
                    : 'text-violet-900/80 hover:bg-white/70 dark:text-violet-100/80 dark:hover:bg-violet-950/40'
                }`}
              >
                <span className="mr-1" aria-hidden>
                  🎒
                </span>
                Öğrenci
              </button>
              <button
                type="button"
                role="tab"
                id={`${tabListId}-teacher`}
                aria-selected={tab === 'teacher'}
                aria-controls={`${tabListId}-panel-teacher`}
                onClick={() => setTab('teacher')}
                className={`rounded-xl px-3 py-3 text-sm font-black transition sm:py-3.5 ${
                  tab === 'teacher'
                    ? 'bg-white text-emerald-950 shadow-md ring-2 ring-emerald-400/60 dark:bg-gray-950 dark:text-emerald-50 dark:ring-emerald-500/40'
                    : 'text-emerald-900/80 hover:bg-white/70 dark:text-emerald-100/80 dark:hover:bg-emerald-950/30'
                }`}
              >
                <span className="mr-1" aria-hidden>
                  🍎
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
                  </p>
                </div>
              ) : null}
              <KidsRoleLoginForm
                embedded
                fieldIdSuffix="student"
                title="Öğrenci girişi"
                subtitle="Kayıt yalnızca öğretmen davetiyle yapılır."
                allowedRoles={['student']}
                redirectTo="/ogrenci/panel"
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
                subtitle="E-posta ve şifrenle sınıf ve proje yönetimine gir."
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
