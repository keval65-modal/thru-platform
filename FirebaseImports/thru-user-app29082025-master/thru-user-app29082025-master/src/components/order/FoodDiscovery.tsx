'use client';

import * as React from 'react';
import { Loader2, Sparkles, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOrderFlow } from '@/contexts/OrderFlowContext';
import { routeBasedShopDiscovery } from '@/lib/route-based-shop-discovery';
import { rankWorthTheStop } from '@/lib/route-options-optimizer';
import { AUTO_DETOUR_KM } from '@/types/order-flow';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

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

export function FoodDiscovery() {
  const router = useRouter();
  const { selectedStartLocation, selectedDestination } = useOrderFlow();
  const [loading, setLoading] = React.useState(false);
  const [worthStops, setWorthStops] = React.useState<ReturnType<typeof rankWorthTheStop>>([]);
  const [surpriseResults, setSurpriseResults] = React.useState<ReturnType<typeof rankWorthTheStop>>([]);
  const [showSurprise, setShowSurprise] = React.useState(false);

  const loadPlaces = React.useCallback(async () => {
    const endpoints = parseEndpoints(selectedStartLocation, selectedDestination);
    if (!endpoints) return [];
    const result = await routeBasedShopDiscovery.findShopsAlongRoute(
      endpoints.start,
      endpoints.end,
      AUTO_DETOUR_KM,
      ['restaurant', 'cafe', 'bakery', 'fast_food'] as any
    );
    return result.shops;
  }, [selectedStartLocation, selectedDestination]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const shops = await loadPlaces();
        if (cancelled) return;
        const hour = new Date().getHours();
        setWorthStops(rankWorthTheStop(shops, hour).slice(0, 3));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [loadPlaces]);

  const handleSurprise = async () => {
    setLoading(true);
    setShowSurprise(true);
    try {
      const shops = await loadPlaces();
      const hour = new Date().getHours();
      const ranked = rankWorthTheStop(shops, hour);
      setSurpriseResults(ranked.slice(0, 4));
    } finally {
      setLoading(false);
    }
  };

  const minutesLabel = (shop: { detourDistance?: number; estimatedTime?: number }) => {
    const mins = shop.estimatedTime
      ? Math.round(shop.estimatedTime)
      : Math.max(1, Math.round((shop.detourDistance ?? 1) * 3));
    return `+${mins} min`;
  };

  const PlaceCard = ({
    shop,
    compact,
  }: {
    shop: (typeof worthStops)[0];
    compact?: boolean;
  }) => (
    <button
      type="button"
      onClick={() => router.push(`/vendor/${shop.id}`)}
      className={cn(
        'w-full rounded-2xl p-4 text-left transition-colors',
        'bg-gradient-to-br from-background to-muted/30',
        'border border-border/50 hover:border-primary/30 hover:shadow-sm',
        compact && 'p-3'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {shop.isSponsored && (
            <span className="text-[10px] font-medium text-primary/80 uppercase tracking-wide">
              Worth the stop
            </span>
          )}
          <p className="font-semibold truncate">{shop.name}</p>
          {shop.perk && (
            <p className="text-xs text-muted-foreground mt-0.5">{shop.perk}</p>
          )}
        </div>
        <span className="shrink-0 text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
          {minutesLabel(shop)}
        </span>
      </div>
      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
        <span>{(shop as any).rating?.toFixed(1) ?? '4.2'}</span>
        <span>·</span>
        <span className="truncate">Recommended on your route</span>
      </div>
    </button>
  );

  return (
    <div className="space-y-6">
      {(loading || worthStops.length > 0) && (
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
            <Sparkles className="h-4 w-4 text-primary" />
            Worth the stop
          </h3>
          {loading && worthStops.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
              Finding places on your route…
            </div>
          ) : (
            <div className="space-y-2">
              {worthStops.map((shop) => (
                <PlaceCard key={shop.id} shop={shop} />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="rounded-2xl bg-muted/30 p-4 space-y-3">
        <div>
          <p className="font-medium">Not sure what to pick?</p>
          <p className="text-sm text-muted-foreground mt-1">
            We&apos;ll suggest spots based on your route, time of day, and what&apos;s popular nearby.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full rounded-xl h-11"
          onClick={handleSurprise}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Surprise me
        </Button>
        {showSurprise && surpriseResults.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-sm font-medium text-center">We found these worth stopping for</p>
            {surpriseResults.map((shop) => (
              <PlaceCard key={`surprise-${shop.id}`} shop={shop} compact />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
