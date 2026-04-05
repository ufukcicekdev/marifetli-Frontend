'use client';

import { useMemo } from 'react';
import { KidsSelect, type KidsSelectOption } from '@/src/components/kids/kids-ui';
import { useKidsI18n, useKidsLanguageSelect } from '@/src/providers/kids-language-provider';

export type KidsLanguageSelectVariant = 'sidebar' | 'header';

/**
 * Kids panelinde dil seçimi — `KidsSelect` ile diğer formlarla aynı özel açılır liste.
 */
export function KidsLanguageSelectField({
  id,
  variant = 'sidebar',
}: {
  id: string;
  variant?: KidsLanguageSelectVariant;
}) {
  const { t, language } = useKidsI18n();
  const { onSelectLanguage, savingLanguage, languageSelectDisabled, showStudentLanguageHint } =
    useKidsLanguageSelect();

  const options = useMemo<KidsSelectOption[]>(
    () => [
      { value: 'tr', label: t('profile.language.tr') },
      { value: 'en', label: t('profile.language.en') },
      { value: 'ge', label: t('profile.language.ge') },
    ],
    [t],
  );

  const labelClass =
    variant === 'header'
      ? 'mb-1 block text-[11px] font-semibold text-gray-600 dark:text-gray-400'
      : 'mb-1 block text-xs font-semibold text-violet-900 dark:text-violet-100';

  const savingClass =
    variant === 'header'
      ? 'mt-1 text-[10px] text-gray-500 dark:text-gray-400'
      : 'mt-1 text-[11px] text-violet-700 dark:text-violet-300';

  const lockedClass =
    variant === 'header'
      ? 'mt-1 text-[10px] text-gray-500 dark:text-gray-400'
      : 'mt-1 text-[11px] text-zinc-600 dark:text-zinc-400';

  const wrapClass =
    variant === 'sidebar'
      ? 'rounded-xl bg-white/80 px-2 py-1.5 ring-1 ring-violet-200/70 dark:bg-slate-900/50 dark:ring-violet-800/60'
      : '';

  const buttonClassName =
    variant === 'header'
      ? 'min-h-9 rounded-lg py-2 text-sm focus:ring-2 focus:ring-violet-400/20 dark:focus:ring-violet-500/15'
      : '';

  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {t('sidebar.language')}
      </label>
      <div className={wrapClass}>
        <KidsSelect
          id={id}
          value={language}
          onChange={(v) => void onSelectLanguage(v)}
          options={options}
          disabled={languageSelectDisabled}
          searchable={false}
          panelMaxHeightPx={220}
          buttonClassName={buttonClassName}
        />
      </div>
      {savingLanguage ? <p className={savingClass}>{t('sidebar.languageSaving')}</p> : null}
      {showStudentLanguageHint ? <p className={lockedClass}>{t('profile.language.hint.locked')}</p> : null}
    </div>
  );
}
