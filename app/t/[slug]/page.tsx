import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TopicPageContent } from './topic-page-content';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.marifetli.com.tr';
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://web-production-5404d.up.railway.app/api';

const SPECIAL_SLUGS: Record<string, { title: string; description: string }> = {
  populer: {
    title: 'Popüler Sorular',
    description: 'Marifetli topluluğunda en popüler el işi ve el sanatları soruları. Örgü, dikiş, nakış, takı tasarımı ve daha fazlası.',
  },
  tum: {
    title: 'Tüm Sorular',
    description: 'Marifetli\'de paylaşılan tüm el işi ve el sanatları soruları. Soruları keşfet, deneyimlerini paylaş.',
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const special = SPECIAL_SLUGS[slug];
  if (special) {
    return {
      title: special.title,
      description: special.description,
      openGraph: {
        title: `${special.title} | Marifetli`,
        description: special.description,
        url: `${SITE_URL}/t/${slug}`,
      },
      alternates: { canonical: `${SITE_URL}/t/${slug}` },
    };
  }
  try {
    const res = await fetch(`${API_BASE}/categories/${encodeURIComponent(slug)}/`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      return { title: `${slug} | Marifetli` };
    }
    const cat = await res.json();
    const name = cat.name || slug;
    const title = (cat.meta_title?.trim() || `${name} Soruları`).slice(0, 70);
    const description = (
      cat.meta_description?.trim() ||
      cat.description?.trim() ||
      `${name} kategorisindeki el işi ve el sanatları soruları. Marifetli topluluğunda soru sor, cevapla, paylaş.`
    ).slice(0, 160);
    return {
      title,
      description,
      openGraph: {
        title: title.includes('|') ? title : `${title} | Marifetli`,
        description,
        url: `${SITE_URL}/t/${slug}`,
      },
      alternates: { canonical: `${SITE_URL}/t/${slug}` },
    };
  } catch {
    return { title: `${slug} | Marifetli` };
  }
}

/** Kategori/konu sayfası için BreadcrumbList + WebPage JSON-LD (Google & AI SEO). Alt kategoride parent_slug/parent_name ile ana kategori eklenir. */
function buildTopicPageStructuredData(slug: string, name: string, description: string, parentSlug?: string | null, parentName?: string | null) {
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.marifetli.com.tr';
  const items: { '@type': string; position: number; name: string; item: string }[] = [
    { '@type': 'ListItem', position: 1, name: 'Marifetli', item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: 'Konular', item: `${SITE_URL}/sorular` },
  ];
  if (parentSlug && parentName) {
    items.push({ '@type': 'ListItem', position: 3, name: parentName, item: `${SITE_URL}/t/${parentSlug}` });
    items.push({ '@type': 'ListItem', position: 4, name, item: `${SITE_URL}/t/${slug}` });
  } else {
    items.push({ '@type': 'ListItem', position: 3, name, item: `${SITE_URL}/t/${slug}` });
  }
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items,
  };
  const webPage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: name.includes('Soruları') ? name : `${name} Soruları`,
    description,
    url: `${SITE_URL}/t/${slug}`,
    inLanguage: 'tr-TR',
    isPartOf: { '@id': `${SITE_URL}/#organization` },
  };
  return [breadcrumb, webPage];
}

export default async function TopicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const special = SPECIAL_SLUGS[slug];
  let structuredData: ReturnType<typeof buildTopicPageStructuredData> | null = null;
  if (special) {
    structuredData = buildTopicPageStructuredData(slug, special.title, special.description);
  } else {
    try {
      const res = await fetch(`${API_BASE}/categories/${encodeURIComponent(slug)}/`, {
        next: { revalidate: 300 },
      });
      if (res.ok) {
        const cat = await res.json();
        const name = cat.name || slug;
        const description =
          cat.meta_description?.trim() ||
          cat.description?.trim() ||
          `${name} kategorisindeki el işi ve el sanatları soruları. Marifetli topluluğunda soru sor, cevapla, paylaş.`;
        structuredData = buildTopicPageStructuredData(slug, name, description, cat.parent_slug, cat.parent_name);
      }
    } catch {
      // ignore
    }
  }
  return (
    <>
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}
      <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-gray-950 animate-pulse" />}>
        <TopicPageContent slug={slug} />
      </Suspense>
    </>
  );
}
