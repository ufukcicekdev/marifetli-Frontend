'use client';

import { use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api, { type BlogPostDetailItem, type BlogCommentItem } from '@/src/lib/api';
import { addRecentBlog } from '@/src/lib/recent-activity';
import { extractMediaFromHtml } from '@/src/lib/extract-media';
import { OptimizedAvatar } from '@/src/components/optimized-avatar';
import dynamic from 'next/dynamic';
import { ShareButton } from '@/src/components/share-button';
import { useAuthStore } from '@/src/stores/auth-store';
import { BlogSidebar } from '@/src/components/blog-sidebar';

const SaveModal = dynamic(() => import('@/src/components/save-modal').then((m) => ({ default: m.SaveModal })), { ssr: false });
import { formatTimeAgo } from '@/src/lib/format-time';
import { sanitizeHtml } from '@/src/lib/sanitize-html';

function formatDate(s: string | null) {
  if (!s) return '';
  return new Date(s).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const queryClient = useQueryClient();
  const { user: currentUser, isAuthenticated } = useAuthStore();
  const [commentText, setCommentText] = useState('');
  const [saveModalOpen, setSaveModalOpen] = useState(false);

  const { data: post, isLoading, error } = useQuery({
    queryKey: ['blog-post', slug],
    queryFn: async () => {
      const res = await api.getBlogPost(slug);
      return res.data as BlogPostDetailItem;
    },
    enabled: !!slug,
  });

  useEffect(() => {
    if (!post?.slug || !post?.title) return;
    const content = (post as { content?: string }).content;
    const firstImg = extractMediaFromHtml(content)?.[0];
    const imageUrl = post.featured_image ?? (firstImg?.type === 'image' ? firstImg.url : undefined);
    addRecentBlog({ slug: post.slug, title: post.title, imageUrl });
  }, [post?.slug, post?.title, post?.featured_image, (post as { content?: string })?.content]);

  const { data: likeStatus } = useQuery({
    queryKey: ['blog-like-status', slug],
    queryFn: async () => {
      const res = await api.getBlogLikeStatus(slug);
      return res.data;
    },
    enabled: !!slug && isAuthenticated,
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      const res = await api.blogLike(slug);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['blog-post', slug], (old: BlogPostDetailItem | undefined) =>
        old ? { ...old, like_count: data.like_count } : old
      );
      queryClient.setQueryData(['blog-like-status', slug], () => ({ liked: true, like_count: data.like_count }));
    },
    onError: (e: { response?: { data?: { detail?: string } } }) => {
      toast.error(e?.response?.data?.detail ?? 'Beğeni işlenemedi.');
    },
  });

  const unlikeMutation = useMutation({
    mutationFn: async () => {
      const res = await api.blogUnlike(slug);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['blog-post', slug], (old: BlogPostDetailItem | undefined) =>
        old ? { ...old, like_count: data.like_count } : old
      );
      queryClient.setQueryData(['blog-like-status', slug], () => ({ liked: false, like_count: data.like_count }));
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await api.createBlogComment(slug, content);
      return res.data;
    },
    onSuccess: (newComment) => {
      queryClient.setQueryData(['blog-post', slug], (old: BlogPostDetailItem | undefined) => {
        if (!old) return old;
        const comments = [...(old.comments ?? []), newComment as BlogCommentItem];
        return { ...old, comments, comment_count: comments.length };
      });
      setCommentText('');
      toast.success('Yorumunuz alındı ve moderasyon sonrasında yayınlanacak.');
      // Moderasyon sonrası listeyi güncelle (reddedilirse yorum listeden gitsin)
      window.setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['blog-post', slug] });
      }, 5000);
    },
    onError: (e: { response?: { data?: { detail?: string } } }) => {
      toast.error(e?.response?.data?.detail ?? 'Yorum eklenemedi.');
    },
  });

  const liked = likeStatus?.liked ?? false;
  const likeCount = likeStatus?.like_count ?? post?.like_count ?? 0;

  const handleLike = () => {
    if (!currentUser) {
      toast.error('Beğenmek için giriş yapın.');
      return;
    }
    if (liked) unlikeMutation.mutate();
    else likeMutation.mutate();
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const content = commentText.trim();
    if (!content) return;
    if (!currentUser) {
      toast.error('Yorum yapmak için giriş yapın.');
      return;
    }
    commentMutation.mutate(content);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-10 flex flex-col lg:flex-row gap-8 max-w-6xl">
          <main className="min-w-0 flex-1 max-w-4xl">
            <div className="animate-pulse bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
            </div>
          </main>
          <BlogSidebar />
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-10 flex flex-col lg:flex-row gap-8 max-w-6xl">
          <main className="min-w-0 flex-1 max-w-4xl">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">Yazı bulunamadı</p>
              <Link href="/blog" className="mt-4 inline-block text-orange-500 hover:text-orange-600">
                Bloga dön →
              </Link>
            </div>
          </main>
          <BlogSidebar />
        </div>
      </div>
    );
  }

  const author = post.author as { username?: string; profile_picture?: string; first_name?: string };
  const authorName = author?.username ?? author?.first_name ?? 'Marifetli';
  const hasHtml = post.content && /<[a-z][\s\S]*>/i.test(post.content);
  // Reddedilen (2) yorumları gösterme
  const comments = (post.comments ?? []).filter((c) => (c.moderation_status ?? 1) !== 2);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-10 flex flex-col lg:flex-row gap-8 max-w-6xl">
        <main className="min-w-0 flex-1 max-w-4xl">
          <div className="mb-4">
            <Link href="/blog" className="text-sm text-orange-500 hover:text-orange-600 dark:text-orange-400">
              ← Bloga dön
            </Link>
          </div>

          <article className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden mb-8 min-w-0">
          {post.featured_image && (
            <div className="relative w-full aspect-video bg-gray-100 dark:bg-gray-800 shrink-0">
              <Image
                src={post.featured_image}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 896px) 100vw, 896px"
                priority
              />
            </div>
          )}
          <div className="p-5 sm:p-8 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4 wrap-break-word">
              {post.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500 dark:text-gray-400 mb-6 min-w-0">
              <span className="flex items-center gap-2 shrink-0">
                {author?.profile_picture ? (
                  <OptimizedAvatar src={author.profile_picture} size={32} alt="" className="w-8 h-8 shrink-0" />
                ) : (
                  <span className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-medium shrink-0">
                    {authorName.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="truncate max-w-[140px] sm:max-w-none" title={authorName}>
                  {authorName}
                </span>
              </span>
              <span className="shrink-0">·</span>
              <time dateTime={post.published_at ?? post.created_at} className="shrink-0 whitespace-nowrap">
                {post.published_at ? formatDate(post.published_at) : formatTimeAgo(post.created_at)}
              </time>
              {post.view_count != null && (
                <>
                  <span className="shrink-0">·</span>
                  <span className="shrink-0">{post.view_count} görüntülenme</span>
                </>
              )}
            </div>

            <div className="prose prose-gray dark:prose-invert max-w-none text-gray-700 dark:text-gray-300">
              {hasHtml ? (
                <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content ?? '') }} />
              ) : (
                <p className="whitespace-pre-wrap">{post.content}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-6 mt-6 border-t border-gray-200 dark:border-gray-700 min-w-0">
              <button
                type="button"
                onClick={handleLike}
                className={`flex items-center gap-1.5 transition-colors shrink-0 ${liked ? 'text-orange-500' : 'text-gray-500 hover:text-orange-500 dark:text-gray-400 dark:hover:text-orange-500'}`}
                title={liked ? 'Beğeniyi kaldır' : 'Beğen'}
              >
                <svg className="w-5 h-5 shrink-0" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span className="text-sm font-medium">{likeCount} beğeni</span>
              </button>
              <ShareButton title={post.title} />
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={() => setSaveModalOpen(true)}
                  className="flex items-center gap-1.5 text-gray-500 hover:text-orange-500 dark:text-gray-400 dark:hover:text-orange-500 transition-colors shrink-0"
                  title="Koleksiyona kaydet"
                >
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  <span className="text-sm font-medium">Kaydet</span>
                </button>
              )}
              <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0">
                {comments.length} yorum
              </span>
            </div>
            <SaveModal blogPostId={post.id} isOpen={saveModalOpen} onClose={() => setSaveModalOpen(false)} />

            {isAuthenticated && (
              <form onSubmit={handleCommentSubmit} className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Yorum yaz
                </label>
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Düşüncenizi paylaşın..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-y min-h-[80px]"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Gönderdiğiniz yorum önce moderasyondan geçer, onaylandıktan sonra herkes tarafından görülebilir.
                </p>
                <div className="mt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={commentMutation.isPending || !commentText.trim()}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {commentMutation.isPending ? 'Gönderiliyor...' : 'Gönder'}
                  </button>
                </div>
              </form>
            )}

            {!isAuthenticated && (
              <p className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
                Yorum yapmak için <Link href="/giris" className="text-orange-500 hover:text-orange-600">giriş yapın</Link>.
              </p>
            )}
          </div>

          {comments.length > 0 && (
            <div id="yorumlar" className="border-t border-gray-200 dark:border-gray-700 p-5 sm:p-8 min-w-0">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Yorumlar</h2>
              <ul className="space-y-4">
                {comments.map((c) => {
                  const commentAuthor = c.author as { username?: string; profile_picture?: string };
                  return (
                    <li key={c.id} className="flex gap-3 min-w-0">
                      {commentAuthor?.profile_picture ? (
                        <OptimizedAvatar src={commentAuthor.profile_picture} size={32} alt="" className="w-8 h-8 shrink-0 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-medium text-gray-500 shrink-0">
                          {commentAuthor?.username?.charAt(0).toUpperCase() ?? '?'}
                        </div>
                      )}
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[180px] sm:max-w-none" title={commentAuthor?.username ?? 'Kullanıcı'}>
                            {commentAuthor?.username ?? 'Kullanıcı'}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                            {formatTimeAgo(c.created_at)}
                          </span>
                          {c.moderation_status === 0 && (
                            <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-xs font-medium px-2 py-0.5 rounded">
                              İnceleniyor
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap wrap-break-word">
                          {c.content}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </article>
        </main>

        <BlogSidebar />
      </div>
    </div>
  );
}
