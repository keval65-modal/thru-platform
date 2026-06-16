'use client';

import * as React from 'react';
import { Check, Loader2, MapPin, MapPinOff } from 'lucide-react';
import { useOrderFlow } from '@/contexts/OrderFlowContext';
import { findRouteShopsWithFallback } from '@/lib/route-shop-search';
import type { RouteShopSearchTier } from '@/lib/route-shop-search';
import {
  isShopOnPath,
  routeTimingLabel,
  streetFromAddress,
} from '@/lib/route-options-optimizer';
import type { OrderCategory, PickupStore } from '@/types/order-flow';
import { cn } from '@/lib/utils';

const SECTION_TITLE: Record<OrderCategory, string> = {
  grocery: 'Grocery stores on your route',
  food: 'Food stops on your route',
  medicine: 'Pharmacies on your route',
};

const EMPTY_HINT: Record<OrderCategory, string> = {
  grocery: 'grocery stores',
  food: 'food stops',
  medicine: 'pharmacies',
};

function parseEndpoints(start: string | null, dest: string | null) {
  const parse = (str: string) => {
    const m = str.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
    if (!m) return null;
    return { latitude: parseFloat(m[1]), longitude: parseFloat(m[2]), address: str };
  };
  if (!start || !dest) return null;
  const s = parse(start);
  const d = parse(dest);
  if (!s || !d) return null;
  return { start: s, end: d };
}

type Props = {
  category: OrderCategory;
  selectedVendor: PickupStore | null;
  onSelectVendor: (vendor: PickupStore | null) => void;
  /** Optional link when user taps a shop (e.g. browse food menu) */
  onBrowseShop?: (vendorId: string) => void;
};

export function CategoryRouteShops({
  category,
  selectedVendor,
  onSelectVendor,
  onBrowseShop,
}: Props) {
  const { selectedStartLocation, selectedDestination } = useOrderFlow();
  const [loading, setLoading] = React.useState(true);
  const [searchTier, setSearchTier] = React.useState<RouteShopSearchTier>('none');
  const [shops, setShops] = React.useState<
    Awaited<ReturnType<typeof findRouteShopsWithFallback>>['shops']
  >([]);

  React.useEffect(() => {
    let cancelled = false;
    const endpoints = parseEndpoints(selectedStartLocation, selectedDestination);
    if (!endpoints) {
      setShops([]);
      setLoading(false);
      setSearchTier('none');
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const result = await findRouteShopsWithFallback(
          endpoints.start,
          endpoints.end,
          [category]
        );
        if (cancelled) return;
        setShops(result.shops);
        setSearchTier(result.tier);

        if (!selectedVendor && result.shops[0]) {
          const first = result.shops[0];
          onSelectVendor({
            category,
            vendorId: first.id,
            vendorName: first.name,
            address: first.address,
          });
        }
      } catch {
        if (!cancelled) {
          setShops([]);
          setSearchTier('none');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-fetch on route change only
  }, [selectedStartLocation, selectedDestination, category]);

  const handleSelect = (shop: (typeof shops)[0]) => {
    onSelectVendor({
      category,
      vendorId: shop.id,
      vendorName: shop.name,
      address: shop.address,
    });
  };

  return (
    <section className="mt-6 pt-5 border-t border-border/50 space-y-3">
      <div>
        <h3 className="text-sm font-semibold">{SECTION_TITLE[category]}</h3>
        {searchTier === 'detour' && shops.length > 0 && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Nothing directly on your route — within a 5 km detour.
          </p>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Finding {EMPTY_HINT[category]}…
        </div>
      ) : shops.length === 0 ? (
        <div className="rounded-xl bg-muted/30 p-4 text-center text-sm text-muted-foreground">
          <MapPinOff className="h-6 w-6 mx-auto mb-2 opacity-50" />
          <p>No {EMPTY_HINT[category]} found along this route right now.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {shops.map((shop, index) => {
            const selected = selectedVendor?.vendorId === shop.id;
            const onPath = isShopOnPath(shop);
            const timing = routeTimingLabel(shop);
            const street = streetFromAddress(shop.address);
            const isSuggested = index === 0;

            return (
              <div
                key={shop.id}
                className={cn(
                  'rounded-2xl border-2 transition-all overflow-hidden',
                  selected ? 'border-primary bg-primary/5' : 'border-border/50 bg-muted/20'
                )}
              >
                <button
                  type="button"
                  onClick={() => handleSelect(shop)}
                  className="w-full p-4 text-left"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{shop.name}</p>
                        {isSuggested && (
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                            Suggested
                          </span>
                        )}
                      </div>
                      {street && (
                        <p className="text-sm text-muted-foreground mt-1 flex items-start gap-1">
                          <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{street}</span>
                        </p>
                      )}
                    </div>
                    {selected ? (
                      <span className="shrink-0 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3.5 w-3.5 text-primary-foreground" />
                      </span>
                    ) : null}
                  </div>
                  <span
                    className={cn(
                      'inline-block mt-2 text-xs font-medium px-2.5 py-1 rounded-full',
                      onPath ? 'bg-emerald-500/10 text-emerald-700' : 'bg-primary/10 text-primary'
                    )}
                  >
                    {timing}
                  </span>
                </button>
                {onBrowseShop && (
                  <div className="px-4 pb-3 -mt-1">
                    <button
                      type="button"
                      className="text-xs font-medium text-primary hover:underline"
                      onClick={() => onBrowseShop(shop.id)}
                    >
                      Browse menu →
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
