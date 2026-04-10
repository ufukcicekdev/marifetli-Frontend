'use client';

import { useEffect } from 'react';

/**
 * Uygulama mount olunca Capacitor SplashScreen'i gizler.
 * Web'de sessizce atlar.
 */
export function CapacitorSplashHide() {
  useEffect(() => {
    import('@capacitor/splash-screen')
      .then(({ SplashScreen }) => SplashScreen.hide())
      .catch(() => {/* web ortamında normal */});
  }, []);

  return null;
}
