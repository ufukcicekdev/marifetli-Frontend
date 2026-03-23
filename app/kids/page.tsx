import { Suspense } from 'react';
import { headers } from 'next/headers';
import { KidsHomeLanding } from '@/src/components/kids/kids-home-landing';
import { kidsPathPrefixFromHost } from '@/src/lib/kids-config';

export default async function KidsHomePage() {
  const host = (await headers()).get('host') ?? '';
  const prefix = kidsPathPrefixFromHost(host);

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg py-16 text-center font-medium text-violet-800 dark:text-violet-200">
          Yükleniyor…
        </div>
      }
    >
      <KidsHomeLanding pathPrefix={prefix} />
    </Suspense>
  );
}
