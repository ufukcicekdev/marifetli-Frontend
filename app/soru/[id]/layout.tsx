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

type AnswerForMeta = {
  id?: number;
  content?: string;
  like_count?: number;
  created_at?: string;
  parent?: number | null;
  is_best_answer?: boolean;
  moderation_status?: number;
  author?: { username?: string; first_name?: string };
};

type QuestionForMeta = {
  title: string;
  slug?: string;
  description?: string;
  content?: string;
  meta_title?: string;
  meta_description?: string;
  created_at?: string;
  answers?: AnswerForMeta[];
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

function personForSchema(displayName: string, username?: string | null) {
  const node: Record<string, unknown> = { '@type': 'Person', name: displayName };
  if (username) node.url = `${SITE_URL}/profil/${username}`;
  return node;
}

function buildQAPageStructuredData(question: QuestionForMeta, paramId: string) {
  const qSlug = question.slug || paramId;
  const pageBase = `${SITE_URL}/soru/${qSlug}`;
  const text = stripHtmlForSchema(question.content || question.description || '');
  const authorName =
    question.author?.username || question.author?.first_name || 'Marifetli topluluk üyesi';
  const questionAuthorUsername = question.author?.username || undefined;

  // Sadece üst düzey cevaplar (yorum zinciri değil); reddedilenleri atla
  const topLevel = (question.answers || []).filter(
    (a) => a && a.moderation_status !== 2 && (a.parent == null || a.parent === undefined),
  );
  const sorted = [...topLevel].sort((a, b) => {
    if (a.is_best_answer && !b.is_best_answer) return -1;
    if (!a.is_best_answer && b.is_best_answer) return 1;
    return 0;
  });

  const suggestedAnswer = sorted.slice(0, 8).map((a) => {
    const aid = a.id;
    const answerUrl = typeof aid === 'number' ? `${pageBase}#comment-${aid}` : pageBase;
    const ansAuthorName = a.author?.username || a.author?.first_name || 'Anonim';
    const ansUsername = a.author?.username || undefined;
    const votes = typeof a.like_count === 'number' ? a.like_count : 0;
    return {
      '@type': 'Answer',
      url: answerUrl,
      text: stripHtmlForSchema(a.content),
      ...(a.created_at && { datePublished: a.created_at }),
      upvoteCount: votes,
      author: personForSchema(ansAuthorName, ansUsername),
    };
  });

  return {
    '@context': 'https://schema.org',
    '@type': 'QAPage',
    mainEntity: {
      '@type': 'Question',
      name: question.title,
      text: text || question.title,
      author: personForSchema(authorName, questionAuthorUsername),
      ...(question.created_at && { dateCreated: question.created_at }),
      answerCount: topLevel.length,
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
    const fallbackUrl = `${SITE_URL}/soru/${encodeURIComponent(id)}`;
    return {
      title: 'Soru Bulunamadı',
      robots: { index: false, follow: true },
      alternates: { canonical: fallbackUrl },
    };
  }
  const title = question.meta_title || question.title;
  const description = question.meta_description || question.description || question.title;
  const slug = question.slug || id;
  const url = `${SITE_URL}/soru/${slug}`;
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
