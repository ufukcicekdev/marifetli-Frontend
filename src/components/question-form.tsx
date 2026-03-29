'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/src/lib/api';
import { RichTextEditor } from '@/src/components/rich-text-editor';
import { CategoryDropdown, buildCategoriesTree } from '@/src/components/category-dropdown';
import { FileImage, FileText, Link2 } from 'lucide-react';

const TITLE_MAX = 300;
const POST_TYPES = [
  { id: 'text', label: 'Metin', icon: <FileText className="h-3.5 w-3.5" />, disabled: false },
  { id: 'media', label: 'Görsel & Video', icon: <FileImage className="h-3.5 w-3.5" />, disabled: false },
  { id: 'link', label: 'Link', icon: <Link2 className="h-3.5 w-3.5" />, disabled: false },
];

export type QuestionFormPayload = {
  title: string;
  description: string;
  content: string;
  category?: number | null;
  /** Topluluk sayfasından soru sorulduğunda doldurulur */
  community?: number | null;
  tags?: number[];
  tag_names?: string[];
  status?: string;
};

export type QuestionFormInitial = {
  title: string;
  content: string;
  categoryId: number | null;
  tagIds: number[];
  /** Gönderiden gelen etiket objeleri - tags API yüklenmeden chip isimlerini göstermek için */
  tagsFromQuestion?: { id: number; name: string }[];
  linkUrl?: string;
  pollOptions?: string[];
  postType?: string;
};

type QuestionFormProps = {
  mode: 'create' | 'edit';
  initialValues?: QuestionFormInitial;
  /** Topluluk sayfasından soru sorulurken topluluk id (soru bu toplulukta yayınlanır) */
  communityId?: number | null;
  onSubmit: (data: QuestionFormPayload, asDraft?: boolean) => void;
  isSubmitting?: boolean;
  showDraftButton?: boolean;
};

function extractImageUrls(html: string): string[] {
  const urls: string[] = [];
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = imgRegex.exec(html)) !== null) urls.push(m[1]);
  return urls;
}

function stripImagesFromHtml(html: string): string {
  return html.replace(/<p>\s*<img[^>]*>\s*<\/p>/gi, '').replace(/<img[^>]*>/gi, '').trim() || '<p></p>';
}

function parseContentForEdit(content: string): {
  linkUrl: string;
  pollOptions: string[];
  postType: string;
  imageUrls: string[];
  contentWithoutImages: string;
} {
  let linkUrl = '';
  let pollOptions: string[] = [];
  let postType = 'text';
  const imageUrls = extractImageUrls(content);
  const contentWithoutImages = stripImagesFromHtml(content);

  const linkMatch = content.match(/<a\s+href="([^"]+)"[^>]*>/i);
  if (linkMatch) {
    linkUrl = linkMatch[1];
    postType = 'link';
  }

  const ulMatch = content.match(/<ul>([\s\S]*?)<\/ul>/i);
  if (ulMatch) {
    const liMatches = ulMatch[1].match(/<li[^>]*>([\s\S]*?)<\/li>/gi);
    if (liMatches && liMatches.length >= 2) {
      pollOptions = liMatches.map((li) => li.replace(/<[^>]+>/g, '').trim());
      postType = 'poll';
    }
  }

  if (content.includes('<img')) postType = 'media';

  return { linkUrl, pollOptions: pollOptions.length ? pollOptions : ['', ''], postType, imageUrls, contentWithoutImages };
}

export function QuestionForm({
  mode,
  initialValues,
  communityId,
  onSubmit,
  isSubmitting = false,
  showDraftButton = true,
}: QuestionFormProps) {
  const [initialized, setInitialized] = useState(!initialValues);
  const hasInitialized = useRef(false);
  const [categoryId, setCategoryId] = useState<number | null>(initialValues?.categoryId ?? null);
  const [postType, setPostType] = useState<string>(initialValues?.postType ?? 'text');
  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [content, setContent] = useState(initialValues?.content ?? '');
  const [linkUrl, setLinkUrl] = useState(initialValues?.linkUrl ?? '');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaFilesDataUrls, setMediaFilesDataUrls] = useState<string[]>([]);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaSlideIndex, setMediaSlideIndex] = useState(0);
  const [tagInput, setTagInput] = useState('');
  const [tagIds, setTagIds] = useState<number[]>(initialValues?.tagIds ?? []);
  const [customTagNames, setCustomTagNames] = useState<string[]>([]);
  const [tagInputFocused, setTagInputFocused] = useState(false);

  useEffect(() => {
    if (initialValues && !hasInitialized.current) {
      hasInitialized.current = true;
      const parsed = parseContentForEdit(initialValues.content);
      setTitle(initialValues.title);
      setCategoryId(initialValues.categoryId);
      setTagIds(initialValues.tagIds);
      setCustomTagNames([]);
      if (parsed.linkUrl) setLinkUrl(parsed.linkUrl);
      // Anket şimdilik kaldırıldı; eski anket gönderileri metin olarak açılır
      if (parsed.postType === 'poll') {
        setPostType('text');
        setContent(initialValues.content);
      } else if (parsed.postType) {
        setPostType(parsed.postType);
      }
      if (parsed.imageUrls.length > 0) {
        setMediaUrls(parsed.imageUrls);
        setContent(parsed.contentWithoutImages);
      } else if (parsed.postType !== 'poll') {
        setContent(initialValues.content);
      }
      setInitialized(true);
    }
  }, [initialValues]);

  const { data: categoriesRaw } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories().then((r) => r.data),
  });
  const categoriesTree = useMemo(() => buildCategoriesTree(categoriesRaw), [categoriesRaw]);

  const { data: tagsData = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: () => api.getTags().then((r) => r.data),
  });
  const tags = Array.isArray(tagsData) ? tagsData : [];

  const mediaItemsCount = mediaUrls.length + mediaFiles.length;
  useEffect(() => {
    if (mediaItemsCount > 0 && mediaSlideIndex >= mediaItemsCount) {
      setMediaSlideIndex(Math.max(0, mediaItemsCount - 1));
    }
  }, [mediaItemsCount, mediaSlideIndex]);

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const images = files.filter((f) => f.type.startsWith('image/'));
    const total = mediaUrls.length + mediaFiles.length + images.length;
    if (total > 5) return;
    const maxNew = 5 - mediaUrls.length - mediaFiles.length;
    const toAdd = images.slice(0, maxNew);
    const startIdx = mediaFiles.length;
    setMediaFiles((prev) => [...prev, ...toAdd]);
    setMediaFilesDataUrls((prev) => {
      const next = [...prev];
      toAdd.forEach(() => next.push(''));
      return next;
    });
    e.target.value = '';
    toAdd.forEach((file, i) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setMediaFilesDataUrls((prev) => {
          const next = [...prev];
          next[startIdx + i] = dataUrl;
          return next;
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const removeMediaItem = (index: number) => {
    if (index < mediaUrls.length) {
      setMediaUrls((prev) => prev.filter((_, i) => i !== index));
    } else {
      const fileIndex = index - mediaUrls.length;
      setMediaFiles((prev) => prev.filter((_, i) => i !== fileIndex));
      setMediaFilesDataUrls((prev) => prev.filter((_, i) => i !== fileIndex));
    }
    setMediaSlideIndex((prev) => (prev === index ? Math.max(0, index - 1) : prev > index ? prev - 1 : prev));
  };

  const getSubmitContent = () => {
    if (postType === 'link' && linkUrl.trim()) {
      const trimmed = linkUrl.trim();
      return content ? `${content}<p><a href="${trimmed}" target="_blank" rel="noopener">${trimmed}</a></p>` : `<p><a href="${trimmed}" target="_blank" rel="noopener">${trimmed}</a></p>`;
    }
    if (postType === 'media') {
      const loadedDataUrls = mediaFilesDataUrls.filter(Boolean);
      const imgTags = [...mediaUrls, ...loadedDataUrls]
        .map((src) => `<p><img src="${src}" alt="" style="max-width:100%;" /></p>`)
        .join('');
      return content ? `${content}${imgTags}` : imgTags || '<p></p>';
    }
    return content;
  };

  const canSubmit = () => {
    if (!title.trim()) return false;
    if (!categoryId) return false;
    if (postType === 'link' && !linkUrl.trim()) return false;
    return true;
  };

  const removeTag = (id: number) => setTagIds((prev) => prev.filter((t) => t !== id));
  const removeCustomTag = (name: string) => setCustomTagNames((prev) => prev.filter((n) => n !== name));

  const tagCharsCount = tagIds.reduce((acc, id) => {
    const tag = (tags as { id: number; name: string }[]).find((t) => t.id === id);
    return acc + (tag?.name.length ?? 0);
  }, 0) + customTagNames.reduce((acc, n) => acc + n.length, 0);
  const TAG_CHAR_LIMIT = 100;

  const addTagWithLimit = (tag: { id: number; name: string }) => {
    if (tagIds.includes(tag.id)) return;
    const newCount = tagCharsCount + tag.name.length;
    if (newCount > TAG_CHAR_LIMIT) return;
    setTagIds((prev) => [...prev, tag.id]);
    setTagInput('');
  };

  const addTagByName = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const tagList = tags as { id: number; name: string }[];
    const lowerTrimmed = trimmed.toLocaleLowerCase('tr');
    const match = tagList.find((t) => t.name.toLocaleLowerCase('tr') === lowerTrimmed);
    if (match) {
      addTagWithLimit(match);
    } else if (
      !customTagNames.includes(trimmed) &&
      !tagList.some((t) => tagIds.includes(t.id) && t.name.toLocaleLowerCase('tr') === lowerTrimmed) &&
      tagCharsCount + trimmed.length <= TAG_CHAR_LIMIT
    ) {
      setCustomTagNames((prev) => [...prev, trimmed]);
      setTagInput('');
    }
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredTags.length > 0) addTagWithLimit(filteredTags[0]);
      return;
    }
    if (e.key === 'Backspace' && !tagInput && tagIds.length > 0) {
      e.preventDefault();
      removeTag(tagIds[tagIds.length - 1]);
    }
  };

  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (tagCharsCount + v.length > TAG_CHAR_LIMIT) return;
    if (v.includes(',') || v.includes(';')) {
      const sep = v.includes(',') ? ',' : ';';
      const segments = v.split(sep).map((s) => s.trim()).filter(Boolean);
      segments.forEach((part) => addTagByName(part));
      setTagInput('');
    } else {
      setTagInput(v);
    }
  };

  const filteredTags = tagInput.trim()
    ? (tags as { id: number; name: string }[]).filter(
        (t) =>
          t.name.toLowerCase().includes(tagInput.toLowerCase().trim()) &&
          !tagIds.includes(t.id)
      ).slice(0, 10)
    : (tags as { id: number; name: string }[]).filter((t) => !tagIds.includes(t.id)).slice(0, 8);

  const handleSubmit = (asDraft: boolean) => (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) return;
    if (!canSubmit() && !asDraft) return;
    const finalContent = getSubmitContent();
    onSubmit({
      title: title.trim(),
      description: finalContent.replace(/<[^>]*>/g, '').slice(0, 500),
      content: finalContent,
      category: categoryId || undefined,
      ...(communityId != null && { community: communityId }),
      tags: tagIds,
      ...(customTagNames.length > 0 && { tag_names: customTagNames }),
      status: asDraft ? 'draft' : 'open',
    }, asDraft);
  };

  if (!initialized && mode === 'edit') {
    return (
      <div className="animate-pulse bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
      </div>
    );
  }

  return (
    <form className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Topluluk / Kategori *</label>
        <CategoryDropdown
          categoriesTree={categoriesTree}
          value={categoryId}
          onChange={setCategoryId}
          placeholder="Kategori seçin"
        />
      </div>

      <div className="flex flex-wrap border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
        {POST_TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={t.disabled}
            onClick={() => !t.disabled && setPostType(t.id)}
            className={`flex-1 min-w-[80px] py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium transition-colors shrink-0 ${
              postType === t.id ? 'text-brand border-b-2 border-brand' : t.disabled ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-400'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Başlık *</label>
            <span className="text-xs text-gray-500">{title.length}/{TITLE_MAX}</span>
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
            placeholder="Başlık yazın..."
            maxLength={TITLE_MAX}
            required
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-brand"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Etiketler (isteğe bağlı)</label>
          <div className="relative">
            <div
              className={`min-h-[42px] flex flex-wrap items-center gap-2 px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus-within:ring-2 focus-within:ring-brand focus-within:border-transparent`}
            >
              {tagIds.map((id) => {
                const tag =
                  (tags as { id: number; name: string }[]).find((t) => t.id === id) ??
                  initialValues?.tagsFromQuestion?.find((t) => t.id === id);
                return tag ? (
                  <span
                    key={`tag-${id}`}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm"
                  >
                    {tag.name}
                    <button
                      type="button"
                      onClick={() => removeTag(id)}
                      className="w-4 h-4 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                      aria-label="Etiketi kaldır"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </span>
                ) : null;
              })}
              {customTagNames.map((name) => (
                <span
                  key={`custom-${name}`}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-brand-pink dark:bg-brand/20 text-brand-hover rounded text-sm"
                >
                  {name}
                  <button
                    type="button"
                    onClick={() => removeCustomTag(name)}
                    className="w-4 h-4 rounded flex items-center justify-center hover:bg-brand/20 transition-colors"
                    aria-label="Etiketi kaldır"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={handleTagInputChange}
                onPaste={(e) => {
                  const pasted = (e.clipboardData?.getData('text') ?? '').trim();
                  if (pasted.includes(',') || pasted.includes(';')) {
                    e.preventDefault();
                    const sep = pasted.includes(',') ? ',' : ';';
                    const segments = pasted.split(sep).map((s) => s.trim()).filter(Boolean);
                    segments.forEach((part) => addTagByName(part));
                    setTagInput('');
                  }
                }}
                onKeyDown={handleTagInputKeyDown}
                onFocus={() => setTagInputFocused(true)}
                onBlur={() => setTimeout(() => setTagInputFocused(false), 150)}
                placeholder={tagIds.length === 0 && customTagNames.length === 0 ? 'Etiket ekle...' : ''}
                className="flex-1 min-w-[120px] py-1 px-1 bg-transparent border-0 outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 text-sm"
              />
            </div>
            {tagInputFocused && filteredTags.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 py-1 max-h-48 overflow-y-auto">
                {filteredTags.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => addTagWithLimit(t)}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-900 dark:text-gray-100"
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}
            <div className="flex justify-between mt-1 px-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">Etiketleri virgülle ayırın</p>
              <span className="text-xs text-gray-500 dark:text-gray-400">{tagCharsCount + tagInput.length}/{TAG_CHAR_LIMIT}</span>
            </div>
          </div>
        </div>

        {postType === 'link' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Link URL *</label>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-brand"
            />
          </div>
        )}

        {postType === 'media' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Görsel / Video</label>
            {mediaItemsCount === 0 ? (
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 sm:p-12 text-center hover:border-brand transition-colors">
                <input type="file" accept="image/*" onChange={handleMediaChange} className="hidden" id="media-upload" />
                <label htmlFor="media-upload" className="cursor-pointer block">
                  <span className="mb-2 block">
                    <FileImage className="mx-auto h-8 w-8 text-slate-500" />
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Görsel yüklemek için tıklayın veya sürükleyip bırakın</span>
                  <span className="block text-xs text-gray-500 mt-1">PNG, JPG, GIF (en fazla 5 görsel)</span>
                </label>
              </div>
            ) : (
              <div className="relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div className="aspect-video min-h-[200px] relative">
                  {mediaUrls.map((src, i) => (
                    <div key={`url-${i}`} className={`absolute inset-0 transition-opacity duration-200 ${i === mediaSlideIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                      <img src={src} alt="" className="w-full h-full object-contain" />
                    </div>
                  ))}
                  {mediaFiles.map((file, i) => {
                    const idx = mediaUrls.length + i;
                    return (
                      <div key={`file-${i}`} className={`absolute inset-0 transition-opacity duration-200 ${idx === mediaSlideIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                        <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-contain" />
                      </div>
                    );
                  })}
                  {mediaSlideIndex > 0 && (
                    <button type="button" onClick={() => setMediaSlideIndex((i) => i - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center">‹</button>
                  )}
                  {mediaSlideIndex < mediaItemsCount - 1 && (
                    <button type="button" onClick={() => setMediaSlideIndex((i) => i + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center">›</button>
                  )}
                  <button type="button" onClick={() => removeMediaItem(mediaSlideIndex)} className="absolute top-2 right-2 z-20 w-8 h-8 rounded-full bg-black/50 hover:bg-red-600 text-white flex items-center justify-center text-sm" title="Görseli kaldır">×</button>
                </div>
                <div className="flex items-center justify-between px-3 py-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex gap-1">
                    {Array.from({ length: mediaItemsCount }).map((_, i) => (
                      <button key={i} type="button" onClick={() => setMediaSlideIndex(i)} className={`w-2 h-2 rounded-full transition-colors ${i === mediaSlideIndex ? 'bg-brand' : 'bg-gray-400 dark:bg-gray-600'}`} />
                    ))}
                  </div>
                  <span className="text-xs text-gray-500">{mediaSlideIndex + 1} / {mediaItemsCount}</span>
                  {mediaItemsCount < 5 && (
                    <>
                      <input type="file" accept="image/*" onChange={handleMediaChange} className="hidden" id="media-upload-more" />
                      <label htmlFor="media-upload-more" className="text-xs text-brand hover:text-brand-hover cursor-pointer">+ Görsel ekle</label>
                    </>
                  )}
                </div>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">Video desteği yakında eklenecek.</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {postType === 'text' ? 'İçerik (isteğe bağlı)' : 'Açıklama (isteğe bağlı)'}
          </label>
          <RichTextEditor content={content} onChange={setContent} placeholder="İçeriğinizi buraya yazın... (Kalın, italik, liste, link vb. kullanabilirsiniz)" minHeight="160px" />
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
          {showDraftButton && (
            <button type="button" onClick={handleSubmit(true)} disabled={isSubmitting || !title.trim() || !categoryId} className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50" title={!categoryId ? 'Kategori seçmeniz gerekir' : undefined}>
              Taslak Kaydet
            </button>
          )}
          <button type="button" onClick={handleSubmit(false)} disabled={isSubmitting || !canSubmit()} className="px-5 py-2.5 bg-brand hover:bg-brand-hover text-white font-medium rounded-lg disabled:opacity-50" title={!categoryId ? 'Kategori seçmeniz gerekir' : undefined}>
            {isSubmitting ? (mode === 'edit' ? 'Kaydediliyor...' : 'Yayınlanıyor...') : (mode === 'edit' ? 'Kaydet' : 'Yayınla')}
          </button>
        </div>
      </div>
    </form>
  );
}
