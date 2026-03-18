'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthModalStore } from '@/src/stores/auth-modal-store';

export default function GirisPage() {
  const router = useRouter();
  const openAuth = useAuthModalStore((s) => s.open);

  useEffect(() => {
    openAuth('login');
    router.replace('/');
  }, [router, openAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
