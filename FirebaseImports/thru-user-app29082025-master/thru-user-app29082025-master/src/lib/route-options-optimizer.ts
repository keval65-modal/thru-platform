import type { GroceryListItem, RouteOption } from '@/types/order-flow';
import type { RouteBasedShop } from '@/lib/route-based-shop-discovery';
import type { RouteShopSearchTier } from '@/lib/route-shop-search';

function estimateGroceryTotal(items: GroceryListItem[]): number {
  return items.reduce((sum, item) => {
    const multiplier = item.unit === 'kg' ? 120 : item.unit === 'litre' ? 90 : 45;
    return sum + item.quantity * multiplier;
  }, 0);
}

/** ~500 m from the driving line counts as on the user's path */
const ON_PATH_KM = 0.5;

export function isShopOnPath(shop: RouteBasedShop): boolean {
  return (
    shop.isOnRoute ||
    shop.distanceFromRoute <= ON_PATH_KM ||
    shop.detourDistance <= ON_PATH_KM
  );
}

/** Extra minutes from detour distance — not total drive time from start. */
export function detourMinutesFromShop(shop: RouteBasedShop): number {
  if (isShopOnPath(shop)) return 0;
  const fromDetour = Math.max(1, Math.round(shop.detourDistance * 3));
  return Math.min(30, fromDetour);
}

export function routeTimingLabel(shop: RouteBasedShop): string {
  if (isShopOnPath(shop)) return 'On your path';
  const mins = detourMinutesFromShop(shop);
  if (mins <= 5) return `~${mins} min off route`;
  return `+${mins} min detour`;
}

export function streetFromAddress(address: string | undefined): string {
  if (!address || address === 'Address not available') return '';
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  return parts.slice(0, 2).join(', ');
}

/**
 * One card per shop on the route — first entry is the suggested stop.
 */
export function buildRouteOptions(
  shops: RouteBasedShop[],
  groceryItems: GroceryListItem[],
  searchTier: RouteShopSearchTier = 'on_route'
): RouteOption[] {
  if (shops.length === 0) return [];

  const sorted = [...shops].sort((a, b) => {
    if (a.isOnRoute !== b.isOnRoute) return a.isOnRoute ? -1 : 1;
    if (a.detourDistance !== b.detourDistance) return a.detourDistance - b.detourDistance;
    return a.routePosition - b.routePosition;
  });

  const basePrice = estimateGroceryTotal(groceryItems);

  return sorted.map((shop, index) => {
    const streetName = streetFromAddress(shop.address);
    const isSuggested = index === 0;
    const onPath = isShopOnPath(shop);
    const addedMinutes = onPath ? 0 : detourMinutesFromShop(shop);
    const timingLabel = routeTimingLabel(shop);
    const savings = isSuggested
      ? Math.max(0, Math.round(basePrice * 0.12))
      : Math.max(0, Math.round(basePrice * Math.max(0.03, 0.1 - index * 0.02)));

    return {
      id: shop.id,
      label: shop.name,
      shopIds: [shop.id],
      shopNames: [shop.name],
      shopAddress: shop.address,
      streetName,
      isSuggested,
      isOnRoute: onPath,
      isOnPath: onPath,
      timingLabel,
      totalPrice: basePrice,
      savings,
      addedMinutes,
      description: streetName || shop.address,
    };
  });
}

export function estimateOrderTotal(items: GroceryListItem[]): number {
  return estimateGroceryTotal(items);
}

export function rankWorthTheStop(
  shops: RouteBasedShop[],
  hour: number
): Array<RouteBasedShop & { perk?: string; isSponsored?: boolean }> {
  const mealPerk = (h: number) => {
    if (h >= 7 && h < 11) return 'Great breakfast stop';
    if (h >= 11 && h < 15) return 'Lunch pick on your route';
    if (h >= 18 && h < 22) return 'Dinner worth the stop';
    return 'Recommended on your route';
  };

  return [...shops]
    .sort((a, b) => a.detourDistance - b.detourDistance)
    .slice(0, 6)
    .map((shop, i) => ({
      ...shop,
      perk: i === 0 ? 'Free dessert today' : mealPerk(hour),
      isSponsored: i < 2,
    }));
}
