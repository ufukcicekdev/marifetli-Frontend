import type { Metadata } from 'next';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.marifetli.com.tr').replace(/\/$/, '');
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api').replace(/\/$/, '');

function toAbsoluteImageUrl(url: string | null | undefined): string | undefined {
  if (!url || typeof url !== 'string') return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const origin = API_BASE.replace(/\/api\/?$/, '');
  return url.startsWith('/') ? `${origin}${url}` : `${origin}/${url}`;
}

type DesignForMeta = {
  id: number;
  image_url?: string | null;
  image_urls?: string[];
  tags?: string;
  description?: string;
  author_username?: string;
  created_at?: string;
};

async function getDesign(id: string): Promise<DesignForMeta | null> {
  try {
    const res = await fetch(`${API_BASE}/designs/${encodeURIComponent(id)}/`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function buildDesignStructuredData(design: DesignForMeta, id: string) {
  const imageUrls = design.image_urls?.length
    ? design.image_urls
    : design.image_url
      ? [design.image_url]
      : [];
  const images = imageUrls
    .map((u) => toAbsoluteImageUrl(u))
    .filter((u): u is string => !!u);

  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: design.tags ? `Tasarım: ${design.tags.split(',')[0]?.trim() || 'El işi'}` : 'El işi tasarımı',
    description: (design.description || design.tags || 'Marifetli topluluk tasarımı').slice(0, 500),
    ...(design.author_username && {
      author: { '@type': 'Person', name: design.author_username },
    }),
    ...(design.created_at && { datePublished: design.created_at }),
    ...(images.length > 0 && { image: images.length === 1 ? images[0] : images }),
    url: `${SITE_URL}/tasarim/${id}`,
  };
}

type Props = { params: Promise<{ id: string }>; children: React.ReactNode };

/** Static export (Capacitor) için gerekli; en az bir path üretilmeli. */
export function generateStaticParams() {
  return [{ id: '0' }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const design = await getDesign(id);
  if (!design) {
    return { title: 'Tasarım Bulunamadı' };
  }
  const title =
    design.tags
      ? `${design.tags.split(',')[0]?.trim() || 'Tasarım'} — u/${design.author_username || 'Marifetli'}`
      : `Tasarım — u/${design.author_username || 'Marifetli'}`;
  const description = (design.description || design.tags || 'El işi ve el sanatları tasarımı.').slice(0, 160);
  const url = `${SITE_URL}/tasarim/${id}`;
  const imageUrl = toAbsoluteImageUrl(design.image_url || design.image_urls?.[0]);

  return {
    title,
    description,
    openGraph: {
      type: 'website',
      url,
      title,
      description,
      siteName: 'Marifetli',
      locale: 'tr_TR',
      ...(imageUrl && { images: [{ url: imageUrl, width: 1200, height: 630, alt: title }] }),
    },
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(imageUrl && { images: [imageUrl] }),
    },
    alternates: { canonical: url },
  };
}

export default async function TasarimIdLayout({ children, params }: Props) {
  const { id } = await params;
  const design = await getDesign(id);
  const schema = design ? buildDesignStructuredData(design, id) : null;
  return (
    <>
      {schema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      )}
      {children}
    </>
  );
}
