import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'tr.com.marifetli.app',
  appName: 'Marifetli',
  // Mobil build distDir: ".next-mobile" kullandığı için export oraya yazılıyor (Next.js 16)
  webDir: '.next-mobile',
  server: {
    // Production: canlı siteyi WebView'da yükle.
    // Local test için: url: 'http://localhost:3000', cleartext: true
    url: 'https://www.marifetli.com.tr',
    cleartext: false,
  },
  android: {
    allowMixedContent: true,
  },
  ios: {
    contentInset: 'automatic',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
    },
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '1078906448846-cc8flalpj2n10c8cgvqk53q4861bvd7f.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
