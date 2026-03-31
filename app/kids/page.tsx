import { Suspense } from 'react';
import { KidsHomeLanding } from '@/src/components/kids/kids-home-landing';
import { kidsPathPrefixFromHost } from '@/src/lib/kids-config';
import tr from '@/language/tr.json';

export default function KidsHomePage() {
  const host = '';
  const prefix = kidsPathPrefixFromHost(host);

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg py-16 text-center font-medium text-violet-800 dark:text-violet-200">
          {tr['common.loading']}
        </div>
      }
    >
      <KidsHomeLanding pathPrefix={prefix} />
    </Suspense>
  );
}
