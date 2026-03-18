'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function CommunityEditRedirectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  useEffect(() => {
    router.replace(`/topluluk/${slug}?modal=edit`);
  }, [slug, router]);
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full" />
    </div>
  );
}
