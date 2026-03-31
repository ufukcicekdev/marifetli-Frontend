'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { KidsLanguageCode } from '@/src/lib/kids-api';
import { useKidsAuth } from '@/src/providers/kids-auth-provider';
import tr from '@/language/tr.json';
import en from '@/language/en.json';
import ge from '@/language/ge.json';

const KIDS_LANGUAGE_STORAGE_KEY = 'marifetli_kids_language';

type Dictionary = Record<string, string>;

const dictionaries: Record<KidsLanguageCode, Dictionary> = {
  tr: tr as Dictionary,
  en: en as Dictionary,
  ge: ge as Dictionary,
};

function normalizeLanguage(input: string | null | undefined): KidsLanguageCode {
  const v = (input || '').trim().toLowerCase();
  if (v === 'en' || v === 'ge') return v;
  return 'tr';
}

function translate(dict: Dictionary, fallback: Dictionary, key: string): string {
  return dict[key] || fallback[key] || key;
}

type KidsLanguageContextValue = {
  language: KidsLanguageCode;
  canChangeLanguage: boolean;
  t: (key: string) => string;
  setLanguageLocal: (language: KidsLanguageCode) => void;
};

const KidsLanguageContext = createContext<KidsLanguageContextValue | null>(null);

export function KidsLanguageProvider({ children }: { children: React.ReactNode }) {
  const { user } = useKidsAuth();
  const [language, setLanguage] = useState<KidsLanguageCode>('tr');

  const canChangeLanguage = user?.role === 'teacher' || user?.role === 'parent';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!user) return;
    if (user.role === 'student') {
      const locked = normalizeLanguage(user.effective_language || 'tr');
      setLanguage(locked);
      localStorage.setItem(KIDS_LANGUAGE_STORAGE_KEY, locked);
      return;
    }
    const serverLangRaw = (user.preferred_language || user.effective_language || '').trim().toLowerCase();
    const localLangRaw = (localStorage.getItem(KIDS_LANGUAGE_STORAGE_KEY) || '').trim().toLowerCase();
    const resolved = normalizeLanguage(serverLangRaw || localLangRaw || 'tr');
    setLanguage(resolved);
    localStorage.setItem(KIDS_LANGUAGE_STORAGE_KEY, resolved);
  }, [user]);

  const value = useMemo<KidsLanguageContextValue>(
    () => ({
      language,
      canChangeLanguage,
      t: (key: string) => translate(dictionaries[language], dictionaries.tr, key),
      setLanguageLocal: (next: KidsLanguageCode) => {
        const normalized = normalizeLanguage(next);
        setLanguage(normalized);
        if (typeof window !== 'undefined') {
          localStorage.setItem(KIDS_LANGUAGE_STORAGE_KEY, normalized);
        }
      },
    }),
    [canChangeLanguage, language],
  );

  return <KidsLanguageContext.Provider value={value}>{children}</KidsLanguageContext.Provider>;
}

export function useKidsI18n() {
  const ctx = useContext(KidsLanguageContext);
  if (!ctx) throw new Error('useKidsI18n sadece Kids icinde kullanilabilir');
  return ctx;
}
