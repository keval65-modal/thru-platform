'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { DestinationForm } from '@/components/order/DestinationForm';
import { useOrderFlow } from '@/contexts/OrderFlowContext';

export default function OrderDestinationPage() {
  const router = useRouter();
  const flow = useOrderFlow();

  const canContinue =
    flow.selectedStartLocation &&
    flow.selectedDestination &&
    flow.departureTime;

  return (
    <div className="space-y-8">
      <DestinationForm />

      <Button
        type="button"
        className="w-full h-12 rounded-xl text-base font-semibold"
        disabled={!canContinue || !flow.hydrated}
        onClick={() => router.push('/order/needs')}
      >
        Continue
      </Button>
    </div>
  );
}
