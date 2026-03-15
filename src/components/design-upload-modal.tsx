'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';

export type DesignLicense = 'commercial' | 'cc-by' | 'cc-by-nc';

export interface DesignUploadFormData {
  file: File | null;
  license: DesignLicense;
  addWatermark: boolean;
  tags: string;
  copyrightConfirmed: boolean;
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
  const [file, setFile] = useState<File | null>(null);
  const [license, setLicense] = useState<DesignLicense>('cc-by');
  const [addWatermark, setAddWatermark] = useState(true);
  const [tags, setTags] = useState('');
  const [copyrightConfirmed, setCopyrightConfirmed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = useCallback(() => {
    setFile(null);
    setLicense('cc-by');
    setAddWatermark(true);
    setTags('');
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped?.type.startsWith('image/')) setFile(dropped);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected?.type.startsWith('image/')) setFile(selected);
    e.target.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!copyrightConfirmed) {
      toast.error('Telif beyanını onaylamanız gerekiyor.');
      return;
    }
    if (!file) {
      toast.error('Lütfen bir görsel seçin.');
      return;
    }
    const data: DesignUploadFormData = { file, license, addWatermark, tags, copyrightConfirmed };
    onSubmit?.(data);
    // Başarılı yüklemeden sonra parent onClose çağırır; kapandığında resetForm useEffect ile yapılır
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
            {/* Dropzone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Görsel
              </label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  relative rounded-2xl border-2 border-dashed min-h-[180px] flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors
                  ${isDragging
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-orange-400 dark:hover:border-gray-500 bg-gray-50/50 dark:bg-gray-800/50'
                  }
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="sr-only"
                  aria-label="Görsel seç"
                />
                {file ? (
                  <>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{file.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      className="mt-1 text-xs text-orange-600 dark:text-orange-400 hover:underline"
                    >
                      Kaldır
                    </button>
                  </>
                ) : (
                  <>
                    <svg className="w-12 h-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Görseli buraya sürükle
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      veya tıklayarak seç (PNG, JPG, WebP)
                    </p>
                  </>
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
