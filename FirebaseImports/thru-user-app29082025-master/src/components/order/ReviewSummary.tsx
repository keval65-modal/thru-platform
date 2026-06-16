'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useOrderFlow } from '@/contexts/OrderFlowContext';
import { saveActiveTripRoute } from '@/lib/active-trip-route';
import { placeOrderFromFlow } from '@/lib/place-order-from-flow';
import { computeCartSummary, formatCartInr, getPickupStores } from '@/lib/order-cart-pricing';

export function ReviewSummary() {
  const flow = useOrderFlow();
  const router = useRouter();
  const { toast } = useToast();
  const [processing, setProcessing] = React.useState(false);

  const summary = React.useMemo(() => computeCartSummary(flow), [flow]);
  const pickupStores = React.useMemo(() => getPickupStores(flow), [flow]);
  const groceryCount = flow.groceryItems.length;
  const categories = flow.categories.join(', ') || '—';
  const hasItems = summary.itemCount > 0;
  const medicineOnly =
    flow.categories.includes('medicine') &&
    !flow.categories.includes('grocery') &&
    !flow.categories.includes('food');

  const startLocation =
    flow.startLocationQuery || flow.selectedStartLocation || '';
  const destination =
    flow.destinationQuery || flow.selectedDestination || '';

  const handleCheckout = async () => {
    setProcessing(true);
    try {
      // Staged payment — simulate gateway delay then place order
      await new Promise((resolve) => setTimeout(resolve, 1200));

      const result = await placeOrderFromFlow(flow);
      if (!result.success || !result.orderId) {
        throw new Error(result.error || 'Could not place order');
      }

      saveActiveTripRoute({
        orderId: result.orderId,
        startLocation,
        destination,
        pickupStops: pickupStores.map((store) => ({
          id: `${store.category}-${store.vendorId}`,
          name: store.vendorName,
          address: store.address,
          category: store.category,
          vendorId: store.vendorId,
        })),
        createdAt: new Date().toISOString(),
      });

      toast({
        title: 'Payment successful',
        description: `Order #${result.orderId} sent to vendors.`,
      });

      router.push(`/order-tracking/${result.orderId}`);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Checkout failed',
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Review & checkout</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {hasItems
            ? "Here's what you've added for your trip."
            : 'Your route is ready — continue when you are.'}
        </p>
      </div>

      {hasItems && (
        <div className="rounded-2xl bg-muted/30 p-5 space-y-4">
          {!medicineOnly && (
            <div className="flex justify-between items-baseline">
              <span className="text-muted-foreground">Order total</span>
              <span className="text-3xl font-bold tabular-nums">
                {formatCartInr(summary.total)}
              </span>
            </div>
          )}
          {medicineOnly && (
            <p className="text-sm font-medium text-muted-foreground">Pharmacy quote pending</p>
          )}
          {summary.savings > 0 && (
            <div className="flex justify-between text-emerald-600 font-medium">
              <span>Estimated savings</span>
              <span>−{formatCartInr(summary.savings)}</span>
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl bg-background border border-border/50 p-4 space-y-2 text-sm">
        <p>
          <span className="text-muted-foreground">From:</span>{' '}
          <span className="font-medium">{startLocation || '—'}</span>
        </p>
        <p>
          <span className="text-muted-foreground">To:</span>{' '}
          <span className="font-medium">{destination || '—'}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Needs:</span>{' '}
          <span className="font-medium capitalize">{categories}</span>
          {groceryCount > 0 && ` · ${groceryCount} grocery item${groceryCount > 1 ? 's' : ''}`}
        </p>
        {pickupStores.length > 0 && (
          <div className="space-y-1 pt-1">
            <p className="text-muted-foreground">Pickup stops:</p>
            {pickupStores.map((store) => (
              <p key={`${store.category}-${store.vendorId}`}>
                <span className="font-medium capitalize">{store.category}:</span>{' '}
                {store.vendorName}
                {store.address ? (
                  <span className="text-muted-foreground"> · {store.address}</span>
                ) : null}
              </p>
            ))}
          </div>
        )}
      </div>

      <Button
        type="button"
        className="w-full h-12 rounded-xl text-base font-semibold"
        onClick={() => void handleCheckout()}
        disabled={processing || (!hasItems && pickupStores.length === 0)}
      >
        {processing ? 'Processing payment…' : 'Continue to checkout'}
      </Button>
    </div>
  );
}
