'use client';

import { useEffect } from 'react';
import { addRecentCommunity } from '@/src/lib/recent-activity';

export function RecordCommunityVisit({ slug, label }: { slug: string; label: string }) {
  useEffect(() => {
    if (slug && label) addRecentCommunity({ slug, label });
  }, [slug, label]);
  return null;
}
