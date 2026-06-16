'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ReviewSummary } from '@/components/order/ReviewSummary';

export default function OrderReviewPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <ReviewSummary />
      <Button
        type="button"
        variant="ghost"
        className="w-full"
        onClick={() => router.push('/order/needs')}
      >
        Edit items & stops
      </Button>
    </div>
  );
}
