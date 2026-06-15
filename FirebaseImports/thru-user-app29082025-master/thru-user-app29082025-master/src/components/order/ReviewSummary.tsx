'use client';

import * as React from 'react';
import { useOrderFlow } from '@/contexts/OrderFlowContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { estimateOrderTotal } from '@/lib/route-options-optimizer';

export function ReviewSummary() {
  const flow = useOrderFlow();
  const router = useRouter();
  const { toast } = useToast();
  const [placing, setPlacing] = React.useState(false);

  const option = flow.selectedRouteOptionId
    ? flow.routeOptions.find((o) => o.id === flow.selectedRouteOptionId)
    : flow.routeOptions[0];

  const hasRouteOptions = flow.routeOptions.length > 0;
  const groceryCount = flow.groceryItems.length;
  const categories = flow.categories.join(', ') || '—';
  const estimatedTotal = option?.totalPrice ?? estimateOrderTotal(flow.groceryItems);
  const showPricing = hasRouteOptions || groceryCount > 0;

  const handleCheckout = async () => {
    setPlacing(true);
    try {
      sessionStorage.setItem(
        'thru-checkout-summary',
        JSON.stringify({
          option: option ?? null,
          groceryItems: flow.groceryItems,
          destination: flow.destinationQuery,
          departureTime: flow.departureTime,
          estimatedTotal,
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
          {hasRouteOptions
            ? "Here's what Thru found for your trip."
            : 'Your route is ready — continue when you are.'}
        </p>
      </div>

      {showPricing && (
        <div className="rounded-2xl bg-muted/30 p-5 space-y-4">
          {groceryCount > 0 && (
            <div className="flex justify-between items-baseline">
              <span className="text-muted-foreground">Shopping total</span>
              <span className="text-3xl font-bold tabular-nums">
                ₹{estimatedTotal.toLocaleString('en-IN')}
              </span>
            </div>
          )}
          {hasRouteOptions && (option?.savings ?? 0) > 0 && (
            <div className="flex justify-between text-emerald-600 font-medium">
              <span>Estimated savings</span>
              <span>₹{option!.savings.toLocaleString('en-IN')}</span>
            </div>
          )}
          {hasRouteOptions && option && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Additional drive time</span>
              <span className="font-semibold text-primary">
                Only +{option.addedMinutes} min
              </span>
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
        {option?.shopNames?.length ? (
          <p>
            <span className="text-muted-foreground">Stops:</span>{' '}
            <span className="font-medium">{option.shopNames.join(', ')}</span>
          </p>
        ) : null}
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
