import { NextResponse } from 'next/server';

export const revalidate = 3600;

const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.marifetli.com.tr').replace(/\/$/, '');
const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api').replace(/\/$/, '');

async function fetchBlogSlugs(): Promise<string[]> {
  const slugs: string[] = [];
  let page = 1;
  const pageSize = 100;
  try {
    for (;;) {
      const res = await fetch(`${apiBase}/blog/?page=${page}&page_size=${pageSize}`, {
        next: { revalidate: 3600 },
      });
      if (!res.ok) break;
      const data = await res.json();
      const results = Array.isArray(data) ? data : data?.results ?? [];
      const next = !Array.isArray(data) ? (data as { next?: string | null }).next : null;
      if (!Array.isArray(results) || results.length === 0) break;
      for (const p of results) {
        if (p?.slug) slugs.push(p.slug);
      }
      if (Array.isArray(data) || !next) break;
      page += 1;
      if (page > 200) break;
    }
  } catch {
    // ignore
  }
  return slugs;
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const slugs = await fetchBlogSlugs();
  const now = new Date().toISOString();

  const urls = slugs
    .map(
      (slug) =>
        `  <url>
    <loc>${escapeXml(`${baseUrl}/blog/${slug}`)}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
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
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
