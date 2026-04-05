'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/src/stores/auth-store';
import { NavIcon } from '@/src/components/nav-icon';
import { kidsNavLinks } from '@/src/components/kids/kids-nav';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import { useKidsI18n } from '@/src/providers/kids-language-provider';
import { KIDS_USE_SIDEBAR, kidsPathPrefixFromHost } from '@/src/lib/kids-config';
import { kidsPatchMe, type KidsLanguageCode } from '@/src/lib/kids-api';
import { ThemeToggle } from '@/src/components/theme-toggle';

export default function KidsMobileMenuPage() {
  const { user, loading, refreshUser } = useKidsAuth();
  const siteAdmin = useAuthStore((s) => Boolean(s.user?.is_staff || s.user?.is_superuser));
  const { t, language, canChangeLanguage, setLanguageLocal } = useKidsI18n();
  const [savingLanguage, setSavingLanguage] = useState(false);
  const p = kidsPathPrefixFromHost('');

  async function onLanguageChange(nextRaw: string) {
    if (!canChangeLanguage) return;
    const next = (nextRaw === 'en' || nextRaw === 'ge' ? nextRaw : 'tr') as KidsLanguageCode;
    if (next === language) return;
    setLanguageLocal(next);
    setSavingLanguage(true);
    try {
      await kidsPatchMe({ preferred_language: next });
      await refreshUser();
      toast.success(t('profile.saved'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.saveFailed'));
    } finally {
      setSavingLanguage(false);
    }
  }

  const items = useMemo(
    () => kidsNavLinks(p, loading ? null : user?.role ?? null, { siteAdmin }),
    [p, loading, user?.role, siteAdmin],
  );

  return (
    <div className="mx-auto max-w-3xl px-3 pb-8">
      <h1 className="mb-4 text-2xl font-black text-violet-950 dark:text-white">{t('header.menu')}</h1>
      <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-violet-200/80 bg-white px-4 py-3 dark:border-violet-800/50 dark:bg-gray-900 md:hidden">
        <span className="text-sm font-semibold text-violet-900 dark:text-violet-100">{t('sidebar.theme')}</span>
        <ThemeToggle />
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-2xl border border-violet-200/80 bg-white p-4 transition hover:bg-violet-50 dark:border-violet-800/50 dark:bg-gray-900 dark:hover:bg-gray-800"
          >
            <div className="flex items-center gap-3">
              <span aria-hidden>
                <NavIcon name={item.icon} className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-violet-900 dark:text-violet-100">{t(item.labelKey)}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
      {canChangeLanguage ? (
        <div
          className={`mt-4 rounded-2xl border border-violet-200/80 bg-violet-50/70 p-3 dark:border-violet-800 dark:bg-violet-950/30${KIDS_USE_SIDEBAR ? ' lg:hidden' : ''}`}
        >
          <label htmlFor="kids-menu-language" className="mb-1 block text-xs font-semibold text-violet-900 dark:text-violet-100">
            {t('sidebar.language')}
          </label>
          <select
            id="kids-menu-language"
            className="h-10 w-full rounded-xl border border-violet-300 bg-white px-3 text-sm text-violet-900 dark:border-violet-700 dark:bg-gray-900 dark:text-violet-100"
            value={language}
            disabled={savingLanguage}
            onChange={(e) => void onLanguageChange(e.target.value)}
          >
            <option value="tr">{t('profile.language.tr')}</option>
            <option value="en">{t('profile.language.en')}</option>
            <option value="ge">{t('profile.language.ge')}</option>
          </select>
          {savingLanguage ? (
            <p className="mt-1 text-[11px] text-violet-700 dark:text-violet-300">{t('sidebar.languageSaving')}</p>
          ) : null}
        </div>
      ) : null}
      <Link
        href="/"
        className="mt-4 inline-flex items-center gap-2 rounded-xl border border-violet-200/80 bg-white px-4 py-2.5 font-semibold text-violet-900 transition hover:bg-violet-50 dark:border-violet-800/50 dark:bg-gray-900 dark:text-violet-100 dark:hover:bg-gray-800"
      >
        <span aria-hidden>
          <NavIcon name="site" className="h-5 w-5" />
        </span>
        {t('sidebar.mainSite')}
      </Link>
    </div>
  );
}
