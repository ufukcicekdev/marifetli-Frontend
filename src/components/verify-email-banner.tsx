'use client';

import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/src/stores/auth-store';
import api from '@/src/lib/api';

export function VerifyEmailBanner() {
  const { user, isAuthenticated } = useAuthStore();
  const [sending, setSending] = useState(false);

  if (!isAuthenticated || !user || user.is_verified) return null;

  const handleResend = async () => {
    if (sending) return;
    setSending(true);
    try {
      const res = await api.resendVerificationEmail();
      toast.success(res.data?.message ?? 'Doğrulama linki e-postanıza gönderildi.');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string; message?: string } }; message?: string };
      const msg = e.response?.data?.error ?? e.response?.data?.message ?? e.message ?? 'Gönderilemedi. Lütfen tekrar deneyin.';
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100">
      <div className="container mx-auto px-3 sm:px-4 py-2 flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm">
          <span className="font-medium">E-posta adresinizi doğrulayın.</span>
          {' '}
          Gönderi paylaşmak, yorum ve beğeni yapmak için e-postanıza gelen doğrulama linkine tıklayın.
        </p>
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleResend}
            disabled={sending}
            className="text-sm font-medium text-amber-700 dark:text-amber-300 hover:underline disabled:opacity-60"
          >
            {sending ? 'Gönderiliyor…' : 'Doğrulama mailini tekrar gönder'}
          </button>
          <Link
            href="/ayarlar"
            className="text-sm font-medium text-amber-700 dark:text-amber-300 hover:underline"
          >
            Ayarlar →
          </Link>
        </div>
      </div>
    </div>
  );
}
