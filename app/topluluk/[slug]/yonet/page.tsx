'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function CommunityManageRedirectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  useEffect(() => {
    router.replace(`/topluluk/${slug}?modal=manage`);
  }, [slug, router]);
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full" />
    </div>
  );
}
