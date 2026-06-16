'use client';

import * as React from 'react';
import { useOrderFlow } from '@/contexts/OrderFlowContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { computeCartSummary, formatCartInr, getPickupStores } from '@/lib/order-cart-pricing';

export function ReviewSummary() {
  const flow = useOrderFlow();
  const router = useRouter();
  const { toast } = useToast();
  const [placing, setPlacing] = React.useState(false);

  const summary = React.useMemo(() => computeCartSummary(flow), [flow]);
  const pickupStores = React.useMemo(() => getPickupStores(flow), [flow]);
  const groceryCount = flow.groceryItems.length;
  const categories = flow.categories.join(', ') || '—';
  const hasItems = summary.itemCount > 0;
  const medicineOnly =
    flow.categories.includes('medicine') &&
    !flow.categories.includes('grocery') &&
    !flow.categories.includes('food');

  const handleCheckout = async () => {
    setPlacing(true);
    try {
      sessionStorage.setItem(
        'thru-checkout-summary',
        JSON.stringify({
          pickupStores,
          groceryItems: flow.groceryItems,
          foodItems: flow.foodItems,
          medicineItems: flow.medicineItems,
          destination: flow.destinationQuery,
          departureTime: flow.departureTime,
          estimatedTotal: summary.total,
        })
      );
      router.push('/cart');
    } catch {
      toast({ variant: 'destructive', title: 'Could not continue', description: 'Please try again.' });
    } finally {
      setPlacing(false);
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
          <span className="text-muted-foreground">To:</span>{' '}
          <span className="font-medium">{flow.destinationQuery || '—'}</span>
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
        onClick={handleCheckout}
        disabled={placing}
      >
        {placing ? 'Preparing checkout…' : 'Continue to checkout'}
      </Button>
    </div>
  );
}
