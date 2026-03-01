'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ViewMode } from './post-feed-controls';
import { extractMediaFromHtml } from '@/src/lib/extract-media';
import { MediaSlider } from './media-slider';
import { SaveModal } from './save-modal';
import api from '@/src/lib/api';
import { useAuthStore } from '@/src/stores/auth-store';
import toast from 'react-hot-toast';

interface PostItemProps {
  id: number;
  slug?: string;
  title: string;
  content?: string | null;
  category?: string;
  author: string;
  timeAgo: string;
  commentCount: number;
  voteCount: number;
  viewCount?: number;
  viewMode: ViewMode;
  showEditButton?: boolean;
}

export function PostItem({ id, slug, title, content, category, author, timeAgo, commentCount, voteCount, viewCount, viewMode, showEditButton }: PostItemProps) {
  const mediaItems = useMemo(() => extractMediaFromHtml(content), [content]);
  const firstMedia = mediaItems[0];
  const href = `/soru/${slug ?? id}`;
  const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${href}` : href;
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const [optimisticVote, setOptimisticVote] = useState<'up' | 'down' | null>(null);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const displayCount = voteCount + (optimisticVote === 'up' ? 1 : optimisticVote === 'down' ? -1 : 0);

  const likeMutation = useMutation({
    mutationFn: () => api.likeQuestion(id),
    onMutate: () => setOptimisticVote('up'),
    onSuccess: () => {
      setOptimisticVote(null);
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
    onError: () => {
      setOptimisticVote(null);
      toast.error('Beğeni işlemi başarısız.');
    },
  });

  const unlikeMutation = useMutation({
    mutationFn: () => api.unlikeQuestion(id),
    onMutate: () => setOptimisticVote('down'),
    onSuccess: () => {
      setOptimisticVote(null);
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
    onError: () => {
      setOptimisticVote(null);
      toast.error('İşlem başarısız.');
    },
  });

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error('Beğenmek için giriş yapın.');
      return;
    }
    likeMutation.mutate();
  };

  const handleUnlike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error('Giriş yapın.');
      return;
    }
    unlikeMutation.mutate();
  };

  const handleSaveClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error('Kaydetmek için giriş yapın.');
      return;
    }
    setSaveModalOpen(true);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title, url: fullUrl, text: title });
        toast.success('Paylaşıldı');
      } else {
        await navigator.clipboard.writeText(fullUrl);
        toast.success('Link kopyalandı');
      }
    } catch {
      toast.error('Paylaşım başarısız.');
    }
  };

  const VoteButtons = () => (
    <div className="flex flex-col items-center shrink-0">
      <button onClick={handleLike} className={`transition-colors ${optimisticVote === 'up' ? 'text-orange-500' : 'text-gray-400 hover:text-orange-500'}`} title="Beğen" aria-label="Beğen">
        <svg className="w-5 h-5" fill={optimisticVote === 'up' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>
      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 my-0.5">{displayCount}</span>
      <button onClick={handleUnlike} className={`transition-colors ${optimisticVote === 'down' ? 'text-orange-500' : 'text-gray-400 hover:text-orange-500'}`} title="Beğenme bırak" aria-label="Beğenme bırak">
        <svg className="w-5 h-5" fill={optimisticVote === 'down' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  );

  const ActionBar = ({ compact = false }: { compact?: boolean }) => (
    <div className={`flex items-center gap-3 ${compact ? 'mt-1' : 'mt-3 pt-2 border-t border-gray-200 dark:border-gray-700'}`}>
      <button onClick={handleLike} className={`flex items-center gap-1 transition-colors ${optimisticVote === 'up' ? 'text-orange-500' : 'text-gray-500 hover:text-orange-500 dark:text-gray-400 dark:hover:text-orange-500'}`} title="Beğen" aria-label="Beğen">
        <svg className="w-4 h-4" fill={optimisticVote === 'up' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
        <span className="text-xs font-medium">{displayCount}</span>
      </button>
      <button onClick={handleUnlike} className={`transition-colors ${optimisticVote === 'down' ? 'text-orange-500' : 'text-gray-500 hover:text-orange-500 dark:text-gray-400 dark:hover:text-orange-500'}`} title="Beğenme bırak" aria-label="Beğenme bırak">
        <svg className="w-4 h-4" fill={optimisticVote === 'down' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <Link href={href} className="flex items-center gap-1 text-gray-500 hover:text-orange-500 dark:text-gray-400 dark:hover:text-orange-500 transition-colors" title="Yorumlar">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span className="text-xs">{commentCount} yorum</span>
      </Link>
      <button onClick={handleSaveClick} className="flex items-center gap-1 text-gray-500 hover:text-orange-500 dark:text-gray-400 dark:hover:text-orange-500 transition-colors" title="Kaydet" aria-label="Kaydet">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
        <span className="text-xs">Kaydet</span>
      </button>
      <button onClick={handleShare} className="flex items-center gap-1 text-gray-500 hover:text-orange-500 dark:text-gray-400 dark:hover:text-orange-500 transition-colors" title="Paylaş" aria-label="Paylaş">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        <span className="text-xs">Paylaş</span>
      </button>
        <SaveModal questionId={id} isOpen={saveModalOpen} onClose={() => setSaveModalOpen(false)} />
    </div>
  );

  const Meta = () => (
    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1 flex-wrap gap-x-1 gap-y-0.5">
      {category && <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded shrink-0">{category}</span>}
      <span className="min-w-0 truncate" title={`u/${author}`}>u/{author}</span>
      <span className="shrink-0">•</span>
      <span className="shrink-0">{timeAgo}</span>
      <span className="shrink-0">•</span>
      <span className="shrink-0">{commentCount} yorum</span>
      {showEditButton && slug && (
        <>
          <span className="shrink-0">•</span>
          <Link href={`/soru/${slug}/duzenle`} className="shrink-0 text-orange-500 hover:text-orange-600">
            Düzenle
          </Link>
        </>
      )}
    </div>
  );

  if (viewMode === 'card') {
    return (
      <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-800 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
        <div className="flex gap-2 sm:gap-4 min-w-0">
          <VoteButtons />
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 hover:text-orange-600 line-clamp-2 min-w-0">
                <Link href={href} className="block break-words">{title}</Link>
              </h3>
              {viewCount != null && (
                <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                  {viewCount >= 1000 ? `${(viewCount / 1000).toFixed(1)}k` : viewCount} görüntüleme
                </span>
              )}
            </div>
            <Meta />
            {mediaItems.length > 0 ? (
              <Link href={href} className="mt-3 block">
                <MediaSlider items={mediaItems} className="border-0" />
              </Link>
            ) : null}
            <ActionBar />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-200 dark:border-gray-800 last:border-b-0">
      <div className="flex gap-2 sm:gap-3 min-w-0">
        <VoteButtons />
        <div className="flex-1 min-w-0 overflow-hidden">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-orange-600 line-clamp-1">
            <Link href={href} className="block truncate">{title}</Link>
          </h3>
          <Meta />
          <ActionBar compact />
        </div>
        {firstMedia && (
          <Link href={href} className="w-16 h-16 shrink-0 rounded overflow-hidden bg-gray-100 dark:bg-gray-800">
            {firstMedia.type === 'image' ? (
              <img src={firstMedia.url} alt="" className="w-full h-full object-cover" />
            ) : (
              <video src={firstMedia.url} className="w-full h-full object-cover" muted playsInline />
            )}
          </Link>
        )}
        {viewCount != null && (
          <div className="hidden sm:flex items-center text-xs text-gray-500 dark:text-gray-400 shrink-0">
            {viewCount >= 1000 ? `${(viewCount / 1000).toFixed(1)}k` : viewCount} görüntüleme
          </div>
        )}
      </div>
    </div>
  );
}
