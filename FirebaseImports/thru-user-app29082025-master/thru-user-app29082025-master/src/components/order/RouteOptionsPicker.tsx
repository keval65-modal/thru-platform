'use client';

import * as React from 'react';
import { Check, Loader2, Route } from 'lucide-react';
import { useOrderFlow } from '@/contexts/OrderFlowContext';
import { cn } from '@/lib/utils';

type Props = {
  loading: boolean;
  searchComplete: boolean;
};

export function RouteOptionsPicker({ loading, searchComplete }: Props) {
  const { routeOptions, selectedRouteOptionId, selectRouteOption } = useOrderFlow();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mb-3 text-primary" />
        <p className="text-sm">Finding the best options on your route…</p>
      </div>
    );
  }

  if (searchComplete && routeOptions.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Your route is set</h2>
          <p className="text-sm text-muted-foreground mt-1">
            No matching stops on your route right now — you can continue with your direct trip.
          </p>
        </div>
        <div className="rounded-2xl bg-muted/30 p-6 text-center text-muted-foreground">
          <Route className="h-8 w-8 mx-auto mb-2 opacity-60" />
          <p className="text-sm">We&apos;ll notify you when shops open along this route.</p>
        </div>
      </div>
    );
  }

  if (!searchComplete || routeOptions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Your best choices</h2>
        <p className="text-sm text-muted-foreground mt-1">
          We compared shops on your route — pick what works for you.
        </p>
      </div>

      <div className="space-y-3">
        {routeOptions.map((opt) => {
          const selected = selectedRouteOptionId === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => selectRouteOption(opt.id)}
              className={cn(
                'w-full rounded-2xl p-4 text-left transition-all border-2',
                selected
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-transparent bg-muted/40 hover:bg-muted/60'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-lg">{opt.label}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{opt.description}</p>
                </div>
                {selected && (
                  <span className="shrink-0 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-3.5 w-3.5 text-primary-foreground" />
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-3 flex-wrap">
                <span className="text-2xl font-bold tabular-nums">
                  ₹{opt.totalPrice.toLocaleString('en-IN')}
                </span>
                <span className="text-sm font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                  +{opt.addedMinutes} min
                </span>
                {opt.savings > 0 && (
                  <span className="text-sm text-emerald-600 font-medium">
                    Save ₹{opt.savings}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
