import { NextResponse } from 'next/server';

export const revalidate = 3600;

const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.marifetli.com.tr').replace(/\/$/, '');
const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api').replace(/\/$/, '');

async function fetchDesignIds(): Promise<number[]> {
  const ids: number[] = [];
  let page = 1;
  const pageSize = 100;
  try {
    for (;;) {
      const res = await fetch(
        `${apiBase}/designs/?page=${page}&page_size=${pageSize}`,
        { next: { revalidate: 3600 } }
      );
      if (!res.ok) break;
      const data = (await res.json()) as { results?: { id: number }[]; next?: string | null };
      const results = data?.results ?? [];
      if (results.length === 0) break;
      for (const d of results) {
        if (d?.id) ids.push(d.id);
      }
      if (!data?.next) break;
      page += 1;
      if (page > 200) break;
    }
  } catch {
    // ignore
  }
  return ids;
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
  const ids = await fetchDesignIds();
  const now = new Date().toISOString();

  const urls = ids
    .map(
      (id) =>
        `  <url>
    <loc>${escapeXml(`${baseUrl}/tasarim/${id}`)}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
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
