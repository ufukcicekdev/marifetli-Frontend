'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Eski /tasarim-yukle linkleri tasarımlar sayfasına yönlendirilir; modal orada açılır.
 */
export default function TasarimYukleRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/tasarimlar?yukle=1');
  }, [router]);
  return (
    <div className="container mx-auto px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
      Yönlendiriliyor…
    </div>
  );
}
