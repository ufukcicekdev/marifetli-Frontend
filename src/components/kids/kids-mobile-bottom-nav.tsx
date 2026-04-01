'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { useAuthStore } from '@/src/stores/auth-store';
import { NavIcon } from '@/src/components/nav-icon';
import {
  kidsMobileBottomItems,
  isKidsMobileBottomActive,
  type KidsMobileBottomItem,
} from '@/src/components/kids/kids-nav';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import { useKidsI18n } from '@/src/providers/kids-language-provider';

type KidsMobileBottomNavProps = {
  pathPrefix: string;
};

function NavSlot({
  item,
  active,
  label,
  onMenuToggle,
}: {
  item: KidsMobileBottomItem;
  active: boolean;
  label: string;
  onMenuToggle: (() => void) | null;
}) {
  const isCenter = item.kind === 'center';
  const base =
    'flex min-w-0 flex-col items-center justify-end gap-0.5 px-0.5 pb-1.5 pt-0.5 min-h-[52px] transition-colors';
  const isMenuItem = item.href.endsWith('/menu') || item.href === '/menu';

  if (isCenter) {
    return (
      <Link
        href={item.href}
        className={`${base} -mt-3 rounded-full bg-linear-to-br from-violet-600 to-fuchsia-600 px-3 py-2 text-white shadow-lg ring-4 ring-white dark:ring-gray-950`}
        aria-current={active ? 'page' : undefined}
      >
        <NavIcon name={item.icon} className="h-7 w-7 shrink-0 text-white" />
        <span className="max-w-18 truncate text-center text-[10px] font-semibold leading-tight">{label}</span>
      </Link>
    );
  }

  if (isMenuItem && active && onMenuToggle) {
    return (
      <button
        type="button"
        onClick={onMenuToggle}
        className={`${base} ${
          active ? 'text-violet-600 dark:text-violet-400' : 'text-zinc-500 dark:text-zinc-400'
        }`}
        aria-current={active ? 'page' : undefined}
      >
        <NavIcon name={item.icon} className="h-6 w-6" />
        <span className="max-w-16 truncate text-center text-[10px] font-semibold leading-tight">{label}</span>
      </button>
    );
  }

  return (
    <Link
      href={item.href}
      className={`${base} ${
        active ? 'text-violet-600 dark:text-violet-400' : 'text-zinc-500 dark:text-zinc-400'
      }`}
      aria-current={active ? 'page' : undefined}
    >
      <NavIcon name={item.icon} className="h-6 w-6" />
      <span className="max-w-16 truncate text-center text-[10px] font-semibold leading-tight">{label}</span>
    </Link>
  );
}

/**
 * Kids portal: mobilde sabit alt menü (rol bazlı 5 kısayol).
 */
export function KidsMobileBottomNav({ pathPrefix }: KidsMobileBottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useKidsAuth();
  const siteAdmin = useAuthStore((s) => Boolean(s.user?.is_staff || s.user?.is_superuser));
  const { t } = useKidsI18n();

  const items = useMemo(
    () => kidsMobileBottomItems(pathPrefix, loading ? null : user?.role ?? null, { siteAdmin }),
    [pathPrefix, user?.role, loading, siteAdmin],
  );

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-violet-200/80 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_24px_rgba(91,33,182,0.08)] backdrop-blur-md dark:border-violet-900/50 dark:bg-gray-950/95 md:hidden"
      aria-label={t('kids.bottomNav.aria')}
    >
      <ul className="mx-auto flex max-w-lg items-end justify-between gap-0 px-1 pt-1">
        {items.map((item) => {
          const active = isKidsMobileBottomActive(pathname, item, pathPrefix);
          const label = t(item.labelKey);
          const isMenuItem = item.href.endsWith('/menu') || item.href === '/menu';
          const onMenuToggle =
            isMenuItem && active
              ? () => {
                  if (typeof window !== 'undefined' && window.history.length > 1) {
                    router.back();
                  } else {
                    router.push(pathPrefix || '/');
                  }
                }
              : null;
          return (
            <li key={`${item.href}-${item.kind}-${item.labelKey}`} className="flex min-w-0 flex-1 justify-center">
              <NavSlot item={item} active={active} label={label} onMenuToggle={onMenuToggle} />
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
