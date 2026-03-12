'use client';

import Script from 'next/script';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import api from '@/src/lib/api';
import { hasAnalyticsConsent } from '@/src/lib/cookie-consent';

/**
 * Admin panelden ayarlanan Google Analytics (GA4) ve Google Search Console
 * doğrulama meta etiketini sayfaya ekler. GA yalnızca çerez onayında analitiğe izin verildiyse yüklenir.
 */
export function SiteAnalytics() {
  const [analyticsOk, setAnalyticsOk] = useState(false);
  useEffect(() => {
    setAnalyticsOk(hasAnalyticsConsent());
    const onUpdate = () => setAnalyticsOk(hasAnalyticsConsent());
    window.addEventListener('cookie-consent-update', onUpdate);
    return () => window.removeEventListener('cookie-consent-update', onUpdate);
  }, []);

  const { data: settings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const { data } = await api.getSiteSettings();
      return data;
    },
  });

  const gaId = settings?.google_analytics_id?.trim();
  const gscMeta = settings?.google_search_console_meta?.trim();
  const faviconUrl = settings?.favicon_url?.trim() || null;

  useEffect(() => {
    if (!faviconUrl) return;
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"].site-settings-favicon');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      link.classList.add('site-settings-favicon');
      document.head.appendChild(link);
    }
    link.href = faviconUrl;
    return () => link?.remove();
  }, [faviconUrl]);

  useEffect(() => {
    if (!gscMeta) return;
    const existing = document.querySelector('meta[name="google-site-verification"]');
    if (existing) return;
    const meta = document.createElement('meta');
    meta.name = 'google-site-verification';
    meta.content = gscMeta;
    document.head.appendChild(meta);
    return () => {
      meta.remove();
    };
  }, [gscMeta]);

  if (!gaId) return null;
  if (!analyticsOk) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="lazyOnload"
      />
      <Script id="ga4-config" strategy="lazyOnload">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}');
        `}
      </Script>
    </>
  );
}
