import type { Metadata } from 'next';
import { stripHtml } from '@/src/lib/extract-media';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.marifetli.com.tr').replace(/\/$/, '');
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || 'https://web-production-5404d.up.railway.app/api').replace(/\/$/, '');

function toAbsoluteImageUrl(url: string | null | undefined): string | undefined {
  if (!url || typeof url !== 'string') return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const origin = API_BASE.replace(/\/api\/?$/, '');
  return url.startsWith('/') ? `${origin}${url}` : `${origin}/${url}`;
}

type BlogPostMeta = {
  title: string;
  excerpt?: string;
  meta_title?: string;
  meta_description?: string;
  featured_image?: string | null;
  published_at?: string | null;
  created_at?: string;
  updated_at?: string;
  author?: { username?: string };
};

async function getBlogPost(slug: string): Promise<BlogPostMeta | null> {
  try {
    const res = await fetch(`${API_BASE}/blog/${slug}/`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function buildArticleSchema(post: BlogPostMeta, slug: string) {
  const url = `${SITE_URL}/blog/${slug}`;
  const imageUrl = toAbsoluteImageUrl(post.featured_image);
  const rawDesc = post.meta_description || post.excerpt || post.title;
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.meta_title || post.title,
    description: stripHtml(rawDesc).slice(0, 160),
    url,
    ...(imageUrl && { image: imageUrl }),
    datePublished: post.published_at || post.created_at,
    dateModified: post.updated_at || post.published_at || post.created_at,
    author: {
      '@type': 'Person',
      name: (post.author as { username?: string })?.username || 'Marifetli',
    },
    publisher: {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'Marifetli',
    },
  };
}

type Props = { params: Promise<{ slug: string }>; children: React.ReactNode };

/** Static export (Capacitor) için gerekli; en az bir path üretilmeli. */
export function generateStaticParams() {
  return [{ slug: '_' }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post?.title) {
    return { title: 'Yazı Bulunamadı' };
  }
  const title = post.meta_title || post.title;
  const description = stripHtml(post.meta_description || post.excerpt || post.title).slice(0, 160);
  const url = `${SITE_URL}/blog/${slug}`;
  const imageUrl = toAbsoluteImageUrl(post.featured_image);

  return {
    title,
    description,
    openGraph: {
      type: 'article',
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

export default async function BlogSlugLayout({ children, params }: Props) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  const articleSchema = post ? buildArticleSchema(post, slug) : null;
  return (
    <>
      {articleSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
        />
      )}
      {children}
    </>
  );
}
