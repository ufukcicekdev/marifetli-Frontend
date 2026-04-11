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
      serverClientId: '281207706636-2e7kqbtjckm4c51ure7gcinuv24t23be.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
