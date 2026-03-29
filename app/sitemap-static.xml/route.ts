import { NextResponse } from 'next/server';

export const revalidate = 3600;

const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.marifetli.com.tr').replace(/\/$/, '');
const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || 'https://web-production-5404d.up.railway.app/api').replace(/\/$/, '');

/** Sabit sayfalar (kategoriden bağımsız) */
const fixedRoutes: { path: string; changefreq: string; priority: string }[] = [
  { path: '', changefreq: 'daily', priority: '1.0' },
  { path: '/sorular', changefreq: 'daily', priority: '0.9' },
  { path: '/blog', changefreq: 'daily', priority: '0.9' },
  { path: '/tasarimlar', changefreq: 'daily', priority: '0.8' },
  { path: '/kategoriler', changefreq: 'weekly', priority: '0.8' },
  { path: '/topluluklar', changefreq: 'weekly', priority: '0.8' },
  { path: '/kids', changefreq: 'weekly', priority: '0.75' },
  { path: '/iletisim', changefreq: 'monthly', priority: '0.5' },
  { path: '/hakkimizda', changefreq: 'monthly', priority: '0.5' },
  { path: '/gizlilik-politikasi', changefreq: 'monthly', priority: '0.4' },
  { path: '/kullanim-sartlari', changefreq: 'monthly', priority: '0.4' },
  { path: '/marifetli-kids/kullanim-sartlari', changefreq: 'monthly', priority: '0.35' },
  { path: '/marifetli-kids/gizlilik-politikasi', changefreq: 'monthly', priority: '0.35' },
  { path: '/marifetli-kids/kvkk-aydinlatma-metni', changefreq: 'monthly', priority: '0.35' },
  { path: '/marifetli-kids/cerez-politikasi', changefreq: 'monthly', priority: '0.35' },
  { path: '/t/populer', changefreq: 'weekly', priority: '0.7' },
  { path: '/t/tum', changefreq: 'weekly', priority: '0.7' },
];

type CategoryItem = { slug: string; subcategories?: CategoryItem[] };

/** API'den tüm kategori slug'larını toplar (üst + alt kategoriler). */
async function fetchCategorySlugs(): Promise<string[]> {
  const slugs: string[] = [];
  try {
    const res = await fetch(`${apiBase}/categories/`, { next: { revalidate: 3600 } });
    if (!res.ok) return slugs;
    const raw = (await res.json()) as CategoryItem[] | { results?: CategoryItem[] };
    const data = Array.isArray(raw) ? raw : (raw?.results ?? []);
    const collect = (items: CategoryItem[]) => {
      for (const c of items) {
        if (c?.slug) slugs.push(c.slug);
        if (c?.subcategories?.length) collect(c.subcategories);
      }
    };
    collect(data);
  } catch {
    // API yoksa veya hata olursa boş döner; sabit rotalar yine eklenir
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
  const categorySlugs = await fetchCategorySlugs();
  const categoryRoutes: { path: string; changefreq: string; priority: string }[] = categorySlugs.map((slug) => ({
    path: `/t/${slug}`,
    changefreq: 'weekly',
    priority: '0.7',
  }));
  const staticRoutes = [...fixedRoutes, ...categoryRoutes];

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
