/**
 * Build/dev öncesi public/manifest.json üretir.
 * NEXT_PUBLIC_SITE_URL ile start_url ve id mutlak URL olur; Chrome manifest bulabilsin diye statik dosya kullanıyoruz.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT_PATH = path.join(ROOT, 'public', 'manifest.json');

function loadEnv(file) {
  const env = {};
  const p = path.join(ROOT, file);
  if (!fs.existsSync(p)) return env;
  const content = fs.readFileSync(p, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx === -1) return;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  });
  return env;
}

const envLocal = loadEnv('.env.local');
const envProd = loadEnv('.env.production');
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || envProd.NEXT_PUBLIC_SITE_URL || envLocal.NEXT_PUBLIC_SITE_URL || 'https://www.marifetli.com.tr').replace(/\/$/, '');

const manifest = {
  id: `${siteUrl}/`,
  name: 'Marifetli - El İşi & El Sanatları Topluluğu',
  short_name: 'Marifetli',
  description: 'Örgü, dikiş, nakış, takı tasarımı ve el sanatları tutkunlarının buluşma noktası.',
  start_url: `${siteUrl}/`,
  display: 'standalone',
  display_override: ['window-controls-overlay', 'standalone'],
  background_color: '#ffffff',
  theme_color: '#ea580c',
  orientation: 'portrait-primary',
  scope: '/',
  lang: 'tr',
  screenshots: [
    { src: `${siteUrl}/screenshot-wide.png`, sizes: '1376x768', type: 'image/png', form_factor: 'wide', label: 'Marifetli masaüstü' },
    { src: `${siteUrl}/screenshot-narrow.png`, sizes: '1376x768', type: 'image/png', form_factor: 'narrow', label: 'Marifetli mobil' },
  ],
  icons: [
    { src: `${siteUrl}/icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: `${siteUrl}/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: `${siteUrl}/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    { src: `${siteUrl}/favicon.ico`, sizes: '48x48', type: 'image/x-icon', purpose: 'any' },
  ],
};

fs.writeFileSync(OUT_PATH, JSON.stringify(manifest, null, 2), 'utf8');
console.log('manifest.json generated (origin:', siteUrl, ')');
