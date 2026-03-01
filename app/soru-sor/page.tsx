'use client';

import Link from 'next/link';
import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/src/lib/api';
import { useAuthStore } from '@/src/stores/auth-store';
import { RichTextEditor } from '@/src/components/rich-text-editor';

const TITLE_MAX = 300;
const POST_TYPES = [
  { id: 'text', label: 'Metin', icon: '📝', disabled: false },
  { id: 'media', label: 'Görsel & Video', icon: '🖼️', disabled: false },
  { id: 'link', label: 'Link', icon: '🔗', disabled: false },
  { id: 'poll', label: 'Anket', icon: '📊', disabled: false },
];

export default function SoruSorPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [postType, setPostType] = useState<string>('text');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaSlideIndex, setMediaSlideIndex] = useState(0);
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [tagInput, setTagInput] = useState('');
  const [tagIds, setTagIds] = useState<number[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !isAuthenticated) {
      router.replace('/giris');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (mediaFiles.length > 0 && mediaSlideIndex >= mediaFiles.length) {
      setMediaSlideIndex(mediaFiles.length - 1);
    }
  }, [mediaFiles.length, mediaSlideIndex]);

  const { data: categoriesRaw } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories().then((r) => r.data),
    enabled: isAuthenticated,
  });
  const categories = Array.isArray(categoriesRaw) ? categoriesRaw : (categoriesRaw as { results?: unknown[] } | undefined)?.results ?? [];

  const { data: tagsData = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: () => api.getTags().then((r) => r.data),
    enabled: isAuthenticated,
  });
  const tags = Array.isArray(tagsData) ? tagsData : [];

  const createMutation = useMutation({
    mutationFn: (payload: { title: string; description: string; content: string; category?: number | null; tags?: number[]; status: string }) =>
      api.createQuestionRaw(payload).then((r) => r.data),
    onSuccess: (data) => {
      toast.success(data?.slug ? 'Gönderi yayınlandı!' : 'Kaydedildi');
      const slug = data?.slug;
      if (slug) router.push(`/soru/${slug}`);
      else router.push('/sorular');
    },
    onError: () => toast.error('Gönderi oluşturulamadı'),
  });

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const images = files.filter((f) => f.type.startsWith('image/'));
    setMediaFiles((prev) => [...prev, ...images].slice(0, 5));
    e.target.value = '';
    images.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setContent((c) => c + `<p><img src="${dataUrl}" alt="${file.name}" style="max-width:100%;" /></p>`);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeMediaFile = (index: number) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
    setMediaSlideIndex((prev) => {
      if (prev === index) return index === 0 ? 0 : index - 1;
      if (prev > index) return prev - 1;
      return prev;
    });
  };

  const addPollOption = () => {
    if (pollOptions.length < 10) setPollOptions((prev) => [...prev, '']);
  };

  const updatePollOption = (index: number, value: string) => {
    setPollOptions((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) setPollOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const getSubmitContent = () => {
    if (postType === 'link' && linkUrl.trim()) {
      const trimmed = linkUrl.trim();
      return content ? `${content}<p><a href="${trimmed}" target="_blank" rel="noopener">${trimmed}</a></p>` : `<p><a href="${trimmed}" target="_blank" rel="noopener">${trimmed}</a></p>`;
    }
    if (postType === 'poll' && pollOptions.some((o) => o.trim())) {
      const list = pollOptions.filter((o) => o.trim()).map((o) => `<li>${o.trim()}</li>`).join('');
      return content ? `${content}<ul>${list}</ul>` : `<ul>${list}</ul>`;
    }
    return content;
  };

  const canSubmit = () => {
    if (!title.trim()) return false;
    if (postType === 'link' && !linkUrl.trim()) return false;
    return true;
  };

  const handleSubmit = (asDraft: boolean) => (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit()) return;
    const finalContent = getSubmitContent();
    createMutation.mutate({
      title: title.trim(),
      description: finalContent.replace(/<[^>]*>/g, '').slice(0, 500),
      content: finalContent,
      category: categoryId || undefined,
      tags: tagIds.length ? tagIds : undefined,
      status: asDraft ? 'draft' : 'open',
    });
  };

  const addTag = (tag: { id: number; name: string }) => {
    if (!tagIds.includes(tag.id)) setTagIds((prev) => [...prev, tag.id]);
    setTagInput('');
  };

  const removeTag = (id: number) => setTagIds((prev) => prev.filter((t) => t !== id));

  const filteredTags = tagInput
    ? tags.filter((t: { name: string }) => t.name.toLowerCase().includes(tagInput.toLowerCase())).slice(0, 5)
    : [];

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 overflow-x-hidden">
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-3xl min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Gönderi Oluştur</h1>
          <Link href="/sorular" className="text-sm text-orange-500 hover:text-orange-600">
            Taslaklar
          </Link>
        </div>

        <form className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          {/* Kategori seçici */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Topluluk / Kategori</label>
            <select
              value={categoryId ?? ''}
              onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="">Kategori seçin</option>
              {(categories as { id: number; name: string }[]).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Post tipi sekmeler */}
          <div className="flex flex-wrap border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
            {POST_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                disabled={t.disabled}
                onClick={() => !t.disabled && setPostType(t.id)}
                className={`flex-1 min-w-[80px] py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium transition-colors shrink-0 ${
                  postType === t.id
                    ? 'text-orange-500 border-b-2 border-orange-500'
                    : t.disabled
                    ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-400'
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          <div className="p-4 space-y-4">
            {/* Başlık */}
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
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            {/* Etiketler */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Etiketler</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tagIds.map((id) => {
                  const tag = tags.find((t: { id: number }) => t.id === id);
                  return tag ? (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded text-sm"
                    >
                      {tag.name}
                      <button type="button" onClick={() => removeTag(id)} className="hover:text-orange-900">
                        ×
                      </button>
                    </span>
                  ) : null;
                })}
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && filteredTags.length > 0) {
                      e.preventDefault();
                      addTag(filteredTags[0]);
                    }
                  }}
                  placeholder="Etiket ekle"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
                {filteredTags.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 py-1">
                    {filteredTags.map((t: { id: number; name: string }) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => addTag(t)}
                        className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Link: URL alanı */}
            {postType === 'link' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Link URL *</label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            )}

            {/* Görsel & Video: Slider ile yükleme (Reddit tarzı) */}
            {postType === 'media' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Görsel / Video</label>
                {mediaFiles.length === 0 ? (
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 sm:p-12 text-center hover:border-orange-500 transition-colors">
                    <input type="file" accept="image/*" onChange={handleMediaChange} className="hidden" id="media-upload" />
                    <label htmlFor="media-upload" className="cursor-pointer block">
                      <span className="text-4xl mb-2 block">🖼️</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Görsel yüklemek için tıklayın veya sürükleyip bırakın</span>
                      <span className="block text-xs text-gray-500 mt-1">PNG, JPG, GIF (en fazla 5 görsel)</span>
                    </label>
                  </div>
                ) : (
                  <div className="relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <div className="aspect-video min-h-[200px] relative">
                      {mediaFiles.map((file, i) => (
                        <div
                          key={i}
                          className={`absolute inset-0 transition-opacity duration-200 ${i === mediaSlideIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                        >
                          <img
                            src={URL.createObjectURL(file)}
                            alt=""
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ))}
                      {mediaSlideIndex > 0 && (
                        <button
                          type="button"
                          onClick={() => setMediaSlideIndex((i) => i - 1)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center"
                        >
                          ‹
                        </button>
                      )}
                      {mediaSlideIndex < mediaFiles.length - 1 && (
                        <button
                          type="button"
                          onClick={() => setMediaSlideIndex((i) => i + 1)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center"
                        >
                          ›
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeMediaFile(mediaSlideIndex)}
                        className="absolute top-2 right-2 z-20 w-8 h-8 rounded-full bg-black/50 hover:bg-red-600 text-white flex items-center justify-center text-sm"
                        title="Görseli kaldır"
                      >
                        ×
                      </button>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex gap-1">
                        {mediaFiles.map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setMediaSlideIndex(i)}
                            className={`w-2 h-2 rounded-full transition-colors ${i === mediaSlideIndex ? 'bg-orange-500' : 'bg-gray-400 dark:bg-gray-600'}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-gray-500">{mediaSlideIndex + 1} / {mediaFiles.length}</span>
                      {mediaFiles.length < 5 && (
                        <>
                          <input type="file" accept="image/*" onChange={handleMediaChange} className="hidden" id="media-upload-more" />
                          <label htmlFor="media-upload-more" className="text-xs text-orange-500 hover:text-orange-600 cursor-pointer">
                            + Görsel ekle
                          </label>
                        </>
                      )}
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">Video desteği yakında eklenecek.</p>
              </div>
            )}

            {/* Anket: Seçenekler */}
            {postType === 'poll' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Anket seçenekleri</label>
                <div className="space-y-2">
                  {pollOptions.map((opt, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => updatePollOption(i, e.target.value)}
                        placeholder={`Seçenek ${i + 1}`}
                        className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      />
                      <button
                        type="button"
                        onClick={() => removePollOption(i)}
                        disabled={pollOptions.length <= 2}
                        className="px-2 text-gray-500 hover:text-red-500 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {pollOptions.length < 10 && (
                    <button type="button" onClick={addPollOption} className="text-sm text-orange-500 hover:text-orange-600">
                      + Seçenek ekle
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* İçerik (zengin metin) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {postType === 'text' ? 'İçerik (isteğe bağlı)' : 'Açıklama (isteğe bağlı)'}
              </label>
              <RichTextEditor
                content={content}
                onChange={setContent}
                placeholder="İçeriğinizi buraya yazın... (Kalın, italik, liste, link vb. kullanabilirsiniz)"
                minHeight="160px"
              />
            </div>

            {/* Butonlar */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={handleSubmit(true)}
                disabled={createMutation.isPending || !title.trim()}
                className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
              >
                Taslak Kaydet
              </button>
              <button
                type="button"
                onClick={handleSubmit(false)}
                disabled={createMutation.isPending || !canSubmit()}
                className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg disabled:opacity-50"
              >
                {createMutation.isPending ? 'Yayınlanıyor...' : 'Yayınla'}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
