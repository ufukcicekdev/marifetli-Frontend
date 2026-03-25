import type { ReactNode } from 'react';

type MarifetliKidsLegalPageShellProps = {
  title: string;
  children: ReactNode;
  /** Kids portalında koyu zemine uyum */
  variant?: 'main' | 'kids';
};

export function MarifetliKidsLegalPageShell({
  title,
  children,
  variant = 'main',
}: MarifetliKidsLegalPageShellProps) {
  const heading =
    variant === 'kids'
      ? 'text-2xl font-bold text-violet-950 dark:text-violet-50'
      : 'text-2xl font-bold text-gray-900 dark:text-gray-100';
  const meta =
    variant === 'kids'
      ? 'text-sm text-violet-800/80 dark:text-violet-200/80'
      : 'text-sm text-gray-500 dark:text-gray-400';

  return (
    <div className="mx-auto max-w-3xl px-3 py-6 sm:px-5 sm:py-8 lg:px-8">
      <h1 className={`mb-2 ${heading}`}>{title}</h1>
      <p className={`mb-6 ${meta}`}>Son güncelleme: {new Date().toLocaleDateString('tr-TR')}</p>
      {children}
    </div>
  );
}
