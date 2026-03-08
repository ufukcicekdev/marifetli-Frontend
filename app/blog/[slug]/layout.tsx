import type { Metadata } from 'next';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.marifetli.com.tr').replace(/\/$/, '');
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || 'https://web-production-5404d.up.railway.app/api').replace(/\/$/, '');

function toAbsoluteImageUrl(url: string | null | undefined): string | undefined {
  if (!url || typeof url !== 'string') return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const origin = API_BASE.replace(/\/api\/?$/, '');
  return url.startsWith('/') ? `${origin}${url}` : `${origin}/${url}`;
}

async function getBlogPost(slug: string) {
  try {
    const res = await fetch(`${API_BASE}/blog/${slug}/`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return res.json() as Promise<{
      title: string;
      excerpt?: string;
      meta_title?: string;
      meta_description?: string;
      featured_image?: string | null;
    }>;
  } catch {
    return null;
  }
}

type Props = { params: Promise<{ slug: string }>; children: React.ReactNode };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post?.title) {
    return { title: 'Yazı Bulunamadı' };
  }
  const title = post.meta_title || post.title;
  const description = post.meta_description || post.excerpt || post.title;
  const url = `${SITE_URL}/blog/${slug}`;
  const imageUrl = toAbsoluteImageUrl(post.featured_image);

  return {
    title,
    description: description.slice(0, 160),
    openGraph: {
      type: 'article',
      url,
      title,
      description: description.slice(0, 160),
      siteName: 'Marifetli',
      locale: 'tr_TR',
      ...(imageUrl && { images: [{ url: imageUrl, width: 1200, height: 630, alt: title }] }),
    },
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      title,
      description: description.slice(0, 160),
      ...(imageUrl && { images: [imageUrl] }),
    },
    alternates: { canonical: url },
  };
}

export default function BlogSlugLayout({ children }: Props) {
  return children;
}
