/**
 * Build/dev öncesi public/manifest.json üretir.
 * start_url ve id göreli ("/") bırakılıyor; tarayıcı manifest'in sunulduğu origin'e göre çözer, "same origin" hatası olmaz.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT_PATH = path.join(ROOT, 'public', 'manifest.json');

const manifest = {
  id: '/',
  name: 'Marifetli - El İşi & El Sanatları Topluluğu',
  short_name: 'Marifetli',
  description: 'Örgü, dikiş, nakış, takı tasarımı ve el sanatları tutkunlarının buluşma noktası.',
  start_url: '/',
  display: 'standalone',
  display_override: ['window-controls-overlay', 'standalone'],
  background_color: '#ffffff',
  theme_color: '#ea580c',
  orientation: 'portrait-primary',
  scope: '/',
  lang: 'tr',
  screenshots: [
    { src: '/screenshot-wide.png', sizes: '1376x768', type: 'image/png', form_factor: 'wide', label: 'Marifetli masaüstü' },
    { src: '/screenshot-narrow.png', sizes: '1376x768', type: 'image/png', form_factor: 'narrow', label: 'Marifetli mobil' },
  ],
  // PNG (PWA) + SVG (ölçeklenebilir). Favicon: app/icon.png (Next.js) ve public/favicon-32x32.png.
  icons: [
    { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
  ],
};

fs.writeFileSync(OUT_PATH, JSON.stringify(manifest, null, 2), 'utf8');
console.log('manifest.json generated (relative start_url/id for same-origin)');
