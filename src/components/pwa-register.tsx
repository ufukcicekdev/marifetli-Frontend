'use client';

import { useEffect } from 'react';

/**
 * PWA kurulumu için ana service worker'ı kaydeder (scope "/").
 * Chrome "Uygulama olarak yükle" özelliği için sayfanın bir SW tarafından kontrol edilmesi gerekir.
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
  }, []);
  return null;
}
