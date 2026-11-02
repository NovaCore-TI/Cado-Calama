'use client';

import { useRouter } from 'next/navigation';
import { useLiveUpdates } from '@/hooks/useLiveUpdates';

export function LiveArticleRefresh() {
  const router = useRouter();
  useLiveUpdates({ resources: ['blog'], pollMs: 60_000 }, () => router.refresh());
  return null;
}
