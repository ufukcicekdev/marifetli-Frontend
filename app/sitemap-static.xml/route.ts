import { NextResponse } from 'next/server';

const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.marifetli.com.tr').replace(/\/$/, '');

const staticRoutes: { path: string; changefreq: string; priority: string }[] = [
  { path: '', changefreq: 'daily', priority: '1.0' },
  { path: '/sorular', changefreq: 'daily', priority: '0.9' },
  { path: '/blog', changefreq: 'daily', priority: '0.9' },
  { path: '/iletisim', changefreq: 'monthly', priority: '0.5' },
  { path: '/t/populer', changefreq: 'weekly', priority: '0.7' },
  { path: '/t/tum', changefreq: 'weekly', priority: '0.7' },
  { path: '/t/orgu', changefreq: 'weekly', priority: '0.7' },
  { path: '/t/dikis', changefreq: 'weekly', priority: '0.7' },
  { path: '/t/nakis', changefreq: 'weekly', priority: '0.7' },
  { path: '/t/taki-tasarim', changefreq: 'weekly', priority: '0.7' },
  { path: '/t/el-sanatlari', changefreq: 'weekly', priority: '0.7' },
  { path: '/t/dekorasyon', changefreq: 'weekly', priority: '0.7' },
  { path: '/t/tig-isi', changefreq: 'weekly', priority: '0.7' },
  { path: '/t/amigurumi', changefreq: 'weekly', priority: '0.7' },
  { path: '/t/dantel', changefreq: 'weekly', priority: '0.7' },
  { path: '/t/makrome', changefreq: 'weekly', priority: '0.7' },
  { path: '/t/kece', changefreq: 'weekly', priority: '0.7' },
];

function escapeXml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const now = new Date().toISOString();
  const urls = staticRoutes
    .map(
      (r) =>
        `  <url>
    <loc>${escapeXml(baseUrl + (r.path || '/'))}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
