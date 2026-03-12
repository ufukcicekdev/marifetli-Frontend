import { NextRequest, NextResponse } from 'next/server';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.marifetli.com.tr').replace(/\/$/, '');

/**
 * PWA manifest - start_url ve id mutlak URL olarak döner; Chrome mobil kurulum için gerekli.
 */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl?.origin || SITE_URL;
  const startUrl = `${origin}/`;
  const manifest = {
    id: startUrl,
    name: 'Marifetli - El İşi & El Sanatları Topluluğu',
    short_name: 'Marifetli',
    description: 'Örgü, dikiş, nakış, takı tasarımı ve el sanatları tutkunlarının buluşma noktası.',
    start_url: startUrl,
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone'],
    background_color: '#ffffff',
    theme_color: '#ea580c',
    orientation: 'portrait-primary',
    scope: '/',
    lang: 'tr',
    screenshots: [
      { src: `${origin}/screenshot-wide.png`, sizes: '1376x768', type: 'image/png', form_factor: 'wide', label: 'Marifetli masaüstü' },
      { src: `${origin}/screenshot-narrow.png`, sizes: '1376x768', type: 'image/png', form_factor: 'narrow', label: 'Marifetli mobil' },
    ],
    icons: [
      { src: `${origin}/icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `${origin}/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: `${origin}/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: `${origin}/favicon.ico`, sizes: '48x48', type: 'image/x-icon', purpose: 'any' },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
