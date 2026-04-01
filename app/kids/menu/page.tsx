'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useAuthStore } from '@/src/stores/auth-store';
import { NavIcon } from '@/src/components/nav-icon';
import { kidsNavLinks } from '@/src/components/kids/kids-nav';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import { useKidsI18n } from '@/src/providers/kids-language-provider';
import { kidsPathPrefixFromHost } from '@/src/lib/kids-config';

export default function KidsMobileMenuPage() {
  const { user, loading } = useKidsAuth();
  const siteAdmin = useAuthStore((s) => Boolean(s.user?.is_staff || s.user?.is_superuser));
  const { t } = useKidsI18n();
  const p = kidsPathPrefixFromHost('');

  const items = useMemo(
    () => kidsNavLinks(p, loading ? null : user?.role ?? null, { siteAdmin }),
    [p, loading, user?.role, siteAdmin],
  );

  return (
    <div className="mx-auto max-w-3xl px-3 pb-8">
      <h1 className="mb-4 text-2xl font-black text-violet-950 dark:text-white">{t('header.menu')}</h1>
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
