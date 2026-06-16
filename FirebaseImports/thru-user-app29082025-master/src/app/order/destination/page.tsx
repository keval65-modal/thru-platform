'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CityDriveIllustration } from '@/components/order/CityDriveIllustration';
import { DestinationForm } from '@/components/order/DestinationForm';
import { useOrderFlow } from '@/contexts/OrderFlowContext';
import { useToast } from '@/hooks/use-toast';
import { isDepartureIsoInPast, PAST_DEPARTURE_TIME_MESSAGE } from '@/lib/departure-time';

function parseCoordString(str: string | null): boolean {
  if (!str) return false;
  return /^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/.test(str.trim());
}

export default function OrderDestinationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const flow = useOrderFlow();

  const hasStart = parseCoordString(flow.selectedStartLocation);
  const hasDest = parseCoordString(flow.selectedDestination);
  const hasDeparture = Boolean(flow.departureTime);

  const canContinue =
    hasStart && hasDest && hasDeparture && flow.hydrated && (flow.isImmediate || !isDepartureIsoInPast(flow.departureTime));

  const handleContinue = () => {
    if (!hasStart || !hasDest) {
      toast({
        variant: 'destructive',
        title: 'Select locations from suggestions',
        description: 'Pick your start and destination from the dropdown list so we can plan your route.',
      });
      return;
    }
    if (!hasDeparture) {
      toast({
        variant: 'destructive',
        title: 'Set departure time',
        description: 'Choose Leaving now or Schedule for later.',
      });
      return;
    }
    if (!flow.isImmediate && isDepartureIsoInPast(flow.departureTime)) {
      toast({
        variant: 'destructive',
        title: 'Invalid departure time',
        description: PAST_DEPARTURE_TIME_MESSAGE,
      });
      return;
    }
    router.push('/order/needs');
  };

  return (
    <div className="space-y-8">
      <DestinationForm />

      <Button
        type="button"
        className="w-full h-12 rounded-xl text-base font-semibold"
        disabled={!canContinue}
        onClick={handleContinue}
      >
        Continue
      </Button>

      <CityDriveIllustration />
    </div>
  );
}
