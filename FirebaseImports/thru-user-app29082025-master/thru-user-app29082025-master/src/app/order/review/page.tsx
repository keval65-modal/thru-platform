'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ReviewSummary } from '@/components/order/ReviewSummary';
import { useOrderFlow } from '@/contexts/OrderFlowContext';

export default function OrderReviewPage() {
  const router = useRouter();
  const { routeOptions } = useOrderFlow();

  return (
    <div className="space-y-6">
      <ReviewSummary />
      {routeOptions.length > 0 && (
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() => router.push('/order/optimize')}
        >
          Change option
        </Button>
      )}
    </div>
  );
}
