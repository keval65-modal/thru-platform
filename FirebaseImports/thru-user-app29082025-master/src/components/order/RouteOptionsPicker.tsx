'use client';

import * as React from 'react';
import { Check, Loader2, MapPin, MapPinOff, Sparkles } from 'lucide-react';
import { useOrderFlow } from '@/contexts/OrderFlowContext';
import type { RouteShopSearchTier } from '@/lib/route-shop-search';
import type { OrderCategory, RouteOption } from '@/types/order-flow';
import { cn } from '@/lib/utils';

type Props = {
  loading: boolean;
  searchComplete: boolean;
  searchTier?: RouteShopSearchTier;
};

function shopTypeLabel(categories: OrderCategory[]): string {
  const hasGrocery = categories.includes('grocery');
  const hasFood = categories.includes('food');
  const hasMedicine = categories.includes('medicine');

  if (hasMedicine && !hasGrocery && !hasFood) return 'pharmacies';
  if (hasFood && !hasGrocery && !hasMedicine) return 'food stops';
  if (hasGrocery && hasFood) return 'shops';
  if (hasGrocery) return 'grocery shops';
  return 'shops';
}

function optionsSubtitle(categories: OrderCategory[], searchTier: RouteShopSearchTier): string {
  const label = shopTypeLabel(categories);
  if (searchTier === 'detour') {
    return `Nothing directly on your route — these ${label} are within a 5 km detour.`;
  }
  if (categories.includes('medicine') && !categories.includes('grocery')) {
    return 'Pick a pharmacy along your trip for prescription pickup.';
  }
  if (categories.includes('food') && !categories.includes('grocery')) {
    return 'Pick where you would like to stop for food along your trip.';
  }
  return 'Pick where you would like to stop for groceries along your trip.';
}

function ShopOptionCard({
  opt,
  selected,
  onSelect,
  medicineOnly,
}: {
  opt: RouteOption;
  selected: boolean;
  onSelect: () => void;
  medicineOnly?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full rounded-2xl p-4 text-left transition-all border-2',
        selected
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-transparent bg-muted/40 hover:bg-muted/60',
        opt.isSuggested && !selected && 'border-primary/20'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-lg leading-tight">{opt.label}</p>
            {opt.isSuggested && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                <Sparkles className="h-3 w-3" />
                Suggested
              </span>
            )}
          </div>
          {(opt.streetName || opt.shopAddress) && (
            <p className="text-sm text-muted-foreground mt-1 flex items-start gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span className="line-clamp-2">{opt.streetName || opt.shopAddress}</span>
            </p>
          )}
        </div>
        {selected && (
          <span className="shrink-0 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
            <Check className="h-3.5 w-3.5 text-primary-foreground" />
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 mt-3 flex-wrap">
        {!medicineOnly && (
          <span className="text-xl font-bold tabular-nums">
            ₹{opt.totalPrice.toLocaleString('en-IN')}
          </span>
        )}
        {medicineOnly && (
          <span className="text-sm font-medium text-muted-foreground">Quote pending</span>
        )}
        <span
          className={cn(
            'text-sm font-medium px-2.5 py-1 rounded-full',
            opt.isOnPath
              ? 'bg-emerald-500/10 text-emerald-700'
              : 'bg-primary/10 text-primary'
          )}
        >
          {opt.timingLabel ?? (opt.isOnPath ? 'On your path' : `+${opt.addedMinutes} min detour`)}
        </span>
        {opt.savings > 0 && (
          <span className="text-sm text-emerald-600 font-medium">
            Save ₹{opt.savings}
          </span>
        )}
      </div>
    </button>
  );
}

export function RouteOptionsPicker({ loading, searchComplete, searchTier = 'none' }: Props) {
  const { routeOptions, selectedRouteOptionId, selectRouteOption, categories } = useOrderFlow();

  const medicineOnly =
    categories.includes('medicine') &&
    !categories.includes('grocery') &&
    !categories.includes('food');
  const shopLabel = shopTypeLabel(categories);

  const suggested = routeOptions.filter((o) => o.isSuggested);
  const others = routeOptions.filter((o) => !o.isSuggested);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mb-3 text-primary" />
        <p className="text-sm">Finding shops on your route…</p>
      </div>
    );
  }

  if (searchComplete && routeOptions.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">No shops on your route</h2>
          <p className="text-sm text-muted-foreground mt-1">
            We couldn&apos;t find {shopLabel} along this route or within a 5 km detour.
          </p>
        </div>
        <div className="rounded-2xl bg-muted/30 p-6 text-center text-muted-foreground">
          <MapPinOff className="h-8 w-8 mx-auto mb-2 opacity-60" />
          <p className="text-sm font-medium text-foreground">
            No shops available on the route right now.
          </p>
          <p className="text-sm mt-2">
            We&apos;re working on bringing more vendors to you — you can still continue with your
            trip.
          </p>
        </div>
      </div>
    );
  }

  if (!searchComplete || routeOptions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Shops on your way</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {optionsSubtitle(categories, searchTier)}
        </p>
      </div>

      {suggested.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Suggested on your route
          </h3>
          {suggested.map((opt) => (
            <ShopOptionCard
              key={opt.id}
              opt={opt}
              selected={selectedRouteOptionId === opt.id}
              onSelect={() => selectRouteOption(opt.id)}
              medicineOnly={medicineOnly}
            />
          ))}
        </section>
      )}

      {others.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {suggested.length > 0 ? 'Other shops nearby' : 'Available shops'}
          </h3>
          {others.map((opt) => (
            <ShopOptionCard
              key={opt.id}
              opt={opt}
              selected={selectedRouteOptionId === opt.id}
              onSelect={() => selectRouteOption(opt.id)}
              medicineOnly={medicineOnly}
            />
          ))}
        </section>
      )}
    </div>
  );
}
