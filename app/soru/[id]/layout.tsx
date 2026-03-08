import type { Metadata } from 'next';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.marifetli.com.tr').replace(/\/$/, '');
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || 'https://web-production-5404d.up.railway.app/api').replace(/\/$/, '');

function toAbsoluteImageUrl(url: string | null | undefined): string | undefined {
  if (!url || typeof url !== 'string') return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const origin = API_BASE.replace(/\/api\/?$/, '');
  return url.startsWith('/') ? `${origin}${url}` : `${origin}/${url}`;
}

function firstImageFromHtml(html: string | null | undefined): string | undefined {
  if (!html || typeof html !== 'string') return undefined;
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m?.[1]?.trim();
}

async function getQuestion(slugOrId: string) {
  try {
    const res = await fetch(`${API_BASE}/questions/${encodeURIComponent(slugOrId)}/`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json() as Promise<{
      title: string;
      description?: string;
      content?: string;
      meta_title?: string;
      meta_description?: string;
    }>;
  } catch {
    return null;
  }
}

type Props = { params: Promise<{ id: string }>; children: React.ReactNode };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const question = await getQuestion(id);
  if (!question?.title) {
    return { title: 'Soru Bulunamadı' };
  }
  const title = question.meta_title || question.title;
  const description = question.meta_description || question.description || question.title;
  const url = `${SITE_URL}/soru/${id}`;
  const imageUrl = toAbsoluteImageUrl(firstImageFromHtml(question.content));

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

export default function SoruIdLayout({ children }: Props) {
  return children;
}
