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

type QuestionForMeta = {
  title: string;
  description?: string;
  content?: string;
  meta_title?: string;
  meta_description?: string;
  created_at?: string;
  answers?: Array<{ content?: string; author?: { username?: string; first_name?: string }; moderation_status?: number }>;
  author?: { username?: string; first_name?: string };
};

async function getQuestion(slugOrId: string): Promise<QuestionForMeta | null> {
  try {
    const res = await fetch(`${API_BASE}/questions/${encodeURIComponent(slugOrId)}/`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function stripHtmlForSchema(html: string | null | undefined): string {
  if (!html || typeof html !== 'string') return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500);
}

function buildQAPageStructuredData(question: QuestionForMeta, id: string) {
  const text = stripHtmlForSchema(question.content || question.description || '');
  const authorName =
    question.author?.username || question.author?.first_name || 'Marifetli topluluk üyesi';
  const answers = (question.answers || []).filter((a) => a?.moderation_status !== 2); // reddedilenleri atla
  const suggestedAnswer = answers.slice(0, 8).map((a) => ({
    '@type': 'Answer',
    text: stripHtmlForSchema(a.content),
    author: { '@type': 'Person', name: a.author?.username || a.author?.first_name || 'Anonim' },
  }));

  return {
    '@context': 'https://schema.org',
    '@type': 'QAPage',
    mainEntity: {
      '@type': 'Question',
      name: question.title,
      text: text || question.title,
      author: { '@type': 'Person', name: authorName },
      ...(question.created_at && { dateCreated: question.created_at }),
      answerCount: answers.length,
      ...(suggestedAnswer.length > 0 && { suggestedAnswer }),
    },
  };
}

type Props = { params: Promise<{ id: string }>; children: React.ReactNode };

/** Static export (Capacitor) için gerekli; en az bir path üretilmeli. */
export function generateStaticParams() {
  return [{ id: '_' }];
}

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

export default async function SoruIdLayout({ children, params }: Props) {
  const { id } = await params;
  const question = await getQuestion(id);
  const qaSchema = question ? buildQAPageStructuredData(question, id) : null;
  return (
    <>
      {qaSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(qaSchema) }}
        />
      )}
      {children}
    </>
  );
}
