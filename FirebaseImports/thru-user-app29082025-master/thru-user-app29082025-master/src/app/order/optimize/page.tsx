'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { RouteOptionsPicker } from '@/components/order/RouteOptionsPicker';
import { useOrderFlow } from '@/contexts/OrderFlowContext';
import { routeBasedShopDiscovery } from '@/lib/route-based-shop-discovery';
import { buildRouteOptions } from '@/lib/route-options-optimizer';
import { AUTO_DETOUR_KM } from '@/types/order-flow';

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

export default function OrderOptimizePage() {
  const router = useRouter();
  const {
    selectedStartLocation,
    selectedDestination,
    categories,
    groceryItems,
    routeOptions,
    selectedRouteOptionId,
    setRouteOptions,
    selectRouteOption,
  } = useOrderFlow();

  const [loading, setLoading] = React.useState(true);
  const [searchComplete, setSearchComplete] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setSearchComplete(false);

      const endpoints = parseEndpoints(selectedStartLocation, selectedDestination);
      if (!endpoints) {
        if (!cancelled) {
          setRouteOptions([]);
          setLoading(false);
          setSearchComplete(true);
        }
        return;
      }

      const storeTypes = categories.includes('food')
        ? (['grocery', 'supermarket', 'restaurant', 'cafe'] as const)
        : (['grocery', 'supermarket'] as const);

      try {
        const result = await routeBasedShopDiscovery.findShopsAlongRoute(
          endpoints.start,
          endpoints.end,
          AUTO_DETOUR_KM,
          storeTypes as any
        );
        if (cancelled) return;
        const options = buildRouteOptions(result.shops, groceryItems);
        setRouteOptions(options);
        if (options[0]) {
          selectRouteOption(options[0].id);
        } else {
          selectRouteOption('');
        }
      } catch {
        if (!cancelled) {
          setRouteOptions([]);
          selectRouteOption('');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setSearchComplete(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    selectedStartLocation,
    selectedDestination,
    categories,
    groceryItems,
    setRouteOptions,
    selectRouteOption,
  ]);

  const canReview =
    searchComplete && (routeOptions.length === 0 || Boolean(selectedRouteOptionId));

  return (
    <div className="space-y-8">
      <RouteOptionsPicker loading={loading} searchComplete={searchComplete} />

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          className="flex-1 h-12 rounded-xl"
          onClick={() => router.push('/order/needs')}
        >
          Back
        </Button>
        <Button
          type="button"
          className="flex-1 h-12 rounded-xl font-semibold"
          disabled={!canReview}
          onClick={() => router.push('/order/review')}
        >
          {routeOptions.length === 0 ? 'Continue' : 'Review'}
        </Button>
      </div>
    </div>
  );
}
