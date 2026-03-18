'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import api from '@/src/lib/api';

const SAFE_FONT_REGEX = /^[a-zA-Z0-9\s\-]+$/;
const MAX_FONT_LENGTH = 60;

function safeFontName(name: string | null | undefined): string | null {
  if (!name || typeof name !== 'string') return null;
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > MAX_FONT_LENGTH) return null;
  if (!SAFE_FONT_REGEX.test(trimmed)) return null;
  return trimmed;
}

function buildGoogleFontsUrl(fonts: string[]): string {
  const familyParams = fonts.map(
    (f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@400;500;600;700`
  );
  return `https://fonts.googleapis.com/css2?${familyParams.join('&')}&display=swap`;
}

/** Başlık varsayılanı: self-hosted, globals.css @font-face ile yüklenir. */
const DEFAULT_HEADING_FONT = 'TT Octosquares';
/** Gövde varsayılanı: Google Fonts'tan yüklenir. */
const DEFAULT_BODY_FONT = 'Nunito';

/**
 * Admin panelden gelen font_body / font_heading ayarlarını uygular.
 * Varsayılan: gövde Nunito, başlık TT Octosquares (Seçenek A – Dengeli).
 */
export function SiteFonts() {
  const { data: settings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const { data } = await api.getSiteSettings();
      return data;
    },
  });

  const fontBody = safeFontName(settings?.font_body);
  const fontHeading = safeFontName(settings?.font_heading);
  const linkId = 'site-settings-fonts';
  const linkRef = useRef<HTMLLinkElement | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    const bodyFont = fontBody ?? DEFAULT_BODY_FONT;
    const headingFont = fontHeading ?? bodyFont;

    root.style.setProperty('--font-body', `"${bodyFont}", ui-sans-serif, system-ui, sans-serif`);
    root.style.setProperty('--font-heading', `"${headingFont}", var(--font-body)`);

    /* TT Octosquares Google'da yok (@font-face ile yüklü); sadece Google'da olan fontları linkle */
    const fontsForGoogle = [bodyFont, headingFont].filter((f) => f !== DEFAULT_HEADING_FONT);
    const fontsToLoad = Array.from(new Set(fontsForGoogle));

    let link = document.getElementById(linkId) as HTMLLinkElement | null;
    if (fontsToLoad.length === 0) {
      if (link) {
        link.remove();
        linkRef.current = null;
      }
    } else {
      if (!link) {
        link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.setAttribute('data-site-fonts', '');
        document.head.appendChild(link);
        linkRef.current = link;
      }
      link.href = buildGoogleFontsUrl(fontsToLoad);
    }

    return () => {
      root.style.removeProperty('--font-body');
      root.style.removeProperty('--font-heading');
    };
  }, [fontBody, fontHeading]);

  return null;
}
