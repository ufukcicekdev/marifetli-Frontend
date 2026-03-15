'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';

export type DesignLicense = 'commercial' | 'cc-by' | 'cc-by-nc';

export interface DesignUploadFormData {
  files: File[];
  license: DesignLicense;
  addWatermark: boolean;
  tags: string;
  description: string;
  copyrightConfirmed: boolean;
}

/** Seçilen dosyaların büyük slider önizlemesi */
function DesignPreviewSlider({
  files,
  currentIndex,
  onIndexChange,
  onRemove,
}: {
  files: File[];
  currentIndex: number;
  onIndexChange: (i: number) => void;
  onRemove: (index: number) => void;
}) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    const list = files.map((f) => URL.createObjectURL(f));
    setUrls(list);
    return () => list.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  if (files.length === 0) return null;
  const index = Math.min(currentIndex, urls.length - 1);
  const url = urls[index];

  return (
    <div className="relative w-full aspect-video max-h-[260px] flex items-center justify-center">
      {url && (
        <img
          src={url}
          alt={`Önizleme ${index + 1}`}
          className="max-w-full max-h-full object-contain rounded-lg"
        />
      )}
      {files.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onIndexChange(index <= 0 ? files.length - 1 : index - 1); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center"
            aria-label="Önceki"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onIndexChange(index >= files.length - 1 ? 0 : index + 1); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center"
            aria-label="Sonraki"
          >
            ›
          </button>
        </>
      )}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onRemove(index); }}
        className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-red-500/90 hover:bg-red-600 text-white flex items-center justify-center text-sm font-bold shadow"
        aria-label="Bu görseli kaldır"
        title="Bu görseli kaldır"
      >
        ×
      </button>
      {files.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {files.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => { e.stopPropagation(); onIndexChange(i); }}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${i === index ? 'bg-orange-500 ring-2 ring-orange-300' : 'bg-white/60 hover:bg-white/80'}`}
              aria-label={`Görsel ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Tüm seçilen görsellerin küçük önizlemesi; her birinden silinebilir */
function DesignThumbnailStrip({
  files,
  currentIndex,
  onSelectIndex,
  onRemove,
}: {
  files: File[];
  currentIndex: number;
  onSelectIndex: (i: number) => void;
  onRemove: (index: number) => void;
}) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    const list = files.map((f) => URL.createObjectURL(f));
    setUrls(list);
    return () => list.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  if (files.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto py-2 px-1">
      {files.map((_, i) => (
        <div
          key={i}
          className="relative shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 bg-gray-200 dark:bg-gray-700"
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onSelectIndex(i); }}
            className={`block w-full h-full ${i === currentIndex ? 'ring-2 ring-orange-500 ring-offset-1' : 'opacity-80 hover:opacity-100'}`}
          >
            {urls[i] && (
              <img
                src={urls[i]}
                alt={`Görsel ${i + 1}`}
                className="w-full h-full object-cover"
              />
            )}
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(i); }}
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center text-xs font-bold shadow z-10"
            aria-label={`Görsel ${i + 1} kaldır`}
            title="Bu görseli kaldır"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

const LICENSE_OPTIONS: { value: DesignLicense; label: string; description: string }[] = [
  { value: 'commercial', label: 'Ticari Kullanıma İzin Ver', description: 'Herkes kullanabilir' },
  { value: 'cc-by', label: 'Sadece Atıf ile Kullanım (CC BY)', description: 'İsmim belirtilmeli' },
  { value: 'cc-by-nc', label: 'Ticari Kullanım Yasak (CC BY-NC)', description: 'Sadece hobi amaçlı, satış yapılamaz' },
];

interface DesignUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (data: DesignUploadFormData) => void;
  isSubmitting?: boolean;
}

export function DesignUploadModal({ isOpen, onClose, onSubmit, isSubmitting = false }: DesignUploadModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [license, setLicense] = useState<DesignLicense>('cc-by');
  const [addWatermark, setAddWatermark] = useState(true);
  const [tags, setTags] = useState('');
  const [description, setDescription] = useState('');
  const [copyrightConfirmed, setCopyrightConfirmed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = useCallback(() => {
    setFiles([]);
    setPreviewIndex(0);
    setLicense('cc-by');
    setAddWatermark(true);
    setTags('');
    setDescription('');
    setCopyrightConfirmed(false);
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetForm();
      return;
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, resetForm]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const list = Array.from(newFiles).filter((f) => f.type.startsWith('image/'));
    setFiles((prev) => [...prev, ...list]);
    setPreviewIndex(0);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addFiles(e.target.files);
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewIndex((prev) => {
      const newLen = files.length - 1;
      if (newLen <= 0) return 0;
      if (prev > index) return prev - 1;
      if (prev === index) return index > 0 ? index - 1 : 0;
      return prev;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!copyrightConfirmed) {
      toast.error('Telif beyanını onaylamanız gerekiyor.');
      return;
    }
    if (files.length === 0) {
      toast.error('Lütfen en az bir görsel seçin.');
      return;
    }
    const data: DesignUploadFormData = { files, license, addWatermark, tags, description, copyrightConfirmed };
    onSubmit?.(data);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="design-upload-modal-title"
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 sm:p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <h2 id="design-upload-modal-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Tasarım Yükleme ve Lisanslama
            </h2>
            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:text-gray-400 dark:hover:bg-gray-800 transition-colors"
              aria-label="Kapat"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-y-auto">
          <div className="p-5 sm:p-6 space-y-6">
            {/* Dropzone + çoklu görsel önizleme (slider) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Görseller (birden fazla ekleyebilirsiniz)
              </label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                  relative rounded-2xl border-2 border-dashed min-h-[200px] flex flex-col transition-colors
                  ${isDragging
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                    : 'border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/50'
                  }
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="sr-only"
                  aria-label="Görsel seç"
                />
                {files.length > 0 ? (
                  <>
                    <div className="relative flex-1 min-h-[180px] flex flex-col rounded-t-2xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                      <DesignPreviewSlider
                        files={files}
                        currentIndex={previewIndex}
                        onIndexChange={setPreviewIndex}
                        onRemove={removeFile}
                      />
                      <div className="px-2 pb-1">
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          Yüklenen görseller ({files.length}) — istediğinizi silmek için üzerindeki × e tıklayın
                        </p>
                        <DesignThumbnailStrip
                          files={files}
                          currentIndex={previewIndex}
                          onSelectIndex={setPreviewIndex}
                          onRemove={removeFile}
                        />
                      </div>
                    </div>
                    <div className="p-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {files.length} görsel seçildi
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 hover:bg-orange-100 dark:hover:bg-orange-900/50 border border-orange-200 dark:border-orange-800 transition-colors"
                        >
                          <span className="text-base leading-none">+</span>
                          Görsel ekle
                        </button>
                        <button
                          type="button"
                          onClick={() => setFiles([])}
                          className="px-3 py-1.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          Tümünü kaldır
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 min-h-[180px] flex flex-col items-center justify-center gap-3 cursor-pointer"
                  >
                    <svg className="w-12 h-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Görselleri buraya sürükle veya tıkla
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Birden fazla seçebilirsin (PNG, JPG, WebP)
                    </p>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 hover:bg-orange-100 dark:hover:bg-orange-900/50 border border-orange-200 dark:border-orange-800 transition-colors"
                    >
                      <span className="text-lg leading-none">+</span>
                      Görsel ekle
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Lisans */}
            <div>
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Lisans
              </span>
              <div className="space-y-3" role="radiogroup" aria-label="Lisans seçeneği">
                {LICENSE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`
                      flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors
                      ${license === opt.value
                        ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-900/20 dark:border-orange-500'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="license"
                      value={opt.value}
                      checked={license === opt.value}
                      onChange={() => setLicense(opt.value)}
                      className="mt-1 w-4 h-4 text-orange-500 border-gray-300 focus:ring-orange-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {opt.label}
                      </span>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {opt.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Filigran */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={addWatermark}
                onChange={(e) => setAddWatermark(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Görselin üzerine otomatik <strong>marifetli.com.tr</strong> filigranı eklensin
              </span>
            </label>

            {/* Etiketler */}
            <div>
              <label htmlFor="design-tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Etiketler (kategori)
              </label>
              <input
                id="design-tags"
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Örn: Örgü, Ahşap, Kanaviçe"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            {/* Açıklama (SEO ve kullanıcılar için) */}
            <div>
              <label htmlFor="design-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Açıklama <span className="text-gray-400 font-normal">(isteğe bağlı)</span>
              </label>
              <textarea
                id="design-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tasarımı kısaca anlatın; arama motorları ve ziyaretçiler için faydalıdır."
                rows={3}
                maxLength={2000}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-y"
              />
            </div>

            {/* Telif onayı */}
            <label className={`
              flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors
              ${!copyrightConfirmed ? 'border-gray-200 dark:border-gray-700' : 'border-orange-500/50 dark:border-orange-500/50'}
            `}>
              <input
                type="checkbox"
                checked={copyrightConfirmed}
                onChange={(e) => setCopyrightConfirmed(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500 shrink-0"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Bu tasarımın bana ait olduğunu ve tüm telif haklarının bende olduğunu beyan ederim.
              </span>
            </label>
          </div>

          <div className="p-5 sm:p-6 border-t border-gray-200 dark:border-gray-800 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={!copyrightConfirmed || isSubmitting}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Yükleniyor...' : 'Yükle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
