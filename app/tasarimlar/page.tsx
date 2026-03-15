'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import api from '@/src/lib/api';
import { useAuthStore } from '@/src/stores/auth-store';
import { DesignUploadModal, type DesignUploadFormData } from '@/src/components/design-upload-modal';
import toast from 'react-hot-toast';

const LICENSE_LABELS: Record<string, string> = {
  commercial: 'Ticari kullanım',
  'cc-by': 'Atıf ile',
  'cc-by-nc': 'Ticari yasak',
};

export default function TasarimlarPage() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['designs', 'list'],
    queryFn: () => api.getDesigns().then((r) => r.data),
  });

  useEffect(() => {
    if (searchParams?.get('yukle') === '1' && isAuthenticated) {
      setUploadModalOpen(true);
    }
  }, [searchParams, isAuthenticated]);

  const designs = (data as { results?: { id: number; image_url: string; license: string; tags: string; created_at: string; author_username: string }[] })?.results ?? [];

  const handleUploadSubmit = async (formData: DesignUploadFormData) => {
    if (!formData.file) return;
    if (!isAuthenticated) {
      toast.error('Tasarım yüklemek için giriş yapın.');
      return;
    }
    setUploading(true);
    try {
      await api.uploadDesign({
        file: formData.file,
        license: formData.license,
        addWatermark: formData.addWatermark,
        tags: formData.tags,
        copyrightConfirmed: formData.copyrightConfirmed,
      });
      toast.success('Tasarımınız yüklendi.');
      setUploadModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['designs', 'list'] });
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err && typeof (err as { response?: { data?: { detail?: string } } }).response?.data?.detail === 'string'
        ? (err as { response: { data: { detail: string } } }).response.data.detail
        : 'Yükleme başarısız.';
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
          Tasarımlar
        </h1>
        {isAuthenticated && (
          <button
            type="button"
            onClick={() => setUploadModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 transition-colors"
          >
            <span className="text-lg leading-none">+</span>
            Tasarım Yükle
          </button>
        )}
      </div>
      <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
        Topluluktan yüklenen el işi ve el sanatları tasarımları.
      </p>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="aspect-square rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <p className="text-amber-600 dark:text-amber-400 text-sm">Tasarımlar yüklenemedi.</p>
      ) : designs.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Henüz tasarım yok.</p>
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => setUploadModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-orange-500 hover:text-orange-600 border border-orange-500 transition-colors"
            >
              İlk tasarımı sen yükle
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {designs.map((d) => (
            <Link
              key={d.id}
              href={`/tasarim/${d.id}`}
              className="group block rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-orange-400 dark:hover:border-orange-600 transition-colors bg-white dark:bg-gray-900"
            >
              <div className="aspect-square relative overflow-hidden">
                <img
                  src={d.image_url}
                  alt={d.tags || 'Tasarım'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              </div>
              <div className="p-3 border-t border-gray-100 dark:border-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  u/{d.author_username}
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">
                  {LICENSE_LABELS[d.license] ?? d.license}
                </p>
                {d.tags && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                    {d.tags.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 2).join(', ')}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      <DesignUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSubmit={handleUploadSubmit}
        isSubmitting={uploading}
      />
    </div>
  );
}
