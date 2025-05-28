import { Suspense } from 'react';
import StocksPageClient from '@/app/components/Stock/StocksPageClient';
import StocksPageSkeleton from '@/app/components/Stock/StocksPageSkeleton';

export default function StocksPage() {
  return (
    <Suspense fallback={<StocksPageSkeleton />}>
      <StocksPageClient />
    </Suspense>
  );
}
