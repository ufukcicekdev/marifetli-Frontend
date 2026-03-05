import type { MetadataRoute } from 'next';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.marifetli.com.tr';
const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

const staticRoutes = [
  '',
  '/sorular',
  '/iletisim',
  '/t/populer',
  '/t/tum',
  '/t/orgu',
  '/t/dikis',
  '/t/nakis',
  '/t/taki-tasarim',
  '/t/el-sanatlari',
  '/t/dekorasyon',
  '/t/tig-isi',
  '/t/amigurumi',
  '/t/dantel',
  '/t/makrome',
  '/t/kece',
];

async function fetchQuestionSlugs(): Promise<string[]> {
  const slugs: string[] = [];
  let page = 1;
  const pageSize = 100;
  try {
    for (;;) {
      const res = await fetch(
        `${apiBase.replace(/\/$/, '')}/questions/?page=${page}&page_size=${pageSize}&ordering=-created_at`,
        { next: { revalidate: 3600 } }
      );
      if (!res.ok) break;
      const data = await res.json();
      const results = data?.results ?? [];
      for (const q of results) {
        if (q?.slug) slugs.push(q.slug);
      }
      if (results.length < pageSize || !data?.next) break;
      page++;
      if (page > 500) break;
    }
  } catch {
    // API erişilemezse sadece statik sayfalar döner
  }
  return slugs;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  const siteBase = baseUrl.replace(/\/$/, '');

  for (const path of staticRoutes) {
    const url = path ? `${siteBase}${path}` : `${siteBase}/`;
    entries.push({
      url,
      lastModified: now,
      changeFrequency: (path === '' || path === '/sorular' ? 'daily' : 'weekly') as MetadataRoute.Sitemap[0]['changeFrequency'],
      priority: path === '' ? 1 : path === '/sorular' ? 0.9 : 0.7,
    });
  }

  const questionSlugs = await fetchQuestionSlugs();
  for (const slug of questionSlugs) {
    entries.push({
      url: `${siteBase}/soru/${slug}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  }

  return entries;
}
